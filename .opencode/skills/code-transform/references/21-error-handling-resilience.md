# Error Handling & Resilience Patterns

> **Based on**: AWS Builder's Library, Google SRE Book Ch.22, Stripe Engineering.

## The Pattern Stack (layered defense)

```
Fallback (graceful degradation)     ← last resort
Circuit Breaker (fail fast)         ← stop calling broken deps
Bulkhead (isolate failures)         ← one failure doesn't starve others
Retry with Backoff & Jitter         ← handle transient failures
Timeout / Deadline Propagation      ← bound the wait
Idempotency (safe retries)          ← foundation
```

## Pattern 1: Timeouts & Deadline Propagation

Every remote call MUST have a timeout. Deadline propagation: one deadline at top; each hop subtracts elapsed.

## Pattern 2: Retry with Backoff & Jitter

Retry ONLY transient (408, 429, 500, 502, 503, 504). Never retry 400/401/403/404/422.
Full jitter: `random.uniform(0, min(cap, base * 2**attempt))`
Retry budget (token bucket) limits aggregate retry rate. Retry at ONE layer only.

## Pattern 3: Circuit Breaker

CLOSED → failure rate ≥ threshold → OPEN (fail fast) → wait → HALF-OPEN (probe) → CLOSED/OPEN.
Use for dependency-down; retry budget for overload.

## Pattern 4: Bulkhead (Isolation)

Thread pool (strong) or semaphore (lighter) per dependency.
Sizing: `concurrency = target_QPS × target_latency × 1.3`

## Pattern 5: Fallback & Graceful Degradation

Cached fallback, default values, partial responses, graceful degradation.
Degrade non-critical paths first; protect critical writes.

## Pattern 6: Idempotency

Stripe-style idempotency keys. Server stores key→response (24-48h TTL).
Three failure modes: connection failure, midway failure, response failure.

## Error Classification

| HTTP                | Retry? | gRPC                       | Retry? |
| ------------------- | ------ | -------------------------- | ------ |
| 408                 | ✅     | DEADLINE_EXCEEDED          | ✅     |
| 429                 | ✅     | RESOURCE_EXHAUSTED         | ✅     |
| 500/502/503/504     | ✅     | UNAVAILABLE                | ✅     |
| 400/401/403/404/422 | ❌     | INVALID_ARGUMENT/NOT_FOUND | ❌     |

## Libraries

Python: tenacity, circuitbreaker | JS/TS: opossum, cockatiel | Java: Resilience4j | .NET: Polly v8 | Go: failsafe-go

## Anti-Patterns

1. No timeout on HTTP/DB calls
2. Infinite retries
3. Retrying at every layer (multiplicative)
4. No jitter (thundering herd)
5. Retrying 4xx errors
6. Same CB across dependencies
7. Silent fallback (no metric/log)
8. Retrying POST without idempotency key
