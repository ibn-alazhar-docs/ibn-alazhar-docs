# 📋 Test Changelog

> Historical record of test infrastructure additions and changes.

## 2026-07-09 — Massive Coverage Expansion (Phase 15)

### Added — Documentation

- **Phase 15**: `tests/README.md` — Comprehensive test suite guide with quick start, overview table, running instructions, config reference, conventions, CI/CD integration, troubleshooting
- **Phase 15**: `tests/TEST-MAP.md` — Full source-to-test file mapping across all packages, API routes, frontend, E2E, fuzz, security, edge, load, recovery, backup
- **Phase 15**: `tests/CONVENTIONS.md` — File naming, import patterns, mocking approach, test structure patterns, vitest config reference, best practices
- **Phase 15**: `tests/COVERAGE-GOALS.md` — Mandatory gates, target/stretch coverage, global thresholds, performance thresholds, critical paths
- **Phase 15**: `tests/CHANGELOG-TESTS.md` — This file

### Added — Test Infrastructure

- **Phase 14**: CI workflows (`.github/workflows/ci.yml`, `deploy.yml`, `lighthouse.yml`, `preview.yml`)
  - 3-stage pipeline: fast (PR only) → pr (PR→main) → full (main push)
  - Postgres 16 + Redis 7 service containers
  - Playwright + Chromium for E2E
- **Phase 14**: Regression guard (`tests/regression/regression-suite.test.ts`, `regression.config.ts`)
- **Phase 14**: Pre-commit and pre-push hooks (`tests/regression/pre-commit.sh`, `tests/regression/pre-push.sh`)
- **Phase 14**: Smoke test (`tests/smoke/pre-deploy.ts`)

### Added — Contract Tests (Phase 1 + Phase 10)

- `tests/api/api-schemas.ts` — Zod v4 API schema definitions
- `tests/api/openapi-spec.ts` — OpenAPI spec generation
- `tests/api/contract-api.test.ts` — API contract enforcement
- `tests/api/contract-validation.test.ts` — Zod validation contract
- `tests/api/provider-contract.test.ts` — Provider-side contract
- `tests/api/consumer-contract.test.ts` — Consumer-side contract
- `tests/api/spec-drift.test.ts` — Spec drift detection

### Added — API Tests (23 files)

- Auth (register, login, forgot/reset password, email verification)
- Documents (CRUD, bulk operations, tags, move, restore)
- Folders (CRUD, move, tree, empty, restore, tags)
- Tags (CRUD, merge, document association)
- Search (query, suggest)
- Profile (get, update)
- Export (single, batch, folder, tag, format-specific)
- Share (token access, export from share)
- Upload (file validation, contract validation)
- Conversion (start, status, list)
- Stream, Analytics, Bookmarks, Users, Webhooks
- Actuator (health, info, metrics, prometheus)
- Health endpoints (live, ready)

### Added — Backend Unit Tests (38 files)

- Pipeline: config, ocr-manager, ocr-types, ocr-providers (cloud + local), ocr-split
- Text: text processing, edge cases, property-based
- Output: all format generators
- Queue: queue, queue-infrastructure
- Storage: storage, storage-rate-limit
- Database: constraints, indexes, encryption
- Shared: types, logger, health-server
- Services: document-crud, document-move, document-share, document-tag-use-cases
- Services: folder-use-cases, tag-use-cases, tags, registration, user
- Services: search, profile, conversion, dashboard, authorization
- Services: services-use-cases, google-drive, distributed-lock

### Added — Frontend Tests (14 files)

- Validators: auth, document, folder, share, tag
- Utils: cn, build-folder-tree, conversion-status
- Auth guards, i18n, metadata
- Export: metadata, profiles, validators

### Added — Integration Tests (17 files)

- Full pipeline flow (OCR → Text → Output)
- Auth session lifecycle
- Document CRUD + management + ownership
- Folder-documents relationship
- OCR provider failover
- PDF split
- Pipeline export + text flows
- Search + Postgres + Tags
- Share + Export
- Tags + Documents
- Zip builder

### Added — E2E Playwright Tests (27 files)

- Auth flows, Document CRUD, Folder management
- Search & tags, Export & share, Admin flows
- Error states, i18n/RTL
- Accessibility (6 files): pages, keyboard, color contrast, interactions, RTL, tab order
- Visual regression (4 files): pages, components, themes, responsive
- Security, Comprehensive journey, QA scenarios, Webapp smoke
- 12 Page Object Models in `tests/e2e/pages/`

### Added — Fuzz Tests (21 files, 1119+ tests)

- All API endpoints + Zod schema validation
- Boundary cases, edge inputs, type confusion, injection attempts

### Added — Security Tests (13 files)

- Auth security, upload security, IDOR/authorization
- Input validation, rate limiting + CSRF, rate limit IP
- Share security, SSRF prevention, search validation
- Pagination validation, export validation
- OCR injection prevention, headers configuration

### Added — Pentest Tests (12 files, OWASP-based)

- Access control, injection, crypto/auth, data validation, config audit
- Account takeover, business logic, IDOR deep
- Info disclosure, input attacks, privilege escalation
- Regression (pen-001)

### Added — Edge Case Tests (5 files)

- Race conditions, timeouts & cancellation
- Boundary conditions, failure recovery, state transitions

### Added — Load Tests

- k6: upload, export, API endpoints, search, stress patterns (6 files)
- Vitest: DB concurrency, memory patterns, pipeline throughput, rate limit, validation throughput, zip builder (6 files)

### Added — Soak/Stress Tests (5 files)

- Memory leak detection, long-running pipeline, resource limits
- Concurrent workers, circuit breaker

### Added — Recovery Tests (6 files)

- Database recovery, pipeline recovery, rate limit recovery
- Share/export recovery, zip builder recovery, failure categorization

### Added — Backup Tests (3 files)

- Database backup, storage backup, full system restore

### Added — Vitest Configuration (11 configs)

- `vitest.config.ts`, `vitest.api.config.ts`, `vitest.frontend.config.ts`
- `vitest.integration.config.ts`, `vitest.security.config.ts`, `vitest.pentest.config.ts`
- `vitest.fuzz.config.ts`, `vitest.edge.config.ts`, `vitest.load.config.ts`
- `vitest.recovery.config.ts`, `vitest.backup.config.ts`

### Added — Mock Infrastructure

- `tests/mocks/`: ioredis, minio, next-auth-react, next-intl, next-intl-routing, next-navigation, next-server
- `tests/api/mocks/`: mock-prisma, mock-db-package, mock-db-helpers
- `tests/setup.ts`: global Next.js mocks + auth mock
- `tests/api/setup.ts`: auth guard mocks + mockSession

---

## Test Count Summary

| Phase | Type                | File Count | Test Count  |
| ----- | ------------------- | ---------- | ----------- |
| 1     | API Schema/Contract | 7          | ~225        |
| 2     | Unit (Backend)      | 38         | ~1106       |
| 3     | Integration         | 17         | ~111        |
| 4     | E2E Playwright      | 27+12 POMs | ~190+       |
| 5     | Visual Regression   | 4          | ~632        |
| 6     | Accessibility       | 6          | ~108        |
| 7     | Fuzz                | 21         | ~1119       |
| 8     | Load (k6 + Vitest)  | 12         | scenarios   |
| 9     | Security            | 13         | ~200+       |
| 10    | Pentest (OWASP)     | 12         | ~204        |
| 11    | Edge Cases          | 5          | ~204        |
| 12    | Regression          | 1+2 hooks  | suite       |
| 13    | Soak/Stress         | 5          | TBD         |
| 14    | Recovery            | 6          | ~30+        |
| 15    | Backup              | 3          | ~15+        |
| —     | Frontend            | 14         | ~150+       |
| —     | **Total**           | **~190+**  | **~4,000+** |
