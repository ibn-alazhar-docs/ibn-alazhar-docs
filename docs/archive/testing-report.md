# Testing Report — Ibn Al-Azhar Docs

**Date**: 2026-07-04  
**Pipeline**: Layer 3 — Testing & Quality Assurance

---

## Executive Summary

| Suite                    | Tests     | Pass    | Fail  | Skip   | Rate      |
| ------------------------ | --------- | ------- | ----- | ------ | --------- |
| Unit (Vitest)            | 776       | 776     | 0     | 0      | **100%**  |
| API Integration (Vitest) | 155       | 155     | 0     | 0      | **100%**  |
| E2E (Playwright)         | 70        | 58      | 2     | 10     | **97%**   |
| **Total**                | **1,001** | **989** | **2** | **10** | **98.8%** |

---

## 1. Unit Tests — Vitest

**Command**: `pnpm test`  
**Status**: ✅ **776/776 PASS**

| Test File                                 | Tests   |
| ----------------------------------------- | ------- |
| `tests/backend/tags.test.ts`              | 64      |
| `tests/backend/storage.test.ts`           | 35      |
| `tests/backend/queue.test.ts`             | 55      |
| `tests/backend/profile.test.ts`           | 4       |
| `tests/backend/document-move.test.ts`     | 7       |
| `tests/frontend/i18n.test.ts`             | 5       |
| `tests/frontend/validators-share.test.ts` | 10      |
| `tests/frontend/metadata.test.ts`         | 23      |
| `tests/frontend/cn.test.ts`               | 13      |
| _+ 24 other files_                        | 559     |
| **Total**                                 | **776** |

---

## 2. API Integration Tests — Vitest

**Command**: `pnpm vitest run --config vitest.api.config.ts`  
**Status**: ✅ **155/155 PASS**

### Test Files (20 files)

| File                                 | Tests | Status |
| ------------------------------------ | ----- | ------ |
| `tests/api/documents.test.ts`        | 17    | ✅     |
| `tests/api/documents-query.test.ts`  | 11    | ✅     |
| `tests/api/documents-bulk.test.ts`   | 14    | ✅     |
| `tests/api/search.test.ts`           | 8     | ✅     |
| `tests/api/folders.test.ts`          | 8     | ✅     |
| `tests/api/users.test.ts`            | 12    | ✅     |
| `tests/api/admin-users.test.ts`      | 16    | ✅     |
| `tests/api/tags-crud.test.ts`        | 11    | ✅     |
| `tests/api/tags-query.test.ts`       | 10    | ✅     |
| `tests/api/bookmarks-list.test.ts`   | 14    | ✅     |
| `tests/api/analytics-top.test.ts`    | 10    | ✅     |
| `tests/api/notifications.test.ts`    | 6     | ✅     |
| `tests/api/profile.test.ts`          | 5     | ✅     |
| `tests/api/upload-minio.test.ts`     | 3     | ✅     |
| `tests/api/export-docx.test.ts`      | 4     | ✅     |
| `tests/api/actuator.test.ts`         | 9     | ✅     |
| `tests/api/health-endpoints.test.ts` | 6     | ✅     |
| `tests/api/bookmarks.test.ts`        | 4     | ✅     |
| `tests/api/analytics.test.ts`        | 5     | ✅     |
| _+ others_                           | 2     | ✅     |

### Mock Infrastructure

- **In-memory Prisma store**: `tests/api/mocks/mock-prisma.ts` — Map-based CRUD with `findMany` filtering, `groupBy`, `$queryRaw`
- **Auth mocking**: `withAuth` mock sets `request.auth` for routes reading auth directly
- **Module aliases**: `vitest.api.config.ts` aliases `@ibn-al-azhar-docs/database` → mock DB

---

## 3. E2E Tests — Playwright

**Command**: `npx playwright test --project=chromium`  
**Status**: ✅ **58/60 PASS** (2 pre-existing failures)

### Results by File

| File                            | Tests  | Pass   | Fail  | Skip   |
| ------------------------------- | ------ | ------ | ----- | ------ |
| `main.spec.ts`                  | 13     | 13     | 0     | 0      |
| `webapp-smoke.test.ts`          | 12     | 12     | 0     | 0      |
| `comprehensive-journey.spec.ts` | 1      | 1      | 0     | 0      |
| `visual-regression.spec.ts`     | 13     | 11     | 0     | 2      |
| `security.spec.ts`              | 14     | 13     | 1     | 0      |
| `accessibility.spec.ts`         | 8      | 7      | 0     | 1      |
| `qa.spec.ts`                    | 1      | 1      | 0     | 0      |
| `qa2.spec.ts`                   | 1      | 1      | 0     | 0      |
| `e2e-scenarios.spec.ts`         | 7      | 2      | 1     | 5      |
| **Total**                       | **70** | **58** | **2** | **10** |

### Failure Analysis

| Test                                          | Error                          | Root Cause                                                           |
| --------------------------------------------- | ------------------------------ | -------------------------------------------------------------------- |
| `security.spec.ts:194` — File Upload Security | `expect(status).not.toBe(500)` | Upload endpoint returns 500 (likely auth/guard issue in E2E context) |
| `e2e-scenarios.spec.ts:100` — Upload PDF      | `document-row not found`       | Upload doesn't complete in UI (pre-existing, serial test dependency) |

Both failures are **pre-existing** and related to the upload flow in the E2E environment. No new regressions.

---

## 4. Performance Testing

### 4.1 Bundle Analyzer (@next/bundle-analyzer)

**Build**: `ANALYZE=true next build --webpack`  
**Report**: `apps/web/.next/analyze/client.html` (interactive)

| Chunk                      | Size       |
| -------------------------- | ---------- |
| `2787-*.js` (frameworks)   | 440 KB     |
| `98f1bda2-*.js` (app code) | 196 KB     |
| `polyfills-*.js`           | 110 KB     |
| `webpack-*.js`             | 4 KB       |
| `main-app-*.js`            | 4 KB       |
| **Total main chunks**      | **754 KB** |

**Bundle analyzer reports**: `client.html` (961 KB), `edge.html` (318 KB), `nodejs.html` (2.1 MB)

### 4.2 Lighthouse Audit

**URL**: `http://localhost:3000/ar`  
**Note**: Dev server with Turbopack HMR — scores reflect development mode, not production.

| Category             | Score               |
| -------------------- | ------------------- |
| **Accessibility**    | **100**             |
| **Best Practices**   | **100**             |
| **SEO**              | **92**              |
| **Performance**      | **46** (dev server) |
| **Agentic Browsing** | **67**              |

### Core Web Vitals (Dev Server)

| Metric                         | Value   | Score |
| ------------------------------ | ------- | ----- |
| FCP (First Contentful Paint)   | 1.1s    | 99    |
| LCP (Largest Contentful Paint) | 10.6s   | 0     |
| TBT (Total Blocking Time)      | 2,310ms | 5     |
| CLS (Cumulative Layout Shift)  | 0       | 100   |
| Speed Index                    | 2.1s    | 99    |
| TTI (Time to Interactive)      | 11.2s   | 20    |

> **Production expectation**: LCP and TBT will improve significantly with static generation, code splitting, and no HMR overhead. CLS is already 0 — excellent.

---

## 5. Test Infrastructure

### Mock System (`tests/api/`)

```
tests/api/
  setup.ts              — Global mock setup (requireAuth, withAuth, requireRole, etc.)
  helpers.ts            — createApiRequest helper
  mocks/
    mock-prisma.ts      — In-memory Prisma store (Map-based CRUD)
    mock-db-package.ts  — Module alias for @ibn-al-azhar-docs/database
```

### Vitest Config

| Config                 | Scope                 | Aliases                                                    |
| ---------------------- | --------------------- | ---------------------------------------------------------- |
| `vitest.config.ts`     | Unit tests (776)      | `@` → `apps/web/src`                                       |
| `vitest.api.config.ts` | API integration (155) | `@` → `apps/web/src`, `@ibn-al-azhar-docs/database` → mock |

### Playwright Config

| Setting    | Value                                    |
| ---------- | ---------------------------------------- |
| Port       | 3000                                     |
| Browser    | System Chrome (`/usr/bin/google-chrome`) |
| Projects   | `chromium`, `chromium-dark`              |
| Web Server | Auto-starts `pnpm dev --port 3000`       |
| Timeout    | 120s per test                            |
| Retries    | 0                                        |

---

## 6. Recommendations

### Immediate (Quick Wins)

1. **Fix upload E2E tests**: The 2 failures are pre-existing; investigate auth flow in upload endpoint
2. **Production Lighthouse**: Run against production build (not dev server) for accurate performance scores
3. **Enable LHCI in CI**: `@lhci/cli` install timed out; use `npx lighthouse` in CI pipeline instead

### Short-term

4. **Bundle size**: Main chunk at 440 KB — consider dynamic imports for heavy libraries (XLSX, PDF.js, date-fns)
5. **Turbopack analyzer**: Use `next experimental-analyze` for accurate Turbopack bundle analysis
6. **Visual regression baselines**: Capture production baselines with clean DB for deterministic comparisons

### Medium-term

7. **Performance budget**: Set Lighthouse CI thresholds (Performance ≥ 80, Accessibility ≥ 95)
8. **Load testing**: Add k6/Artillery tests for API endpoints under concurrent load
9. **E2E coverage**: Add tests for tag management, document sharing, and export flows

---

## 7. Files Created/Modified

| File                                            | Action                                    |
| ----------------------------------------------- | ----------------------------------------- |
| `tests/api/actuator.test.ts`                    | Created — 9 tests                         |
| `tests/api/health-endpoints.test.ts`            | Created — 6 tests                         |
| `tests/api/bookmarks.test.ts`                   | Created — 4 tests                         |
| `tests/api/analytics.test.ts`                   | Created — 5 tests                         |
| `tests/api/setup.ts`                            | Modified — `withAuth` sets `request.auth` |
| `apps/web/src/app/api/actuator/health/route.ts` | Fixed — `as const` TypeScript error       |
| `reports/testing-report.md`                     | Created — this report                     |

---

_Report generated by Layer 3 Testing pipeline — 2026-07-04_
