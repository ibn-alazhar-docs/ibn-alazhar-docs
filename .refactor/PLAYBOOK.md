# Refactor Playbook (distilled, T004)

Golden rules: behavior preserved; small verified steps; tests first; one concern per task; never weaken a test or a rule to get green. Disk (`.refactor/`) is memory — re-read `STATE.md` first after any compaction.

## Layers per unit (in order)

1. Tests/safety net (characterization, smoke, screenshots).
2. Logic: pure domain functions; one source of truth per rule/state; tested edge cases.
3. Code: intent names; single-purpose functions; guard clauses; no magic values; extract at third repetition; remove dead code.
4. Architecture: one-directional deps; no cycles; small public interfaces; routing/data/config/logging in one obvious place.
5. Design: tokens first (color/spacing/type/radius/shadow/z/breakpoints); primitives with full states (default/hover/focus/active/disabled/loading/empty/error); parity refactor before any `change:` improvement.

## Repo truths (never violate)

Arabic-only `[ar]`, RTL logical props, `next-intl`; no guest tools (`/api/tools/guest/*` absent), tools internal `/ar/tools`; `QUEUE_DRIVER` default `redis`, no dual-write, never set in runtime config/Dockerfile/supervisord; import boundaries (`core/services` ⊉ prisma, `ui/state` ⊉ prisma/pipeline/queue/google, `domain` ⊉ app/ui/core/middleware/transport); `deletedAt` soft-delete; DOCX template vendored; `Amiri`+`OFL.txt` only; no `push --force`/`reset --hard`.

## Commands

- `pnpm check` = prettier --check -> eslint --max-warnings 0 -> tsc (5 projects; shared excluded, `tsc -p packages/shared/tsconfig.json --noEmit`). `pnpm ci:all` = check + test + secrets:scan.
- Focused tests: `pnpm vitest run --project=<name> <path>`; bare `pnpm test` runs everything. Unit needs `pandoc`; integration/API/security/E2E need live services via `./ibn.sh dev-infra` (Postgres 5433); integration/recovery serialized. E2E: CI production `next start`, 180-min, no `networkidle`. CI has no edge/fuzz/pentest/recovery/regression jobs — run explicitly.

## Waves & verification

Max 3-4 workers, disjoint allowlists, task packets (goal, lens, allowlist, contracts, current behavior, steps, acceptance commands). Orchestrator re-runs gates G0-G7 itself after each task and dispatches a fresh-context reviewer. On failure: capture → classify → root-cause → smallest fix → full gates; max 3 attempts, then revert to `blocked.md`.

## Commits

`refactor(scope):` / `test(scope):` / `fix(scope):` / `change(scope):` / `docs:` / `chore:` — one per completed task. Bugs → `bugs-found.md` + separate `fix:` with a test. Non-obvious choices → `decisions.md`. Never commit secrets/`.env*`.
