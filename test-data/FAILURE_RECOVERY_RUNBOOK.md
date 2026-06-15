# Failure Recovery Runbook

## Purpose

Document procedures for recovering from common failure scenarios in the document processing pipeline.

---

## Quick Reference

| Scenario                 | Action                                                               |
| ------------------------ | -------------------------------------------------------------------- |
| Worker crash             | Container auto-restarts (Docker restart policy)                      |
| Redis disconnects        | BullMQ retry strategy — up to 5x exponential, then fail              |
| MinIO unavailable        | Jobs fail with `STORAGE_ERROR` — retry on recovery                   |
| Job timeout              | Job fails, categorized as fatal → DLQ. Check resource usage.         |
| OCR quota exceeded       | Permanent failure → DLQ. Wait for quota reset or rotate credentials. |
| Orphan blobs in MinIO    | Run `cleanupOrphanedFiles(config, prefix, maxAgeMs)`                 |
| Partial processing (OCR) | Per-page error handling — failed pages return empty text             |
| Export failure           | Retryable. If persists, check MinIO connectivity and storage space.  |

---

## 1. Worker Crash

### Scenario

An OCR worker crashes mid-job (OOM, unhandled exception, process kill).

### Recovery

1. **Docker**: Worker container has `restart: unless-stopped` — auto-restarts
2. **BullMQ**: Active jobs are picked up by another worker instance (if concurrency > 1) or remain `active` until the crashed worker's heartbeat expires
3. **Stuck jobs**: Run `getStuckJobs()` to detect jobs that were active but abandoned
4. **Manual cleanup**: Remove stuck jobs via BullMQ admin UI or API

### Prevention

- Set `removeOnComplete: { count: 100 }` and `removeOnFail: { count: 50 }` to limit Redis memory usage
- Add `SIGTERM` handler for graceful shutdown

---

## 2. Orphan Cleanup

### Scenario

A job fails mid-stage after uploading to MinIO, leaving orphan blobs (e.g., uploaded file exists but no processing was completed).

### Detection

- Orphan keys under `uploads/{jobId}`, `ocr-results/{jobId}`, `exports/{jobId}` where the job has no matching record in Redis
- Periodic scan of MinIO prefixes vs active DB records

### Recovery

```typescript
// Delete all files under a job prefix older than 24 hours
const removed = await cleanupOrphanedFiles(config, `uploads/`, 24 * 60 * 60 * 1000);
```

Or manually:

```bash
mc rm --recursive --force myminio/ibn-al-azhar-docs/uploads/abandoned-job-id/
```

### Prevention

- Orphan cleanup should run as a periodic cron job (hourly/daily)
- Track all MinIO uploads in the database for cross-reference

---

## 3. Partial Processing Recovery

### Scenario

A multi-page document has pages 1-5 processed but page 6 OCR fails. With per-page error handling, page 6 returns empty text.

### Recovery

1. The document is marked as `completed` with an empty page 6
2. Review the document — if the empty page is critical, re-upload the specific page
3. Re-process via the export API with the partial document

### Detection

- Worker log shows `[ocr] Page-level failures for doc.pdf: [{"page":6,"error":"...",}]`
- Document has fewer non-empty pages than expected

### Prevention

- Per-page error handling prevents total job failure
- Future: add per-page retry with exponential backoff

---

## 4. Export Recovery

### Scenario

Export fails for one format but succeeds for others.

### Recovery

1. Separate export queues per format (already the case — each export job is independent)
2. Failed exports are retried automatically (3 attempts)
3. If all retries fail, the job enters DLQ with `EXPORT_FAILED` error
4. Extract the cleaned text from MinIO and manually generate the missing format

### Manual Export

```typescript
const cleanedBuffer = await downloadFile(config, `ocr-results/${jobId}/cleaned.json`);
const cleanedData = JSON.parse(cleanedBuffer.toString());
const result = generateMarkdown(cleanedData.text);
const txtContent = generateTxt(result);
// Save to MinIO or download
```

---

## 5. Queue Recovery

### Scenario

Redis restarts, all queue state is lost.

### Impact

- In-memory BullMQ state (waiting, active, delayed jobs) is lost
- MinIO blobs and database records are preserved
- Workers start fresh after Redis comes back

### Recovery

1. Workers connect to Redis and auto-recreate queues
2. Jobs in MinIO that were mid-processing need manual re-queuing
3. Use database records to identify in-flight jobs and re-add them to queues

### Prevention

- Redis persistence (RDB/AOF) for non-critical state
- Database is the source of truth for job lifecycle — Redis is cache

---

## 6. Redis Disconnect Recovery

BullMQ's `retryStrategy` handles this:

```typescript
retryStrategy: (times: number) => {
  if (times > 5) return null; // Give up after 5 retries
  return Math.min(1000 * 2 ** times, 10000); // 2s, 4s, 8s, 10s, 10s
};
```

- Workers pause processing (no new jobs picked up)
- Active jobs continue (already in progress)
- After 5 failed reconnection attempts, workers shut down
- On reconnection, workers resume automatically

---

## 7. Graceful Shutdown

```
SIGTERM → close connections → exit(0)
```

Workers catch `SIGTERM` and `SIGINT`:

```typescript
process.on("SIGTERM", async () => {
  console.log("[worker] Shutting down...");
  await closeQueueConnections();
  process.exit(0);
});
```

Active jobs receive BullMQ's internal timeout — if a worker doesn't respond, BullMQ marks the job as failed after the configured timeout.

---

## Runbook Summary

| Failure Mode        | Auto-Recovery  | Manual Step Required   | Priority |
| ------------------- | -------------- | ---------------------- | -------- |
| Worker crash        | Docker restart | Check for stuck jobs   | P1       |
| Redis disconnect    | BullMQ retry   | Verify reconnection    | P1       |
| OCR timeout         | Retry → DLQ    | Check Drive API status | P2       |
| OCR quota exceeded  | DLQ            | Rotate credentials     | P2       |
| PDF rejected        | N/A            | Notify user            | P2       |
| Export failure      | Retry (3x)     | Manual export          | P3       |
| Orphan blobs        | Cron job       | Periodic cleanup       | P3       |
| Partial OCR failure | Per-page empty | Re-upload failed page  | P3       |
