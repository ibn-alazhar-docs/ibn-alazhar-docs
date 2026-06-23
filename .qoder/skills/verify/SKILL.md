---
name: verify
description: Run the full CI pipeline locally — format check, lint, typecheck, tests, and secrets scan. Use before committing or pushing to catch issues early. Trigger with "verify", "check", "run CI locally", or when the user wants to validate changes.
---

Run the full local CI pipeline and report results per step.

## Steps

1. Ensure infrastructure is running: `./ibn.sh dev-infra` (Postgres on 5433, Redis, MinIO). If already running, skip.
2. Run `pnpm ci:all` which executes in order:
   - `pnpm format:check` — Prettier formatting
   - `pnpm lint` — ESLint with zero-tolerance (`--max-warnings 0`)
   - `pnpm typecheck` — TypeScript across all 4 workspaces (web, pipeline, ocr-worker, export-worker)
   - `pnpm test` — Vitest unit/integration tests
   - `pnpm secrets:scan` — Scans for leaked secrets

3. Report the result of each step as PASS or FAIL. If any step fails, show the error output and stop (don't continue to the next step — `pnpm ci:all` uses `&&` chaining).

## Notes

- If Prisma schema was modified, run `pnpm db:generate` before verify.
- Tests require Postgres, Redis, and MinIO to be running. If tests fail with connection errors, remind the user to run `./ibn.sh dev-infra`.
- For a single test file: `pnpm test tests/path/to/file.test.ts`
- For a single test by name: `pnpm test -- -t "test name pattern"`
