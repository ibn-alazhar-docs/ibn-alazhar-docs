# Baseline (Phase 0, T002)

Recorded 2026-11-08 on branch `refactor/total` at `b5dc563` (head `df2ec77` after T001).

## Stack detection

- Root `package.json`: name `ibn-al-azhar-docs`, `packageManager pnpm@10.33.4`, `engines node 22.x / pnpm 10.33.4`.
- Workspace (`pnpm-workspace.yaml`): `apps/*`, `packages/*`, `workers/*`. `apps/web` = Next 16 App Router (`next dev --turbopack`); `packages/pipeline` (OCR/queue/storage/export/text), `packages/database` (Prisma `postgres:16`), `packages/shared` (types/logging, excluded from root typecheck), `workers/ocr-worker` + `workers/export-worker`.
- Toolchain verified: node v22.22.3, pnpm 10.33.4.

## Commands run (real output, same day)

| Command | Result | Duration |
|---|---|---|
| `pnpm install --frozen-lockfile` | OK, `Done in 7.8s` | 8s |
| `pnpm --filter @ibn-al-azhar-docs/web build` | OK, full Next 16 production build with all routes listed | 166s |
| `pnpm typecheck` (5 projects) | OK, no errors | 101s |
| `pnpm lint` (zero warnings) | OK | 14s |
| `pnpm format:check` | OK, "All matched files use Prettier code style!" | 28s |
| `pnpm test:unit` | 79 test files passed | 198s |
| `pnpm test:frontend` | 31 test files passed | 68s |
| `pnpm test:regression` | 1 test file passed | 18s |

## Not run in baseline (why)

- `test:integration` / `test:api` / `test:security` / `test:e2e`: need live Postgres+Redis (CI supplies services; dev has `./ibn.sh dev-infra`). Not counted against the refactor; recorded as environmental, not a failure.
- `test:edge` / `test:fuzz` / `test:pentest` / `test:recovery`: have `test:*` scripts but **no CI job** — will be run explicitly per tasks.md when those areas change.
- `pnpm test` (bare): runs the whole vitest suite including live-service projects — same environmental limit as above.

## Pre-existing failures

None in the runnable subset above. Full-suite and E2E status is governed by CI; the E2E job has historically been slow (180-min timeout) rather than failing on assertions.

## Counts for later floors (G7)

- TS/TSX source files: 1384 (`apps/web/src`, `packages`, `workers`).
- Routes in `apps/web/src/app`: 19 `page.tsx`, 78 `route.ts` (API handlers).
- Test files runnable without services: unit 79, frontend 31, regression 1.
