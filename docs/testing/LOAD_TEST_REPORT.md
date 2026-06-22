# LOAD_TEST_REPORT.md — Phase 3G

## Summary

| Metric         | Value |
| -------------- | ----- |
| Test Files     | 6     |
| Tests          | 39    |
| All Passing    | ✓     |
| Total Duration | ~6s   |

## Decision: **GO**

All targets met. No bottlenecks found at tested concurrency levels.

---

## Database Performance

### Read Latency

| Concurrency | p50  | p95  | p99  | Errors |
| ----------- | ---- | ---- | ---- | ------ |
| 10 reads    | 39ms | 59ms | 59ms | 0      |
| 50 reads    | 16ms | 20ms | 21ms | 0      |
| 100 reads   | 24ms | 37ms | 37ms | 0      |
| 50 counts   | 23ms | 28ms | —    | 0      |

**Target: p95 < 200ms → PASS (max p95 = 59ms)**

### Write Latency

| Concurrency | p50  | p95   | p99   | Errors |
| ----------- | ---- | ----- | ----- | ------ |
| 10 writes   | 24ms | 32ms  | —     | 0      |
| 50 writes   | 73ms | 131ms | 133ms | 0      |

**Target: p95 < 500ms → PASS (max p95 = 131ms)**

### Mixed Read/Write

| Concurrency                    | p50  | p95  | Errors |
| ------------------------------ | ---- | ---- | ------ |
| 50 mixed (33% write, 67% read) | 40ms | 67ms | 0      |

### Connection Pool

| Scenario               | Duration | Errors |
| ---------------------- | -------- | ------ |
| 100 sequential queries | 83ms     | 0      |
| 50 concurrent queries  | 13ms     | 0      |

**No connection exhaustion detected.**

---

## Pipeline Throughput

| Operation                        | Count | Duration | Throughput        |
| -------------------------------- | ----- | -------- | ----------------- |
| cleanArabicText (short)          | 100   | 64ms     | **1,558 ops/sec** |
| cleanArabicText (long, 20× text) | 50    | 336ms    | **149 ops/sec**   |
| analyzeText                      | 100   | 10ms     | **9,713 ops/sec** |
| generateMarkdown (short)         | 20    | 11ms     | **1,838 ops/sec** |
| generateMarkdown (long)          | 5     | 38ms     | **133 ops/sec**   |

### Concurrent Pipeline

| Scenario                       | Duration |
| ------------------------------ | -------- |
| 10 concurrent full pipeline    | 6ms      |
| 50 concurrent clean operations | 20ms     |

**Target: > 50 ops/sec → PASS (133–9,713 ops/sec)**

---

## Rate Limiter Performance

| Scenario                      | Duration | Throughput  | Notes                   |
| ----------------------------- | -------- | ----------- | ----------------------- |
| 100 sequential checks         | 368ms    | 272 ops/sec | Redis overhead per call |
| 50 concurrent (different IPs) | 10ms     | —           | 50/50 allowed           |
| 100 concurrent (same IP)      | 7ms      | —           | 20 allowed, 80 blocked  |
| 200 unique IPs + cleanup      | OK       | —           | Memory bounded          |

**Rate limit enforcement: ACCURATE under load.**

**Target: > 200 ops/sec → PASS (272 ops/sec sequential, much higher concurrent)**

---

## ZIP Builder Performance

| Scenario                       | Duration          | Output Size |
| ------------------------------ | ----------------- | ----------- |
| Single-doc ZIP (10 sequential) | p50=4ms, p95=32ms | —           |
| 5-doc ZIP                      | 31ms              | 8.4KB       |
| 20-doc ZIP                     | 37ms              | 31.3KB      |
| ZIP with source buffer         | 13ms              | 2.8KB       |
| 5 concurrent single-doc ZIPs   | 15ms total        | —           |
| 3 concurrent 10-doc ZIPs       | 60ms total        | —           |

**Target: < 2000ms for 5 docs → PASS (31ms)**

---

## Validation Throughput

| Schema          | Count | Duration | Throughput          |
| --------------- | ----- | -------- | ------------------- |
| Login (valid)   | 1,000 | 8ms      | **123,186 ops/sec** |
| Login (invalid) | 1,000 | 42ms     | **23,811 ops/sec**  |
| Register        | 500   | 9ms      | **57,188 ops/sec**  |
| Document update | 1,000 | 5ms      | **212,351 ops/sec** |
| Folder create   | 1,000 | 5ms      | **190,439 ops/sec** |
| Tag create      | 1,000 | 3ms      | **305,632 ops/sec** |
| Single export   | 500   | 3ms      | **196,358 ops/sec** |
| Batch export    | 500   | 11ms     | **43,911 ops/sec**  |

**Validation layer is extremely fast — never a bottleneck.**

---

## Memory Usage

| Scenario                        | Heap Growth | Heap Used     |
| ------------------------------- | ----------- | ------------- |
| 100 sequential document inserts | -1.5MB (GC) | 17.8MB / 50MB |
| Read 100 documents              | 0.4MB       | —             |
| 50 concurrent reads             | 2.3MB       | —             |
| 200 unique IPs (rate limiter)   | Bounded     | —             |

**No memory leaks detected. Heap stays well under 100MB during load.**

---

## Bottlenecks

**None found at tested concurrency levels (up to 100 concurrent operations).**

The rate limiter sequential throughput (272 ops/sec) is the slowest component due to Redis round-trip per check. Under concurrent load, this is not an issue since requests are batched.

---

## Slow Queries

**None.** All database operations completed under 135ms at 50 concurrent writes.

---

## Queue Behavior

Not directly testable without running Redis + BullMQ workers. However, the rate limiter's Redis pipeline (`INCR` + `TTL`) performs well under load.

---

## Failure Rates

| Scenario                | Failure Rate |
| ----------------------- | ------------ |
| 100 concurrent DB reads | **0%**       |
| 50 concurrent DB writes | **0%**       |
| 50 concurrent counts    | **0%**       |
| 100 sequential queries  | **0%**       |
| 50 concurrent queries   | **0%**       |

**Zero failures across all load tests.**

---

## Scaling Recommendations

### Current capacity (based on test data)

- **100 concurrent users:** Comfortable (p95 < 140ms)
- **500 concurrent users:** Likely fine (connection pool handles 50 concurrent queries easily)
- **1,000+ concurrent users:** Would need connection pooling (PgBouncer), Redis cluster for rate limiting

### Recommendations for production

1. **PgBouncer** — Already configured in `.env.example` (`DATABASE_URL_POOLED`). Use for application queries.
2. **Redis cluster** — For rate limiting at scale (>1000 req/sec).
3. **MinIO horizontal scaling** — For concurrent uploads beyond 50 simultaneous.
4. **OCR worker horizontal scaling** — Queue-based, already designed for multiple workers.

---

## Test Inventory

| #   | Test File                       | Tests  | Status       |
| --- | ------------------------------- | ------ | ------------ |
| 1   | `db-concurrency.test.ts`        | 7      | PASS         |
| 2   | `pipeline-throughput.test.ts`   | 7      | PASS         |
| 3   | `rate-limit-load.test.ts`       | 6      | PASS         |
| 4   | `zip-builder-load.test.ts`      | 6      | PASS         |
| 5   | `validation-throughput.test.ts` | 8      | PASS         |
| 6   | `memory-patterns.test.ts`       | 5      | PASS         |
|     | **Total**                       | **39** | **ALL PASS** |

## How to Run

```bash
# Load tests (requires PostgreSQL)
./ibn.sh dev-infra
pnpm db:generate && pnpm db:migrate
pnpm test:load
```
