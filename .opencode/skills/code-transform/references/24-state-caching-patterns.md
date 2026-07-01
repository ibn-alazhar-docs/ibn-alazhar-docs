# State Management & Caching Patterns

## Cache Strategies

- **Cache-Aside** (default): app checks cache, on miss loads from DB
- **Read-Through**: app talks only to cache; cache loads on miss
- **Write-Through**: write to cache → cache writes to DB synchronously
- **Write-Behind**: write to cache → cache writes to DB async (data loss risk on crash)

## Cache Invalidation (The Hardest Problem)

- TTL-Based: setex(key, 300, value). Choose by staleness tolerance.
- Event-Driven: publish invalidation event on DB update
- Versioned: include version in cache key; bump on update
- Tag-Based: associate entries with tags; invalidate by tag

## Cache Stampede Prevention

- Locking (mutex): acquire lock on miss; others wait
- Probabilistic Early Expiration (XFetch): randomly refresh before TTL

## Distributed State (Redis)

- Sessions: setex(session:id, 86400, json). Don't use sticky sessions.
- Distributed Locks (Redlock): always check ownership with Lua script
- Rate Limiting: token bucket in Redis with Lua
- Pub/Sub: publish/subscribe for real-time

## CQRS & Event Sourcing

- CQRS: separate write model (commands) from read model (queries). When: heavy read/write skew.
- Event Sourcing: store events (immutable). Current state = replay. When: need audit trail.

## Concurrency Control

- Optimistic: `UPDATE ... WHERE version = ?` (low contention)
- Pessimistic: `SELECT ... FOR UPDATE` (high contention)
- Distributed locks: acquire in deterministic order (prevent deadlock)

## Frontend State (4 categories)

1. URL state — path, query params (router)
2. Server state — cached server data (React Query/SWR)
3. Client state — ephemeral UI (Zustand/Context)
4. Form state — user input (React Hook Form)
   Rule: Don't duplicate server state in client state.

## Anti-Patterns

1. Stale cache (no invalidation)
2. Thundering herd (no locking)
3. Lost update (no concurrency control)
4. Cache stampede on restart (no warmup)
5. Distributed lock without ownership check
6. Frontend state duplication
7. In-process cache in load-balanced setup
8. Session in app memory
9. Write-behind without persistence
10. Cross-region invalidation lag without versioned keys
