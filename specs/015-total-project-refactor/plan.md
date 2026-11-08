# Implementation Plan: Total Project Refactor (Code, Logic, Design, Architecture)

**Branch**: `refactor/total` | **Date**: 2026-11-08 | **Spec**: `specs/015-total-project-refactor/spec.md`

**Input**: Feature specification from `/specs/015-total-project-refactor/spec.md`

**Note**: This template is filled in by the `spec-kit plan` command; its definition describes the execution workflow.

## Summary

A behavior-preserving, spec-driven refactor of the whole Ibn Al Azhar Docs workspace across four lenses (Code, Logic, Design, Architecture), executed as: branch/tag → Phase 0 baseline + safety net → Phase 1 full map (read-only sub-agents) → Phase 2 per-unit Spec Kit sequences → Phase 3 waves of ≤4 workers → Phase 4 integration → Phase 5 audit. Every task passes gates G0–G7 (FR-010) and is committed Conventional-Commits-style on `refactor/total` only; any behavior/visual change is a separately declared `change:` spec + decisions entry.

## Technical Context

**Language/Version**: TypeScript 5.9.3, Node 22.x, pnpm 10.33.4 (workspace, `package.json` engines/packageManager).

**Primary Dependencies**: Next.js 16 App Router + React 19.2 (app `apps/web`, Turbopack dev), Prisma 6.5 (`@prisma/client`), BullMQ/ioredis (default queue driver `redis`), Tailwind 4, `next-intl` 4, `next-auth` 5 beta, Resend, Sentry/OTel, Google APIs. Dev-only: Vitest 3.2, Playwright 1.61, eslint 8 + prettier 3.6, `tsx`, `wrangler` 4 + OpenNext-Cloudflare (preview/deploy).

**Storage**: PostgreSQL (Prisma, `packages/database/prisma/schema.prisma`), Redis (default queue, `QUEUE_DRIVER=redis` in `packages/pipeline/src/queue/driver.ts`; PG path only when `=pg`, no dual-write), local/S3 storage (`STORAGE_DRIVER`, default `local`).

**Testing**: Vitest 3.2 multi-project (`unit`, `api`, `integration`, `security`, `frontend` jsdom, `edge`, `fuzz`, `pentest`, `recovery`, `regression`), Playwright 1.61 for `tests/e2e/*.spec.ts` (`*.e2e.spec.ts` excluded — vitest, gated on `E2E_FULL=1`), coverage via `@vitest/coverage-v8`. Focused runs: `pnpm vitest run --project=<name> <path>` / `pnpm test:<suite>`; bare `pnpm test` runs everything. Unit needs system `pandoc`; integration/API/security/E2E need live Postgres+Redis via `./ibn.sh dev-infra` (Postgres 5433); integration/recovery serialized (`singleFork`).

**Target Platform**: Web app deployed via OpenNext/Cloudflare (`preview`/`deploy`) and HF Spaces (Docker image); background workers `workers/ocr-worker`, `workers/export-worker` (Docker targets `web`, `ocr-runner`, `export-runner`).

**Project Type**: Monorepo web platform (Next.js app + shared pipeline/data packages + 2 workers). Boundaries: `apps/*`, `packages/*`, `workers/*`; aliases `@` → `apps/web/src`, `@ibn-al-azhar-docs/*` → `packages/*/src` (`vitest.config.ts`).

**Performance Goals**: No perf regression claims in this refactor; performance work is out of scope unless a unit spec declares it. Metrics floor is the baseline (LOC, files, duplication, complexity, cycles, bundle size if relevant — G7).

**Constraints**: Frozen contracts by default (URLs, API shapes, schema, CLI flags, exports); Arabic-only RTL i18n (`locales: [ar]`, `/en` → `/ar` redirect); no guest tools (`/api/tools/guest/*` absent), tools internal at `/ar/tools`; `QUEUE_DRIVER` default `redis`, never set in runtime config/Dockerfile/supervisord; ESLint `--max-warnings 0`, `no-explicit-any` error (off in `tests/`); import boundaries (core/services ⊉ `@prisma/client`; ui/state ⊉ prisma/pipeline/bullmq/ioredis/google-auth-library; domain ⊉ `@/app|ui|core|middleware|transport`); `deletedAt` soft-delete.

**Scale/Scope**: Very large repo (many apps/packages/workers/tests); units capped at ~10 files / ~800 lines, tasks at ~10 files / ~400 lines (FR-007).

## Constitution Check

No `.specify/memory/constitution.md` exists yet; the first Phase-2 step writes it (FR-003) from: behavior preserved, small steps, tests first, one concern per change, four lenses, G0–G7 gates, contract-freeze, naming/structure conventions taken from what the codebase already does best, Arabic-only + no-guest-tools + `QUEUE_DRIVER` truths, + the user's own CLAUDE.md guidance (code is truth, update `CLAUDE-STATE.md` only, don't edit Repowise-generated `docs/`; root `PROJECT_STATUS.md`/`STATUS_FINAL.md` are dated history; read `DESIGN.md` before visual/UI decisions).

- **GATE: PASS with condition** — plan is designed against these principles; the condition is that `.specify/memory/constitution.md` (or fallback) is written in Phase 2 before any unit implementation, and this plan is re-checked against it before `/tasks`.
- **No violations to justify** in Complexity Tracking at this stage. If a later unit needs an exception (e.g., a compatibility layer for a contract migration), it is justified there in its own plan, not here.

## Project Structure

### Documentation (this feature)

```text
specs/015-total-project-refactor/
├── plan.md
├── spec.md
└── tasks.md   # produced by the /tasks step, not by plan
.refactor/
├── MASTER_PROMPT.md  # the launch prompt (location per Open Q Q2)
├── STATE.md          # current phase/wave/units/blockers/next action (updated after every task/wave/compaction)
├── 00-baseline.md    # Phase 0 baseline + pre-existing failures
├── 00-inventory.md   # Phase 1 index: every source file -> unit
├── 01-plan.md        # Phase 2 unit order + parallelism
├── PLAYBOOK.md       # distilled methodology for workers (max ~150 lines)
├── decisions.md      # FR-012 decision log
├── bugs-found.md     # bugs found, fixed separately as fix:
├── blocked.md        # tasks reverted after 3 attempts
├── deferred.md       # consciously deferred items
├── analysis/         # raw analyzer summaries (Phase 0)
├── map/              # Phase 1 read-only maps (one file per area, <=80 lines each)
├── visual-baseline/  # before-screenshots mobile + desktop (Phase 0, Playwright)
└── FINAL_REPORT.md   # Phase 5 metrics + delivery report
```

Per-unit Spec Kit trees (Phase 2, one wave ahead of implementation):

```text
specs/<unit>/
├── spec.md    # As-Is + To-Be (specify)
├── plan.md    # concrete plan, risks, rollback (plan)
└── tasks.md   # small dependency-ordered tasks with allowlists (tasks)
```

### Source Code (repository root)

```text
apps/web/src/          # Next.js 16 App Router
├── app/api            # thin route handlers only
├── app/[locale]/...   # /ar only (Arabic-first RTL)
├── domain/            # contracts (never imports app/ui/core/middleware/transport)
├── core/              # use-cases/services (never imports @prisma/client)
├── ui/                # components (never prisma/pipeline/queue libs)
└── state/             # client state
packages/
├── pipeline/          # OCR, queue, storage, export, text/clean (incl. diacritize.ts)
├── database/          # Prisma schema + client
└── shared/            # types/logging (own tsconfig, excluded from root typecheck)
workers/
├── ocr-worker/        # background consumer
└── export-worker/     # background consumer
tests/                 # vitest projects + tests/e2e (Playwright) + tests/smoke
specs/                 # Spec Kit trees (001..015)
docs/                  # ops/reference docs (Repowise-generated sections are do-not-touch)
infrastructure/        # Dockerfiles, eslint rules, HF build-check
scripts/               # setup-hooks, secrets-scan, hf sync
```

**Structure Decision**: Single-workspace monorepo (pnpm workspaces); no new top-level packages are introduced by this plan — units refactor inside existing boundaries and only add barrel files / small public interfaces (lens D) where a module's internals leak. New files live in `.refactor/`, `specs/<unit>/`, or inside an owning package; never in `docs/wiki` (does not exist), never generated paths.

## Complexity Tracking

No violations at this stage (see Constitution Check). Keep this table empty unless a later per-unit plan justifies an exception.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| _none declared_ | — | — |

## Strategy

**Sequencing (dependency order, FR-003/FR-007)**:

1. **Phase 0 — Recon & safety net** (orchestrator + a small worker): create `refactor/total`, tag `pre-refactor`; detect stack; run install/build/typecheck/lint/tests; write `00-baseline.md`; run analyzers into `.refactor/analysis/` (madge/knip/jscpd or scripted fallbacks — no installs if avoidable); build characterization + smoke tests and Playwright before-screenshots for every route (mobile + desktop). Commit safety net separately.
2. **Phase 1 — Full map** (≤4 `explore` sub-agents in parallel, read-only): inventory + dependency graph + data flow/state + contracts + business rules + design system + ranked smells. Each writes ≤80 lines into `.refactor/map/`; index all into `00-inventory.md` (100% source coverage).
3. **Phase 2 — Constitution + decomposition**: write `.specify/memory/constitution.md` (or fallback structure if Spec Kit CLI unavailable), split units (≤10 files / ~800 lines), order foundations → leaves → pages last, record parallelism in `01-plan.md`. Per unit, run `specify/clarify/plan/tasks/analyze`, one wave ahead of implementation.
4. **Phase 3 — Waves**: ≤4 workers in parallel with disjoint allowlists, task packets per §6.2; inside a unit order is tests/safety-net → Logic → Code → Architecture → Design. Orchestrator runs G0–G7 itself, dispatches a fresh-context reviewer, then commits one Conventional-Commits entry per task and updates `STATE.md`.
5. **Phase 4 — Integration pass** (orchestrator): cross-unit wiring, re-run dependency analysis (no cycles, right direction), delete confirmed dead code/unused deps, align naming/folders, verify every route end to end, re-run visual comparison vs baseline.
6. **Phase 5 — Audit & delivery**: full gate suite; write `ARCHITECTURE.md` (Mermaid) and `.refactor/FINAL_REPORT.md`; update README/setup docs where wrong.

**Parallelism graph (tentative, finalized in `01-plan.md`)**: design-system tokens + shared types/utils layer first (serial, orchestrator-owned shared layer); then leaves (pipeline text/clean, queue driver, storage, database, workers) in parallel; then web layers (domain → core → ui/state → routes/pages) in order; docs/tests-infrastructure cross-cutting in parallel with leaves. Never two workers on the same file.

**Delegation (protocol-compliant)**: Orchestrator never reads the whole repo into its own context — mappers and workers do the reading/writing; ~2 direct read-only calls per turn max; workers never spawn sub-agents; model tiers are cheap-first (fast for lookups, medium/heavy for design/debug) but sub-agents are never given model overrides.

**Risks & mitigations**:

| Risk | Mitigation |
|------|------------|
| Silent behavior/visual change | G4/G5 diffs; `change:` specs + `change:` commits only for intentional changes |
| Test weakening to reach green | FR-014 ban; G2/G6 review; baseline test count is the floor |
| E2E suite too slow (30–90 min, production `next start`) | G3 smoke as the per-task gate; full E2E only at wave end + final audit |
| Live services unavailable (docker guard stopped) | `./ibn.sh dev-infra` before integration/E2E; never run migrations against real data |
| Free-tier model quota (medium/implementer service-account failures seen) | Tasks ≤400 lines, evidence on disk, cheap-tier first; revert+block after 3 attempts (FR-011) |
| Worker drift beyond allowlist | G6 diff review per task; one commit per task |

**Verification strategy**: Same commands as CI (`pnpm check`, `pnpm ci:all` at the end, suite-scoped vitest/Playwright per task), contracts diffed (G5), screenshots diffed (G4), metrics compared to baseline (G7). Never claim done without `exit 0` and visible output. No `push --force`, no `reset --hard`, no touching `main` — branch stays `refactor/total` until final audit explicitly merges.
