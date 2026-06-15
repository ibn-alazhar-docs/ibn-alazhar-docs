# Pipeline Observability

## Purpose

Provide lightweight visibility into pipeline health, queue state, and job progress without enterprise telemetry.

---

## Queue Metrics API (`getQueueMetrics` / `getAllQueueMetrics`)

### Single Queue

```typescript
const metrics = await getQueueMetrics(config);
// {
//   waiting: number,    // Jobs waiting to be processed
//   active: number,     // Jobs currently being processed
//   completed: number,  // Jobs completed (stored in Redis)
//   failed: number,     // Jobs that failed
//   delayed: number,    // Jobs delayed (retry backoff)
// }
```

### All Queues

```typescript
const allMetrics = await getAllQueueMetrics(config);
// {
//   "pipeline:validation": { waiting, active, completed, failed, delayed },
//   "pipeline:splitting":  { ... },
//   "pipeline:ocr":        { ... },
//   "pipeline:cleaning":   { ... },
//   "pipeline:generation": { ... },
//   "pipeline:export":     { ... },
// }
```

---

## Stuck Job Detection (`getStuckJobs`)

Detects jobs that have been `active` for more than 2x their configured timeout:

```typescript
const stuck = await getStuckJobs(config);
// [
//   { queue: "pipeline:ocr", jobId: "abc-123", ageMs: 600000 },
// ]
```

---

## Failed Job Inspection (`getFailedJobs`)

Query all jobs that have been routed to the dead letter queue:

```typescript
const failedJobs = await getFailedJobs(config);
```

---

## Job Status Tracking (`getJobStatus`)

Track individual job progress through pipeline stages:

```typescript
const status = await getJobStatus(config, jobId);
// { stage: "ocr", progress: 50 }
```

---

## Worker Health Signals

| Signal            | What It Indicates                                             |
| ----------------- | ------------------------------------------------------------- |
| Worker starts     | `[ocr-worker] Starting...`                                    |
| Worker registers  | `[ocr-worker] All workers registered`                         |
| Stage start       | `[ocr] Processing job abc-123: doc.pdf`                       |
| Stage complete    | `[ocr] Completed OCR for abc-123 (5 pages, 0.85)`             |
| Stage failure     | `[ocr] Failed for abc-123: OCR_NO_TEXT (category: transient)` |
| DLQ record        | `[dlq] Job abc-123 failed permanently: PDF_ENCRYPTED`         |
| Graceful shutdown | `[ocr-worker] Shutting down...`                               |

---

## Metrics Exposed (No Enterprise Telemetry)

| Metric              | Source            | Format                       |
| ------------------- | ----------------- | ---------------------------- |
| Queue depth         | `getQueueMetrics` | `{queue}: {waiting, active}` |
| Failed job count    | `getQueueMetrics` | `{queue}: {failed}`          |
| Stuck job detection | `getStuckJobs`    | `{queue}: {jobId}: {age}`    |
| DLQ contents        | `getFailedJobs`   | Full `FailedJob` records     |
| Per-job progress    | `getJobStatus`    | `{stage}: {progress}%`       |
| Processing duration | Worker logs       | Timestamp diff in logs       |

---

## How to Monitor

### Endpoint (API route)

```typescript
// GET /api/system/health
const metrics = await getAllQueueMetrics(config);
const stuck = await getStuckJobs(config);
const failed = await getFailedJobs(config);
return Response.json({ metrics, stuck, failed });
```

### CLI (run in container)

```bash
node -e "
const { loadConfig, getAllQueueMetrics, getStuckJobs, getFailedJobs } = require('./packages/pipeline');
const config = loadConfig();
Promise.all([getAllQueueMetrics(config), getStuckJobs(config), getFailedJobs(config)])
  .then(([metrics, stuck, failed]) => console.log(JSON.stringify({ metrics, stuck, failed }, null, 2)));
"
```

### Log-Based

```bash
docker compose logs ocr-worker | grep -E '\[(ocr|dlq|clean|generate|split)\]'
```

---

## Production Recommendation

For production, add:

- Periodic `getAllQueueMetrics` poll (every 30s) → store in database
- `getStuckJobs` alert threshold (more than 3 stuck jobs = page)
- Failed job count trend (more than 10 failures/hour = investigate)
