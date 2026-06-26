# AGENTS.md

Arabic-first, RTL-first, Docker-first document processing platform for Azhar students.
**Pipeline**: PDF/Image → OCR → Cleanup → Markdown → Preview → Export.

## Quick start

```bash
./ibn.sh start                          # Full Docker stack
# Or for local dev on host with Docker infra:
./ibn.sh dev-infra                      # Postgres (port 5433) + Redis + MinIO
pnpm db:generate && pnpm db:migrate && pnpm db:seed
pnpm --filter @ibn-al-azhar-docs/web dev
```

## Correct commands

| Command                 | What                                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| `pnpm format:write`     | Prettier                                                                                           |
| `pnpm lint`             | ESLint — `--max-warnings 0` (zero-tolerance)                                                       |
| `pnpm typecheck`        | `tsc --noEmit` × 4 (web, pipeline, ocr-worker, export-worker)                                      |
| `pnpm check`            | `format:check → lint → typecheck` (fast pre-push gate)                                             |
| `pnpm test`             | Unit tests — `tests/**/*.test.ts` (excludes integration/security/pentest/load/recovery/backup/api) |
| `pnpm test:integration` | Integration tests (requires DB)                                                                    |
| `pnpm test:security`    | Security tests                                                                                     |
| `pnpm test:pentest`     | Penetration tests                                                                                  |
| `pnpm test:load`        | Load tests                                                                                         |
| `pnpm test:recovery`    | Recovery tests                                                                                     |
| `pnpm test:backup`      | Backup & restore tests                                                                             |
| `pnpm coverage`         | Unit tests with v8 coverage                                                                        |
| `pnpm ci:all`           | `format:check → lint → typecheck → test → secrets:scan`                                            |
| `pnpm secrets:scan`     | Scan staged files (also runs in pre-commit hook)                                                   |
| `npx playwright test`   | E2E tests in `tests/e2e/`                                                                          |

Workers (run via `tsx`, no build step):

```bash
pnpm --filter @ibn-al-azhar-docs/ocr-worker start
pnpm --filter @ibn-al-azhar-docs/export-worker start
```

## Monorepo map

```
apps/web/           Next.js 16 App Router (standalone output, Turbopack dev)
packages/pipeline/  Shared OCR, queue, storage, text logic (raw TypeScript — no build step)
packages/config/    Empty package
workers/            ocr-worker, export-worker (BullMQ consumers, tsx entry), shared (health-server, logger)
prisma/             Schema + migrations (PostgreSQL 16, relationMode = "prisma")
infrastructure/     Docker configs (Caddy, monitoring), HF deployment (Dockerfile, entrypoint.sh)
docs/               Test reports (docs/testing/), production docs (RUNBOOK, ALERTING_RULES), deployment guides
tests/              Unit, integration, security, pentest, load, recovery, backup test suites
```

## Architecture (post-refactor)

```
apps/web/src/
  domain/            Types, auth, repository interfaces (IDocumentRepository, etc.)
  core/
    composition-root.ts  Central DI — creates all use-cases with repository injection
    use-cases/           Business logic (UserUseCases, TagUseCases, ExportUseCases, etc.)
    repositories/        Prisma implementations of domain interfaces
  lib/               Auth, validation, errors, storage, logger
  app/api/           Next.js route handlers (thin — delegate to use-cases via composition-root)
```

**Rules:**

- Routes import from `@/core/composition-root` (never directly from use-cases or repositories)
- Use-cases accept repository interfaces (never concrete implementations)
- `composition-root.ts` is the single source of use-case instances
- Domain types live in `domain/`, not in `lib/`

## Gotchas an agent would miss

- **`@ibn-al-azhar-docs/pipeline` is consumed as raw TypeScript** — `main` points to `src/index.ts`, no tsc compilation. Consumers need `tsx`.
- **Typecheck is 4 separate commands**, not one. Each workspace has its own `tsconfig.json`. All inherit from `tsconfig.base.json`.
- **Dev Postgres is on port 5433** — `docker-compose.dev.yml` maps host:5433 → container:5432.
- **Tests require running infra** — run `./ibn.sh dev-infra` (Postgres, Redis, MinIO) before `pnpm test` or `pnpm ci:all`.
- **Next.js standalone output misses bcryptjs** in pnpm layout — Dockerfile copies it manually.
- **OCR workers call Python scripts** (`generate_pdf.py`, `split-pdf.py`) via `exec` — requires Python venv with pypdfium2, Pillow, pytesseract, tesseract-ocr-ara.
- **`archive/`, `00_Inbox/`, `09_Archive/` are non-canonical** — excluded from tsconfig, eslint, vitest, prettier, dockerignore.
- **Vitest aliases** — `@` maps to `apps/web/src`, `@ibn-al-azhar-docs/pipeline` maps to `packages/pipeline/src`. Configured in each `vitest.*.config.ts`.
- **Test setup mocks auth/navigation** — `tests/setup.ts` mocks `@/lib/auth`, `next/server`, `next/navigation`. New tests inheriting from the root config get these automatically.
- **Workers load env via `--env-file`** — e.g. `tsx --env-file=../../.env src/index.ts`. No `dotenv.config()` in worker code.
- **`pnpm ci:all` fails fast** — stops at first failing stage (format:check → lint → typecheck → test → secrets:scan).

## Phase status

Check `.opencode/context/active-phase.md` for the canonical current phase and scope. The phase system uses phase terminology (not "sprint").

## Key constraints

- **Conventional Commits**: Use `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:` prefixes.
- **Branch naming**: `feat/description` or `fix/description` (matches CI triggers).
- **Spec-driven**: Read `specs/NNN-feature/spec.md` before implementing.
- **Phase-locked**: Check `.opencode/context/active-phase.md` — do not implement outside current phase scope.
- **Arabic-first / RTL-first**: UI defaults to Arabic. Use logical CSS (`ms-`/`me-` not `ml-`/`mr-`).
- **Brand**: Green `#16A34A` (NOT `#10B981`), Gold `#CA8A04`, Gray `#1F2937`, Font Cairo.
- **Code style**: `interface` over `type` for objects. Named exports only (except Next.js pages/layouts). Never use `any`. See CODE_STYLE.md.
- **`.opencode/` is the runtime OS**: Read `AI_OPERATING_RULES.md` and `SESSION_RULES.md` for mandatory agent rules.
- **Other instruction files** (loaded by `opencode.json`): `CODE_STYLE.md`, `SECURITY.md`, `CONTRIBUTING.md`, `governance/*.md`.
