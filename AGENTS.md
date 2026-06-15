# AGENTS.md — Ibn Al-Azhar Docs

Arabic-first, RTL-first, Docker-first document processing platform for Azhar students.
**Pipeline**: PDF/Image → OCR → Cleanup → Markdown → Preview → Export.

## Quick start

The easiest way to start and manage the entire environment (including the database, workers, and web server) is by using the `./ibn.sh` helper script:

```bash
pnpm install
./ibn.sh start
```

Alternatively, for local development on the host connecting to Docker-based infrastructure:

```bash
./ibn.sh dev-infra
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm --filter @ibn-al-azhar-docs/web dev
```

## Commands

| Command                                   | What                                                 |
| ----------------------------------------- | ---------------------------------------------------- |
| `pnpm lint`                               | ESLint — `--max-warnings 0` (zero-tolerance)         |
| `pnpm typecheck`                          | `tsc -p tsconfig.base.json --noEmit`                 |
| `pnpm test`                               | Vitest — tests in `tests/**/*.test.ts`               |
| `pnpm test -- -t "pattern"`               | Run single test by name                              |
| `pnpm test tests/backend/text.test.ts`    | Run single test file                                 |
| `pnpm format:check` / `pnpm format:write` | Prettier (semi, singleQuote: false, printWidth: 100) |
| `pnpm validate:content`                   | Validate MDX/etc content                             |
| `pnpm secrets:scan`                       | Secret scanning                                      |
| `pnpm ci:all`                             | lint + typecheck + validate:content + test           |
| `pnpm docker:down`                        | Stop infra containers                                |
| `pnpm db:studio`                          | Prisma Studio                                        |

Playwright E2E: `npx playwright test` (tests in `tests/e2e/`, config at root `playwright.config.ts`).

Workers (separate processes, started individually):

```bash
pnpm --filter @ibn-al-azhar-docs/ocr-worker start
pnpm --filter @ibn-al-azhar-docs/export-worker start
```

## Monorepo

```
apps/web/          Next.js 16 App Router (main app)
packages/pipeline/ Shared OCR, queue, storage, text cleanup logic
workers/           ocr-worker, export-worker (BullMQ consumers)
prisma/            Schema + migrations (PostgreSQL 16)
```

Key packages: `@ibn-al-azhar-docs/web`, `@ibn-al-azhar-docs/pipeline`.

## Architecture essentials

- **Middleware** (apps/web/src/middleware.ts): i18n → auth → rate-limit → CSRF
- **Routing**: locale-prefixed `[locale]/(auth)/`, `[locale]/(dashboard)/`, `[locale]/(public)/` + flat `/api/*`
- **Auth**: NextAuth.js v5, Credentials provider, JWT (24h), bcryptjs
- **I18n**: next-intl, Arabic (`ar`) default, English (`en`) available
- **State**: no global store — server components + URL params
- **Pipeline**: BullMQ queues, MinIO storage, hybrid OCR (Surya local + Google fallback), SSE progress
- **Soft delete**: `deletedAt` on User, Document, Folder
- **DB enums**: `Role` (ADMIN/STUDENT/TEACHER), `DocStatus` (UPLOADED→…→COMPLETED/FAILED/ARCHIVED), `JobStatus` (PENDING/…/CANCELLED)

## Code conventions

- TypeScript strict — no `any`, use `unknown`
- Named exports, async/await, camelCase vars/fns, PascalCase components/types, UPPER_SNAKE_CASE constants
- Arabic-first: UI text, errors, comments default to Arabic
- RTL-first: every layout supports RTL natively
- Prisma: `relationMode = "prisma"`, `DATABASE_URL` + `DATABASE_URL_DIRECT`
- Brand: Green `#16A34A`, Gold `#CA8A04`, Gray `#1F2937`, White `#FFFFFF`, Font Cairo

## Phase status

| Phase    | Scope                                          | Status |
| -------- | ---------------------------------------------- | ------ |
| 1A–1D    | Pipeline (OCR, cleanup, queue, export)         | ✅     |
| 2A       | Auth (NextAuth.js v5, JWT, roles)              | ✅     |
| 2B-1     | Folder management (5-level, soft-delete)       | ✅     |
| 2B-2     | Document org (status lifecycle, listing, bulk) | ✅     |
| 2C-1     | Search (SQL full-text, suggestions)            | ✅     |
| **2C-2** | **Tags** (in progress)                         | **⏳** |
| 2C-3     | Enhanced export                                | 📋     |
| 2D       | Sharing                                        | 📋     |

## Key constraints

- **Spec-driven**: no implementation without an approved spec (`specs/NNN-feature/spec.md`)
- **Phase-locked**: work must stay within the active phase scope
- **Docker-first**: all services run in containers for dev
- **No free-forever hosting claims**
- **Security**: CSP headers, rate-limit, CSRF, input validation with Zod, `secrets:scan` script
- GitHub Actions CI: `format:check → lint → typecheck → test` (PostgreSQL service container)

## Skills to load automatically

From `.agents/skills/` — load the matching skill before writing code:

- UI/UX: `impeccable`, `frontend-design`, `tailwind-v4-shadcn`
- Next.js: `nextjs-app-router-patterns`
- DB: `prisma-postgres`
- Testing: `playwright-best-practices`, `vitest`
- Security: `security-review`, `code-reviewer`
- DevOps: `deploy-to-vercel`
- BullMQ: `bullmq-specialist`
- Docker: `docker-compose-orchestration`, `docker-expert`
- Git: `speckit-git-*`
- Arabic/RTL: `arabic-rtl`, `brand-consistency`

## Referenced by opencode.json

`opencode.json` loads these as instructions: `AGENTS.md`, `CODE_STYLE.md`, `SECURITY.md`, `CONTRIBUTING.md`, `governance/*.md`.
(Note: `CODE_STYLE.md` and `CONTRIBUTING.md` do not exist yet — just `AGENTS.md` + `SECURITY.md` + governance.)

## MCP servers (opencode.json)

| Server                       | Status   |
| ---------------------------- | -------- |
| postgres (ibn_al_azhar_docs) | enabled  |
| sequential-thinking          | enabled  |
| memory                       | enabled  |
| playwright                   | disabled |
| github                       | disabled |
| context7-local               | disabled |
