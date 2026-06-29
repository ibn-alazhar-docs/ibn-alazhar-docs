# Safe Migration Patterns — Evolve Systems Without Breaking Them

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
