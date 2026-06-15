# Testing Strategy — Ibn Al-Azhar Docs

## Overview

Testing pyramid approach: **many fast unit tests**, **some integration tests**, **few E2E tests**.

## Current Coverage (as of June 2026)

| Layer           | Files  | Lines     | Framework  |
| --------------- | ------ | --------- | ---------- |
| Unit (backend)  | 6      | 2,087     | Vitest     |
| Unit (frontend) | 5      | 766       | Vitest     |
| E2E             | 1      | 124       | Playwright |
| **Total**       | **12** | **2,977** |            |

## Test Type Mapping

### Unit Tests — `tests/backend/` & `tests/frontend/`

| Module                                     | Test File                                  | Priority |
| ------------------------------------------ | ------------------------------------------ | -------- |
| Pipeline config (`loadConfig`)             | `tests/backend/config.test.ts`             | High     |
| Output generators (MD/TXT/JSON/DOCX)       | `tests/backend/output.test.ts`             | High     |
| Arabic text cleaning (`cleanArabicText`)   | `tests/backend/text.test.ts`               | Critical |
| Queue failure categorization               | `tests/backend/queue.test.ts`              | High     |
| PDF validation (`validatePdf`)             | `tests/backend/storage.test.ts`            | High     |
| Pipeline type constants                    | `tests/backend/types.test.ts`              | Medium   |
| Auth guards (`requireAuth`, `requireRole`) | `tests/frontend/auth-guards.test.ts`       | High     |
| CSS utility (`cn`)                         | `tests/frontend/cn.test.ts`                | Low      |
| Conversion status progress logic           | `tests/frontend/conversion-status.test.ts` | Medium   |
| i18n locale helpers                        | `tests/frontend/i18n.test.ts`              | Medium   |
| Page metadata generation                   | `tests/frontend/metadata.test.ts`          | Medium   |

### Unit Test Gaps (needs coverage)

- **Document CRUD**: service functions for create/read/update/delete documents
- **Folder CRUD**: folder tree operations
- **Tag operations**: create/assign/remove tags
- **Share link generation**: token creation, expiry logic
- **User settings**: get/set settings
- **Search logic**: search query building, result ranking
- **API route handlers**: each Next.js API route (auth, documents, folders, tags, sharing, settings)

### Integration Tests — missing, needs creation

| Area              | What to Test                                                  | Priority |
| ----------------- | ------------------------------------------------------------- | -------- |
| Auth flow         | Register → login → session persistence → logout               | Critical |
| Document pipeline | Upload → validate → split → OCR → clean → generate → complete | High     |
| Storage layer     | S3/MinIO upload/download/delete operations                    | High     |
| Queue processing  | Job enqueue → process → complete/fail → retry                 | High     |
| Database queries  | Prisma queries with filters, pagination, sorting              | Medium   |
| API endpoints     | Request → middleware → handler → response round-trip          | High     |

**Suggested location**: `tests/integration/`
**Suggested framework**: Vitest (same as unit) with test containers or in-memory DB

### E2E Tests — `tests/e2e/`

#### Current Coverage

| Page          | Tests                                                        | Status  |
| ------------- | ------------------------------------------------------------ | ------- |
| Login         | 5 tests (RTL dir, invalid creds, success, refresh, redirect) | Covered |
| Dashboard     | 1 test (stat cards visible)                                  | Partial |
| Files page    | 2 tests (navigation, upload section)                         | Partial |
| Sidebar       | 2 tests (links visible, files nav)                           | Partial |
| RTL direction | 2 tests (ar=rtl, en=ltr)                                     | Covered |

#### E2E Gaps (needs Playwright tests)

| User Flow               | Priority | Notes                                               |
| ----------------------- | -------- | --------------------------------------------------- |
| File upload             | Critical | Upload dialog, file selection, progress, completion |
| Document list           | High     | Pagination, sort by date/name, filter by status     |
| Folder navigation       | High     | Create folder, navigate tree, breadcrumbs           |
| Document viewer         | High     | View converted document, switch formats             |
| Tag management          | Medium   | Add/remove tags on documents                        |
| Search                  | Medium   | Search bar, results display                         |
| Settings page           | Medium   | Update profile, change locale                       |
| Share flow              | Low      | Create share link, access shared doc                |
| User management (admin) | Low      | List users, change roles                            |

## Coverage Targets

| Metric                   | Current | Target                |
| ------------------------ | ------- | --------------------- |
| Line coverage (backend)  | ~75%    | 90%                   |
| Line coverage (frontend) | ~40%    | 80%                   |
| E2E critical paths       | ~30%    | 90%                   |
| Integration tests        | 0%      | All API routes        |
| Component tests          | 0%      | All shared components |

## CI Integration

- **Unit + Integration**: `vitest run` — runs on every push
- **E2E**: `npx playwright test` — runs on PR and main branch
- **Coverage gate**: <80% blocks merge
- **Flaky test policy**: mark with `.flakey` tag, fix within 1 sprint

## Tools & Configuration

- **Unit/Integration**: Vitest (`vitest.config.ts`)
- **E2E**: Playwright (`playwright.config.ts`)
- **Coverage**: v8 provider (configured in `vitest.config.ts`)
- **CI**: GitHub Actions (`.github/`)
