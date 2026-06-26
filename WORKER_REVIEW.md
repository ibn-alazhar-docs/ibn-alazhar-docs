# WORKER_REVIEW.md

> **Level:** Principal Engineer
> **Scope:** Background Processing, Idempotency, Queues, Resilience
> **System:** Ibn Al-Azhar Docs

## 1. Queue Architecture (BullMQ)

**Current State:**
The system uses Redis-backed BullMQ for `ocr-worker` and `export-worker`.

**Issues Detected:**
- **Queue Configuration Bleed:** `packages/pipeline/src/queue.ts` configures connections, workers, queues, and enqueuing mechanisms all in one God Module. 
- **Missing Resource Cleanup:** Workers do not explicitly call `prisma.$disconnect` upon graceful shutdown, leading to connection leaks and pool exhaustion during deployments.

## 2. Worker Logic & Idempotency

**OCR Worker (The Core Bottleneck):**
- **God File Violation:** `ocr-worker/index.ts` is ~600 lines executing 5 distinct processing stages, raw SQL queries, and Python sub-process orchestration.
- **Idempotency Flaws:** The OCR worker updates document status mid-process. If the worker crashes, the job retries, but the intermediate state may cause duplicate text extraction or inconsistent markdown generation. Operations are not strictly idempotent.
- **Sequential Bottlenecks:** `GoogleDriveOcrProvider.extractPages` sleeps for 1 second between pages and processes them sequentially. This destroys throughput.

**Export Worker:**
- **Memory Pressure:** Assembling large ZIP files in memory or via inefficient streaming can cause Node.js OOM (Out of Memory) crashes.
- **Idempotency:** Generally better, but relies heavily on external storage state.

## 3. Failure Recovery

- **Dead Letter Queue (DLQ):** Exists, but lacks an automated retry policy with exponential backoff for transient failures (e.g., S3 rate limits).
- **Poison Pills:** A maliciously crafted or corrupted PDF will crash the Python sub-process. The error handling mechanism traps the error, but the exact fault isn't always bubbled up cleanly to the user UI.

## 4. Remediation Strategy

1. **Decouple Queue Module:** Split `queue.ts` into `BullQueueProvider`, `WorkerFactory`, and `JobEnqueueService`.
2. **Refactor OCR Worker:** 
   - Extract the 5 stages into a Chain of Responsibility pattern.
   - Enforce Idempotency: Use database transaction checkpoints or verify existing outputs in MinIO before reprocessing a stage.
3. **Optimize Throughput:** Parallelize page extraction in OCR providers where API rate limits allow.
4. **Graceful Shutdown:** Implement `SIGTERM`/`SIGINT` handlers in all workers to drain queues and cleanly disconnect from Prisma and Redis.
