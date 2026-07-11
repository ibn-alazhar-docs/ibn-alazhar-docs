# 🎯 Coverage Goals

> Coverage targets and quality gates for Ibn Al-Azhar Docs.

## Mandatory Gates (100% Must Pass)

These are enforced by the regression config (`tests/regression/regression.config.ts`) and CI pipeline. Zero failures allowed.

| Gate                                  | Threshold           | Enforcement                                    |
| ------------------------------------- | ------------------- | ---------------------------------------------- |
| API response status codes             | 100% correct        | `tests/api/`                                   |
| API error shapes                      | 100% correct schema | `tests/api/`                                   |
| Auth guard on protected routes        | 100% enforced       | `tests/api/`, `tests/security/`                |
| Input validation rejects invalid data | 100%                | `tests/api/`, `tests/fuzz/`, `tests/frontend/` |
| File size / type restrictions         | 100%                | `tests/api/upload.test.ts`                     |
| Rate limiting on auth endpoints       | 100%                | `tests/security/rate-limit-*.test.ts`          |
| Lint warnings                         | 0                   | `.github/workflows/ci.yml`                     |
| Type errors                           | 0                   | `pnpm typecheck`                               |
| Test failures                         | 0                   | All vitest configs                             |
| Secrets in code                       | 0                   | `pnpm secrets:scan`                            |
| Critical security vulnerabilities     | 0                   | `tests/pentest/`, `tests/security/`            |

## Target Coverage (90%+ Line Coverage)

| Module                                               | Current Target | Test Files                                                             |
| ---------------------------------------------------- | -------------- | ---------------------------------------------------------------------- |
| Pipeline OCR (`ocr.ts`, `ocr-manager`)               | ≥90%           | `tests/backend/ocr-manager.test.ts`, `tests/backend/ocr-types.test.ts` |
| Text processing (`text/clean.ts`, `text/analyze.ts`) | ≥90%           | `tests/backend/text.test.ts`, `tests/backend/edge-cases.test.ts`       |
| Output formats (`output/*.ts`)                       | ≥90%           | `tests/backend/output.test.ts`                                         |
| Auth logic (register, login, password reset)         | ≥90%           | `tests/backend/registration.test.ts`, `tests/backend/user.test.ts`     |
| Document CRUD                                        | ≥90%           | `tests/backend/document-crud.test.ts`                                  |
| Folder management                                    | ≥90%           | `tests/backend/folder-use-cases.test.ts`                               |
| Tag management                                       | ≥90%           | `tests/backend/tags.test.ts`, `tests/backend/tag-use-cases.test.ts`    |
| Search functionality                                 | ≥90%           | `tests/backend/search.test.ts`                                         |
| Export functionality                                 | ≥90%           | `tests/backend/conversion.test.ts`, `tests/frontend/export-*.test.ts`  |
| Storage operations                                   | ≥90%           | `tests/backend/storage.test.ts`                                        |
| Config                                               | ≥90%           | `tests/backend/config.test.ts`                                         |
| Validators (auth, document, folder, share, tag)      | ≥90%           | `tests/frontend/validators-*.test.ts`                                  |

## Stretch Coverage (80%+ Line Coverage)

| Module                                       | Target | Notes                                      |
| -------------------------------------------- | ------ | ------------------------------------------ |
| Queue operations (all `queue/*.ts`)          | ≥80%   | BullMQ requires integration testing        |
| OCR provider implementations (all providers) | ≥80%   | Gemini, Google, Surya, Tesseract           |
| Output format generators (pandoc, pdf, etc.) | ≥80%   | Some formats need external binaries        |
| Google Drive integration                     | ≥80%   | Requires OAuth setup in CI                 |
| Webhook management                           | ≥80%   | Endpoints covered in API tests             |
| Analytics                                    | ≥80%   | Backend unit + dashboard                   |
| Document move                                | ≥80%   | `tests/backend/document-move.test.ts`      |
| Document share                               | ≥80%   | `tests/backend/document-share.test.ts`     |
| Distributed lock                             | ≥80%   | `tests/backend/distributed-lock.test.ts`   |
| Database constraints & indexes               | ≥80%   | `tests/backend/database-*.test.ts`         |
| Encryption                                   | ≥80%   | `tests/backend/encryption.test.ts`         |
| Logger                                       | ≥80%   | `tests/backend/logger.test.ts`             |
| Health server                                | ≥80%   | `tests/backend/health-server.test.ts`      |
| Shared types                                 | ≥80%   | `tests/backend/shared-types.test.ts`       |
| Property-based tests                         | ≥80%   | `tests/backend/property-based.test.ts`     |
| Rate limiting (storage)                      | ≥80%   | `tests/backend/storage-rate-limit.test.ts` |

## Global Coverage Thresholds (from `regression.config.ts`)

```typescript
global: {
  statements: 80,
  branches: 70,
  functions: 80,
  lines: 80,
},
critical: {
  statements: 90,
  branches: 85,
  functions: 90,
  lines: 90,
},
```

## Performance Thresholds

| Metric                    | Threshold        | Measured In          |
| ------------------------- | ---------------- | -------------------- |
| Unit test duration        | <100ms per test  | `tests/backend/`     |
| API response time         | <500ms           | `tests/api/`         |
| Integration test duration | <1000ms per test | `tests/integration/` |

## Quality Gates

| Gate               | Threshold |
| ------------------ | --------- |
| Max lint warnings  | 0         |
| Max type errors    | 0         |
| Max test failures  | 0         |
| Max flaky tests    | 3         |
| Max critical vulns | 0         |
| Max high vulns     | 0         |
| Secrets scan       | Required  |

## Critical Paths (Always Tested)

These files are marked as critical in `regression.config.ts` and must have ≥90% coverage:

1. `packages/pipeline/src/ocr.ts` — Core OCR orchestration
2. `packages/pipeline/src/text/clean.ts` — Arabic text cleaning
3. `apps/web/src/app/api/upload/route.ts` — File upload endpoint
4. `apps/web/src/app/api/documents/route.ts` — Document listing
5. `apps/web/src/app/api/export/[id]/[format]/route.ts` — Document export
6. `apps/web/src/app/middleware.ts` — Auth + i18n middleware

## Reporting

Coverage reports are generated via:

```bash
pnpm coverage               # Full coverage
pnpm test:frontend --coverage  # Frontend-only coverage
pnpm test:api --coverage       # API-only coverage
```

Reports are output as:

- **text** — console summary
- **json** — `coverage/coverage-final.json`
- **html** — `coverage/index.html` (browser-viewable)

## Improving Coverage

To improve coverage in a specific area:

1. Run `pnpm coverage` to identify gaps
2. Check `coverage/index.html` for line-by-line uncovered code
3. Add tests in the appropriate directory following CONVENTIONS.md
4. Verify with `pnpm test:<category> --coverage`
5. Update thresholds in `tests/regression/regression.config.ts` if needed
