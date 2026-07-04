# Codebase Profile — Ibn Al-Azhar Docs

## Overview

| Metric              | Value           |
| ------------------- | --------------- |
| Total source files  | 385             |
| Total lines of code | 47,431          |
| TypeScript lines    | 39,262          |
| Test files          | 81              |
| Git history depth   | 50 commits      |
| Monorepo            | pnpm workspaces |

## Languages

| Extension | Count | Notes                                   |
| --------- | ----- | --------------------------------------- |
| .md       | 526   | Documentation (specs, ADRs, governance) |
| .html     | 281   | Generated/static                        |
| .ts       | 268   | TypeScript source                       |
| .mjs      | 114   | Scripts/tooling                         |
| .tsx      | 92    | React components                        |
| .sh       | 35    | Shell scripts                           |
| .json     | 34    | Config files                            |
| .mdx      | 22    | MDX content                             |
| .py       | 11    | OCR/processing scripts                  |
| .css      | 10    | Styles                                  |
| .yml      | 9     | CI/CD, Docker                           |
| .sql      | 9     | Migrations                              |

## Architecture

```
apps/web/           Next.js 16 App Router (standalone, Turbopack dev)
  src/
    domain/         Types, auth, repository interfaces
    core/           DI (composition-root), use-cases, repository impls
    lib/            Auth, validation, errors, storage, logger
    app/api/        14 route groups (thin — delegate to use-cases)
    app/[locale]/   i18n pages

packages/pipeline/  Shared OCR, queue, storage, text logic (raw TS, no build)

workers/
  ocr-worker/       BullMQ consumer — OCR processing
  export-worker/    BullMQ consumer — export tasks
  shared/           Health server, logger

prisma/             Schema (10 models, PostgreSQL 16), migrations, seed
tests/              Unit, integration, security, pentest, load, recovery, backup, e2e, api
```

## Key Patterns

- **Clean Architecture**: domain/ → core/ (use-cases, repositories) → app/api/ (route handlers)
- **DI via composition-root.ts**: single source of use-case instances
- **Repository pattern**: interfaces in domain/, Prisma implementations in core/repositories/
- **Arabic-first / RTL-first**: locale-driven, logical CSS
- **Docker-first**: docker-compose.yml for full stack, dev-infra for local
- **Spec-driven**: specs/ directory, phase-gated implementation

## Prisma Schema (10 models)

User, Account, Session, VerificationToken, Document, Folder, Tag, TagDocument, ConversionJob, ShareLink, UserSetting, AuditLog

Enums: Role (ADMIN/STUDENT/TEACHER), DocStatus (9 states), JobStatus (5 states)

## Test Infrastructure

| Config                       | Purpose                         |
| ---------------------------- | ------------------------------- |
| vitest.config.ts             | Unit tests                      |
| vitest.integration.config.ts | Integration tests (DB required) |
| vitest.security.config.ts    | Security tests                  |
| vitest.pentest.config.ts     | Penetration tests               |
| vitest.load.config.ts        | Load tests                      |
| vitest.recovery.config.ts    | Recovery tests                  |
| vitest.backup.config.ts      | Backup/restore tests            |
| vitest.api.config.ts         | API tests                       |
| playwright.config.ts         | E2E tests                       |

## Audit Dimensions Recommended

All 10 dimensions apply. Project is >10 files → orchestrate with 8 parallel agents.
