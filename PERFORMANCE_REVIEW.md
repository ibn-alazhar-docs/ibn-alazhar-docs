# PERFORMANCE_REVIEW.md

> **Level:** Principal Engineer
> **Scope:** Latency, Memory Allocations, Queries, Async Flows
> **System:** Ibn Al-Azhar Docs

## 1. Async Flows & Event Loops

**Observations:**

- The Node.js event loop handles concurrency reasonably well due to BullMQ offloading heavy tasks.
- **Flaws Detected:**
  - `getJobStatus` executes 5 sequential Redis calls instead of pipelining them (`redis.pipeline()`) or utilizing `Promise.all`. This amplifies Redis latency by 5x.
  - OCR page extraction involves arbitrary `sleep(1000)` calls to dodge rate limits. This blocks the async flow linearly.

## 2. Memory Allocations

**Observations:**

- Node.js garbage collection handles normal Web API load smoothly.
- **Flaws Detected:**
  - Generating large exports (Export Worker) loads massive string/markdown blobs into memory simultaneously instead of streaming them directly through the archiver.
  - V8 Memory can spike dangerously when mapping thousands of tags or deeply nested folder trees due to unnecessary array duplications (`[...arr, item]` inside loops instead of `.push()`).

## 3. Database Query Efficiency

**Observations:**

- **N+1 Problems:** The `resolveFolderForExport` function queries the database iteratively inside a loop.
- **Connection Exhaustion:** Prisma connection pooling is present via PgBouncer, but long-running transactions (or forgotten `$disconnect` in workers) can starve the pool, causing API latency spikes for other users.

## 4. Remediation Strategy

1. **Optimize Redis/Async Calls:** Refactor sequential network boundaries. Use `Promise.all` for parallel execution or Redis pipelining for batch commands.
2. **Stream Processing:** Force the Export Worker to utilize Node.js native streams (`stream.Transform`) when generating ZIP files, capping memory usage to the buffer size.
3. **Database Efficiency:** Replace iterative recursive queries with a single raw Recursive CTE SQL query.
4. **Remove Arbitrary Sleeps:** Replace arbitrary `sleep` logic with sophisticated Leaky Bucket or Token Bucket rate limiters (`bottleneck` library) to maximize throughput while respecting external API limits.
