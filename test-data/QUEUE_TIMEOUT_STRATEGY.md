# Queue Timeout Strategy

## Purpose

Define explicit timeout policies for all pipeline queues to prevent hung jobs from blocking workers indefinitely.

---

## Timeout Configuration

| Queue        | Timeout | Rationale                             | Applied In           |
| ------------ | ------- | ------------------------------------- | -------------------- |
| `validation` | 30s     | Quick — file header + MIME check only | `JOB_TIMEOUTS` const |
| `splitting`  | 60s     | PDF parsing + validation              | `JOB_TIMEOUTS` const |
| `ocr`        | 300s    | Google Drive API upload + OCR + wait  | `JOB_TIMEOUTS` const |
| `cleaning`   | 30s     | Text processing only — local          | `JOB_TIMEOUTS` const |
| `generation` | 30s     | Markdown/TXT/JSON generation — local  | `JOB_TIMEOUTS` const |
| `export`     | 60s     | File generation + MinIO upload        | `JOB_TIMEOUTS` const |

### Implementation (`packages/pipeline/src/queue.ts`)

```typescript
export const JOB_TIMEOUTS: Record<string, number> = {
  [JOB_QUEUES.VALIDATION]: 30_000,
  [JOB_QUEUES.SPLITTING]: 60_000,
  [JOB_QUEUES.OCR]: 300_000,
  [JOB_QUEUES.CLEANING]: 30_000,
  [JOB_QUEUES.GENERATION]: 30_000,
  [JOB_QUEUES.EXPORT]: 60_000,
};

function getDefaultJobOptions(queueName: string) {
  const timeout = JOB_TIMEOUTS[queueName];
  if (timeout) {
    return { timeout };
  }
  return {};
}
```

### Worker-Level Timeout Safety

Each worker handler wraps its logic in a `setTimeout` guard:

```typescript
const timeout = setTimeout(() => {
  throw new Error("JOB_TIMEOUT: Splitting exceeded 60s");
}, 55000); // 5s buffer before queue timeout
try {
  /* work */
} finally {
  clearTimeout(timeout);
}
```

---

## Timeout Behavior

| Event                        | Action                                          |
| ---------------------------- | ----------------------------------------------- |
| Job exceeds queue timeout    | BullMQ marks job as `failed` with timeout error |
| Worker timeout fires         | Worker catches + logs timeout, job fails        |
| Retry on timeout             | Transient → retried up to `attempts` limit      |
| Retries exhausted on timeout | Fatal → DLQ (not retried)                       |

---

## Retry-Safe Timeout Handling

- Timeout errors (`JOB_TIMEOUT`) are categorized as **fatal** — not retried
- Worker-level `setTimeout` is 5s **shorter** than queue timeout, so worker always resolves (or fails) before BullMQ declares timeout
- This avoids ambiguous state where BullMQ kills the job while the worker is still running

---

## Determinism

- Timeouts are set **per-queue**, not per-job — consistent behavior across all jobs
- Timeout constants are defined in `types.ts` alongside queue names, making them easy to find and tune
- No environment variable overrides for timeouts — keeps behavior deterministic across environments
