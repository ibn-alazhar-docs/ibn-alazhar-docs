---
name: rate-limiting
description: "Implement API rate limiting — token bucket (default), sliding window, fixed window, leaky bucket. Picks algorithm based on traffic pattern, wires Redis (atomic Lua script) for multi-server or in-memory for single-server, enforces per-IP/per-user/per-API-key limits, returns 429 with Retry-After and X-RateLimit-* headers. Triggers in Phase 6 EXECUTE when exposing public APIs or protecting auth endpoints."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: backend
---

# Rate Limiting

> Backend sub-skill for protecting every public endpoint — and especially every auth endpoint — from abuse. Picks the algorithm (token bucket default), the store (Redis for multi-server, in-memory for single), wires the middleware, and emits standard `X-RateLimit-*` headers and `429 Too Many Requests` with `Retry-After`. Coordinates with `auth-setup` (per-user identity) and `api-contract` (per-route limits).

## When to Use

| Phase                | Trigger                                                                              | Why                                    |
| -------------------- | ------------------------------------------------------------------------------------ | -------------------------------------- |
| Phase 2 — AUDIT      | Dimension 4 (Security) finds no rate limit on `/login`, `/signup`, `/reset-password` | Critical — brute force is unrestricted |
| Phase 2 — AUDIT      | Public API has no per-caller throttle                                                | Abuse / DoS risk                       |
| Phase 6 — EXECUTE    | User says "add rate limiting", "throttle API", "prevent abuse"                       | This is the executing sub-skill        |
| Phase 6 — EXECUTE    | Multi-server deploy — in-memory limiter no longer works                              | Must move to Redis-backed              |
| Phase 9 — ACCEPTANCE | Verify 429 returned at limit, Retry-After correct, headers present                   | Limits must be testable                |
| Phase 11 — ROLLOUT   | Verify Redis available in prod; fail-open behavior confirmed                         | Limiter outage must degrade gracefully |

**Do NOT use this sub-skill directly for:** WAF-level DDoS protection (Cloudflare/AWS WAF — that's infrastructure, not application), per-customer quota enforcement in business logic (that's a billing concern), or CDN edge caching (separate layer). This sub-skill is the application-level limiter that sits inside your request pipeline.

## What It Does

1. Picks the algorithm via the Decision Tree (default: token bucket).
2. Picks the store: Redis (multi-server) or in-memory LRU (single-server).
3. Wires middleware that runs before route handlers:
   - Identify the caller: API key (authenticated) → user ID (authenticated) → IP (anonymous).
   - Build the bucket key: `{route}:{caller_id}`.
   - Atomically consume a token (Redis Lua script or in-memory mutex).
   - On allow: set `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers, call next handler.
   - On deny: return `429 Too Many Requests` with `Retry-After` (seconds until next token) and the same three headers.
4. Configures per-route limits (auth endpoints strict, read endpoints loose, write endpoints moderate).
5. Configures per-tier overrides (free tier: 100 req/min, paid tier: 1000 req/min).
6. Wires fail-open behavior on Redis outage (degrade to in-memory limiter, log the outage, never block all traffic).
7. Emits a `rate_limit` middleware factory: `rate_limit({route, limit, window_sec, key_by})`.

## Integration Contract

```
INPUT:
  - framework: express|fastify|fastapi|django|next|rails (required)
  - store: redis|memory (default: redis if REDIS_URL set, else memory)
  - redis_url: string (optional — required if store=redis)
  - default_limit: int (default 100 req/min per caller)
  - per_route_overrides: list of {route, limit, window_sec}
    example: [{"route": "/login", "limit": 5, "window_sec": 60},
              {"route": "/signup", "limit": 3, "window_sec": 60},
              {"route": "/api/v1/*", "limit": 1000, "window_sec": 60}]
  - key_by: api_key|user_id|ip (default: api_key if auth header, else ip)
  - tier_overrides: list of {tier, multiplier} (default: [{tier: "free", multiplier: 1}, {tier: "paid", multiplier: 10}])
  - fail_open_on_redis_outage: bool (default true — see Hard Rules)

OUTPUT (JSON to stdout):
  {
    "status": "ok|error",
    "algorithm": "token_bucket",
    "store": "redis|memory",
    "files_created": [
      "src/rate-limit/middleware.{ts,py}",
      "src/rate-limit/store.{ts,py}",
      "src/rate-limit/config.{ts,py}"
    ],
    "env_required": ["REDIS_URL (if store=redis)"],
    "middleware_export": "rate_limit",
    "routes_protected": ["/login", "/signup", "/reset-password", "/api/v1/*"],
    "default_limit": "100 req/min per caller",
    "fail_open": true,
    "security_warnings": []
  }

SIDE EFFECTS:
  - Writes rate-limit module under src/rate-limit/
  - Adds required env vars to .env.example
  - Registers middleware in the framework's entry point BEFORE route handlers
  - Adds a Lua script to src/rate-limit/token_bucket.lua (atomic on Redis)
```

## CLI

```bash
# Autonomous: pick algorithm, pick store, wire middleware
python3 scripts/rate_limit_agent.py setup \
  --framework fastapi \
  --store redis \
  --redis-url-env REDIS_URL \
  --default-limit 100 \
  --window-sec 60

# Add per-route override (auth endpoints must be strict)
python3 scripts/rate_limit_agent.py add-route --route /login  --limit 5 --window-sec 60 --key-by ip
python3 scripts/rate_limit_agent.py add-route --route /signup --limit 3 --window-sec 60 --key-by ip

# Add per-tier multiplier (paid users get 10x)
python3 scripts/rate_limit_agent.py add-tier \
  --tier paid \
  --multiplier 10

# Test the limiter locally
python3 scripts/rate_limit_agent.py test \
  --route /login \
  --requests 10 \
  --interval 0.1
# Expected: 5 return 200, 5 return 429 with Retry-After

# Verify fail-open behavior (kill Redis, hit endpoint)
python3 scripts/rate_limit_agent.py test-fail-open \
  --simulate-redis-down

# Switch from memory to Redis (multi-server deploy)
python3 scripts/rate_limit_agent.py migrate-to-redis \
  --redis-url-env REDIS_URL
```

## Decision Tree (autonomous)

```
Q1: Single-server or multi-server?
  Single server (dev, small internal tool)
    → In-memory token bucket (no external dep)
       Trade-off: limits reset on restart, per-instance not global
  Multi-server (production, > 1 instance)
    → Redis token bucket with atomic Lua script
       CRITICAL: must be atomic — INCR + EXPIRE in two commands = race condition
       Use EVALSHA with the bundled token_bucket.lua script

Q2: What algorithm?
  Token bucket (DEFAULT)
    → Allows bursts up to bucket size, refills at rate
    → Best for: APIs with bursty traffic (user clicks 5 things fast, then idle)
  Sliding window
    → Smoother enforcement, no boundary spikes
    → Best for: strict per-second APIs (payment, auth)
    → Trade-off: more memory (sorted set per key)
  Fixed window
    → Simplest, but allows 2x burst at boundary (e.g. 100/min → 100 at 0:59 + 100 at 1:00)
    → Best for: rough enforcement, low-traffic internal APIs
    → Never use for: auth endpoints (boundary spike = brute force window)
  Leaky bucket
    → Smooths output to a steady rate
    → Best for: queue/pipe scenarios, downstream rate protection
    → Trade-off: requests queue (latency) instead of reject

Q3: What key?
  Per-IP (anonymous traffic)
    → Default for public endpoints without auth
    → Trade-off: NAT/shared office = false positives; consider /24 subnet for IPv4
  Per-API-key (authenticated traffic)
    → Default for authenticated APIs
    → Each key has its own bucket; revoking the key kills the traffic
  Per-user (authenticated traffic)
    → Use when one user can have multiple sessions/devices
    → Requires `auth-setup` middleware to have run first
  Per-tenant (B2B)
    → Use the tenant ID, not user ID — one noisy user shouldn't throttle the whole org

Q4: Strict global limit?
  Yes (DDoS protection, not abuse prevention)
    → Cloudflare / AWS WAF at the edge — never at the app layer for this
    → App-layer limiter is per-caller, not global; global = app cannot serve any request
```

## Algorithms (cheat sheet)

| Algorithm      | Memory per key               | Burst behavior                      | Boundary edge case   | Use when                          |
| -------------- | ---------------------------- | ----------------------------------- | -------------------- | --------------------------------- |
| Token bucket   | O(1) — 2 numbers             | Allows full bucket burst            | None                 | **Default** — most APIs           |
| Sliding window | O(N) — sorted set per window | Smooth, no burst beyond rate        | None                 | Strict per-second (auth, payment) |
| Fixed window   | O(1) — 1 counter             | Allows rate, no burst within window | 2x burst at boundary | Internal, low-traffic             |
| Leaky bucket   | O(1) — queue size            | Smooths to steady rate              | None                 | Queue/pipe, downstream protection |

**Token bucket Lua script** (must be atomic — `INCR` + `EXPIRE` in two commands is a race condition):

```lua
-- KEYS[1] = bucket key
-- ARGV[1] = capacity
-- ARGV[2] = refill_rate (tokens per second)
-- ARGV[3] = now (unix timestamp, milliseconds)
-- ARGV[4] = requested tokens (usually 1)
local bucket = redis.call('HMGET', KEYS[1], 'tokens', 'last_refill')
local tokens = tonumber(bucket[1]) or tonumber(ARGV[1])
local last_refill = tonumber(bucket[2]) or tonumber(ARGV[3])
local elapsed = math.max(0, tonumber(ARGV[3]) - last_refill)
tokens = math.min(tonumber(ARGV[1]), tokens + elapsed * tonumber(ARGV[2]))
if tokens < tonumber(ARGV[4]) then
  redis.call('HMSET', KEYS[1], 'tokens', tokens, 'last_refill', tonumber(ARGV[3]))
  redis.call('EXPIRE', KEYS[1], 3600)
  return {0, math.ceil((tonumber(ARGV[4]) - tokens) / tonumber(ARGV[2]))}  -- denied, retry_after_sec
end
tokens = tokens - tonumber(ARGV[4])
redis.call('HMSET', KEYS[1], 'tokens', tokens, 'last_refill', tonumber(ARGV[3]))
redis.call('EXPIRE', KEYS[1], 3600)
return {1, 0}  -- allowed, no retry_after
```

## Patterns (mandatory)

| Concern               | Pattern                                                           | Why                                                             |
| --------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------- |
| Response headers      | `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` | Standard, lets clients self-throttle                            |
| 429 status            | `429 Too Many Requests` with `Retry-After: <seconds>`             | RFC 6585 + RFC 7231 — clients know when to retry                |
| Key composition       | `{route_pattern}:{caller_id}` (e.g. `login:ip:1.2.3.4`)           | Per-route isolation — a noisy /search shouldn't lock out /login |
| Anonymous callers     | Per-IP (or /24 subnet for IPv4 to mitigate NAT)                   | No API key = no per-user identity                               |
| Authenticated callers | Per-API-key or per-user-id                                        | More accurate than IP; revoking the key kills traffic           |
| Tiered limits         | `multiplier` on base limit (paid = 10x)                           | Business model — paid users get more                            |
| Auth endpoints        | Always strict (5/min/IP for /login, 3/min/IP for /signup)         | Brute force prevention — non-negotiable                         |
| Redis outage          | Fail-open (degrade to in-memory or allow) — see Hard Rules        | Rejecting all traffic is worse than allowing some abuse         |
| Reset spike           | Use sliding window or token bucket (not fixed window)             | Fixed window allows 2x burst at the boundary                    |
| Memory bloat          | TTL on every Redis key (1h default)                               | Without TTL, the keyspace grows unbounded                       |

## Failure Modes & Recovery

| Symptom                                        | Cause                                           | Recovery                                                                                                         |
| ---------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `Redis connection refused`                     | Redis down                                      | Fail-open: log outage, allow request (or degrade to in-memory limiter). Alert ops. Never return 503 to all users |
| `429 storm` — every request rejected           | Limiter key collision (all users share one key) | Check key composition — must include caller_id, not just route                                                   |
| Limit resets early                             | TTL on Redis key < window_sec                   | Set TTL = window_sec \* 2 (or 3600s default) so bucket state persists                                            |
| Boundary spike (2x traffic at minute boundary) | Fixed window algorithm                          | Switch to token bucket or sliding window                                                                         |
| Per-IP false positives (entire office blocked) | NAT — one IP, many users                        | For /login use per-(IP + email) key; for general API use per-API-key                                             |
| Limiter costs 50ms per request                 | Network round-trip to Redis per request         | Use connection pool; co-locate Redis with app; consider in-memory for hot paths                                  |
| Limit not enforced                             | Middleware registered after route handlers      | Order matters — limiter must be in the global middleware chain BEFORE routes                                     |
| `X-RateLimit-*` headers missing                | Headers only set on allow path, not 429         | Set headers on BOTH 200 and 429 responses                                                                        |
| Limiter state lost on deploy                   | In-memory store, no persistence                 | Use Redis for prod; in-memory is dev-only                                                                        |
| Thundering herd at reset                       | All clients retry at the exact reset time       | Add jitter to Retry-After (±10%); client libraries should also add jitter                                        |

## Self-Healing Loop

Every rate-limit incident (limit too strict, limit too loose, Redis outage) writes a structured record to `OMNIPROJECT_SELF_IMPROVEMENT.md`:

```
- route: /api/v1/search
  failure_class: false_positive_lockout
  trigger: shared office NAT, 50 users from 1 IP, 100/min limit hit in 2s
  recovery: switched key from per-IP to per-(IP + session_id) for authenticated routes; per-IP only for anonymous
  rule_added: rate-limiting sub-skill now defaults per-user for authenticated routes, per-IP only for anonymous
```

`meta-auditor` reads these in Phase 13. If the same failure class appears ≥3 times across projects, `self-patch-generator` produces a rule that auto-adjusts the default key composition.

For auth endpoints without rate limits: the audit halts the build — this is a Critical bug.

## Quality Gates (enforced before declaring "rate limiting ready")

- [ ] Every auth endpoint (`/login`, `/signup`, `/reset-password`, `/mfa/verify`) is rate-limited (5/min/IP or stricter)
- [ ] Middleware registered globally BEFORE route handlers
- [ ] 429 response includes `Retry-After` header (integer seconds)
- [ ] 429 response includes `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers
- [ ] 200 responses ALSO include the `X-RateLimit-*` headers (so clients can self-throttle)
- [ ] Redis outage triggers fail-open (degrade to in-memory or allow) — verified by killing Redis in test
- [ ] Redis Lua script is atomic (single `EVALSHA` call, no `INCR` + `EXPIRE` race)
- [ ] Every Redis key has a TTL (default 3600s) — no unbounded key growth
- [ ] Per-tier overrides tested (free tier hits limit at 100 req/min, paid at 1000)
- [ ] Anonymous callers keyed by IP; authenticated callers keyed by API key or user ID
- [ ] Tests cover: under-limit (200), at-limit (200), over-limit (429), reset-after-window (200), Redis-down-fail-open (200)
- [ ] No fixed-window algorithm on auth endpoints (boundary spike risk)

If any gate fails: status = `error`, do not proceed to Phase 9. An unthrottled auth endpoint is a brute-force invitation.

## Tools

- **Redis** (preferred store for multi-server) — atomic Lua scripts via `EVALSHA`. Required for any multi-instance deploy.
- **ioredis** (Node) / **redis-py** (Python) — Redis clients with Lua script support and connection pooling.
- **lru-cache** (Node) / **cachetools** (Python) — in-memory store for single-server or fail-open fallback.
- **express-rate-limit** (Node, Express) — prebuilt middleware; pair with `rate-limit-redis` for distributed.
- **slowapi** (Python, FastAPI/Flask) — prebuilt middleware with Redis backend.
- **Cloudflare** / **AWS WAF** — for strict global DDoS limits (edge layer, not app layer).
- **nginx limit_req** — for infra-level throttling before traffic reaches the app.

## Permissions

- Filesystem: write to `src/rate-limit/`, `.env.example`
- Network: outbound to Redis (port 6379, or TLS port 6380)
- Secrets: read `REDIS_URL` from env var (may contain password — never log it)
- Processes: may invoke `npm install` / `pip install` for limiter libraries

## Hard Rules

1. **Always rate-limit auth endpoints** (`/login`, `/signup`, `/reset-password`, `/mfa/verify`, `/verify-email`). 5 req/min/IP for login, 3 req/min/IP for signup and reset. Without this, brute force and account enumeration are unrestricted. This is non-negotiable and the audit halts the build if missing.
2. **Always return `Retry-After` on 429 responses.** Integer seconds until the next token is available. Without it, clients hammer the endpoint with retries and make the problem worse.
3. **Never fail-closed on Redis outage.** If Redis is unavailable, fail-open (allow the request, log the outage, alert ops). Rejecting 100% of traffic because the limiter is down is a self-inflicted DoS — far worse than allowing some abuse through.
4. **Always use an atomic operation for token consumption.** Redis: single `EVALSHA` Lua script. In-memory: mutex/lock around the check-and-decrement. `INCR` + `EXPIRE` in two Redis commands is a race condition that allows limit bypass under concurrency.
5. **Always set a TTL on every Redis key.** Default 3600s. Without TTL, the keyspace grows unbounded — every unique caller adds a permanent key, and Redis OOMs in weeks.
6. **Always include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers on BOTH 200 and 429 responses.** Clients use these to self-throttle; missing headers force them to discover the limit by hitting 429s.
7. **Never use the fixed-window algorithm on auth endpoints.** The boundary edge case (2x burst at minute boundary) opens a brute-force window. Use token bucket (default) or sliding window for auth.
8. **Always register the limiter middleware BEFORE route handlers.** Order matters — a limiter registered after routes does nothing. Verify with a test that the limiter runs on every route.
9. **Always key authenticated callers by API key or user ID, not IP.** One user behind NAT (office, mobile carrier) should not be throttled because their colleague is noisy. IP-based limits are for anonymous traffic only.
10. **Always log 429 events with the route, caller ID, and limit.** Without visibility you cannot tune limits or detect abuse patterns. But NEVER log the full request body (PII risk) — just the route and caller identifier.
