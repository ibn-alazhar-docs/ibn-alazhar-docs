# Dead Letter Queue Strategy

## Purpose

Preserve failed jobs for operational review and recovery after retries are exhausted.

---

## Architecture

```
Job → Queue → Worker → Retry (up to 3x) → FAILED
                                              │
                                              ▼
                                        DLQ Queue
                                      (pipeline:failed)
                                              │
                                              ▼
                                      DLQ Handler
                                    (log + alert)
```

---

## DLQ Implementation

### Queue

A dedicated BullMQ queue (`pipeline:failed`) stores failed job payloads after all retries are exhausted.

### Setup

```typescript
// Initialize DLQ at worker startup
import { setupDlq } from "@ibn-al-azhar-docs/pipeline";

await setupDlq(config, async (failed: FailedJob) => {
  console.error(`[dlq] Job ${failed.jobId} failed permanently:`, failed.error);
});
```

### Storage Format

```typescript
interface FailedJob {
  jobId: string;
  queue: string; // Original queue name
  originalData: unknown; // Full job payload
  error: string; // Error message
  errorCode: string; // Categorized error code
  failureCategory: string; // "transient" | "permanent" | "fatal"
  attempts: number; // How many attempts were made
  lastAttemptAt: string; // ISO timestamp
  failedAt: string; // ISO timestamp
}
```

### Add to DLQ

```typescript
import { recordFailedJob } from "@ibn-al-azhar-docs/pipeline";

if (category === "fatal" || category === "permanent") {
  await recordFailedJob(config, {
    jobId: job.id,
    queue: "pipeline:ocr",
    originalData: job,
    error: error.message,
    errorCode: "OCR_FAILED",
    failureCategory: category,
    attempts: job.attemptsMade ?? 1,
    lastAttemptAt: new Date().toISOString(),
    failedAt: new Date().toISOString(),
  });
}
```

### Query Failed Jobs

```typescript
const failedJobs = await getFailedJobs(config);
// Returns all FailedJob records, filterable by jobId, queue, or errorCode
```

### Clean Up

```typescript
await cleanupFailedJob(config, jobId);
```

---

## DLQ Rules

| Condition                  | Action                                 |
| -------------------------- | -------------------------------------- |
| Job exhausts retries       | Auto-failed by BullMQ (lost)           |
| Fatal failure detected     | Explicitly added to DLQ                |
| Permanent failure detected | Explicitly added to DLQ                |
| Transient failure exhausts | Falls through to BullMQ default (lost) |
| DLQ handler called         | Logs error for observability           |

---

## Operational Recovery Notes

| Scenario                  | Recovery                                         |
| ------------------------- | ------------------------------------------------ |
| Job in DLQ due to OCR     | Check Google Drive quota, retry manually         |
| Job in DLQ due to PDF     | Request clean PDF from user, retry               |
| Job in DLQ due to timeout | Check resource usage, increase timeout if needed |
| DLQ repeatedly growing    | Investigate pattern — systemic issue?            |

---

## Caveats

- DLQ stores job in Redis — not persistent across Redis restarts
- For production, add a `failed` job subscriber that writes to persistent storage (database)
- DLQ is not an archival solution — jobs should be reviewed and cleaned up periodically
