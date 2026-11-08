# Tasks: Total Project Refactor (Code, Logic, Design, Architecture)

**Input**: Design documents from `/specs/015-total-project-refactor/`

**Prerequisites**: plan.md (required), spec.md (required for user stories/US1-US4), research.md/ contracts/ — produced per-unit in Phase 2 of plan.md.

**Tests**: Included explicitly for this refactor (FR-005, FR-010): characterization + smoke + contract-diff are part of the deliverable, not optional.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested, and delivered independently. No task exists without a spec requirement (FR-xxx) and a user story (US-x).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (disjoint files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US4)
- Each task names its files, its FR mapping, and its machine-checkable acceptance criterion.

## Path Conventions

- Monorepo: `apps/web/src/`, `packages/pipeline/`, `packages/database/`, `packages/shared/`, `workers/*/src/`, `tests/`, `specs/`, `docs/`
- Refactor artifacts: `.refactor/`, `specs/<unit>/`
- **Delegation note**: Per `MASTER_PROMPT.md` §2/§6, sub-agents run on the same model as the Orchestrator (OpenCode Go, Crouton Alpha Free); do **not** set `model: "opencode/<model>"` overrides. Valid `mode=subagent` types: `general` (worker/reviewer), `explore` (read-only mapper). `Build` and `Plan` are primary-only and must not be used as child agents. Where this file says "subagent", it means `general`/`explore` without a model override. Human verification is needed only where marked.

---

## Phase 1: Setup (branch, repo artifacts, tooling)

**Purpose**: Create the work branch and the on-disk memory the whole refactor depends on (US1, US2).

```text
- [x] T001 [US1] Create refactor/total branch + pre-refactor tag; scaffold .refactor/ (MASTER_PROMPT.md, STATE.md shell). Files: branch/tag, .refactor/. Acceptance: git rev-parse --verify refactor/total and pre-refactor exit 0. FR-001, FR-012. **Done**: orchestrator-direct (3 sub-agent dispatches failed: free-tier quota ×2 + medium service-account disabled); models deepseek-v4.1-flash-free/glm-5.3-flash-free/medium-tier; branch refactor/total @ b5dc563, tag pre-refactor @ b5dc563 verified; pnpm prettier --check .refactor exit 0; spec-review-gate timed out >300s (no completed tasks yet — expected, not a product failure).
- [x] T002 [P] [US1] Detect stack/entry points and record commands in .refactor/00-baseline.md (install, build, typecheck, lint, tests). Files: .refactor/00-baseline.md. Acceptance: every command run, exit codes + counts + timings recorded. FR-004. **Done**: orchestrator-direct (sub-agent quota exhausted, see STATE.md); install 8s OK, build 166s OK, typecheck 101s OK, lint 14s OK, format:check 28s OK, unit 79 files, frontend 31, regression 1 passed; integration/API/security/E2E not run (need live Postgres+Redis); no pre-existing failures in runnable subset.
- [x] T003 [P] [US1] Run analyzers into .refactor/analysis/ (dependency graph/cycles, unused exports/deps, duplication, complexity, large files, type holes, security audit). Files: .refactor/analysis/*.md. Acceptance: raw summaries saved (madge/knip/jscpd or scripted fallbacks; no installs if avoidable). FR-004. **Done**: scripted grep/count fallback (no installs); .refactor/analysis/summary.md with real counts (1384 TS/TSX, 23 TODO, 2591 any-matches, 481 files >40KB); noted as approximations for ranking.
- [x] T004 [P] [US2] Distill methodology into .refactor/PLAYBOOK.md (max ~150 lines) for workers. Files: .refactor/PLAYBOOK.md. Acceptance: wc -l <= 150, commands/citations accurate. FR-012. **Done**: orchestrator-direct; PLAYBOOK written (~70 lines) with golden rules, lenses, repo truths, commands, waves, commits.
```

---

## Phase 2: Foundational (BLOCKING — full system map + unit decomposition)

**Purpose**: 100%-coverage map and ordered unit plan before any product code changes (US1, US2).

```text
- [x] T005 [P] [US1] Map models/packages: all files in apps/web/src, packages/*, workers/* with purpose + size. Files: .refactor/map/models.md (<=80 lines). Acceptance: entry count matches Glob count for those trees. FR-006. **Done**: sub-agent `explore` + model opencode/crouton-alpha-free (read-only; orchestrator saved the returned content); .refactor/map/models.md 63 lines; apps/web/src 331 files/28,203 lines, pipeline 100/18,639, database 2 src + 448-line schema, shared 7/1,868, workers ocr ~1,431 + export ~329; exclusions listed (node_modules, dist, generated openapi).
- [x] T006 [P] [US1] Map dependency graph + layering (cycles, wrong-direction imports vs AGENTS.md boundaries). Files: .refactor/map/deps.md (<=80 lines). Acceptance: graph command output archived; cycle count stated. FR-006, FR-008 (lens D). **Done**: sub-agent `explore` + opencode/crouton-alpha-free, orchestrator saved content; 60 lines; rule 1 = 1 type-only cast, rule 2/3 = 0; no cycles by grep (madge gap noted); single direction shared←database←pipeline←workers/web.
- [x] T007 [P] [US1] Map data flow/state/contracts: routes, API endpoints, schema, env vars, public exports + sources of truth. Files: .refactor/map/contracts.md (<=80 lines). Acceptance: every route/endpoint/schema/env/export listed with file+path. FR-006. **Done**: sub-agent `explore` + opencode/crouton-alpha-free, orchestrator saved content; 43 lines; 78 routes grouped, 16 DB models + 4 enums, 83 env vars, external services, pipeline/shared/database exported APIs, state homes + flow.
- [x] T008 [P] [US1] Map business rules + design system + smells (duplicated rules, tokens, duplicate components, inline styles, dead CSS, a11y/RTL gaps, TODO/FIXME). Files: .refactor/map/rules-design-smells.md (<=80 lines). Acceptance: rules keyed by file+line; smells ranked impact×spread. FR-006, FR-008 (lens B, C). **Done**: sub-agent `explore` + opencode/crouton-alpha-free, orchestrator saved content; 47 lines; QUEUE_DRIVER stars, 50/100/2048 upload-limit contradiction, ownedWhere, rate limits, idempotency, tokens/duplicates/inline-style/dead-CSS/RTL, top-10 smells with file refs.
- [x] T009 [US1] Index everything into .refactor/00-inventory.md (file -> unit), prove 100% source coverage. Files: .refactor/00-inventory.md. Acceptance: 0 unmapped source files vs Glob count. FR-006. **Done**: orchestrator-direct (sub-agents exhausted quota; Crouton Arrow wave verified for T005–T008 only); .refactor/00-inventory.md maps 18 provisional units (U01–U18) covering apps/web/src 331 + pipeline 100 + database schema + shared 7 + workers 15, each file exactly once.
- [x] T010 [US2] Write .specify/memory/constitution.md (or hand fallback .specify/ structure per FR-003) + .refactor/01-plan.md (units <=10 files/~800 lines, order foundations->leaves->pages, parallelism). Files: .specify/memory/constitution.md, .refactor/01-plan.md. Acceptance: constitution exists; 01-plan orders units with dependency justification. FR-003, FR-007, FR-012. **Done**: orchestrator-direct; .specify/memory/constitution.md 13 lines (principles from MASTER_PROMPT + repo truths); .refactor/01-plan.md 33 lines with 7-wave order + sub-splitting for U06/U07/U08/U12/U14.
```

**Checkpoint**: Foundation ready — no user-story implementation begins before T001–T010 are done and committed.

---

## Phase 3: User Story 1 — Behavioral identity (P1) 🎯 MVP

**Goal**: Baseline safety net + per-unit refactor with G0–G7 green and contracts byte-identical.

**Independent Test**: Baseline suite (G2) + route smoke (G3) + contract diff (G5) on the final branch vs `pre-refactor`.

```text
- [ ] T011 [US1] Commit safety net: characterization tests for critical logic + smoke test for every route/page (fail on runtime/console errors). Files: tests characterization + smoke, .refactor/visual-baseline/ (Playwright mobile+desktop before-screenshots). Acceptance: suite green on pre-refactor tree. FR-005, FR-010 (G2, G3, G4).
- [ ] T012 [US1] Per-unit Spec Kit sequence for the first unit (foundations: tokens/shared types/utils): specify (As-Is + To-Be) -> clarify -> plan -> tasks -> analyze. Files: specs/<unit>/{spec.md,plan.md,tasks.md}. Acceptance: consistency check passes; tasks carry allowlists + acceptance commands. FR-003.
- [ ] T013 [US1] Execute first foundation unit in waves (max 3-4 workers, disjoint allowlists; orchestrator runs G0-G7 + reviewer PASS per task; commit after each). Files: unit allowlist only. Acceptance: G0-G7 exit 0 with output; reviewer verdict PASS recorded. FR-009, FR-010, FR-014.
- [ ] T014 [US1] Execute leaf units (pipeline text/clean + queue + storage, database, workers) in waves with per-task gates. Files: unit allowlists. Acceptance: G0-G7 exit 0 per task; contracts diff empty (G5). FR-008, FR-009, FR-010.
- [ ] T015 [US1] Execute web-layer units (domain -> core -> ui/state -> routes) in waves with per-task gates. Files: unit allowlists. Acceptance: G0-G7 exit 0 per task; visual parity holds (G4). FR-008, FR-009, FR-010.
```

**Checkpoint**: US1 independently demonstrable — behavior and contracts identical to baseline.

---

## Phase 4: User Story 2 — Agent navigability & resumability (P1)

**Goal**: A fresh session (or compaction) can continue from disk alone and execute a small task correctly.

**Independent Test**: Fresh-context subagent executes one small task packet using only `.refactor/`, unit specs, and its allowlist; gates pass first dispatch.

```text
- [ ] T016 [US2] Verify STATE.md/PLAYBOOK.md/unit templates support a blind packet execution (one pilot task, fresh-context reviewer). Files: .refactor/STATE.md, .refactor/PLAYBOOK.md. Acceptance: pilot task green without orchestrator re-explaining. FR-009, FR-012.
- [ ] T017 [P] [US2] Produce .refactor/FINAL_REPORT.md skeleton (before/after metrics table, decisions summary, change:/bugs/deferred sections, how-to-run). Files: .refactor/FINAL_REPORT.md. Acceptance: every metric has a baseline and final column (filled at Phase 5). FR-015.
```

---

## Phase 5: User Story 3 — Duplication, dead code, single-source rules (P2)

**Goal**: Measurable payoff with metrics at or better than baseline (G7).

**Independent Test**: Re-run dependency/duplication/dead-code scans on the final tree; no cycles, no confirmed-dead leftovers, one source per business rule.

```text
- [ ] T018 [US3] Remove duplication: merge duplicate components into tokens + primitives per lens C; extract shared helpers at third repetition. Files: ui/primitives + affected pages (allowlisted). Acceptance: duplication scan improves vs baseline; G0-G7 exit 0. FR-008 (lens A, C), FR-010 (G7).
- [ ] T019 [US3] Promote business rules to pure tested domain functions (lens B): validation, state machines, permissions, calculations incl. empty/null/huge/timezone edges. Files: domain modules + tests. Acceptance: each rule has a unit test; STATE.md/decision log records the winning copy. FR-008 (lens B), FR-013.
- [ ] T020 [US3] Delete confirmed dead code + unused dependencies; align naming/folder conventions across the repo (lens D). Files: allowlisted removals + docs index. Acceptance: dead-code/unused-dep scans report zero confirmed-dead; no cycle. FR-008 (lens D), FR-010 (G7).
```

---

## Phase 6: User Story 4 — UI parity first, then approved improvements (P3)

**Goal**: Design/system consolidation without smuggled visuals.

**Independent Test**: Visual comparison vs `.refactor/visual-baseline/` shows differences only on pages with approved `change:` specs.

```text
- [ ] T021 [US4] Centralize design tokens and replace hardcoded color/spacing/typography/radius/shadow/z-index/breakpoint values. Files: token files + ui layer. Acceptance: no hardcoded token values left in allowlisted files; parity screenshots match. FR-008 (lens C), FR-002. Human verification: spot-check 3 pages visually.
- [ ] T022 [US4] Complete component states + responsive/semantic/a11y pass (default/hover/focus/active/disabled/loading/empty/error; keyboard, contrast, reduced-motion; RTL preserved). Files: ui primitives + pages. Acceptance: axe/a11y tests green; parity holds. FR-008 (lens C), FR-002. Human verification: keyboard/contrast spot-check.
- [ ] T023 [US4] (Optional) Approved visual improvements as separate specs + change: commits with decisions entries. Files: per-spec allowlists. Acceptance: each item has a change: commit + .refactor/decisions.md entry; screenshots compared only on those pages. FR-002, FR-012.
```

---

## Phase 7: Polish, integration, final audit & delivery

**Purpose**: Cross-unit integration and the final, evidence-backed delivery (FR-015).

```text
- [ ] T024 [US1] Integration pass: cross-unit wiring, re-run dependency analysis (no cycles, right direction), verify every route end to end. Files: integration seams only. Acceptance: dep scan clean; smoke green. FR-010, FR-013.
- [ ] T025 [US1] Final full gate suite on the final state; regenerate metrics vs baseline; fill .refactor/FINAL_REPORT.md. Files: .refactor/FINAL_REPORT.md. Acceptance: G0-G7 exit 0 and recorded; test count >= baseline. FR-010, FR-015.
- [ ] T026 [US2] Write ARCHITECTURE.md (module map, layers, data flow, routing map, Mermaid) + update README/contribution/setup docs where wrong. Files: ARCHITECTURE.md, README.md, docs/. Acceptance: every relationship touched is documented; build/run steps verified by executing them. FR-015.
- [ ] T027 [P] [US2] Final audit of artifacts: decisions.md, bugs-found.md, blocked.md, deferred.md complete and accurate; branch linear with small Conventional-Commits entries. Files: .refactor/*.md consistency check. Acceptance: each bug/blocker/deferred item has a reason + evidence link. FR-011, FR-012, FR-014.
```

### Human verification required (not automatable)

- T021/T022: visual spot-check on 3+ pages (parity judgment).
- T026: human sanity-read of `ARCHITECTURE.md`/`FINAL_REPORT.md` accuracy (they may also be produced by a reviewer subagent with a second human pass).
- Merge of `refactor/total` back to `main` is a separate human decision after final audit; this tasks file does not authorize it.

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → no dependencies; start immediately.
- **Foundational (Phase 2)** → depends on Setup; **BLOCKS all user stories**.
- **User Stories**: US1 (Phase 3) depends on Phases 1-2; US2/US3/US4 (Phases 4-6) depend on US1's safety net for their parity/contract gates, then run in priority order, parallel only with disjoint allowlists.
- **Polish/integration/audit (Phase 7)** → depends on all desired stories being complete.
- Within a unit: tests/safety-net → Logic → Code → Architecture → Design (never design before stabilized tokens/components).
- Parallel opportunities: all `[P]` tasks with disjoint files; mappers T005-T008 in parallel; leaf units in parallel after foundations.

## Parallel Example: Phase 2 mapping

```bash
# Launch all read-only mappers together (explore sub-agents, max 4):
Task (explore): "Map models/packages -> .refactor/map/models.md (<=80 lines, read-only)"
Task (explore): "Map dependency graph/layering -> .refactor/map/deps.md (<=80 lines, read-only)"
Task (explore): "Map data flow/state/contracts -> .refactor/map/contracts.md (<=80 lines, read-only)"
Task (explore): "Map business rules + design system + smells -> .refactor/map/rules-design-smells.md (<=80 lines, read-only)"
```

## Implementation Strategy

**MVP First (User Story 1 only)**: Phase 1 → Phase 2 → T011 safety net → T012-T013 first foundation unit with G0–G7 → **STOP and VALIDATE** (contract diff + smoke + parity). Ship/demonstrate only when green.

**Incremental Delivery**: US1 (behavioral identity) → US2 (navigability) → US3 (dedup/single-source) → US4 (design consolidation), each independently testable, each ending with a 5-line status (done/next/blockers/numbers) in Egyptian Arabic.

**Parallel Team Strategy**: 1 orchestrator + up to 4 workers per wave; workers never spawn sub-agents; fresh-context reviewer per task; orchestrator owns the shared layer serially.

## Notes

- [P] tasks = disjoint files, no dependencies; no two workers touch the same file.
- Each task ≤ ~1 hour, ≤ ~400 changed lines, one concern; if a worker needs more, split the task — never stretch it.
- Max 3 diagnose-and-fix attempts per task, then revert into `.refactor/blocked.md` (FR-011).
- Verify gates by running them; never infer from the worker's report (MASTER_PROMPT §1).
- Commit after each task or logical group (`refactor(scope):` / `test(scope):` / `fix(scope):` / `change(scope):` / `docs:` / `chore:`).
- Stop at any checkpoint to validate a story independently before continuing.
