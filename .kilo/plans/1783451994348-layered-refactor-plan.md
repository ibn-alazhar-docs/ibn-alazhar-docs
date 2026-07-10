# Plan: Layered-Architecture Refactor (in-place, full repo)

## Context

Ibn Al-Azhar Docs is a pnpm monorepo: a single **Next.js App Router** app (`apps/web`, ~31.6K LOC / 316 TS/TSX files) plus `packages/*` (database, pipeline, shared) and `workers/*` (ocr, export). It is **already partially layered** (`core/services/*.use-cases.ts`, `core/repositories/*.repository.ts`, `domain/repositories/*.interface.ts`, `app/api/*/route.ts` as controllers) but the layering leaks and overlaps:

- Infrastructure detail leaks into business logic (`prisma` injected straight into use cases — see `core/composition-root.ts:1,70,73`).
- `lib/backend/` is a grab-bag mixing infra (prisma, redis rate-limit, audit, auth) with business services (`dashboard.service.ts`, `stream.service.ts`) and static content.
- Folder-tree logic is **duplicated** with divergent behavior (`lib/shared/build-folder-tree.ts:15` vs `core/folder-tree.ts:29`).
- `core/` vs `domain/` vs `lib/*` boundaries overlap and confuse ownership.

**Goal:** restructure to a clean **layered architecture** (controllers / services / repositories / clients / models+interfaces / transport / config / middleware / shared), preserving **all behavior** — this is a refactor, not a rewrite.

## Decisions (confirmed with user)

1. **Normalize in-place.** Keep `apps/web` as one deployable; map folders to the layered vocabulary. Do **not** split into top-level `backend/`+`frontend/` packages (would be a rewrite of the Next coupling).
2. **Entire repo, phased.** `apps/web` + `packages/*` + `workers/*`, in phases with verification gates.
3. **Phased with gates + per-move commits.** One behavior-preserving move per commit; verify (typecheck/lint/existing tests) after each.
4. **Green baseline first.** Commit/clear current WIP and get typecheck+lint+tests green as a safety net before any refactor move.

## Target structure (apps/web/src)

```
app/
  [locale]/...            # ui (components) + state (view logic / hooks) — Next pages stay here
  api/**/route.ts         # controllers — thin: parse → call ONE use case → shape response
core/
  services/               # business logic (use cases) — the verbs; depend ONLY on interfaces
  repositories/           # concrete data access (Prisma impls) — ONLY code that touches the DB
domain/                   # CONTRACTS: models (types/auth entities) + repository/service interfaces
clients/                  # outbound adapters (S3/MinIO, Redis, Google Drive, email, HF) behind interfaces
transport/               # network mechanics (S3/Redis/HTTP client wiring, serialization, retries)
config/                   # env, composition root (wiring), feature flags
middleware/               # cross-cutting request pipeline (auth-guards, request-logger, audit)
shared/                   # leaf utilities — pure, NO imports from core/domain/clients/etc.
ui/                       # (rename of components/) presentation only
state/                    # (rename of hooks/) stores/hooks/view logic; calls the api client
api/                      # (from lib/frontend/api-client.ts) API client — domain calls, no protocol detail
```

**Boundary rules (from the refactor discipline):**

- Dependency direction: `controller → service → repository/client`. Services depend on **interfaces** in `domain/`, never on `prisma`/SQL/HTTP directly.
- Infrastructure never leaks upward: no `PrismaClient` in a service signature; no provider type escaping `clients/`.
- `shared/` is a leaf: it may not import from `core/`, `domain/`, `clients/`, `transport/`, `config/`, `middleware/`.
- `domain/` stays as the contract layer (interfaces + model types); the frontend `api/` client imports contracts from `domain/`. No separate repo-root `shared/` (not needed for a single app).
- **Next.js constraint:** route handlers (`app/api/**/route.ts`) and pages (`app/[locale]/**`) MUST remain under `app/` — controllers/pages are thin adapters, not moved out.

## Concrete starting smells (validate the need)

| Smell                                                                            | Location                                                         | Principle                    |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------- |
| Prisma client injected into use cases                                            | `core/composition-root.ts:1,70,73`                               | DIP / dependency direction   |
| Inconsistent repo constructors (some take `prisma`, `AccountRepository` doesn't) | `core/composition-root.ts:38-48`                                 | Encapsulation / consistency  |
| Duplicate `buildFolderTree` w/ divergent behavior                                | `lib/shared/build-folder-tree.ts:15`, `core/folder-tree.ts:29`   | DRY / single source of truth |
| `lib/backend/services/*` business logic outside `core/services`                  | `lib/backend/services/dashboard.service.ts`, `stream.service.ts` | SRP / layering               |
| `lib/backend` mixes infra + content + services                                   | `lib/backend/{prisma,rate-limit,audit,auth,content,export}`      | Layering                     |
| `lib/backend/export/*` helpers likely pure transforms mixed with logic           | `lib/backend/export/{zip-builder,metadata,profiles}`             | Lean code / boundary         |

(An execution agent should re-scan each folder with Repowise/`get_context` before moving; this table is the seed list, not exhaustive.)

## Execution phases

Each phase: do moves → run gate (`pnpm typecheck && pnpm lint && pnpm test`) → commit each move separately with a message naming what moved and why. Stop and flag if a move can't be behavior-preserving.

### Phase 0 — Green baseline (prerequisite, not part of refactor)

- Commit or stash current WIP as a clearly-labeled baseline commit.
- Run `pnpm typecheck`, `pnpm lint`, `pnpm test` (+ `pnpm test:api`, `pnpm test:integration` if green is needed). Fix any **pre-existing** failures in a separate "baseline: make checks green" commit.
- Gate: all checks pass. This is the regression reference for `git bisect`.

### Phase 1 — Decompose `lib/backend` into layers (biggest smell)

- Create `clients/`, `transport/`, `config/`, `middleware/`, `shared/` under `apps/web/src`.
- Move: `lib/backend/prisma.ts` → `transport/db.ts` (PrismaClient singleton); `lib/backend/rate-limit/*` → `clients/redis/` + `shared/` (pure store logic); `lib/backend/audit.ts` → `middleware/audit.ts`; `lib/backend/auth.ts` + `auth-guards.ts` → `middleware/` (+ auth types to `domain/`); `lib/backend/request-logger.ts` → `middleware/`; `lib/backend/content*.ts` → `ui/content/` or `shared/content/` (static data, no logic).
- Rewire composition root + all imports. Gate + per-move commits.

### Phase 2 — Services where they belong

- Move `lib/backend/services/dashboard.service.ts`, `stream.service.ts` → `core/services/` (as `*.use-cases.ts` or cohesive service). Ensure callers (controllers) still call them via composition root.
- Audit every `app/api/**/route.ts` for embedded business logic / DB access; extract into a use case if present (keep controllers thin). Gate.

### Phase 3 — Fix infrastructure leakage (DIP)

- In `core/composition-root.ts`, stop passing `prisma` into use cases. Use cases must receive **repository interfaces** (`domain/repositories/*`); the concrete repos (which internally use `prisma`/transport) are constructed in the root. Align `AccountRepository`'s constructor with siblings.
- Verify no `PrismaClient`/`@prisma/client` import exists outside `core/repositories/` + `transport/`. Gate.

### Phase 4 — De-duplicate shared logic

- Consolidate the two `buildFolderTree` implementations into one in `shared/` (keep the sorting + `parentId` variant; align callers). Delete the duplicate. If untested, add a small characterization test pinning current output (bugs included) first.
- Move `lib/shared/*` → `shared/`; move validators (`lib/shared/validators/*`) to `shared/validators/` (boundary validation). Ensure `shared/` stays a leaf. Gate.

### Phase 5 — Frontend structure

- Rename `components/` → `ui/`, `hooks/` → `state/`, move `lib/frontend/api-client.ts` → `api/` (split brand/cn/fonts/metadata into `ui/` + `shared/`). Update imports. Gate (also `next build` typecheck via `pnpm typecheck`).

### Phase 6 — `packages/*`

- Apply the same boundary rules inside each package. `packages/pipeline`: `ocr-providers/` → `clients/`, `queue/` → `transport/`, `output/`+`text/` → pure transforms (keep or move to `services/`/`shared/`). `packages/database`: ensure only the Prisma client / connection lives there. `packages/shared`: contracts only. Gate (package-level typecheck).

### Phase 7 — `workers/*`

- `workers/ocr-worker/src/stages/` → pipeline steps as services; external calls → `clients/`. `workers/export-worker`: same. Preserve BullMQ queue contract. Gate.

### Phase 8 — Final review & docs

- Run full gate set + `pnpm test:e2e` (Playwright) if feasible.
- Remove dead code / obsolete comments discovered along the way.
- Update `ARCHITECTURE.md`, `CLAUDE.md`, and `docs/wiki/` structure notes to reflect the new layout. Confirm a recursive folder listing reveals layers without opening files.

## Cross-cutting rules

- **Behavior frozen.** Outputs, error types/messages, status codes, ordering, null-vs-undefined, async timing must stay identical. Watch for silent drift (error message text, log lines, number precision).
- **One move per commit**, message states what moved + why. Never bundle unrelated moves.
- **Type-check constantly** (`tsc` lists every broken seam — don't grep by hand).
- **Tests as scalpel, not prerequisite:** do NOT build new suites for working code; add a characterization test **only** for untested logic that types don't guard (rate-limit store, folder-tree, export zip-builder) before moving it.
- **If a move can't be behavior-preserving, stop and flag** — that's a rewrite, a separate explicit decision.

## Risks

- **WIP working tree** before Phase 0 → mitigated by green baseline first.
- **Import-alias churn** (`@/...`) from moves → mitigated by type-aware renames + `tsc` gate.
- **Next.js `app/` immutability** for routes/pages → controllers/pages stay under `app/`; only their _dependencies_ move.
- **Behavioral drift in `lib/backend` decomposition** (rate-limit, audit) → mitigated by characterization tests + existing `pnpm test:*` suites.
- **BullMQ/worker queue contract** in Phase 7 → preserve message shapes; verify worker tests.

## Validation

- Per phase: `pnpm typecheck && pnpm lint && pnpm test` must pass.
- Phase 4/7: characterization tests for moved pure logic.
- Phase 8: `pnpm test:e2e` (if environment allows) + manual spot-check of one full flow (upload → OCR → export) for identical behavior.
- Final: `pnpm check` (format+lint+typecheck) green; `git bisect` stays meaningful (each move independently revertable).

## Open questions / deferred

- Whether `domain/` should later be split into `models/` + `contracts/` — deferred (current `domain/` keeps interfaces+types; rename is pure churn, out of scope).
- Adding a top-level repo `shared/` API-contract package — not needed for a single app; deferred.
- New tests for currently-untested modules beyond the characterization pins — out of scope (not a test-authoring task).
