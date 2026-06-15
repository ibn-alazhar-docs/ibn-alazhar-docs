# Retry and Failure Policy

## Purpose

Define explicit retry policies and failure categories for every failure mode in the pipeline.

---

## Failure Categories

| Category      | Meaning                                   | Retry Behavior          |
| ------------- | ----------------------------------------- | ----------------------- |
| **Fatal**     | Job exceeded timeout or was aborted       | No retry → DLQ          |
| **Permanent** | Input is fundamentally unprocessable      | Limited retries → DLQ   |
| **Transient** | Temporary condition (network, rate limit) | Full retry with backoff |

---

## Failure Categorization (`categorizeFailure`)

```typescript
function categorizeFailure(error: Error): { category: FailureCategory; code: string };
```

| Error Pattern              | Category  | Code                 | Reason                                    |
| -------------------------- | --------- | -------------------- | ----------------------------------------- |
| `OCR_UPLOAD_FAILED`        | Transient | `OCR_UPLOAD_FAILED`  | Google Drive upload may succeed next time |
| `OCR_NO_TEXT`              | Transient | `OCR_NO_TEXT`        | OCR may produce text on retry             |
| `ETIMEDOUT` / `ECONNRESET` | Transient | `NETWORK_ERROR`      | Transient network issue                   |
| `RequestTimeout`           | Transient | `REQUEST_TIMEOUT`    | Socket timeout, retryable                 |
| `rateLimit` / `quota`      | Transient | `RATE_LIMITED`       | API rate limit, wait and retry            |
| `Redis`                    | Transient | `REDIS_ERROR`        | Redis temporarily unavailable             |
| `MinIO` / `storage`        | Transient | `STORAGE_ERROR`      | MinIO temporarily unavailable             |
| `OCR_QUOTA_EXCEEDED`       | Permanent | `OCR_QUOTA_EXCEEDED` | Google Drive quota exhausted              |
| `PDF_ENCRYPTED`            | Permanent | `PDF_ENCRYPTED`      | Cannot process encrypted files            |
| `PDF_CORRUPT`              | Permanent | `PDF_CORRUPT`        | File is not a valid PDF                   |
| `PDF_TRUNCATED`            | Permanent | `PDF_TRUNCATED`      | File is incomplete                        |
| `FILE_TOO_LARGE`           | Permanent | `FILE_TOO_LARGE`     | Exceeds size limit                        |
| `INVALID_TYPE`             | Permanent | `INVALID_TYPE`       | Unsupported file format                   |
| `JOB_TIMEOUT`              | Fatal     | `JOB_TIMEOUT`        | Job exceeded timeout                      |
| `JOB_ABORTED`              | Fatal     | `JOB_ABORTED`        | Job was forcefully aborted                |

---

## Queue Retry Configuration

| Queue        | Attempts | Backoff Pattern | Applied In               |
| ------------ | -------- | --------------- | ------------------------ |
| `validation` | 3        | Exponential 2s  | `getRetryConfigForQueue` |
| `splitting`  | 3        | Exponential 2s  | `getRetryConfigForQueue` |
| `ocr`        | env (3)  | Exponential 5s  | `getRetryConfigForQueue` |
| `cleaning`   | 3        | Exponential 2s  | `getRetryConfigForQueue` |
| `generation` | 3        | Exponential 2s  | `getRetryConfigForQueue` |
| `export`     | 3        | Exponential 2s  | `getRetryConfigForQueue` |

### Implementation

```typescript
function getRetryConfigForQueue(queueName: string) {
  const baseConfig = {
    attempts: 3,
    backoff: { type: "exponential" as const, delay: 2000 },
  };
  if (queueName === JOB_QUEUES.OCR) {
    return {
      attempts: parseInt(process.env.OCR_MAX_RETRIES ?? "3"),
      backoff: { type: "exponential" as const, delay: 5000 },
    };
  }
  return baseConfig;
}
```

---

## Backoff Assumptions

| Attempt | Validation/Splitting | OCR (base 5s)  |
| ------- | -------------------- | -------------- |
| 1       | 2s                   | 5s             |
| 2       | 4s                   | 10s            |
| 3       | 8s                   | 20s            |
| 4+      | N/A (max 3)          | env-configured |

---

## Retry Limits

| Scenario           | Max Retries                     | After Exhaustion |
| ------------------ | ------------------------------- | ---------------- |
| Transient failure  | 3                               | BullMQ fails job |
| Permanent failure  | 0 (before categorization) → DLQ | DLQ record       |
| Fatal failure      | 0                               | DLQ record       |
| OCR (env override) | env default                     | BullMQ fails job |

---

## Edge Cases

| Scenario                      | Behavior                                                            |
| ----------------------------- | ------------------------------------------------------------------- |
| Redis disconnects mid-retry   | Retry strategy in `getConnection` — up to 5x exponential, then null |
| All 3 OCR retries fail        | BullMQ marks job failed. Worker checks category before DLQ.         |
| Retry succeeds on 3rd attempt | Job completes normally — no DLQ involvement                         |
| Retry after network blip      | BullMQ auto-retries with exponential backoff                        |
| Manual job re-queuing         | Via DLQ: read failed job data, re-add to original queue             |
