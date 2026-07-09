# 🧪 Ibn Al-Azhar Docs — Test Suite

> Comprehensive test coverage across 15 phases for an Arabic-first, RTL-first document processing platform.

## Quick Start

```bash
pnpm install
pnpm test                          # Run all main tests (backend + api + fuzz)
pnpm test:api                      # API contract tests
pnpm test:frontend                 # Frontend component tests
pnpm test:integration              # Integration tests
pnpm test:e2e                      # E2E Playwright tests (requires running app)
pnpm test:security                 # Security tests
pnpm test:pentest                  # Penetration tests
pnpm test:edge                     # Edge case tests
pnpm test:load                     # Load tests
pnpm test:recovery                 # Recovery tests
pnpm test:backup                   # Backup tests
pnpm coverage                      # Generate coverage report
npx playwright test                # Run E2E tests (alternative)
bash tests/regression/pre-commit.sh  # Pre-commit hook simulation
bash tests/regression/pre-push.sh    # Pre-push hook simulation
```

## Test Suite Overview

| #   | Phase             | Type           | Location                        | Files | Tests     | Status |
| --- | ----------------- | -------------- | ------------------------------- | ----- | --------- | ------ |
| 1   | Schema/Contract   | API Contract   | `tests/api/`                    | 27    | ~500      | ✅     |
| 2   | Unit              | Backend        | `tests/backend/`                | 38    | ~1100     | ✅     |
| 3   | Integration       | Cross-module   | `tests/integration/`            | 17    | ~111      | ✅     |
| 4   | E2E               | Playwright     | `tests/e2e/`                    | 27    | ~190+     | ✅     |
| 5   | Visual Regression | Playwright     | `tests/e2e/`                    | 4     | ~630      | ✅     |
| 6   | Accessibility     | Playwright     | `tests/e2e/`                    | 6     | ~108      | ✅     |
| 7   | Fuzz              | Property-based | `tests/fuzz/`                   | 21    | ~1119     | ✅     |
| 8   | Load              | k6 + Vitest    | `tests/load/k6/`, `tests/load/` | 6+6   | scenarios | ✅     |
| 9   | Security          | Vitest         | `tests/security/`               | 13    | ~200+     | ✅     |
| 10  | Pentest           | OWASP          | `tests/pentest/`                | 12    | ~204      | ✅     |
| 11  | Edge Cases        | Vitest         | `tests/edge/`                   | 5     | ~204      | ✅     |
| 12  | Regression        | Vitest + hooks | `tests/regression/`             | 1+2   | suite     | ✅     |
| 13  | Soak/Stress       | Vitest         | `tests/soak/`                   | 6     | TBD       | ✅     |
| 14  | Recovery          | Vitest         | `tests/recovery/`               | 6     | ~30+      | ✅     |
| 15  | Backup            | Vitest         | `tests/backup/`                 | 3     | ~15+      | ✅     |
| —   | Frontend          | Vitest + jsdom | `tests/frontend/`               | 14    | ~150+     | ✅     |

**Total: ~4,000+ tests across 190+ files**

## Running Tests

### All Main Tests (backend + API + fuzz)

```bash
pnpm test
```

This uses `vitest.config.ts` and runs files matching `tests/**/*.test.ts`, excluding E2E, integration, security, pentest, load, recovery, backup, and frontend directories.

### By Category

```bash
pnpm test:api              # tests/api/*.test.ts via vitest.api.config.ts
pnpm test:backend           # pnpm test (includes backend)
pnpm test:frontend          # tests/frontend/*.test.ts via vitest.frontend.config.ts (jsdom)
pnpm test:integration       # tests/integration/*.test.ts via vitest.integration.config.ts
pnpm test:security          # tests/security/*.test.ts via vitest.security.config.ts
pnpm test:pentest           # tests/pentest/*.test.ts via vitest.pentest.config.ts
pnpm test:edge              # tests/edge/*.test.ts via vitest.edge.config.ts
pnpm test:fuzz              # tests/fuzz/*.test.ts via vitest.fuzz.config.ts
pnpm test:load              # tests/load/*.test.ts via vitest.load.config.ts (single fork)
pnpm test:recovery          # tests/recovery/*.test.ts via vitest.recovery.config.ts
pnpm test:backup            # tests/backup/*.test.ts via vitest.backup.config.ts
pnpm test:e2e               # tests/e2e/*.spec.ts via Playwright
pnpm test:regression        # tests/regression/regression-suite.test.ts
```

### E2E Playwright (requires running app)

```bash
# Starts dev server automatically via playwright.config.ts webServer option
npx playwright test

# Run specific test file
npx playwright test tests/e2e/auth-flows.spec.ts

# Run with UI mode
npx playwright test --ui

# Run headless (explicit)
npx playwright test --project=chromium
```

### k6 Load Tests

```bash
k6 run tests/load/k6/upload-scenarios.js
k6 run tests/load/k6/api-endpoints.js
k6 run tests/load/k6/export-scenarios.js
k6 run tests/load/k6/search-scenarios.js
k6 run tests/load/k6/stress-patterns.js
```

### Coverage

```bash
pnpm coverage
```

Generates text, JSON, and HTML reports via v8 provider. Coverage includes `packages/**/*.ts` and `apps/web/src/**/*.{ts,tsx}`.

## Configuration Files

| File                           | Purpose                                                  |
| ------------------------------ | -------------------------------------------------------- |
| `vitest.config.ts`             | Main — backend + API + fuzz, node env, global mocks      |
| `vitest.api.config.ts`         | API contract tests (Zod v4, 30s timeout)                 |
| `vitest.frontend.config.ts`    | Frontend tests (jsdom, React Testing Library)            |
| `vitest.integration.config.ts` | Integration tests (30s timeout, jszip inline)            |
| `vitest.security.config.ts`    | Security tests (30s timeout)                             |
| `vitest.pentest.config.ts`     | Penetration tests (30s timeout)                          |
| `vitest.fuzz.config.ts`        | Fuzz tests (Zod v4, 30s timeout)                         |
| `vitest.edge.config.ts`        | Edge case tests (60s timeout)                            |
| `vitest.load.config.ts`        | Load tests (120s timeout, single fork)                   |
| `vitest.recovery.config.ts`    | Recovery tests (60s timeout)                             |
| `vitest.backup.config.ts`      | Backup tests (60s timeout)                               |
| `playwright.config.ts`         | E2E Playwright (chromium, 300s timeout, 2 retries on CI) |

## Test Writing Conventions

See [CONVENTIONS.md](./CONVENTIONS.md) for full details.

### Quick Summary

- **Unit tests**: `tests/backend/<module-name>.test.ts`
- **API tests**: `tests/api/<endpoint-name>.test.ts`
- **Frontend tests**: `tests/frontend/<feature>.test.ts`
- **Integration tests**: `tests/integration/<flow-name>.test.ts`
- **E2E tests**: `tests/e2e/<feature>.spec.ts` with POMs in `tests/e2e/pages/`
- **Fuzz tests**: `tests/fuzz/<endpoint-name>-fuzz.test.ts`
- **Security tests**: `tests/security/<area>.test.ts`
- **Edge tests**: `tests/edge/<category>.test.ts`
- **Load tests**: `tests/load/<area>.test.ts` or `tests/load/k6/<scenario>.js`

### Mocking Approach

- **CJS modules** (minio, ioredis, next/server) are mocked via vitest aliases in all configs
- **Next.js APIs** — `next/server`, `next/navigation`, `next-auth` are globally mocked in `tests/setup.ts`
- **Auth guards** — mocked in `tests/api/setup.ts` with `mockSession` for role-based testing
- **Prisma** — mocked via `tests/api/mocks/mock-prisma.ts`
- **i18n** — `next-intl` and `next-intl/routing` are mocked via aliases
- **Auth client** — `next-auth/react` is mocked via alias

## Coverage Goals

See [COVERAGE-GOALS.md](./COVERAGE-GOALS.md) for full details.

### Mandatory (100% pass rate)

- All API endpoints return correct HTTP status codes and error shapes
- Authentication gate on protected routes
- Input validation rejects invalid data
- File size/type restrictions
- Rate limiting on auth endpoints

### Target (90%+ line coverage)

- Pipeline core (OCR, text, output), Auth logic, Document CRUD, Export, Search

### Stretch (80%+ line coverage)

- Queue operations, OCR providers, Output formats, Google Drive, Webhooks, Analytics

## CI/CD Integration

GitHub Actions workflows in `.github/workflows/`:

| Workflow         | Trigger          | Scope                                              |
| ---------------- | ---------------- | -------------------------------------------------- |
| `ci.yml`         | push (main) + PR | 3-stage: fast (PR), pr (PR→main), full (main push) |
| `deploy.yml`     | push (main)      | Deploy pipeline                                    |
| `lighthouse.yml` | PR               | Lighthouse audits                                  |
| `preview.yml`    | PR               | Preview deployments                                |

CI pipeline stages:

1. **fast** — format check, lint, typecheck (PR only)
2. **pr** — full test suite + Playwright E2E with Postgres + Redis services (PR→main)
3. **full** — everything in pr + additional checks (main push)

## Adding New Tests

1. **Identify the phase**: Unit → `tests/backend/`, API → `tests/api/`, etc.
2. **Create the test file**: Follow naming conventions in CONVENTIONS.md
3. **Use existing fixtures**: Check `tests/api/mocks/`, `tests/mocks/`, and `tests/setup.ts`
4. **Run the specific config**: `pnpm test:api` or the relevant config
5. **Update this doc** and the test map

## Troubleshooting

| Symptom                            | Likely Cause                                        | Fix                                                                     |
| ---------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------- |
| `vi.mock` fails for CJS dep        | Vitest can't intercept CJS across module boundaries | Add alias in vitest config pointing to `tests/mocks/`                   |
| E2E tests fail to start            | Port 3000 in use                                    | Kill existing process or set `BASE_URL`                                 |
| E2E test timeouts                  | Dev server not ready                                | Check `playwright.config.ts` `webServer` config                         |
| Integration test timeout           | No Postgres/Redis running                           | Start via Docker Compose                                                |
| Frontend test fails on `next-intl` | Missing mock alias                                  | Add to `vitest.frontend.config.ts`                                      |
| `pnpm test` picks up wrong files   | File in wrong directory                             | Check vitest config `include`/`exclude` patterns                        |
| Fuzz test fails                    | Schema mismatch                                     | Check Zod schema version in `vitest.fuzz.config.ts`                     |
| Load test pool error               | Shared state across tests                           | Config uses `singleFork: true` — ensure tests don't share mutable state |
