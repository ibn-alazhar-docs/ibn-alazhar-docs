# Feature Specification: Total Project Refactor (Code, Logic, Design, Architecture)

**Feature Branch**: `refactor/total`

**Created**: 2026-11-08

**Status**: Draft

**Input**: User description: "MASTER PROMPT: Total Project Refactor" — autonomous, spec-driven, behavior-preserving refactor of the whole Ibn Al Azhar Docs codebase across four lenses (Code, Logic, Design, Architecture), with safety rules, phased execution (baseline → map → spec → waves → integration → audit), and hard verification gates.

## User Scenarios & Testing

### User Story 1 - The platform behaves identically after the refactor (Priority: P1)

As a document-platform user (Arabic-first, RTL-first), I use upload, OCR/conversion, search, folders/tags, export/download, sharing, and internal tools exactly as before, and I notice no change in routes, API shapes, or results.

**Why this priority**: The refactor's default contract is behavior preservation; any silent behavior change is a failure.

**Independent Test**: Run the full gate suite (build, typecheck, lint, unit/characterization tests, E2E smoke over every route) on the final branch and diff contracts (URLs, API shapes, schema, exported package APIs) against the baseline.

**Acceptance Scenarios**:

1. **Given** the `pre-refactor` tag, **When** the same test and E2E suites run on `refactor/total`, **Then** results are at or above baseline (no fewer tests, none skipped or weakened).
2. **Given** any public route or API endpoint, **When** called after the refactor, **Then** its shape, status contract, and Arabic RTL output are unchanged unless a `change:` spec declares a compatible migration.
3. **Given** a page screenshot at mobile and desktop widths, **When** compared to `.refactor/visual-baseline/`, **Then** it matches within tolerance, except pages with an approved `change:` spec.

---

### User Story 2 - A new agent can navigate and change the codebase safely (Priority: P1)

As an engineer (human or agent) starting work on this repo, I can read `ARCHITECTURE.md`, the spec for the unit I touch, and `.refactor/STATE.md`, and know what is allowed, what contracts are frozen, and how to verify my change.

**Why this priority**: The codebase is very large; without a durable map and frozen-contract discipline, every change risks breaking something non-obvious.

**Independent Test**: From a fresh session and the disk artifacts alone (`.refactor/`, `specs/<unit>/`, `ARCHITECTURE.md`), a worker can execute a small task packet without reading the whole repo into context, and its gates pass on first dispatch.

**Acceptance Scenarios**:

1. **Given** a fresh session after compaction, **When** it re-reads `.refactor/MASTER_PROMPT.md` and `.refactor/STATE.md`, **Then** it can continue exactly where work stopped without asking the human.
2. **Given** any task packet, **When** the worker follows only its allowlisted files and acceptance commands, **Then** no file outside the allowlist is modified and every acceptance command exits 0.

---

### User Story 3 - Duplication, dead code, and scattered rules are removed without breaking anything (Priority: P2)

As a maintainer, I see one design system (tokens + primitives), business rules in one place each, no circular imports, and no dead code or unused dependencies left that were confirmed dead.

**Why this priority**: This is the measurable payoff of the refactor, but it is only safe after Stories 1-2 establish the safety net.

**Independent Test**: Re-run the dependency/cycle analysis, duplication scan, and dead-code scan on the final state; metrics are at or better than the `.refactor/00-baseline.md` floor (G7).

**Acceptance Scenarios**:

1. **Given** the final branch, **When** the dependency graph is re-analyzed, **Then** there are no cycles and dependencies flow in one direction per documented layer.
2. **Given** the final branch, **When** dead-code and unused-dependency scans run, **Then** nothing confirmed-dead remains; anything deferred is listed in `.refactor/deferred.md` with a reason.
3. **Given** any business rule previously duplicated, **When** it is searched in the final code, **Then** exactly one source of truth exists and `.refactor/decisions.md` records which copy won and why.

---

### User Story 4 - UI parity first, then approved improvements (Priority: P3)

As a user, I see the same Arabic RTL design during the parity pass, and only see new or improved visuals where a unit spec explicitly approved them as `change:` commits.

**Why this priority**: Visual improvement is valuable but must never be smuggled into structural work.

**Independent Test**: Visual comparison report against `.refactor/visual-baseline/` lists only pages covered by approved `change:` specs as different.

**Acceptance Scenarios**:

1. **Given** a parity-phase unit, **When** screenshots are compared, **Then** they match within tolerance.
2. **Given** an approved improvement, **When** committed, **Then** the commit carries the `change:` prefix and `.refactor/decisions.md` justifies it.

---

### Edge Cases

- A pre-existing failure in the baseline: it is recorded in `.refactor/00-baseline.md`, never counted against the refactor, and never "fixed" by weakening a test.
- A flaky test or gate: re-run twice before classifying; a task gets max 3 diagnose-and-fix attempts, then it is reverted and recorded in `.refactor/blocked.md` with the diagnosis.
- A bug discovered mid-refactor: logged in `.refactor/bugs-found.md` and fixed only in a separate `fix:` commit with a test, never silently inside a refactor commit.
- A behavior change that seems necessary: it stops and becomes a `change:` spec + `.refactor/decisions.md` entry + separate `change:` commit, or it is deferred.
- Context loss / new session / compaction: disk artifacts (`.refactor/STATE.md`, unit specs) are the memory; the agent re-reads them and continues.
- Secrets or `.env*` encountered: never committed, never logged; destructive commands outside the repo and migrations against real data are forbidden.
- `QUEUE_DRIVER` handling: stays default `redis`, PG only when `QUEUE_DRIVER=pg`, no dual-write, never set in runtime config/Dockerfile/supervisord (`wrangler.jsonc` omits it).

## Requirements

### Functional Requirements

- **FR-001**: The refactor MUST work only on branch `refactor/total` (created at start, tagged `pre-refactor` at the starting point) and MUST never touch `main`, force-push, or rewrite history.
- **FR-002**: The refactor MUST preserve behavior and frozen public contracts (URLs, API shapes, DB schema, CLI flags, exported package APIs) by default; any intentional change MUST be declared in its unit spec, justified in `.refactor/decisions.md`, and committed separately with the `change:` prefix.
- **FR-003**: The refactor MUST be spec-driven: a unit MUST NOT be implemented before its Spec Kit sequence (`specify` As-Is + To-Be, `clarify`, `plan`, `tasks`, `analyze`) is written and consistency-checked, following `.refactor/01-plan.md` ordering (foundations first, leaves before parents, pages/composition last).
- **FR-004**: A Phase 0 baseline MUST be recorded in `.refactor/00-baseline.md` (install/build/typecheck/lint/tests run and pass/fail counts, timings, known pre-existing failures) before any refactoring, and analyzers MUST save raw summaries in `.refactor/analysis/` (dependency graph/cycles, unused files/exports/dependencies, duplication, complexity hot spots, large files, type-safety holes, security audit).
- **FR-005**: A safety net MUST be committed before refactoring: characterization tests pinning current behavior of critical logic, a smoke test visiting every route/page failing on runtime/console errors, and (for UI) before-screenshots of every page at mobile + desktop widths into `.refactor/visual-baseline/`.
- **FR-006**: The full system map MUST be produced in Phase 1 and indexed in `.refactor/00-inventory.md`, covering 100% of source files mapped to units (inventory, dependency graph/layering, data flow/state, contracts, business rules, design system, ranked smells/dead code/TODOs).
- **FR-007**: Decomposition MUST size each unit to roughly ≤10 files and ≤800 changed lines (tasks ≤10 files, ≤400 changed lines, one concern per task); larger work MUST be split.
- **FR-008**: Every unit MUST apply the four lenses in order (tests/safety net → Logic → Code → Architecture/wiring → Design), where: (A) Code — intent-revealing names, single-purpose functions, guard clauses, no magic values, third-repetition extraction, no commented-out/dead code, explicit nullable types, consistent error handling; (B) Logic — business rules in pure testable domain functions, one source of truth per rule/state, explicit and tested state machines/validation/permissions/calculations incl. edge cases; (C) Design — centralized tokens, merged primitives with complete states, intentional responsive/semantic/a11y-compliant markup, dead CSS removed, RTL/i18n/branding preserved; (D) Architecture — one-directional layers without cycles, small public interfaces per module, routing/API/data/config/logging/error-boundaries each in one obvious place, contracts stable with compatibility layers for any needed migration.
- **FR-009**: Execution MUST follow waves of max 3-4 parallel workers with disjoint file allowlists, using the task-packet format from `MASTER_PROMPT.md` §6.2; the Orchestrator edits only the shared layer (tokens, shared types, config, routes table, `package.json`, barrels), serially; workers never spawn sub-agents; a fresh-context reviewer checks each worker's diff (PASS/FAIL) before commit.
- **FR-010**: Verification gates G0-G7 MUST run after every task and fully at wave end and at the end: G0 build+typecheck, G1 lint+format (no new warnings vs baseline), G2 unit+characterization tests (no fewer than baseline, none weakened), G3 smoke (every route/page, no runtime/console errors, key flows), G4 UI parity vs visual baseline (except approved `change:` pages), G5 contracts unchanged (diffed), G6 diff review (allowlisted files only, no churn/debug/secrets), G7 metrics not worse than before.
- **FR-011**: On any gate failure, the Orchestrator MUST run the diagnose-and-fix loop (capture error, classify change-caused/pre-existing/flaky, root-cause, smallest correct fix, re-run the full gate set) for max 3 attempts per task, then revert and record in `.refactor/blocked.md`.
- **FR-012**: Every non-obvious decision MUST be logged in `.refactor/decisions.md` (2-4 lines: context, options, decision, consequences); bugs found MUST go to `.refactor/bugs-found.md`; work state (`STATE.md`: phase, wave, per-unit status, last green hash, blockers, next action) MUST be updated after every task/wave and after any compaction or session restart.
- **FR-013**: Work on this repo MUST keep its current truths: Arabic-first RTL platform with `locales: [ar]` (`/en` redirects only), no guest tools or transcription (tools internal at `/ar/tools`, no `/api/tools/guest/*`), `QUEUE_DRIVER` default `redis` with no dual-write, vendored DOCX template only, `Amiri`+`OFL.txt` as the only bundled font, and live-service prerequisites for integration/API/security/E2E (`./ibn.sh dev-infra`, Postgres 5433).
- **FR-014**: Commits MUST be one per completed task using Conventional Commits (`refactor(scope):`, `test(scope):`, `fix(scope):`, `change(scope):`, `docs:`, `chore:`), with no secrets/`.env*`, no hand-edited lockfiles/generated code, no dependency upgrades or framework migrations inside refactor tasks (those become their own specs), and no `rm -rf` on anything not created by the work.
- **FR-015**: Final delivery MUST include accurate `ARCHITECTURE.md` (module map, layers, data flow, routing map, Mermaid diagrams), `.refactor/FINAL_REPORT.md` (before/after metrics: LOC, files, duplication, complexity, cycles, unused code, test count/coverage, bundle size; decisions summary; `change:` list; bugs found; deferred items; how to run everything), and updated README/contribution/setup docs where they are now wrong.

### Key Entities

- **Unit** (specs `015-total-project-refactor` and per-unit `specs/<unit>/`): a vertical slice or cross-cutting layer under refactor, with As-Is spec, To-Be intent, plan, tasks, allowlist, acceptance checks.
- **Task packet**: the exact worker input (§6.2) — file allowlist, contracts to preserve, current behavior, steps, acceptance commands, report format.
- **Baseline & safety net** (`.refactor/00-baseline.md`, `.refactor/analysis/`, `.refactor/visual-baseline/`): the evidence floor every gate compares against.
- **Decision / bug / blocked / deferred records** (`.refactor/decisions.md`, `bugs-found.md`, `blocked.md`, `deferred.md`): one-line-plus-reason logs so nothing is fixed or dropped silently.
- **Contracts**: URLs, API shapes, DB schema, CLI flags, exported package APIs, env vars, external services — frozen unless a `change:` spec migrates them compatibly.

### Non-goals (explicit)

- No new features, no English/marketing content, no guest tools, no transcription re-introduction.
- No dependency upgrades or framework (e.g. Next.js) migrations inside this refactor; they need their own specs after everything else is green.
- No rewriting from scratch; small verified moves only. No cosmetic mass-churn (renames/reformatting) without structural gain.
- No weakening of tests, lint, or type rules to get green; no fixing bugs inside refactor commits.
- No touching `main`, `old-hf`, production data, or running migrations against real data.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Final gate run shows G0-G7 green (build/typecheck/lint/format/tests/smoke/UI-parity/contracts/diff/metrics), with test count ≥ baseline and zero tests weakened.
- **SC-002**: 100% of source files appear in `.refactor/00-inventory.md` and are marked done in a unit (or listed with reasons in `blocked.md`/`deferred.md`).
- **SC-003**: Zero circular dependencies and no confirmed-dead code or unused dependencies remain; duplication and complexity metrics are at or better than baseline.
- **SC-004**: Every page uses the single design system (tokens + primitives) while visual-parity holds except approved `change:` pages; business rules exist in exactly one tested place each.
- **SC-005**: `.refactor/STATE.md` always shows the single next action after any compaction, and every wave ends with a 5-line Egyptian-Arabic status (done / next / blockers / numbers).
- **SC-006**: `ARCHITECTURE.md` and `.refactor/FINAL_REPORT.md` exist, are accurate against the final code, and the branch is clean and linear with small describable commits.

## Assumptions

- Auto-detected from the repo: pnpm workspace (`apps/*`, `packages/*`, `workers/*`), Node 22, pnpm 10.33.4; executable truth is `package.json`, `vitest.config.ts`, `playwright.config.ts`, `.github/workflows/ci-cd.yml`; app commands per `AGENTS.md` (`pnpm install`, `pnpm db:generate`, `pnpm --filter @ibn-al-azhar-docs/web dev/build`, `pnpm check`, `pnpm ci:all`).
- Do-not-touch: `node_modules/`, `dist/`, `build/`, `.git/`, `.env*`, lockfiles (edit only via the package manager), generated code; everything public is frozen unless a Phase-2 spec declares a compatible migration.
- Sub-agents run on the same model/provider as the Orchestrator (OpenCode Go, Crouton Alpha Free); the disk (`.refactor/`) is the memory across compaction and sessions.
- Spec Kit may be unavailable (`specify` CLI install may fail); the fallback is hand-created `.specify/memory/constitution.md` + `specs/NNN-<unit>/{spec.md,plan.md,tasks.md}` with the same sequence.
- OpenCode task tool exposes `general` (full tools) and `explore` (read-only); custom `.opencode/agents/*.md` entries are tried once and, if not invocable, role instructions are pasted into `general`/`explore` packets.

## Definition of Done

This spec is done when: this file exists on the `refactor/total` branch with every requirement testable and every requirement carrying an acceptance criterion, plus at most 3 open questions below; a following `/plan` step produces `plan.md` and `/tasks` produces `tasks.md` under `specs/015-total-project-refactor/` without modifying this spec's requirements.

## Open Questions (max 3, non-blocking)

- **Q1**: Spec Kit CLI install — use `uv tool install specify-cli` (needs network/uv) or go straight to the hand-created fallback structure? (Either is allowed by FR-003; answer decides only the tooling path.)
- **Q2**: Should `.refactor/MASTER_PROMPT.md` be committed into this repo, or live outside it as the launch script the brief assumes? (Decides where `STATE.md` and the playbook live.)
- **Q3**: `E2E_FULL=1` vitest e2e project vs Playwright `tests/e2e/*.spec.ts` — which suite is authoritative for the G3 smoke gate when both exist? (Decides the smoke command in later `tasks.md`.)
