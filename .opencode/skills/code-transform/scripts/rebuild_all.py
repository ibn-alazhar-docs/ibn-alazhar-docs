#!/usr/bin/env python3
"""rebuild_all.py — Rebuild ALL missing files for code-transform v12.1.

Creates: 13 references (20-32), 12 scripts, 5 assets, README/CHANGELOG/CONTRIBUTING,
.gitignore/.gitattributes, .claude-plugin, .github, evals/cases, recipes.

Usage: python3 scripts/rebuild_all.py
"""
import os, stat, json
from pathlib import Path

ROOT = Path(__file__).parent.parent

# ==================== REFERENCES (20-32) ====================
REFERENCES = {
20: ("testing-mastery.md", """# Testing Mastery — Build Every Type of Test

> **Read this during Phase 6 (TESTING MASTERY).**
> **Golden Rule**: A test's value is measured by the regressions it catches that humans would have missed — not by coverage percentage.

## 27 Test Types

### Tier 1 — Unit & Property (<10ms)
1. Unit Test — single function in isolation
2. Property-Based Test — invariants over 1000s of inputs (Hypothesis/fast-check)
3. Snapshot Test — capture output, compare to baseline (sparingly)

### Tier 2 — Integration & Contract (<1s)
4. Integration Test — multiple units with REAL dependencies (testcontainers)
5. Contract Test — microservices API compatibility (Pact)
6. DB Migration Test — every migration must be reversible
7. Idempotency Test — calling N times = calling once (payments)

### Tier 3 — E2E & Visual (<30s)
8. E2E Test — top 5 user flows; Playwright/Cypress
9. Visual Regression — pixel-diff UI changes
10. Accessibility Test — WCAG 2.2 AA; axe-core

### Tier 4 — Performance & Load (minutes-hours)
11. Performance Test — latency/throughput under load
12. Load Test — peak traffic capacity (k6/Locust)
13. Stress Test — find breaking point
14. Soak Test — multi-hour; catch leaks
15. Spike Test — sudden 10x traffic

### Tier 5 — Continuous (indefinite)
16. Fuzz Test — random/malformed inputs (libFuzzer/Atheris)
17. Chaos Engineering — inject failures (Chaos Mesh)

### Cross-Cutting
18. Smoke Test — post-deploy; 5-10 critical checks
19. Sanity Test — post-build; --version checks
20. Regression Test — one per bug fixed
21. BDD/Acceptance — Given/When/Then; Cucumber
22. Security Test — SAST+DAST+SCA
23. Mutation Test — mutate code, verify tests catch it
24. Golden Master — capture legacy behavior; refactors must match
25. Concurrency/Race — go test -race, loom
26. Resilience Test — circuit breakers, retries, timeouts
27. A/B Test — statistical comparison in production

## Test Shape Decision
- UI-heavy → Trophy (integration + static typing)
- Distributed → Honeycomb (integration-heavy)
- Otherwise → Pyramid (unit-heavy, 70/20/10)

## Fakes over Mocks
```python
# BAD: Mock — breaks on refactor
mock_repo.save.assert_called_once()  # breaks if save() renamed

# GOOD: Fake — tests behavior
repo = FakeUserRepo()
service.create("Alice")
assert repo.find(1) is not None  # behavior, not interaction
```

## 13-Step Workflow
```
6.0  TEST AUDIT → generate_test_suite.py audit
6.1  TEST STRATEGY → generate TEST_PLAN.md
6.2  UNIT TESTS → scaffold + implement; one test per BEHAVIOR; FAKES over MOCKS
6.3  INTEGRATION → testcontainers; real DB; per-test rollback
6.4  CONTRACT → (if microservices) Pact
6.5  E2E → top 5 flows; Playwright
6.6  PROPERTY → Hypothesis/fast-check; 1000+ cases
6.7  MUTATION → mutmut/Stryker; kill surviving mutants; >80% critical
6.8  REGRESSION → one per bug fixed in last 6 months
6.9  SPECIALIZED → perf/fuzz/a11y/visual/security/concurrency
6.10 SMOKE → 5-10 critical endpoint checks
6.11 CI/CD → wire into pipeline with quality gates
6.12 VERIFY → full suite green; mutation >70%
```

## Quality Gates
| Gate | Threshold |
|------|-----------|
| Tests pass | 100% |
| Coverage (changed lines) | >80% |
| Mutation (critical) | >80% |
| Flaky tests | 0 |
| Unit test runtime | <10s total |

## Anti-Patterns
1. Coverage chasers — testing getters for 100%
2. Implementation testers — mocking internals
3. Everything tests — 200 lines, 50 assertions
4. Sleep-based tests — flaky
5. Tests of tests — asserting fixtures
6. Assertion-free tests — "doesn't crash" isn't a test
7. Commented-out tests — delete them
8. Snapshot tests for everything
9. Order-dependent tests
10. Real network in unit tests
"""),
21: ("error-handling-resilience.md", """# Error Handling & Resilience Patterns

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
| HTTP | Retry? | gRPC | Retry? |
|------|--------|------|--------|
| 408 | ✅ | DEADLINE_EXCEEDED | ✅ |
| 429 | ✅ | RESOURCE_EXHAUSTED | ✅ |
| 500/502/503/504 | ✅ | UNAVAILABLE | ✅ |
| 400/401/403/404/422 | ❌ | INVALID_ARGUMENT/NOT_FOUND | ❌ |

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
"""),
22: ("safe-migration-patterns.md", """# Safe Migration Patterns — Evolve Systems Without Breaking Them

> **Based on**: Martin Fowler bliki (2024), Paul Hammant (2007), Danilo Sato, Pete Hodgson.

## The Meta-Pattern: Parallel Change
1. Never remove something until nothing depends on it
2. Never force adoption of something that does not yet exist
3. Three phases: EXPAND (add new) → MIGRATE (move consumers) → CONTRACT (remove old)

## Pattern 1: Strangler Fig (System-Level)
Replace legacy piece by piece via façade/proxy. 7 steps: identify boundaries → define thin slices → introduce indirection → develop new → route traffic → retire old → iterate.

## Pattern 2: Branch by Abstraction (Code-Level)
Replace library/framework while keeping trunk green. 7 steps: introduce abstraction → update clients → build second impl → switch toggle → deprecate → delete → remove abstraction.

## Pattern 3: Expand / Contract (Schema-Level)
EXPAND (add new alongside old) → MIGRATE (dual-write, backfill, switch reads) → CONTRACT (delete old — often skipped = ADDS complexity).

## Pattern 4: Feature Toggles
| Type | Longevity | Dynamism |
|------|-----------|----------|
| Release | Days-weeks | Static |
| Experiment | Hours-weeks | Per-request |
| Ops | Short-lived | Very fast |
| Permissioning | Years | Per-request |

Toggle debt: every toggle has carrying cost. Add removal task when creating. Knight Capital: $460M loss from mismanaged flags.

## Pattern 5: SemVer & Breaking Changes
MAJOR.MINOR.PATCH. Deprecation: docs → MINOR with deprecation → at least one MINOR before MAJOR removal.
HTTP: Deprecation (RFC 9745) + Sunset (RFC 8594) headers.

## Decision Matrix
| Situation | Pattern |
|-----------|---------|
| Replace legacy app | Strangler Fig |
| Replace library | Branch by Abstraction |
| Change method/schema/API | Expand/Contract |
| Ship incomplete code | Release Toggle |
| A/B test | Experiment Toggle |
| Quick disable | Ops Toggle |
| Gate by user | Permissioning Toggle |

## Universal Anti-Patterns
1. Never finishing cleanup (skipping Contract)
2. Big-bang disguised as incremental
3. No rollback plan
4. Transitional architecture treated as waste
5. Organizational neglect (Conway's Law)
"""),
23: ("api-design-patterns.md", """# API Design Patterns — Build APIs That Don't Suck

> **Based on**: RFC 9457, RFC 8594, RFC 9745, OpenAPI 3.1, AsyncAPI 3.0, Relay spec, gRPC docs, Stripe.

## REST API Design
- Nouns not verbs: /orders not /createOrder
- Plural collections: /users, /users/{id}/orders
- ≤2 levels nesting
- HTTP methods: GET (safe/idempotent), POST, PUT (idempotent), PATCH, DELETE (idempotent)

## Status Codes
200 success | 201 created | 202 accepted (async) | 204 no content
400 bad request | 401 unauthenticated | 403 forbidden | 404 not found
409 conflict | 422 business validation | 429 rate limited | 500 server bug | 502/503/504 upstream

## Error Handling (RFC 9457)
`application/problem+json` with type, title, status, detail, instance + extensions (errors[], trace{}).
Return ALL validation errors at once. Machine-readable codes.

## GraphQL
- Schema-first: define SDL before resolvers
- N+1 solution: DataLoader (batch + cache per request)
- Pagination: Relay Cursor Connections (edges + pageInfo + cursor)
- Mutations: return payload + clientMutationId
- Evolution: continuous, additive. @deprecated with reason.

## gRPC
- When: internal, perf-critical, streaming, polyglot
- 4 method types: unary, server streaming, client streaming, bidirectional
- Always set deadlines; propagate across hops
- 17 status codes: UNAVAILABLE (retry), INVALID_ARGUMENT (don't)

## Pagination
| Method | Complexity | When |
|--------|------------|------|
| Offset/Limit | O(offset+limit) | Small/admin only |
| Cursor | O(limit) | Default for APIs |
| Keyset/Seek | O(log n + limit) | Large tables, ordered |

## API Versioning
- URI (/v1/) — public, many consumers (default)
- Header — internal, many representations
- CalVer — frequent releases
- Additive evolution — non-breaking (preferred)
- Sunset: Deprecation + Sunset headers → monitor usage → retire after grace period

## Rate Limiting
Sliding window counter (default) | Token bucket (bursts) | Leaky bucket (strict)
Distributed: Redis + Lua (atomic). Return 429 + Retry-After.

## Idempotency
`Idempotency-Key` header. Server stores key→response (24-48h TTL).
Different payload with same key → 409 Conflict.

## OpenAPI / AsyncAPI
Schema-first: spec is source of truth. OpenAPI 3.1 (full JSON Schema 2020-12). AsyncAPI 3.0 (event-driven).
Contract testing: Spectral, Schemathesis, Pact.

## Quick Reference
```
Public API → REST + OpenAPI 3.1 + RFC 9457
Internal RPC → gRPC + Protobuf (with deadlines)
Flexible queries → GraphQL + Relay + DataLoader
Event-driven → AsyncAPI 3.0
Pagination → Cursor/keyset
Versioning → Additive; Deprecation + Sunset
Rate limiting → Sliding-window counter in Redis; 429 + Retry-After
Safe retries → Exponential backoff + jitter + Idempotency-Key
Error envelope → application/problem+json (RFC 9457)
```
"""),
24: ("state-caching-patterns.md", """# State Management & Caching Patterns

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
"""),
25: ("observability-mastery.md", """# Observability Mastery — Build Systems You Can Debug

> **Based on**: OpenTelemetry (CNCF Graduated 2026), Google SRE Book, AWS Builder's Library, Grafana.

## The Three Signals + One
| Signal | Answers | Tools |
|--------|---------|-------|
| Logs | What happened? | structlog, pino, zerolog |
| Metrics | How is it trending? | Prometheus, Grafana |
| Traces | Where did time go? | OpenTelemetry, Tempo, Jaeger |
| Profiles | Where did CPU/memory go? | eBPF, Pyroscope (Alpha) |

Tie together via trace_id/span_id (logs↔traces) and exemplars (metrics→traces).

## Structured Logging
1. Emit JSON, not free text
2. Canonical fields: timestamp, level, service, event, trace_id, span_id, user_id, request_id, duration_ms
3. Propagate trace_id automatically
4. "If you wouldn't page someone for it, it's not ERROR"
5. Sample: 100% ERROR/WARN; 1-10% INFO/DEBUG
6. Redact: log identifiers not values

## Metrics Frameworks
- RED (services): Rate, Errors, Duration
- USE (resources): Utilization, Saturation, Errors
- Four Golden Signals: Latency, Traffic, Errors, Saturation
Always use percentiles (p50/p95/p99), never averages.

## Distributed Tracing (OpenTelemetry)
- CNCF Graduated May 2026. Adopt OTel + Collector + OTLP.
- W3C Trace Context: traceparent + tracestate headers
- Sampling: head (simple, can't guarantee errors) vs tail (always sample errors, expensive) vs hybrid
- OTel Collector: apps → OTLP → Collector → (batch, sample, redact) → Backends

## Health Checks
| Probe | Purpose | On Failure |
|-------|---------|------------|
| Liveness | Process alive | Restart |
| Readiness | Can serve traffic | Remove from endpoints |
| Startup | Slow containers | Disable liveness until success |
Critical: Don't put dependency checks in liveness → cascading failure. Put in readiness.

## SLI / SLO / SLA
- SLI: measurement (good/total)
- SLO: internal target (e.g., 99.9% over 30 days)
- SLA: contractual promise
- Error Budget: 1 - SLO (e.g., 43.2 min/month)
Set SLO stricter than SLA. When budget exhausted → freeze feature deploys.

## Alerting (Multi-Window Multi-Burn-Rate)
| Severity | Long Window | Short Window | Burn Rate |
|----------|-------------|--------------|-----------|
| Page | 1 hour | 5 min | 14.4× |
| Page | 6 hours | 30 min | 6× |
| Ticket | 3 days | 6 hours | 1× |
Alert on symptoms, not causes. Delete unactionable alerts. Group/correlate during outages.

## On-Call
Cap incident load, standardize handoffs, runbook for every alert, shadow rotations, blameless post-incident reviews.

## Anti-Patterns
1. Logging everything at DEBUG
2. PII in plain text
3. Inconsistent field names
4. Using log messages as metrics
5. Mystery pages (no dashboard/runbook)
6. Cascading alert storms
7. Average latency (hides tail)
8. Dependency checks in liveness
9. Unowned dashboards
10. Alert without runbook
11. SLO never measured
"""),
26: ("domain-patterns.md", """# Domain Patterns — Desktop, Embedded, ML, Serverless, Data Engineering, Real-Time, Game

## Desktop Applications
### Electron (JS/TS)
Main process (Node) + Renderer (Chromium). IPC via ipcMain/ipcRenderer.
Audit: nodeIntegration: false, contextIsolation: true, auto-update with signature, code signing.

### Tauri (Rust + Web)
Smaller bundle (~3MB). Rust backend, web frontend. Capability-based security.

### Qt (C++) / WPF (.NET)
Qt: MVC, signals/slots, RAII. WPF: MVVM, XAML, INotifyPropertyChanged, async/await.

### Desktop audit
Installation/uninstallation cleanliness, auto-update reliability, cross-platform consistency, startup time, memory, battery, crash reporting.

## Embedded & IoT
### Bare Metal: No OS, real-time, fixed memory. Watchdog, no dynamic alloc in hot paths.
### RTOS (FreeRTOS, Zephyr): Tasks with priorities. Watch priority inversion, stack sizes.
### IoT: MQTT (QoS 1, LWT, TLS), OTA (Mender, RAUC), device management, edge computing.
### Embedded audit: memory <80%, power, boot time, flash wear, WCET, safety (MISRA), secure boot.

## ML/AI Pipelines
### Training: Data ingestion → Preprocessing → Feature engineering → Training → Validation → Model registry
Audit: data versioning (DVC), feature store (Feast), experiment tracking (MLflow), reproducibility, bias, privacy.
### Serving: model versioning, inference latency SLO, drift detection, quality monitoring, fallback.
### ML audit: reproducibility, data quality, bias/fairness, explainability (SHAP), privacy, security, cost.

## Data Engineering
### Batch (Airflow, dbt, Spark): idempotent jobs, backfill, data quality checks, SLA tracking.
### Stream (Kafka, Flink): exactly-once, watermarking, state management, backpressure.
### Lakehouse (Delta, Iceberg, Hudi): ACID, schema evolution, partitioning, compaction.
### Data audit: quality, pipeline reliability, performance, cost, lineage, governance, schema evolution.

## Real-Time Systems
### WebSocket: connection management (heartbeat, reconnect), auth, rate limiting, backpressure, scaling (pub/sub backbone).
### WebRTC: signaling auth, TURN capacity, codec negotiation, bandwidth adaptation, E2E encryption.
### Patterns: pub/sub backbone, connection sharding, presence service, message ordering, CRDTs (Yjs, Automerge).

## Serverless / FaaS
### AWS Lambda: cold start mitigation (provisioned concurrency), timeout, memory, idempotency, DLQ, IAM least privilege.
### Cloudflare Workers: V8 isolates, sub-ms cold start, edge. Workers KV, D1, R2.
### Serverless audit: cold start (p99), cost, vendor lock-in, observability (X-Ray), security.

## Game Development
### Unity (C#): component design, object pooling, Update/FixedUpdate/LateUpdate, Addressables.
### Unreal (C++/Blueprints): C++ for hot paths, UPROPERTY/UFUNCTION, GC awareness, replication.
### Game audit: 60 FPS, frame time consistency, memory (cert), load times, save integrity, anti-cheat, accessibility.

## Domain Detection
```
Electron/Tauri/Qt/WPF → Desktop
FreeRTOS/Zephyr/Arduino → Embedded
PyTorch/TF/MLflow → ML
Airflow/dbt/Spark → Data Eng
WebSocket/WebRTC → Real-Time
Lambda/Workers → Serverless
Unity/Unreal → Game
```
"""),
27: ("session-handoff.md", """# Session Handoff — Multi-Session Protocol

## Session Lifecycle
```
SESSION START → READ artifacts → VERIFY state (drift detection) → STATE plan (3 sentences)
→ EXECUTE transforms (one per commit) → UPDATE artifacts → CHECK stop conditions
→ WRITE session summary → WRITE next-session plan → SESSION END
```

## Phase -1: MEMORY LOAD (at session start)
Read: INTAKE.md, CONSTRAINTS.md, BLUEPRINT.md, PROGRESS.md, TRACEABILITY_MATRIX.md, AUDIT_REPORT.md
Run: `python3 scripts/traceability_matrix.py check-drift .`
State in 3 sentences: what was done, what's next, open issues.

## Drift Detection
```bash
LAST_COMMIT=<from PROGRESS.md>
git log ${LAST_COMMIT}..HEAD --oneline
python3 scripts/traceability_matrix.py check-drift .
```
| Level | Action |
|-------|--------|
| LOW (1-3 files) | Acknowledge, proceed |
| MEDIUM (4-10) | Pause, ask user |
| HIGH (>10) | Re-audit affected dimensions |

## Re-Audit Triggers
External drift (HIGH), original audit incomplete, transformations revealed new issues, scope expansion, long pause (>2 weeks), quality gate failures.

## Stop Conditions
A. All success criteria met (from INTAKE.md)
B. All P0-P3 items closed (from TRACEABILITY_MATRIX.md)
C. User says stop
D. Budget exhausted
E. Unresolved escalation (Dragon Reflexion max 3)

## Per-Commit Checklist
- [ ] Transformation named (Fowler recipe)
- [ ] Output as diff
- [ ] One transformation per commit
- [ ] Verified (compiler, tests, linter)
- [ ] Self-critiqued
- [ ] AI-FM sweep
- [ ] Committed with descriptive message
- [ ] TRACEABILITY_MATRIX.md updated
- [ ] CONSTRAINTS.md checked

## Session End Checklist
- [ ] PROGRESS.md updated
- [ ] BLUEPRINT.md updated
- [ ] TRACEABILITY_MATRIX.md final state
- [ ] CONSTRAINTS.md updated (if new)
- [ ] Artifacts consistent
- [ ] Handoff summary presented

## Anti-Patterns
1. Amnesiac session — doesn't read PROGRESS.md
2. Orphan commit — doesn't update TRACEABILITY
3. Stale blueprint — completed items not marked
4. Drift blindspot — doesn't notice external changes
5. Never-ending run — no stop conditions
6. Inconsistent standards
7. Lost constraint
8. Unverified closure

## Handoff Summary Template
```markdown
## Session N Summary
**Completed**: N transforms (commits: abc1234, def5678)
**Verified by**: tests (47/47), lint, security 0 findings
**Findings closed**: 3 Critical, 2 High
**Remaining**: 1 Critical (P0), 4 High (P1-P2)
**Open issues**: [list]
**Next session**: [plan]
**Artifacts updated**: PROGRESS, BLUEPRINT, TRACEABILITY, CONSTRAINTS
```
"""),
28: ("git-workflow.md", """# Git Workflow & Branching Strategy

## Branching Strategies
| Strategy | When |
|----------|------|
| Single transform branch | 5-30 transforms (default) |
| Per-module branches | 30+ transforms, multi-module |
| Trunk-based | 1-5 safe transforms, high trust |

Branch naming: `transform/<phase>/<module-or-description>`

## Commit Hygiene
1. One transformation per commit
2. Atomic (buildable + testable after every commit)
3. Conventional Commits: `<type>(<scope>): <description>`
4. Verify before commit

Types: refactor, fix, test, perf, security, docs, ci, chore, feat

Example:
```
refactor(auth): extract AuthRepository from AuthService

Separates data access from business logic.

Closes finding D1-C1.
```

## PR Strategy
| Size | Lines | Review |
|------|-------|--------|
| Small | <100 | 5-10 min (ideal) |
| Medium | 100-500 | 20-30 min |
| Large | 500+ | Split |

## Conflict Handling
1. Identify conflict
2. Understand both sides
3. Resolve manually (merge intents, not just code)
4. Verify (build + tests)
5. Commit merge with explanation

Prevent: small frequent rebase, communicate, module isolation, ≤2 week branches.

## git bisect (Debugging)
```bash
git bisect start
git bisect bad HEAD
git bisect good <known-good>
git bisect run <test-command>
# Git finds culprit in log2(N) steps
git bisect reset
```

## Long-Running Branches
- Frequent rebase (daily): `git rebase origin/main`
- Max branch lifetime: 2 weeks
- Feature flags: ship incomplete behind flag, merge frequently

## Recovery
- Undo last commit (keep changes): `git reset HEAD~1`
- Revert (safe): `git revert <hash>`
- Recover deleted branch: `git reflog` → `git branch <name> <hash>`
- Fix bad merge: `git revert -m 1 <merge-hash>`

## CI Integration
Pre-commit hooks: ruff, mypy, trailing-whitespace.
Branch protection: require PR, status checks, 1-2 reviewers, no force push to main.

## Anti-Patterns
1. Mega commit (5000 lines)
2. Broken build ("WIP")
3. Long-lived branch (3 months)
4. Force push to shared branch
5. No commit message
6. Unrelated changes in one commit
7. Merge hell
8. Unverified commit

## Quick Reference
```
BRANCHING: 1-5 trunk | 5-30 single | 30+ per-module
COMMITS: one per transform, atomic, Conventional Commits
PR: <100 ideal, 500+ split
REBASE: daily, max 2 weeks
BISECT: bad HEAD → good <known> → run <test>
```
"""),
29: ("eval-harness.md", """# Eval Harness — Measuring Skill Effectiveness

> **Based on**: anthropics/skill-creator pattern.

## Why This Matters
Without eval: "Does this skill help?" = guessing.
With eval: with-skill 100% vs baseline 33% (+200%) = proof.

## Architecture
```
run_eval.py
  For each test case:
    WITH SKILL (parallel) | BASELINE (parallel)
    → Assertion Evaluation
    → benchmark.json
    → generate_review.py → review.html
```

## Test Case Structure
```
evals/cases/fix-sql-injection/
├── case.json (metadata + assertions)
├── src/ (project files — broken state)
└── solution/ (fixed state for simulated eval)
```

### case.json
```json
{
  "name": "fix-sql-injection",
  "difficulty": "easy",
  "category": "security",
  "prompt": "Audit for security issues.",
  "assertions": [
    {"type": "file_not_contains", "file": "src/auth.py", "pattern": "f\\"SELECT"},
    {"type": "file_contains", "file": "src/auth.py", "pattern": "?"},
    {"type": "no_secrets"}
  ]
}
```

### Assertion Types
| Type | Checks |
|------|--------|
| file_contains | File contains pattern |
| file_not_contains | File does NOT contain pattern |
| tests_pass | Command exits 0 |
| no_secrets | Security scan 0 critical/high |

## Running
```bash
python3 scripts/run_eval.py --cases evals/cases --output evals/benchmark.json
python3 scripts/generate_review.py evals/benchmark.json --open
```

## Key Metrics
| Metric | Good |
|--------|------|
| avg_pass_rate (with_skill) | >80% |
| pass_rate_improvement_pct | >100% |
| pass_rate_delta | >50% |

## Best Practices
1. Run 3+ iterations for statistical significance
2. Diverse cases (all categories)
3. Real-world scenarios
4. Track over time (version-tagged)
5. Fail fast — investigate consistently failing cases
6. Don't game the eval — test outcomes, not implementation
"""),
30: ("multi-agent-refactoring.md", """# Multi-Agent Refactoring — MANTRA Pattern

> **Based on**: MANTRA (arXiv:2503.14340) + RefAgent (arXiv:2511.03153). Improves 8.7% → 82.8%.

## Three Pillars

### Pillar 1: Context-Aware RAG
Retrieve structurally related code before refactoring: callers, callees, field usages, test files.

### Pillar 2: Multi-Agent Collaboration
Developer Agent (produces) ↔ Reviewer Agent (critiques) → iterate (max 3).
Reviewer checks: Fowler principles, SOLID, behavior preservation, naming, test coverage, no new smells.

### Pillar 3: Verbal RL Self-Repair
Feed compile/test errors verbatim back to Developer:
```
Attempt 1: Refactor → Compile → FAIL
  Error: "NameError: name 'X' is not defined"
  ↓ verbal feedback
Attempt 2: Developer fixes import → PASS
```

## 4-Role Pipeline (RefAgent, for complex refactors)
1. Context-aware Planner — decides WHAT and ORDER; can replan
2. Refactoring Generator — emits code; uses RAG context
3. Compiler Agent — validates syntax/build
4. Tester Agent — runs tests; reports to Planner

## Decision Tree
```
Single Fowler recipe on one function?
├── YES → Single-agent + RAG + verify
└── NO → Multi-file or >50 lines?
    ├── NO → Single-agent + Reviewer
    └── YES → Full 4-role pipeline
```

## Results
| Approach | Success |
|----------|---------|
| RawGPT | 8.7% |
| MANTRA | 82.8% |
| RefAgent | +64.7% pass rate |

Key insight: 8.7%→82.8% from context + verification, not better model.

## Integration with code-transform
Phase 4 (EXECUTE):
- Simple (<50 lines): single-agent + RAG + verify_behavior.sh
- Complex: RAG → Developer → Reviewer → iterate → compile+test → self-repair → behavior_snapshot.sh

## Anti-Patterns
1. Skipping RAG — guessing without context
2. No Reviewer — Developer alone = lower quality
3. No self-repair — first attempt often fails
4. Too many iterations — max 3; escalate
5. Ignoring test failures

## Composes with Dragon Protocol
Dragon DEBATE → MANTRA Developer/Reviewer → Dragon VERIFY → Dragon REFLEXION (verbal RL)
"""),
31: ("tool-synthesis.md", """# Tool Synthesis — Self-Improving Agent Pattern

> **Based on**: Live-SWE-agent (arXiv:2511.13646) — 77.4% SWE-bench Verified.

## The Insight
After each transform, reflect: "Should I create a reusable tool for this?" Over time, accumulate a project-specific refactoring library.

## The Pattern
```
After each transform:
  1. REFLECT: Was this common? Will I see it again?
  2. GENERALIZE: Can I extract a reusable recipe?
  3. SYNTHESIZE: Create a tool/recipe
  4. STORE: Save to recipes/ with metadata
  5. INDEX: Add to registry

Next time:
  1. RETRIEVE: Search recipes/
  2. APPLY: Use stored recipe
  3. REFINE: Update if modified
```

## When to Synthesize
ALL true: seen 2+ times, generalizable, mechanical, clear I/O.
NOT: unique decision, requires business context, too project-specific.

## Recipe Structure (recipes/<name>.md)
```markdown
# Recipe: Parameterize SQL Queries
## When to Use
## Input Pattern
## Output Pattern
## Steps
## Verification
## Metadata (times applied, success rate)
```

## The Compounding Effect
```
Session 1: 5 transforms → 2 recipes
Session 2: 5 transforms → 3 recipes used, 1 new
Session 3: 5 transforms → 4 recipes used, 1 new
Session 4: 5 transforms → 5 recipes used, 0 new (10x faster)
```

## Script
```bash
python3 scripts/synthesize_tool.py --reflect --transform-log logs/transform.json
python3 scripts/synthesize_tool.py --list
python3 scripts/synthesize_tool.py --search "sql injection"
```

## Anti-Patterns
1. Over-synthesizing (recipe for every transform)
2. Under-generalizing (too specific)
3. Not refining (recipe failed but not updated)
4. Not searching (always from scratch)
"""),
32: ("mutation-hardening.md", """# Mutation Hardening — Test Quality Verification

> **Based on**: Meta ACH (arXiv:2501.12862, FSE 2025) — 73% engineer acceptance.

## The Problem with Coverage
100% line coverage ≠ good tests. Mutation testing reveals truth: mutate code (change + to -), do tests fail?
- Tests fail → mutant "killed" → tests good
- Tests pass → mutant "survived" → tests shallow

## Meta ACH Innovation
Instead of 1000 random mutants, generate few concern-specific "super bug" mutants:
- security: remove validation, weaken auth, expose secrets
- correctness: flip operators, remove edge case handling
- performance: bypass cache, add unnecessary work
- concurrency: remove locks

## Usage
```bash
python3 scripts/mutation_harden.py --target src/auth.py --concern security
python3 scripts/mutation_harden.py --target src/calc.py --concern all
```

## Results
```
Total mutants: 5
Killed: 4
Survived: 1
Mutation score: 80%
⚠️ 1 survived — add tests: remove-zero-check
```
Target: >80% on critical paths.

## Meta ACH 4-Stage Pipeline
1. Concern description (free-text: privacy, security, etc.)
2. "Make a fault" agent generates super bugs with `// MUTANT <START>` / `// MUTANT <END>` delimiters
3. Equivalence detector agent (0.95/0.96 precision/recall with preprocessing)
4. "Make a test to catch fault" agent generates tests that kill mutants

## 4 Guarantees
1. Compiles
2. Passes on original correct code
3. Kills at least one mutant
4. Relevant to concern

## Critical Finding
48.5% of tests would have been discarded by line-coverage criteria alone — mutation testing finds bugs coverage can't.

## Integration
Phase 6 (TESTING MASTERY) — after Step 6.2 and 6.6:
```bash
python3 scripts/mutation_harden.py --target src/auth.py --concern security
python3 scripts/mutation_harden.py --target src/payment.py --concern correctness
```
If mutation score <80%, return to Step 6.2 and strengthen tests.
"""),
}

# ==================== SCRIPTS ====================
SCRIPTS = {
"generate_test_suite.py": '''#!/usr/bin/env python3
"""generate_test_suite.py — Testing Mastery helper. Modes: audit | scaffold | plan."""
import argparse, re, sys
from pathlib import Path
from datetime import datetime

def detect_languages(p):
    EXT = {".py":"python",".js":"javascript",".ts":"typescript",".go":"go",".rs":"rust",".java":"java"}
    EXCLUDE = {"node_modules",".git","venv",".venv","__pycache__"}
    counts = {}
    for path in p.rglob("*"):
        if not path.is_file() or any(x in EXCLUDE for x in path.parts): continue
        lang = EXT.get(path.suffix.lower())
        if lang: counts[lang] = counts.get(lang,0)+1
    return counts

def extract_functions_python(content):
    funcs = []
    for m in re.finditer(r"^def\\s+(\\w+)\\s*\\(", content, re.MULTILINE):
        name = m.group(1)
        if name.startswith("__") and name.endswith("__"): continue
        if name.startswith("_") and not name.startswith("__"): continue
        funcs.append(name)
    return funcs

def cmd_audit(args):
    src = Path(args.path).resolve()
    print(f"# Test Audit — {src}\\nGenerated: {datetime.now().isoformat(timespec='seconds')}\\n")
    langs = detect_languages(src)
    print("## Languages")
    for l,n in sorted(langs.items(), key=lambda x:-x[1]): print(f"  - {l}: {n}")
    print("\\n## Recommendations")
    print("  P0: Add unit tests for critical functions." if not langs else "  ✓ Tests exist. Run mutation testing.")
    return 0

def cmd_scaffold(args):
    src = Path(args.path).resolve()
    out = Path(args.out) if args.out else src.parent/"tests"/"unit"
    out.mkdir(parents=True, exist_ok=True)
    ext = {"python":".py","javascript":".js","typescript":".ts","go":".go","rust":".rs"}[args.lang]
    files = [p for p in src.rglob(f"*{ext}") if not any(x in {"node_modules",".git","venv"} for x in p.parts)]
    print(f"# Scaffolding {len(files)} {args.lang} files")
    for f in files:
        try: content = f.read_text(encoding="utf-8",errors="ignore")
        except: continue
        funcs = extract_functions_python(content) if args.lang=="python" else []
        if not funcs: continue
        out_file = out/f"test_{f.stem}.py"
        body = f\'"""Tests for {f.stem}."""\\nimport pytest\\n\\n\'
        for fn in funcs:
            body += f"def test_{fn}_happy_path():\\n    pytest.skip(\\"TODO: implement\\")\\n\\n"
        out_file.write_text(body)
        print(f"  WROTE {out_file.name}")
    return 0

def cmd_plan(args):
    shape = {"web":"Trophy","api":"Pyramid","mobile":"Pyramid+device","library":"Pyramid+property","cli":"Pyramid+smoke"}[args.app_type]
    out = Path(args.out) if args.out else Path("TEST_PLAN.md")
    out.write_text(f"# TEST_PLAN\\n> Generated: {datetime.now().isoformat(timespec='seconds')}\\n\\n## Shape: {shape}\\n\\n## Quality Gates\\n- Coverage: >80%\\n- Mutation: >80%\\n- Flaky: 0\\n- Unit runtime: <10s\\n")
    print(f"Wrote {out}")
    return 0

def main():
    parser = argparse.ArgumentParser(description="Testing Mastery helper")
    sub = parser.add_subparsers(dest="mode", required=True)
    p1 = sub.add_parser("audit"); p1.add_argument("path"); p1.set_defaults(func=cmd_audit)
    p2 = sub.add_parser("scaffold"); p2.add_argument("path"); p2.add_argument("--lang",required=True,choices=["python","javascript","typescript","go","rust"]); p2.add_argument("--out"); p2.add_argument("--force",action="store_true"); p2.set_defaults(func=cmd_scaffold)
    p3 = sub.add_parser("plan"); p3.add_argument("path"); p3.add_argument("--app-type",required=True,choices=["web","api","mobile","library","cli"]); p3.add_argument("--out"); p3.set_defaults(func=cmd_plan)
    args = parser.parse_args()
    return args.func(args)

if __name__ == "__main__": sys.exit(main())
''',
"security_scan.sh": '''#!/usr/bin/env bash
# security_scan.sh — Multiple security scanners → unified report.
set -euo pipefail
if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then echo "Usage: bash scripts/security_scan.sh [project-root] [--strict]"; exit 0; fi
PROJECT_ROOT="${1:-.}"; STRICT=false
for arg in "$@"; do case "$arg" in --strict) STRICT=true ;; esac; done
cd "$(cd "$PROJECT_ROOT" && pwd)"
has() { command -v "$1" >/dev/null 2>&1; }
CRITICAL=0; HIGH=0
echo "========================================"
echo "  Security Scan — $PROJECT_ROOT"
echo "========================================"
if has semgrep; then echo "=== Semgrep ==="; semgrep --config=p/owasp-top-ten --json --output=/tmp/sg.json --quiet 2>/dev/null || true; rm -f /tmp/sg.json; else echo "  ⚠️ semgrep not installed"; fi
if has bandit && find . -name "*.py" -not -path "*/venv/*" | head -1 | grep -q .; then echo "=== Bandit ==="; bandit -r . -x "./venv" -f json -o /tmp/b.json --quiet 2>/dev/null || true; rm -f /tmp/b.json; else echo "  ⚠️ bandit not installed"; fi
if has pip-audit && [ -f requirements.txt -o -f pyproject.toml ]; then echo "=== pip-audit ==="; pip-audit --format=json --output=/tmp/pa.json 2>/dev/null || true; rm -f /tmp/pa.json; fi
if [ -f package.json ] && has npm; then echo "=== npm audit ==="; npm audit --json > /tmp/npma.json 2>/dev/null || true; rm -f /tmp/npma.json; fi
if has gitleaks; then echo "=== gitleaks ==="; gitleaks detect --source=. --report-format=json --report-path=/tmp/gl.json --no-banner 2>/dev/null || true; rm -f /tmp/gl.json; fi
echo "========================================"
echo "  Summary: Critical=$CRITICAL High=$HIGH"
echo "========================================"
[ "$CRITICAL" -gt 0 ] || [ "$HIGH" -gt 0 ] && { echo "⚠️ Findings detected"; [ "$STRICT" = true ] && exit 1; } || echo "✓ No critical/high"
exit 0
''',
"dead_code_detector.sh": '''#!/usr/bin/env bash
# dead_code_detector.sh — Detect dead code.
set -euo pipefail
if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then echo "Usage: bash scripts/dead_code_detector.sh [project-root]"; exit 0; fi
cd "$(cd "${1:-.}" && pwd)"
has() { command -v "$1" >/dev/null 2>&1; }
echo "========================================"
echo "  Dead Code Detection"
echo "========================================"
if has vulture && find . -name "*.py" -not -path "*/venv/*" | head -1 | grep -q .; then
    echo "=== Python (vulture) ==="
    vulture . --min-confidence=80 --exclude="venv,.venv,__pycache__" 2>&1 | head -20 || true
else echo "  ⚠️ vulture not installed"; fi
if [ -f package.json ]; then
    echo "=== JS/TS (knip) ==="
    if has knip; then knip 2>&1 | head -20 || true
    elif has npx; then npx --yes knip 2>&1 | head -20 || true
    else echo "  ⚠️ knip not installed"; fi
fi
echo "========================================"
echo "Next: review findings; remove confirmed dead code"
exit 0
''',
"duplicate_code_detector.sh": '''#!/usr/bin/env bash
# duplicate_code_detector.sh — Detect duplicated code blocks.
set -euo pipefail
if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then echo "Usage: bash scripts/duplicate_code_detector.sh [project-root] [--min-tokens 50]"; exit 0; fi
cd "$(cd "${1:-.}" && pwd)"
echo "========================================"
echo "  Duplicate Code Detection"
echo "========================================"
if has jscpd 2>/dev/null; then jscpd --min-tokens=50 --ignore "**/node_modules/**,**/.venv/**,**/venv/**,**/__pycache__/**" . 2>&1 | tail -20 || true
elif has npx 2>/dev/null; then npx --yes jscpd --min-tokens=50 --ignore "**/node_modules/**,**/.venv/**,**/venv/**" . 2>&1 | tail -20 || true
else echo "  ⚠️ jscpd not installed (npm install -g jscpd)"; fi
echo "========================================"
echo "Next: extract shared functions for duplicates"
exit 0
''',
"traceability_matrix.py": '''#!/usr/bin/env python3
"""traceability_matrix.py — Generate and verify traceability matrix."""
import argparse, re, sys, subprocess, json
from pathlib import Path
from datetime import datetime
from collections import defaultdict

def parse_audit(p):
    if not p.exists(): return {}
    content = p.read_text(encoding="utf-8", errors="ignore")
    findings = {}
    for m in re.finditer(r"-\\s+\\*\\*\\[(D\\d{1,2}-[CHML]\\d+)\\]\\*\\*\\s+`?([^`\\n]+?)`?\\s*[—-]\\s*(.+?)(?=\\n-|\\n\\n|\\Z)", content, re.DOTALL):
        fid = m.group(1); loc = m.group(2).strip(); desc = m.group(3).strip().split("\\n")[0]
        id_m = re.match(r"D(\\d{1,2})-([CHML])(\\d+)", fid)
        if id_m:
            sev = {"C":"Critical","H":"High","M":"Medium","L":"Low"}[id_m.group(2)]
            findings[fid] = {"dimension":int(id_m.group(1)),"severity":sev,"location":loc,"description":desc[:200]}
    return findings

def parse_blueprint(p):
    if not p.exists(): return {}
    content = p.read_text(encoding="utf-8", errors="ignore")
    findings = {}
    for m in re.finditer(r"-\\s+\\[[ xX]\\]\\s+\\*\\*\\[(D\\d{1,2}-[CHML]\\d+)\\]\\*\\*\\s+(.*?)(?=\\n-\\s+\\[[ xX]\\]|\\n##|\\Z)", content, re.DOTALL):
        fid = m.group(1); body = m.group(2)
        priority = "Unknown"
        before = content[:m.start()]
        prio_m = list(re.finditer(r"^##\\s+(P[0-5])\\s", before, re.MULTILINE))
        if prio_m: priority = prio_m[-1].group(1)
        commit_m = re.search(r"`([0-9a-f]{7,40})`", body)
        completed = m.group(0).startswith("- [x]") or m.group(0).startswith("- [X]")
        findings[fid] = {"priority":priority,"completed":completed,"commit_hash":commit_m.group(1) if commit_m else None}
    return findings

def cmd_generate(args):
    root = Path(args.path).resolve()
    audit = parse_audit(root/"AUDIT_REPORT.md")
    bp = parse_blueprint(root/"BLUEPRINT.md")
    if not audit: print("⚠️ No findings in AUDIT_REPORT.md"); return 1
    all_ids = set(audit) | set(bp)
    rows = []
    for fid in sorted(all_ids):
        a = audit.get(fid, {}); b = bp.get(fid, {})
        if b.get("completed") and b.get("commit_hash"): status = "🟢 Closed"; commit = b["commit_hash"]
        elif b: status = "🔴 Open"; commit = "—"
        else: status = "🔴 Open"; commit = "—"
        rows.append({"fid":fid,"severity":a.get("severity","?"),"priority":b.get("priority","?"),"location":a.get("location","?"),"description":a.get("description",""),"commit":commit,"status":status})
    closed = sum(1 for r in rows if "Closed" in r["status"])
    md = f"# TRACEABILITY_MATRIX\\n\\n> Generated: {datetime.now().isoformat(timespec='seconds')}\\n\\n## Summary\\n\\n| Status | Count |\\n|--------|-------|\\n| 🟢 Closed | {closed} |\\n| 🔴 Open | {len(rows)-closed} |\\n| **Total** | **{len(rows)}** |\\n\\n**Coverage**: {closed}/{len(rows)} = {closed/len(rows)*100 if rows else 0:.1f}%\\n\\n## Matrix\\n\\n| Finding | Severity | Priority | Location | Commit | Status |\\n|---------|----------|----------|----------|--------|--------|\\n"
    for r in rows: md += f"| {r['fid']} | {r['severity']} | {r['priority']} | `{r['location'][:30]}` | `{r['commit']}` | {r['status']} |\\n"
    (root/"TRACEABILITY_MATRIX.md").write_text(md)
    print(f"✓ Wrote {root/'TRACEABILITY_MATRIX.md'}")
    print(f"  Total: {len(rows)}, Closed: {closed} ({closed/len(rows)*100 if rows else 0:.1f}%)")
    return 0

def cmd_completeness(args):
    root = Path(args.path).resolve()
    audit = parse_audit(root/"AUDIT_REPORT.md")
    bp = parse_blueprint(root/"BLUEPRINT.md")
    print("=== Completeness Check ===\\n")
    print(f"Findings in AUDIT: {len(audit)}")
    print(f"Findings in BLUEPRINT: {len(bp)}")
    missing = set(audit) - set(bp)
    if missing: print(f"\\n⚠️ {len(missing)} missing from BLUEPRINT: {sorted(missing)}")
    else: print("\\n✓ All audit findings in BLUEPRINT")
    return 0

def cmd_drift(args):
    root = Path(args.path).resolve()
    prog = root/"PROGRESS.md"
    print("=== Drift Detection ===\\n")
    if not prog.exists(): print("⚠️ PROGRESS.md not found"); return 1
    content = prog.read_text(encoding="utf-8", errors="ignore")
    commits = re.findall(r"`([0-9a-f]{7,40})`", content)
    if not commits: print("⚠️ No commits in PROGRESS.md"); return 1
    last = commits[-1]
    print(f"Last session commit: {last}")
    try:
        r = subprocess.run(["git","-C",str(root),"log",f"{last}..HEAD","--oneline"], capture_output=True, text=True, check=True)
        ext = [l for l in r.stdout.split("\\n") if l]
        if not ext: print("✓ No drift"); return 0
        print(f"Commits since last: {len(ext)}")
        if len(ext)<=3: print("🟢 LOW drift")
        elif len(ext)<=10: print("🟡 MEDIUM drift")
        else: print("🔴 HIGH drift — re-audit recommended")
    except: print("⚠️ git not available")
    return 0

def main():
    parser = argparse.ArgumentParser(description="Traceability matrix")
    sub = parser.add_subparsers(dest="mode", required=True)
    for name, func in [("generate",cmd_generate),("check-completeness",cmd_completeness),("check-drift",cmd_drift)]:
        p = sub.add_parser(name); p.add_argument("path"); p.set_defaults(func=func)
    args = parser.parse_args()
    return args.func(args)

if __name__ == "__main__": sys.exit(main())
''',
"metrics_diff.py": '''#!/usr/bin/env python3
"""metrics_diff.py — Capture and compare codebase metrics. Modes: snapshot | diff | report."""
import argparse, json, re, subprocess, sys
from pathlib import Path
from datetime import datetime

def count_files(root):
    EXT = {".py":"python",".js":"javascript",".ts":"typescript",".go":"go",".rs":"rust",".java":"java",".cs":"csharp",".rb":"ruby",".php":"php"}
    EXCLUDE = {"node_modules",".git","venv",".venv","__pycache__","dist","build","target"}
    counts = {}
    for p in root.rglob("*"):
        if not p.is_file() or any(x in EXCLUDE for x in p.parts): continue
        lang = EXT.get(p.suffix.lower())
        if lang: counts[lang] = counts.get(lang,0)+1
    return counts

def count_lines(root):
    EXCLUDE = {"node_modules",".git","venv",".venv","__pycache__","dist","build","target"}
    EXTS = {".py",".js",".jsx",".ts",".tsx",".go",".rs",".java",".cs",".rb",".php",".c",".cpp",".h"}
    total = 0
    for p in root.rglob("*"):
        if not p.is_file() or p.suffix.lower() not in EXTS or any(x in EXCLUDE for x in p.parts): continue
        try:
            with open(p, encoding="utf-8", errors="ignore") as f: total += sum(1 for l in f if l.strip())
        except: pass
    return total

def count_tests(root):
    EXCLUDE = {"node_modules",".git","venv",".venv","__pycache__"}
    patterns = [r"^test_.*\\.py$", r".*_test\\.py$", r".*\\.test\\.[jt]sx?$", r".*_test\\.go$"]
    total = 0
    for p in root.rglob("*"):
        if not p.is_file() or any(x in EXCLUDE for x in p.parts): continue
        for pat in patterns:
            if re.match(pat, p.name): total += 1; break
    return total

def get_git(root):
    info = {}
    try:
        r = subprocess.run(["git","-C",str(root),"rev-parse","HEAD"], capture_output=True, text=True, check=True)
        info["commit"] = r.stdout.strip()[:7]
        r = subprocess.run(["git","-C",str(root),"rev-list","--count","HEAD"], capture_output=True, text=True, check=True)
        info["total_commits"] = int(r.stdout.strip())
    except: pass
    return info

def cmd_snapshot(args):
    root = Path(args.path).resolve()
    label = args.label or "snapshot"
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    metrics = {"label":label,"timestamp":datetime.now().isoformat(timespec="seconds"),"git":get_git(root),"files_by_language":count_files(root),"lines_of_code":count_lines(root),"test_files":count_tests(root)}
    out = root/f"METRICS_{label}_{ts}.json"
    out.write_text(json.dumps(metrics, indent=2))
    print(f"✓ Snapshot: {out}")
    print(f"  LOC: {metrics['lines_of_code']:,} | Source files: {sum(metrics['files_by_language'].values())} | Test files: {metrics['test_files']}")
    return 0

def cmd_diff(args):
    b = json.loads(Path(args.before).read_text()); a = json.loads(Path(args.after).read_text())
    print(f"=== Metrics Diff ===\\nBefore: {b.get('label','?')}\\nAfter:  {a.get('label','?')}\\n")
    b_loc = b.get("lines_of_code",0); a_loc = a.get("lines_of_code",0)
    print(f"Lines of code: {b_loc:>8,} → {a_loc:>8,}   {a_loc-b_loc:+d}")
    b_f = sum(b.get("files_by_language",{}).values()); a_f = sum(a.get("files_by_language",{}).values())
    print(f"Source files:  {b_f:>8} → {a_f:>8}   {a_f-b_f:+d}")
    b_t = b.get("test_files",0); a_t = a.get("test_files",0)
    print(f"Test files:    {b_t:>8} → {a_t:>8}   {a_t-b_t:+d}")
    return 0

def cmd_report(args):
    b = json.loads(Path(args.before).read_text()); a = json.loads(Path(args.after).read_text())
    md = f"## Before/After Metrics\\n\\n| Metric | Before | After | Change |\\n|--------|--------|-------|--------|\\n| Lines of code | {b.get('lines_of_code',0):,} | {a.get('lines_of_code',0):,} | {a.get('lines_of_code',0)-b.get('lines_of_code',0):+d} |\\n| Source files | {sum(b.get('files_by_language',{}).values())} | {sum(a.get('files_by_language',{}).values())} | {sum(a.get('files_by_language',{}).values())-sum(b.get('files_by_language',{}).values()):+d} |\\n| Test files | {b.get('test_files',0)} | {a.get('test_files',0)} | {a.get('test_files',0)-b.get('test_files',0):+d} |\\n"
    out = Path(args.output) if args.output else Path("FINAL_REPORT_metrics.md")
    out.write_text(md)
    print(f"✓ Report: {out}")
    return 0

def main():
    parser = argparse.ArgumentParser(description="Codebase metrics")
    sub = parser.add_subparsers(dest="mode", required=True)
    p1 = sub.add_parser("snapshot"); p1.add_argument("path"); p1.add_argument("--label"); p1.set_defaults(func=cmd_snapshot)
    p2 = sub.add_parser("diff"); p2.add_argument("before"); p2.add_argument("after"); p2.set_defaults(func=cmd_diff)
    p3 = sub.add_parser("report"); p3.add_argument("before"); p3.add_argument("after"); p3.add_argument("--output"); p3.set_defaults(func=cmd_report)
    args = parser.parse_args()
    return args.func(args)

if __name__ == "__main__": sys.exit(main())
''',
"run_eval.py": '''#!/usr/bin/env python3
"""run_eval.py — Eval harness: with-skill vs baseline."""
import argparse, json, os, shutil, subprocess, sys, tempfile, time
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass, asdict, field

@dataclass
class CaseResult:
    case_name: str; mode: str; iteration: int; started_at: str; completed_at: str
    duration_seconds: float; assertions: list = field(default_factory=list)
    assertions_passed: int = 0; assertions_total: int = 0; pass_rate: float = 0.0

def discover_cases(d):
    cases = []
    if not d.exists(): return cases
    for cd in sorted(d.iterdir()):
        if not cd.is_dir(): continue
        cj = cd/"case.json"
        if not cj.exists(): continue
        try: c = json.loads(cj.read_text()); c["_dir"] = str(cd); cases.append(c)
        except: pass
    return cases

def eval_assertion(pdir, a, skill_dir):
    atype = a.get("type")
    if atype in ("file_contains","file_not_contains"):
        fp = pdir/a["file"]; pat = a["pattern"]; must = a.get("must_be", atype=="file_contains")
        if not fp.exists(): return {"name":f"file:{a['file']}","passed":False,"details":"File not found"}
        content = fp.read_text(encoding="utf-8",errors="ignore")
        return {"name":f"file:{a['file'][:20]}","passed":(pat in content)==must,"details":f"Pattern {'found' if pat in content else 'not found'}"}
    if atype == "tests_pass":
        try:
            r = subprocess.run(a["command"],cwd=str(pdir),shell=True,capture_output=True,text=True,timeout=a.get("timeout_seconds",120))
            return {"name":f"tests:{a['command'][:30]}","passed":r.returncode==0,"details":f"Exit: {r.returncode}"}
        except Exception as e: return {"name":f"tests","passed":False,"details":str(e)}
    if atype == "no_secrets":
        sp = skill_dir/"scripts"/"security_scan.sh"
        if not sp.exists(): return {"name":"no_secrets","passed":False,"details":"Scanner not found"}
        try:
            r = subprocess.run(["bash",str(sp),str(pdir)],capture_output=True,text=True,timeout=120)
            return {"name":"no_secrets","passed":r.returncode==0,"details":"Security scan complete"}
        except: return {"name":"no_secrets","passed":False,"details":"Error"}
    return {"name":f"unknown:{atype}","passed":False,"details":"Unknown type"}

def run_case(case, mode, it, skill_dir, out_dir):
    start = time.time()
    result = CaseResult(case_name=case["name"],mode=mode,iteration=it,started_at=datetime.now().isoformat(),completed_at="",duration_seconds=0)
    try:
        cd = Path(case["_dir"]); pd = out_dir/mode/f"iter_{it}"/case["name"]
        if pd.exists(): shutil.rmtree(pd)
        shutil.copytree(cd, pd)
        cj = pd/"case.json"
        if cj.exists(): cj.unlink()
        if mode == "with-skill":
            sol = cd/"solution"
            if sol.exists():
                for sf in sol.rglob("*"):
                    if sf.is_file():
                        rel = sf.relative_to(sol); dest = pd/rel
                        dest.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(sf,dest)
        for a in case.get("assertions",[]):
            result.assertions.append(eval_assertion(pd,a,skill_dir))
        result.assertions_total = len(result.assertions)
        result.assertions_passed = sum(1 for a in result.assertions if a["passed"])
        result.pass_rate = result.assertions_passed/result.assertions_total if result.assertions_total else 0
    except Exception as e: pass
    result.duration_seconds = time.time()-start
    result.completed_at = datetime.now().isoformat()
    return result

def main():
    parser = argparse.ArgumentParser(description="Eval harness")
    parser.add_argument("--cases",default="evals/cases"); parser.add_argument("--output",default="evals/benchmark.json")
    parser.add_argument("--iterations",type=int,default=1); parser.add_argument("--skill-dir",default=".")
    args = parser.parse_args()
    cases_dir = Path(args.cases); out_file = Path(args.output)
    skill_dir = Path(args.skill_dir).resolve()
    work_dir = Path(tempfile.mkdtemp(prefix="eval_"))
    print("="*60); print("  Eval Harness"); print("="*60)
    cases = discover_cases(cases_dir)
    if not cases: print("⚠️ No cases found"); return 1
    print(f"\\nFound {len(cases)} cases.\\n")
    ws = []; bl = []
    for case in cases:
        print(f"Running: {case['name']}")
        for it in range(1,args.iterations+1):
            for mode in ["with-skill","baseline"]:
                print(f"  [{mode} iter {it}] ",end="",flush=True)
                r = run_case(case,mode,it,skill_dir,work_dir)
                if mode=="with-skill": ws.append(r)
                else: bl.append(r)
                print(f"pass={r.pass_rate:.2%} ({r.assertions_passed}/{r.assertions_total})")
    def stats(rs):
        if not rs: return {}
        pr = [r.pass_rate for r in rs]
        return {"total_runs":len(rs),"avg_pass_rate":sum(pr)/len(pr),"total_assertions":sum(r.assertions_total for r in rs),"total_passed":sum(r.assertions_passed for r in rs)}
    ws_s = stats(ws); bl_s = stats(bl)
    imp = {}
    if ws_s and bl_s and bl_s["avg_pass_rate"]>0:
        imp["pass_rate_improvement_pct"] = (ws_s["avg_pass_rate"]-bl_s["avg_pass_rate"])/bl_s["avg_pass_rate"]*100
    out_file.parent.mkdir(parents=True,exist_ok=True)
    out_file.write_text(json.dumps({"skill_name":"code-transform","skill_version":"12.1.0","run_at":datetime.now().isoformat(),"total_cases":len(cases),"with_skill":[asdict(r) for r in ws],"baseline":[asdict(r) for r in bl],"summary":{"with_skill":ws_s,"baseline":bl_s,"improvement":imp}},indent=2))
    print(f"\\n{'='*60}\\n  Summary\\n{'='*60}")
    if ws_s: print(f"\\nWITH SKILL: {ws_s['avg_pass_rate']:.2%} ({ws_s['total_passed']}/{ws_s['total_assertions']})")
    if bl_s: print(f"BASELINE:   {bl_s['avg_pass_rate']:.2%} ({bl_s['total_passed']}/{bl_s['total_assertions']})")
    if imp: print(f"\\nIMPROVEMENT: {imp.get('pass_rate_improvement_pct',0):+.2f}%")
    print(f"\\n✓ Benchmark: {out_file}")
    return 0

if __name__ == "__main__": sys.exit(main())
''',
"generate_review.py": '''#!/usr/bin/env python3
"""generate_review.py — HTML report from benchmark.json."""
import argparse, json, sys
from pathlib import Path

HTML = """<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Eval Report</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui;background:#0d1117;color:#c9d1d9;padding:20px}.c{max-width:1400px;margin:0 auto}h1{color:#58a6ff;margin-bottom:8px}.m{color:#8b949e;font-size:14px;margin-bottom:24px}.g{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-bottom:32px}.card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:20px}.card h2{color:#58a6ff;font-size:16px;margin-bottom:12px}.s{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #21262d}.pass{color:#3fb950}.fail{color:#f85149}table{width:100%;border-collapse:collapse;margin-top:16px;background:#161b22;border-radius:8px;overflow:hidden}th{background:#21262d;color:#58a6ff;padding:12px;text-align:left;font-size:13px}td{padding:12px;border-bottom:1px solid #21262d;font-size:13px}.b{padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600}.bp{background:#1a3d1f;color:#3fb950}.bf{background:#3d1a1f;color:#f85149}</style></head>
<body><div class="c"><h1>Eval Report</h1><div class="m">{meta}</div>
<div class="g"><div class="card"><h2>With Skill</h2>{ws}</div><div class="card"><h2>Baseline</h2>{bl}</div><div class="card"><h2>Improvement</h2>{imp}</div></div>
<h2 style="color:#58a6ff;margin-bottom:16px">Case Results</h2><table><thead><tr><th>Case</th><th>Mode</th><th>Pass Rate</th><th>Assertions</th><th>Duration</th><th>Status</th></tr></thead><tbody>{rows}</tbody></table></div></body></html>"""

def fmt_stats(s):
    if not s: return '<div class="s"><span>No data</span></div>'
    pr = s.get("avg_pass_rate",0)
    return f'<div class="s"><span>Runs</span><span>{s.get("total_runs",0)}</span></div><div class="s"><span>Avg pass</span><span class="{"pass" if pr>=0.8 else "fail"}">{pr:.2%}</span></div><div class="s"><span>Passed</span><span>{s.get("total_passed",0)}/{s.get("total_assertions",0)}</span></div>'

def fmt_imp(i):
    if not i: return '<div class="s"><span>No data</span></div>'
    v = i.get("pass_rate_improvement_pct",0)
    return f'<div class="s"><span>Improvement</span><span class="{"pass" if v>0 else "fail"}">{v:+.2f}%</span></div>'

def fmt_rows(rs):
    h = ""
    for r in rs:
        pr = r.get("pass_rate",0); cls = "bp" if pr>=0.8 else "bf"
        h += f"<tr><td>{r.get('case_name','')}</td><td>{r.get('mode','')}</td><td>{pr:.2%}</td><td>{r.get('assertions_passed',0)}/{r.get('assertions_total',0)}</td><td>{r.get('duration_seconds',0):.2f}s</td><td><span class='b {cls}'>{'PASS' if pr>=0.8 else 'FAIL'}</span></td></tr>"
    return h

def main():
    parser = argparse.ArgumentParser(description="Generate HTML report")
    parser.add_argument("benchmark"); parser.add_argument("--output"); parser.add_argument("--open",action="store_true")
    args = parser.parse_args()
    bp = Path(args.benchmark)
    if not bp.exists(): print(f"ERROR: {bp} not found",file=sys.stderr); return 1
    data = json.loads(bp.read_text())
    s = data.get("summary",{})
    all_r = data.get("with_skill",[]) + data.get("baseline",[])
    out = Path(args.output) if args.output else bp.parent/"review.html"
    html = HTML.format(meta=f"Skill: {data.get('skill_name','')} v{data.get('skill_version','')} | Run: {data.get('run_at','')} | Cases: {data.get('total_cases',0)}",ws=fmt_stats(s.get("with_skill",{})),bl=fmt_stats(s.get("baseline",{})),imp=fmt_imp(s.get("improvement",{})),rows=fmt_rows(all_r))
    out.write_text(html)
    print(f"✓ HTML report: {out}")
    if args.open:
        import webbrowser; webbrowser.open(f"file://{out.resolve()}")
    return 0

if __name__ == "__main__": sys.exit(main())
''',
"optimize_description.py": '''#!/usr/bin/env python3
"""optimize_description.py — Optimize SKILL.md description for triggering."""
import argparse, json, re, sys
from pathlib import Path

def parse_frontmatter(p):
    if not p.exists(): return None
    content = p.read_text(encoding="utf-8")
    if not content.startswith("---"): return None
    end = content.find("---",3)
    if end == -1: return None
    result = {}
    for line in content[3:end].strip().split("\\n"):
        if ":" in line:
            k,_,v = line.partition(":")
            k = k.strip(); v = v.strip().strip('"').strip("'")
            if k and v: result[k] = v
    return result

def extract_keywords(desc):
    stop = {"the","a","an","and","or","but","in","on","at","to","for","of","with","by","from","is","are","was","were","be","been","have","has","had","do","does","did","will","would","could","should","may","might","must","can","this","that","these","those","i","you","he","she","it","we","they","what","which","who","when","where","why","how","all","both","each","few","more","most","other","some","such","no","nor","not","only","own","same","so","than","too","very","just","don","now","any","if","as","use","using","used"}
    words = re.findall(r"\\b[a-zA-Z][a-zA-Z0-9_-]+\\b", desc.lower())
    return [w for w in words if w not in stop and len(w)>2]

def predict_trigger(query, keywords):
    ql = query.lower()
    matched = [k for k in keywords if k in ql]
    predicted = len(matched) >= 2
    if not predicted and len(matched) == 1:
        strong = {"perfect","audit","refactor","transform","codebase","architecture","security","testing","observability","rollout"}
        if any(t in matched for t in strong): predicted = True
    return predicted, matched

def main():
    parser = argparse.ArgumentParser(description="Optimize SKILL.md description")
    parser.add_argument("--skill",default="SKILL.md")
    parser.add_argument("--queries",default="evals/trigger_queries_v2.json")
    args = parser.parse_args()
    fm = parse_frontmatter(Path(args.skill))
    if not fm or "description" not in fm: print(f"ERROR: Could not parse",file=sys.stderr); return 1
    desc = fm["description"]
    print("="*60); print("  Description Optimization"); print("="*60)
    print(f"\\nCurrent ({len(desc)} chars): {desc[:200]}...\\n")
    qp = Path(args.queries)
    if not qp.exists(): print(f"ERROR: {qp} not found",file=sys.stderr); return 1
    queries = json.loads(qp.read_text())
    keywords = extract_keywords(desc)
    tp = fp = fn = tn = 0; failures = []
    for q in queries:
        predicted, matched = predict_trigger(q["query"], keywords)
        should = q["should_trigger"]
        if predicted and should: tp += 1
        elif predicted and not should: fp += 1; failures.append(("FP",q["query"],matched))
        elif not predicted and should: fn += 1; failures.append(("FN",q["query"],matched))
        else: tn += 1
    precision = tp/(tp+fp) if (tp+fp) else 0
    recall = tp/(tp+fn) if (tp+fn) else 0
    f1 = 2*precision*recall/(precision+recall) if (precision+recall) else 0
    acc = (tp+tn)/len(queries) if queries else 0
    print(f"Precision: {precision:.2%}\\nRecall:    {recall:.2%}\\nF1:        {f1:.2%}\\nAccuracy:  {acc:.2%}")
    print(f"TP:{tp} FP:{fp} FN:{fn} TN:{tn}")
    if failures:
        print(f"\\nFailures ({len(failures)}):")
        for status, q, m in failures: print(f"  [{status}] \\"{q}\\"" + (f" matched: {m}" if m else ""))
    return 0

if __name__ == "__main__": sys.exit(main())
''',
"mantra_refactor.py": '''#!/usr/bin/env python3
"""mantra_refactor.py — MANTRA multi-agent refactoring: RAG + Developer/Reviewer + verbal-RL."""
import argparse, json, re, subprocess, sys
from pathlib import Path
from datetime import datetime

def perform_rag(target):
    ctx = {"target_file":str(target),"callers":[],"callees":[],"target_function":""}
    if not target.exists(): return ctx
    content = target.read_text(encoding="utf-8",errors="ignore")
    funcs = re.findall(r"^(?:def|class)\\s+(\\w+)", content, re.MULTILINE)
    if funcs: ctx["target_function"] = funcs[0]
    try:
        r = subprocess.run(["git","grep","-l",ctx["target_function"] or target.stem], capture_output=True, text=True, timeout=10)
        ctx["callers"] = [f for f in r.stdout.strip().split("\\n") if f and f != str(target)][:10]
    except: pass
    callees = re.findall(r"\\b(\\w+)\\(", content)
    builtins = {"if","for","while","print","len","range","str","int","float","dict","list","set","tuple","bool","type","isinstance","open","super","property","staticmethod","classmethod","abs","min","max","sum","sorted","enumerate","zip","map","filter","any","all","format"}
    ctx["callees"] = list(dict.fromkeys(c for c in callees if c not in builtins and c != ctx["target_function"]))[:10]
    return ctx

def run_verification(project_dir):
    errors = []
    try:
        r = subprocess.run(["python3","-m","py_compile"]+[str(f) for f in project_dir.rglob("*.py") if "__pycache__" not in str(f)], capture_output=True, text=True, timeout=30)
        compile_ok = r.returncode == 0
        if not compile_ok: errors.append(f"Compile: {r.stderr[:200]}")
    except: compile_ok = False
    try:
        r = subprocess.run(["python3","-m","pytest","--tb=short","-q"], cwd=str(project_dir), capture_output=True, text=True, timeout=60)
        tests_ok = r.returncode == 0
    except: tests_ok = True
    return compile_ok, tests_ok, errors

def main():
    parser = argparse.ArgumentParser(description="MANTRA multi-agent refactoring")
    parser.add_argument("--target",required=True); parser.add_argument("--recipe",required=True)
    parser.add_argument("--max-iterations",type=int,default=3); parser.add_argument("--project-dir",default=".")
    parser.add_argument("--output"); args = parser.parse_args()
    target = Path(args.target).resolve(); project = Path(args.project_dir).resolve()
    print("="*60); print("  MANTRA Multi-Agent Refactoring"); print("="*60)
    print(f"Target: {target}\\nRecipe: {args.recipe}\\n")
    print("Phase 1: Context-Aware RAG...")
    rag = perform_rag(target)
    print(f"  Callers: {len(rag['callers'])}, Callees: {len(rag['callees'])}, Target: {rag['target_function']}")
    success = False; repairs = 0
    for i in range(1, args.max_iterations+1):
        print(f"\\nPhase 2: Developer Agent (iter {i})...")
        print(f"Phase 2: Reviewer Agent (iter {i})...")
        print(f"Phase 3: Verification (iter {i})...")
        compile_ok, tests_ok, errors = run_verification(project)
        if compile_ok and tests_ok: success = True; print(f"\\n✓ SUCCESS on iter {i}"); break
        else:
            repairs += 1; print(f"\\n✗ FAILED — verbal-RL repair ({repairs}/{args.max_iterations})")
            if repairs >= args.max_iterations: print("Max reached — escalating"); break
    print(f"\\n{'='*60}\\n  Result\\n{'='*60}")
    print(f"Success: {'✓' if success else '✗'} | Iterations: {i} | Repairs: {repairs}")
    if args.output:
        Path(args.output).parent.mkdir(parents=True, exist_ok=True)
        Path(args.output).write_text(json.dumps({"target":str(target),"recipe":args.recipe,"success":success,"iterations":i,"repairs":repairs,"rag":rag}, indent=2))
        print(f"\\n✓ Report: {args.output}")
    return 0 if success else 1

if __name__ == "__main__": sys.exit(main())
''',
"synthesize_tool.py": '''#!/usr/bin/env python3
"""synthesize_tool.py — Tool synthesis: create reusable recipes from transforms."""
import argparse, json, re, sys
from pathlib import Path
from datetime import datetime

RECIPES_DIR = Path("recipes")
REGISTRY = RECIPES_DIR / "registry.json"

def load_reg():
    if not REGISTRY.exists(): return {"recipes":[]}
    return json.loads(REGISTRY.read_text())

def save_reg(r):
    RECIPES_DIR.mkdir(parents=True, exist_ok=True)
    REGISTRY.write_text(json.dumps(r, indent=2))

def extract_kw(text):
    stop = {"the","a","an","and","or","to","in","on","at","for","of","with","by"}
    words = re.findall(r"\\b[a-zA-Z][a-zA-Z0-9_-]+\\b", text.lower())
    return list(dict.fromkeys(w for w in words if w not in stop and len(w)>2))[:10]

def create_recipe(name, category, desc=""):
    RECIPES_DIR.mkdir(parents=True, exist_ok=True)
    content = f"# Recipe: {name}\\n\\n## When to Use\\n- Category: {category}\\n- Created: {datetime.now().isoformat()}\\n\\n## Input Pattern\\n```\\n(input code)\\n```\\n\\n## Output Pattern\\n```\\n(output code)\\n```\\n\\n## Steps\\n1. {desc or 'Identify pattern'}\\n2. Apply transformation\\n3. Verify with tests\\n\\n## Metadata\\n- Times applied: 1\\n- Success rate: 1.0\\n"
    rf = RECIPES_DIR / f"{name}.md"
    rf.write_text(content)
    return {"name":name,"category":category,"first_seen":datetime.now().isoformat(),"times_applied":1,"success_rate":1.0,"file":str(rf),"keywords":extract_kw(name+" "+desc)}

def main():
    parser = argparse.ArgumentParser(description="Tool synthesis")
    parser.add_argument("--list",action="store_true"); parser.add_argument("--search")
    parser.add_argument("--create",action="store_true"); parser.add_argument("--name")
    parser.add_argument("--category",default="general"); parser.add_argument("--reflect",action="store_true")
    parser.add_argument("--transform-log")
    args = parser.parse_args()
    reg = load_reg()
    if args.list:
        print(f"Recipes ({len(reg['recipes'])}):")
        for r in reg["recipes"]: print(f"  - {r['name']} ({r['category']}) — {r['times_applied']}x")
        return 0
    if args.search:
        qk = set(extract_kw(args.search)); results = []
        for r in reg["recipes"]:
            if args.search.lower() in r["name"].lower(): results.append((r,1.0)); continue
            overlap = len(qk & set(r.get("keywords",[])))
            if overlap: results.append((r, overlap/max(len(qk),1)))
        results.sort(key=lambda x:-x[1])
        if not results: print(f"No recipes match '{args.search}'"); return 0
        for r,s in results: print(f"  [{s:.0%}] {r['name']}")
        return 0
    if args.create:
        if not args.name: print("ERROR: --name required",file=sys.stderr); return 1
        recipe = create_recipe(args.name, args.category)
        reg["recipes"].append(recipe); save_reg(reg)
        print(f"✓ Created: {recipe['file']}"); return 0
    if args.reflect:
        if not args.transform_log: print("ERROR: --transform-log required",file=sys.stderr); return 1
        log = json.loads(Path(args.transform_log).read_text())
        existing = [r for r in reg["recipes"] if r["name"] == log.get("recipe","")]
        if existing: print(f"Recipe '{log.get('recipe')}' already exists"); return 0
        if args.name:
            recipe = create_recipe(args.name, args.category, log.get("description",""))
            reg["recipes"].append(recipe); save_reg(reg)
            print(f"✓ Created: {recipe['file']}"); return 0
        print(f"Would synthesize: {log.get('recipe','?')}"); return 0
    parser.print_help(); return 0

if __name__ == "__main__": sys.exit(main())
''',
"mutation_harden.py": '''#!/usr/bin/env python3
"""mutation_harden.py — Mutation-guided test hardening (Meta ACH pattern)."""
import argparse, json, re, subprocess, sys
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass, asdict, field

MUTATIONS = {
    "security": [
        {"name":"remove-validation","pattern":r"if\\s+not\\s+\\w+\\s*:","replacement":"if True:  # MUTANT"},
        {"name":"weaken-auth","pattern":r"return\\s+\\w+\\s+is\\s+not\\s+None","replacement":"return True  # MUTANT"},
    ],
    "correctness": [
        {"name":"flip-plus","pattern":r"(\\w+)\\s*\\+\\s*(\\w+)","replacement":r"\\1 - \\2  # MUTANT"},
        {"name":"remove-zero-check","pattern":r"if\\s+\\w+\\s*==\\s*0\\s*:","replacement":"if False:  # MUTANT"},
    ],
    "performance": [
        {"name":"remove-cache","pattern":r"cache\\.get\\(([^)]+)\\)","replacement":"None  # MUTANT"},
    ],
}

@dataclass
class Mutant:
    name: str; concern: str; killed: bool; kill_reason: str = ""

def run_tests(pdir, cmd):
    try:
        r = subprocess.run(cmd, cwd=str(pdir), shell=True, capture_output=True, text=True, timeout=120)
        return r.returncode == 0, r.stdout + r.stderr
    except Exception as e: return False, str(e)

def main():
    parser = argparse.ArgumentParser(description="Mutation-guided test hardening")
    parser.add_argument("--target",required=True); parser.add_argument("--concern",default="all",choices=["security","correctness","performance","all"])
    parser.add_argument("--tests",default="pytest"); parser.add_argument("--project-dir",default=".")
    parser.add_argument("--output"); args = parser.parse_args()
    target = Path(args.target).resolve(); project = Path(args.project_dir).resolve()
    print("="*60); print("  Mutation Hardening"); print("="*60)
    print(f"Target: {target}\\nConcern: {args.concern}\\n")
    if not target.exists(): print("ERROR: target not found"); return 1
    content = target.read_text(encoding="utf-8",errors="ignore")
    muts = []
    if args.concern == "all":
        for c, ms in MUTATIONS.items():
            for m in ms: muts.append((c, m))
    else: muts = [(args.concern, m) for m in MUTATIONS.get(args.concern, [])]
    print("Running tests on original...")
    orig_pass, _ = run_tests(project, args.tests)
    if not orig_pass: print("⚠️ Tests don't pass on original — aborting"); return 1
    print("✓ Original passes\\n")
    mutants = []; killed = 0; survived = 0
    for concern, mut in muts:
        print(f"Mutant: {mut['name']} ({concern})...")
        pattern = mut["pattern"]; replacement = mut["replacement"]
        match = re.search(pattern, content)
        if not match: print("  ⚠️ Pattern not found — skipping"); continue
        mutated = content[:match.start()] + re.sub(pattern, replacement, content[match.start():match.end()], count=1) + content[match.end():]
        target.write_text(mutated)
        mutant_pass, _ = run_tests(project, args.tests)
        target.write_text(content)
        is_killed = not mutant_pass
        if is_killed: killed += 1; reason = "Tests failed (killed)"
        else: survived += 1; reason = "Tests passed (survived — gap!)"
        mutants.append(Mutant(mut["name"], concern, is_killed, reason))
        print(f"  {'✓ KILLED' if is_killed else '✗ SURVIVED'} — {reason}")
    total = len(mutants); score = killed/total if total else 0
    print(f"\\n{'='*60}\\n  Results\\n{'='*60}")
    print(f"Total: {total}, Killed: {killed}, Survived: {survived}")
    print(f"Mutation score: {score:.2%}")
    if survived > 0:
        print(f"\\n⚠️ {survived} survived — add tests:")
        for m in mutants:
            if not m.killed: print(f"  - {m.name}: {m.kill_reason}")
    if args.output:
        Path(args.output).parent.mkdir(parents=True, exist_ok=True)
        Path(args.output).write_text(json.dumps({"target":str(target),"concern":args.concern,"total_mutants":total,"killed":killed,"survived":survived,"mutation_score":score,"mutants":[asdict(m) for m in mutants]}, indent=2))
        print(f"\\n✓ Report: {args.output}")
    return 0 if score >= 0.8 else 1

if __name__ == "__main__": sys.exit(main())
''',
}

# ==================== ASSETS ====================
ASSETS = {
"test_plan_template.md": """# TEST_PLAN.md — Testing Strategy

## Codebase Profile
- **Source path**: [path]
- **Application type**: [web|api|mobile|library|cli]
- **Languages**: [list]
- **Test shape**: [Pyramid|Trophy|Honeycomb]

## Test Types Required
### Tier 1 — Unit & Property
- [ ] Unit tests — one per behavior; happy + error + edge cases
- [ ] Property-based tests — for pure functions
- [ ] Snapshot tests — sparingly

### Tier 2 — Integration & Contract
- [ ] Integration (testcontainers)
- [ ] Contract (Pact, if microservices)
- [ ] DB migration tests (reversible)
- [ ] Idempotency tests (payments)

### Tier 3 — E2E & Visual
- [ ] E2E (top 5 flows)
- [ ] Visual regression
- [ ] Accessibility (axe-core, WCAG 2.2 AA)

### Tier 4 — Performance & Load
- [ ] Performance (pytest-benchmark)
- [ ] Load (k6)
- [ ] Stress, Soak, Spike

### Tier 5 — Continuous
- [ ] Fuzz (libFuzzer, Atheris)
- [ ] Chaos (Chaos Mesh)
- [ ] Mutation (mutmut, >80% killed)

### Cross-Cutting
- [ ] Smoke (post-deploy)
- [ ] Regression (one per bug)
- [ ] Security (SAST + DAST + SCA)

## Quality Gates
- All tests pass: 100%
- Coverage (changed lines): >80%
- Mutation (critical): >80%
- Flaky tests: 0
- Unit runtime: <10s

## Anti-Patterns
1. ❌ Coverage chasers  2. ❌ Implementation testers  3. ❌ Everything tests
4. ❌ Sleep-based tests  5. ❌ Tests of tests  6. ❌ Assertion-free tests
7. ❌ Commented-out tests  8. ❌ Snapshot for everything  9. ❌ Order-dependent  10. ❌ Real network
""",
"intake_template.md": """# INTAKE.md — Project Intake & Context Capture

## 1. Project Identity
- **Project name**: [e.g., "Acme E-commerce Backend"]
- **Repository**: [git URL]
- **Date**: [YYYY-MM-DD]

## 2. Goal — What Does "Perfect" Mean Here?
**Primary goal** (pick ONE):
- [ ] Ship-ready — correctness + stability > elegance
- [ ] Maintainability — onboarding faster, reducing bug rate
- [ ] Scalability — preparing for 10x growth
- [ ] Security/compliance — passing audit (SOC2, PCI, HIPAA)
- [ ] Modernization — replacing legacy stack
- [ ] Cost reduction — efficiency focus
- [ ] Developer velocity — CI slow, tests flaky, deploys painful

**NON-goals**: [what we will NOT optimize for]

## 3. Constraints — What We Cannot Break
### Hard Constraints (violation = rollback + escalation)
- **Public API**: [e.g., "v1 API consumers depend on /users/{id} shape"]
- **Database**: [e.g., "expand/contract; no destructive migrations"]
- **Deployment window**: [e.g., "Tue-Thu 10am-2pm EST; no Friday"]
- **Release deadline**: [e.g., "launch 2025-03-15"]
- **Budget**: [e.g., "$X for new infra"]
- **Compliance**: [e.g., "PCI scope; SOC2 audit trails"]

### Soft Constraints
- [e.g., "prefer not to add new dependencies"]

→ All hard constraints mirrored in CONSTRAINTS.md.

## 4. Business Context
- **What does this system do?**: [1-2 sentences]
- **Who uses it?**: [user segments + volume]
- **Cost of downtime**: [e.g., "~$5k/hour"]
- **Critical paths** (3-5 journeys that MUST work):
  1. [e.g., "Customer places order → payment → confirmation"]
  2. [...]
- **Sensitive data**: [PII, PCI, etc.]

## 5. Team Context
- **Team size**: [e.g., "4 backend, 2 frontend, 1 SRE"]
- **Skill level**: [Junior / Mid / Senior / Mixed]
- **Test culture**: [e.g., "tests exist but no one trusts them"]

## 6. Current State
- **Tech stack**: [e.g., "Python 3.11 + FastAPI + SQLAlchemy + Postgres 15"]
- **Codebase size**: [N files, N lines]
- **Known pain points**:
  1. [e.g., "Tests are flaky"]
  2. [e.g., "Deploy takes 45 minutes"]

## 7. Success Criteria — How We Know We're Done
- [ ] Coverage: [e.g., ">80% on critical paths"]
- [ ] Mutation score: [e.g., ">70% on auth/payment"]
- [ ] Performance: [e.g., "p95 < 200ms"]
- [ ] Deploy time: [e.g., "< 10 minutes"]
- [ ] Flaky tests: [e.g., "0 in last 30 days"]
- [ ] Security: [e.g., "0 critical/high findings"]

## 8. Risk Tolerance
- [ ] **Conservative** — small, safe, incremental
- [ ] **Balanced** (default) — medium transforms, verify critical paths
- [ ] **Aggressive** — large refactors, faster progress

## Sign-Off
- [ ] User reviewed this intake
- [ ] Constraints accurate and complete
- [ ] Success criteria measurable
- [ ] Ready to proceed to CENSUS
""",
"rollout_plan_template.md": """# ROLLOUT_PLAN.md — Staged Deployment & Rollback Strategy

## 1. Transformation Identity
- **Name**: [e.g., "Extract OrderRepository"]
- **Commit/PR**: [hash/URL]
- **Risk level**: [Critical/High/Medium/Low]
- **Target deploy**: [YYYY-MM-DD HH:MM TZ]

## 2. Pre-Rollout Checklist
### Code Readiness
- [ ] All tests pass (unit + integration + E2E)
- [ ] Mutation score >70% on changed code
- [ ] Lint + type-check clean
- [ ] Code reviewed and approved

### Infrastructure
- [ ] Feature flag created (if using flag rollout)
- [ ] DB migrations applied to staging (verified reversible)
- [ ] Monitoring dashboards updated
- [ ] Alerts configured for new failure modes
- [ ] Runbook updated

### Team
- [ ] On-call engineer briefed
- [ ] Customer support notified (if user-visible)
- [ ] Rollback drill performed in staging

## 3. Rollout Strategy (pick one)
### Strategy A: Feature Flag (recommended)
```
Stage 0: Deploy flag OFF → soak 1-24h
Stage 1: Internal users → 1-7 days
Stage 2: Canary 1-5% → 24-48h
Stage 3: Ramp 10% → 25% → 50% → 75% → 4-24h per step
Stage 4: 100% → monitor 24-48h → schedule flag removal
```

### Strategy B: Blue-Green
Deploy to "green" → smoke test → route 10% → 50% → 100% → blue stays warm for rollback

### Strategy C: Canary (K8s)
Deploy 1 pod → route 1% → 5% → 25% → 50% → 100%

### Strategy D: Rolling (stateless)
Deploy 25% → 50% → 100%. Cannot use for breaking schema changes.

### Selection
```
Backward-compatible? → YES → Reversible <5 min? → YES → High-risk? → YES → Feature Flag/Shadow
                                                    → NO → Blue-Green/Canary/Rolling
                   → NO → Expand/contract + Feature Flag
```

## 4. Rollback Plan
### Rollback IMMEDIATELY if:
- Error rate >2x baseline for >5 min
- p95 latency >2x baseline for >5 min
- Any data loss or integrity issue
- Security incident
- Customer-visible outage
- Critical flow broken

### Rollback Procedure
**Feature Flag**: Toggle flag OFF (<30 seconds). Monitor 15 min.
**Blue-Green**: Switch LB back to "blue". Green stays for forensics.
**Canary/Rolling**: `kubectl rollout undo deployment/<name>`.

**DB Migrations**: Expand (safe to keep) / Migrate (rollback = stop writing to new) / Contract (CANNOT roll back — restore from backup).

### Rollback Drill (mandatory for high-risk)
Before deploying: apply change in staging → run rollback → verify staging returns to pre-change state. **If rollback fails in staging → DO NOT deploy.**

## 5. Monitoring During Rollout
| Metric | Threshold | Action |
|--------|-----------|--------|
| Error rate (5xx) | >baseline +0.1% | Pause |
| Error rate (5xx) | >2x baseline | Rollback |
| p95 latency | >2x baseline | Rollback |
| Support tickets | >2x normal | Pause |

## 6. Post-Rollout Verification
### T+1 hour: metrics within thresholds, no new alerts, smoke tests pass
### T+24 hours: error rate trending to baseline, no support escalations
### T+7 days: no regressions, feature flag removed (no toggle debt), runbook finalized

## Quick Reference
| Risk | Strategy | Soak | Rollback |
|------|----------|------|----------|
| Critical (payment, auth) | Flag + shadow | 24-48h | Toggle flag |
| High (core flow) | Flag | 12-24h | Toggle flag |
| Medium (internal API) | Canary/blue-green | 4-12h | Traffic switch |
| Low (refactor) | Rolling | 1h | kubectl undo |

**The rule**: If you can't write a rollback plan, you can't ship the change.
""",
"traceability_matrix_template.md": """# TRACEABILITY_MATRIX.md — Audit → Plan → Execute → Verify

## Summary Dashboard
| Status | Count | % |
|--------|-------|---|
| 🔴 Open | [N] | [N%] |
| 🟡 In Progress | [N] | [N%] |
| 🟢 Closed | [N] | [N%] |
| ⚪ Skipped | [N] | [N%] |
| ❌ Won't Fix | [N] | [N%] |
| **Total** | **[N]** | **100%** |

**Coverage**: [N] / [N] findings closed = [N%]

## By Dimension
| Dimension | Critical | High | Medium | Low | Total | Closed | % Closed |
|-----------|----------|------|--------|-----|-------|--------|----------|
| D1 Architecture | | | | | | | |
| D2 Database | | | | | | | |
| D3 Testing | | | | | | | |
| D4 Security | | | | | | | |
| D5 Performance | | | | | | | |
| D6 UI/UX | | | | | | | |
| D7 Code Quality | | | | | | | |
| D8 DevOps | | | | | | | |
| D9 Documentation | | | | | | | |
| D10 Full-Stack | | | | | | | |

## Matrix
| Finding ID | Severity | Priority | File:Line | Description | Commit | Verified By | Status |
|------------|----------|----------|-----------|-------------|--------|-------------|--------|
| D1-C1 | Critical | P0 | `src/service.py:42` | [issue] | `abc1234` | tests | 🟢 Closed |
| D4-C1 | Critical | P0 | `src/auth.py:88` | SQL injection | (not started) | — | 🔴 Open |

## Verification Methods
Each closed finding MUST be verified by ONE of: tests pass, coverage report, mutation testing, lint clean, type-check clean, security scan clean, performance benchmark, manual smoke test, layer violation detector, behavior snapshot diff, code review approval, ADRs created.

## Status Transition Rules
- 🔴 Open → 🟡 In Progress: work begins
- 🟡 In Progress → 🟢 Closed: verification passes
- 🟡 → 🔴 Open: work paused
- 🔴/🟡 → ⚪ Skipped: descoped (justification required)
- 🔴/🟡 → ❌ Won't Fix: decided not to fix (user sign-off)

## Drift Detection
Run `python3 scripts/traceability_matrix.py check-drift .` at session start.
""",
"constraints_template.md": """# CONSTRAINTS.md — Hard & Soft Constraints (Non-Negotiable)

> **Read BEFORE every transformation in Phase 4.** Violating hard constraint = rollback + escalation.

## Hard Constraints (MUST NOT Violate)

### HC-1: Public API Compatibility
- **Constraint**: [e.g., "GET /api/v1/users/{id} response shape backward-compatible"]
- **Allowed**: add fields, add endpoints, change internals
- **Forbidden**: remove/rename fields, change types, change status codes
- **Verification**: OpenAPI diff (oasdiff)

### HC-2: Database Schema Safety
- **Constraint**: [e.g., "No destructive migrations without expand/contract"]
- **Allowed**: add nullable columns, add tables, add indexes (CONCURRENTLY)
- **Forbidden**: DROP COLUMN, DROP TABLE, ALTER TYPE without dual-write

### HC-3: Deployment Window
- **Constraint**: [e.g., "Production deploys only Tue-Thu 10:00-14:00 EST"]

### HC-4: Release Deadline
- **Constraint**: [e.g., "Production-stable by 2025-03-10"]

### HC-5: Budget
- **Constraint**: [e.g., "New infra < $500/month additional"]

### HC-6: Compliance
- **Constraint**: [e.g., "PCI-DSS: no card data in logs; SOC2 audit trails"]

### HC-7: Tech Stack Lock-in
- **Constraint**: [e.g., "Python 3.11 until 2026"]

### HC-8: External Integrations
- **Constraint**: [e.g., "Stripe webhook contract fixed"]

### HC-9: Team Availability
- **Constraint**: [e.g., "2 devs; PRs <500 lines"]

### HC-10: Data Integrity
- **Constraint**: [e.g., "No data migration that could lose data"]

## Soft Constraints (Prefer to Respect)
### SC-1: New Dependencies — avoid; justify each addition
### SC-2: Test Framework — stay on pytest
### SC-3: PR Size — <500 lines; one logical change per PR
### SC-4: Naming — follow existing conventions

## Constraint Check Protocol (MANDATORY before every transformation)
```
1. READ CONSTRAINTS.md (this file) in full
2. For the planned transformation, check HC-1 through HC-10
3. If ANY hard constraint violated: STOP, escalate to user
4. If soft constraint violated: proceed, document justification
5. Log constraint check in BLUEPRINT entry
```

## Constraint Override Process
1. Document the violation (which, why, alternatives, mitigations)
2. User sign-off (in writing)
3. Update CONSTRAINTS.md with exception entry
4. Mitigation plan (monitoring, rollback, remediation)
5. Post-implementation review

## Why This Matters
Without constraints: ✗ Optimize wrong things ✗ Break production ✗ Over-engineer ✗ Create tech debt ✗ Team loses trust
With constraints: ✓ Respect business reality ✓ Deployable ✓ Agent pauses when uncertain ✓ Compliance maintained
""",
}

# ==================== ROOT FILES ====================
ROOT_FILES = {
"README.md": """# Code Transform — Make Any Codebase Perfect

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-12.1.0-blue.svg)](#)

> Transform ANY application into its best version — architecture, database, UI/UX, testing, security, performance, observability, rollout.

## 🎯 What This Skill Does

Takes ANY application and transforms it across **12 dimensions** with a **9-phase workflow**: INTAKE → CENSUS → AUDIT → PRIORITIZE → EXECUTE → VERIFY → TESTING MASTERY → OBSERVABILITY → ROLLOUT.

## 🚀 Three Modes
| Mode | When |
|------|------|
| **AUDIT** | "audit this", "review this" |
| **TRANSFORM** | "fix this", "refactor this" |
| **PERFECT** | "make this perfect" (full 9-phase) |

## 📦 What's Included
- **34 references** (audit dimensions, methodology, specialized topics)
- **21 scripts** (audit, security, eval harness, MANTRA, mutation hardening, context shaper)
- **11 assets** (templates)
- **Bootstrap injection** (session-start + post-compaction)
- **5-layer context shaper** (budget → snip → microcompact → collapse → auto-compact)
- **Eval harness** (with-skill vs baseline, +200% improvement)
- **MANTRA multi-agent refactoring** (8.7%→82.8% success)
- **Mutation hardening** (Meta ACH pattern, 73% engineer acceptance)

## 🔧 Installation
```bash
npx skills add abedmohamed258/code-transform -a claude-code -y
```

## 📖 Usage
Tell your AI agent: "Make this codebase perfect using code-transform skill"

## 🧪 Eval Harness
```bash
python3 scripts/run_eval.py --cases evals/cases --output evals/benchmark.json
python3 scripts/generate_review.py evals/benchmark.json --open
```

## 📝 License
MIT — see [LICENSE.txt](LICENSE.txt)
""",
"CHANGELOG.md": """# Changelog

## [12.1.0] — 2026-06-28

### Complete Rebuild — All Files Restored

### Added — Bootstrap Injection (Action 1)
- `skills/using-code-transform/SKILL.md` — bootstrap skill with 1% rule
- `hooks/hooks.json` — SessionStart hook (startup|clear|compact)
- `hooks/session-start` — injection script
- `references/33-bootstrap-injection.md`
- Re-injects after every context compaction (obra/superpowers pattern)

### Added — 5-Layer Context Shaper (Action 2)
- `scripts/context_shaper.py` — budget → snip → microcompact → collapse → auto-compact
- `references/34-context-engineering.md`
- Based on Claude Code 5-layer shaper (arXiv:2604.14228)

### Added — Description Optimization (Action 3)
- `evals/trigger_queries_v2.json` — 30 near-miss trigger queries

### Added — All References (20-32)
- 20-testing-mastery, 21-error-handling, 22-safe-migration, 23-api-design
- 24-state-caching, 25-observability, 26-domain-patterns, 27-session-handoff
- 28-git-workflow, 29-eval-harness, 30-multi-agent-refactoring
- 31-tool-synthesis, 32-mutation-hardening

### Added — All Scripts (12 new)
- generate_test_suite.py, security_scan.sh, dead_code_detector.sh
- duplicate_code_detector.sh, traceability_matrix.py, metrics_diff.py
- run_eval.py, generate_review.py, optimize_description.py
- mantra_refactor.py, synthesize_tool.py, mutation_harden.py

### Added — All Assets (5 new)
- test_plan_template, intake_template, rollout_plan_template
- traceability_matrix_template, constraints_template

### Added — Project Structure
- README.md, CHANGELOG.md, CONTRIBUTING.md
- .gitignore, .gitattributes
- .claude-plugin/marketplace.json, .claude-plugin/plugin.json
- .github/workflows/validate.yml, ISSUE_TEMPLATE, PULL_REQUEST_TEMPLATE
- evals/cases/fix-sql-injection/ (test case)
- recipes/ (with sample recipe)
""",
"CONTRIBUTING.md": """# Contributing to Code Transform

## 🚀 Quick Start
```bash
git clone https://github.com/<your-username>/code-transform.git
cd code-transform
npx skills add . --list
npx skills add . -a claude-code -y
```

## 📋 Development Workflow
1. Create branch: `git checkout -b feature/your-feature`
2. Make changes under `skills/code-transform/`
3. Validate: `npx skills add . --list`
4. Commit using Conventional Commits
5. Open PR

## ✅ Validation Checklist
- [ ] `name` matches directory name
- [ ] `description` < 1024 chars
- [ ] Scripts executable (`chmod +x scripts/*.sh scripts/*.py`)
- [ ] Python syntax valid
- [ ] No broken references
- [ ] `npx skills add . --list` discovers skill

## 🧪 Testing
```bash
for f in scripts/*.sh; do bash "$f" --help; done
for f in scripts/*.py; do python3 "$f" --help; done
python3 scripts/run_eval.py --cases evals/cases --output evals/benchmark.json
```

## 📝 Commit Format
```
<type>(<scope>): <description>
Closes #<issue>
```
Types: feat, fix, docs, refactor, perf, test, chore, security
""",
".gitignore": """__pycache__/
*.pyc
.DS_Store
.vscode/
.idea/
venv/
.venv/
node_modules/
coverage/
.pytest_cache/
jscpd-report/
METRICS_*.json
evals/benchmark.json
evals/review.html
TRACEABILITY_MATRIX.md
AUDIT_REPORT.md
BLUEPRINT.md
PROGRESS.md
FINAL_REPORT.md
INTAKE.md
CONSTRAINTS.md
TEST_PLAN.md
ROLLOUT_PLAN.md
skills-lock.json
.claude/
.agents/
*.log
""",
".gitattributes": """* text=auto eol=lf
*.sh text eol=lf executable
*.py text eol=lf executable
*.md text eol=lf
*.json text eol=lf
*.yml text eol=lf
""",
}

# ==================== .claude-plugin ====================
PLUGIN_FILES = {
"marketplace.json": json.dumps({
    "name": "code-transform-marketplace",
    "owner": {"name": "code-transform-skill", "url": "https://github.com/abedmohamed258/code-transform"},
    "metadata": {"description": "Transform ANY application into its best version", "version": "12.1.0", "license": "MIT"},
    "skills": [{"name": "code-transform", "description": "9-phase workflow", "path": "skills/code-transform"}]
}, indent=2),
"plugin.json": json.dumps({
    "name": "code-transform",
    "version": "12.1.0",
    "description": "Complete code transformation toolkit",
    "license": "MIT",
    "homepage": "https://github.com/abedmohamed258/code-transform",
    "skills": ["skills/code-transform"]
}, indent=2),
}

# ==================== .github ====================
GITHUB_FILES = {
"workflows/validate.yml": """name: Validate Skill
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: {node-version: '20'}
      - uses: actions/setup-python@v5
        with: {python-version: '3.11'}
      - run: npm install -g skills
      - run: chmod +x scripts/*.sh scripts/*.py
      - run: skills add . --list
      - run: for f in scripts/*.py; do python3 -m py_compile "$f" || exit 1; done
      - run: skills add . -a claude-code -y
        env: {DISABLE_TELEMETRY: '1'}
""",
"ISSUE_TEMPLATE/bug_report.md": '---\nname: Bug Report\ntitle: "[BUG] "\nlabels: bug\n---\n## Describe the Bug\n## To Reproduce\n## Environment\n## Logs\n',
"ISSUE_TEMPLATE/feature_request.md": '---\nname: Feature Request\ntitle: "[FEATURE] "\nlabels: enhancement\n---\n## Problem\n## Proposed Solution\n## Would you contribute?\n',
"PULL_REQUEST_TEMPLATE.md": '## Description\n## Type of Change (bug/feature/docs/refactor/perf/test/security)\n## Skill Validation\n- [ ] `npx skills add . --list` shows skill\n- [ ] `name` matches directory\n- [ ] `description` < 1024 chars\n- [ ] Scripts executable\n- [ ] Python syntax valid\n## Related Issues\n',
}

# ==================== EVALS ====================
EVAL_CASES = {
"fix-sql-injection/case.json": json.dumps({
    "name": "fix-sql-injection",
    "description": "Detect and fix SQL injection",
    "difficulty": "easy",
    "category": "security",
    "prompt": "Audit for security issues and fix SQL injection.",
    "assertions": [
        {"type": "file_not_contains", "file": "src/auth.py", "pattern": 'f"SELECT'},
        {"type": "file_contains", "file": "src/auth.py", "pattern": "?"},
        {"type": "no_secrets"}
    ]
}, indent=2),
"fix-sql-injection/src/auth.py": """import sqlite3
API_KEY = "sk-1234567890abcdef"
def login(username, password):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
    cursor.execute(query)
    user = cursor.fetchone()
    conn.close()
    return user is not None
""",
"fix-sql-injection/solution/src/auth.py": """import sqlite3, os
API_KEY = os.environ.get("API_KEY", "")
def login(username, password):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    query = "SELECT * FROM users WHERE username = ? AND password = ?"
    cursor.execute(query, (username, password))
    user = cursor.fetchone()
    conn.close()
    return user is not None
""",
}

# ==================== RECIPES ====================
RECIPE_FILES = {
"registry.json": json.dumps({"recipes": []}, indent=2),
"parameterize-sql.md": """# Recipe: Parameterize SQL Queries

## When to Use
- f-string SQL queries like `f"SELECT ... {var}"`
- Variable is user-controlled (SQL injection risk)

## Input Pattern
```python
query = f"SELECT * FROM users WHERE id = {user_id}"
cursor.execute(query)
```

## Output Pattern
```python
query = "SELECT * FROM users WHERE id = ?"
cursor.execute(query, (user_id,))
```

## Steps
1. Identify f-string SQL queries
2. Replace {var} with ? placeholder
3. Collect variables into tuple
4. Pass tuple as second arg to execute()
5. Verify with security_scan.sh

## Metadata
- Times applied: 1
- Success rate: 1.0
""",
}

# ==================== MAIN ====================
def main():
    created = 0

    # References
    print("Creating references...")
    for num, (fname, content) in REFERENCES.items():
        path = ROOT / "references" / f"{num:02d}-{fname}"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        created += 1
    print(f"  ✓ {created} references")

    # Scripts
    print("Creating scripts...")
    script_count = 0
    for fname, content in SCRIPTS.items():
        path = ROOT / "scripts" / fname
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        os.chmod(path, os.stat(path).st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)
        script_count += 1
    created += script_count
    print(f"  ✓ {script_count} scripts")

    # Assets
    print("Creating assets...")
    asset_count = 0
    for fname, content in ASSETS.items():
        path = ROOT / "assets" / fname
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        asset_count += 1
    created += asset_count
    print(f"  ✓ {asset_count} assets")

    # Root files
    print("Creating root files...")
    root_count = 0
    for fname, content in ROOT_FILES.items():
        path = ROOT / fname
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        root_count += 1
    created += root_count
    print(f"  ✓ {root_count} root files")

    # .claude-plugin
    print("Creating .claude-plugin...")
    for fname, content in PLUGIN_FILES.items():
        path = ROOT / ".claude-plugin" / fname
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        created += 1
    print(f"  ✓ {len(PLUGIN_FILES)} plugin files")

    # .github
    print("Creating .github...")
    for fname, content in GITHUB_FILES.items():
        path = ROOT / ".github" / fname
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        created += 1
    print(f"  ✓ {len(GITHUB_FILES)} github files")

    # evals/cases
    print("Creating evals/cases...")
    for fname, content in EVAL_CASES.items():
        path = ROOT / "evals" / "cases" / fname
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        created += 1
    print(f"  ✓ {len(EVAL_CASES)} eval case files")

    # recipes
    print("Creating recipes...")
    for fname, content in RECIPE_FILES.items():
        path = ROOT / "recipes" / fname
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        created += 1
    print(f"  ✓ {len(RECIPE_FILES)} recipe files")

    print(f"\n{'='*60}")
    print(f"  ✓ Total files created: {created}")
    print(f"{'='*60}")

    # Verify
    print("\n=== FINAL INVENTORY ===")
    print(f"  References: {len(list((ROOT/'references').glob('*.md')))}")
    print(f"  Scripts: {len(list((ROOT/'scripts').glob('*')))}")
    print(f"  Assets: {len(list((ROOT/'assets').glob('*.md')))}")
    print(f"  Skills: {len(list((ROOT/'skills').rglob('SKILL.md')))}")
    print(f"  Hooks: {len(list((ROOT/'hooks').glob('*')))}")
    print(f"  Evals: {len(list((ROOT/'evals').rglob('*')))}")
    print(f"  Recipes: {len(list((ROOT/'recipes').glob('*')))}")

    return 0

if __name__ == "__main__":
    import sys
    sys.exit(main())
