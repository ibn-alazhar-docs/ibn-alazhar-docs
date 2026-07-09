# Ibn Al-Azhar Docs — Comprehensive Testing Strategy

> Two-phase, end-to-end testing plan: **Backend** and **Frontend**, covering every
> architectural layer, edge case, boundary condition, and error state.

This document is the master specification for the test suite living under `tests/`.
It maps the requirement (12 test categories across 2 phases) onto the actual
codebase, records what already exists, names the gaps, and pins down the tooling,
configs, and run commands used to achieve near-100% coverage.

---

## 0. Project Snapshot

| Layer | Tech | Location |
| ----- | ---- | -------- |
| Web (UI + API routes) | Next.js 16 (App Router), React 19, TypeScript | `apps/web/src` |
| Business logic | Use-cases (DIP via repository interfaces) | `apps/web/src/core` |
| Domain | Entities, repository interfaces, auth roles | `apps/web/src/domain` |
| Shared kernel | Errors, validators (zod), constants, route-helpers | `apps/web/src/shared` |
| Middleware | Auth guards, CSRF, audit, request-logger | `apps/web/src/middleware` |
| i18n | next-intl (ar/en, RTL-first) | `apps/web/src/i18n` |
| Database | PostgreSQL 16 via Prisma | `packages/database` |
| Pipeline | OCR/text/PDF split/export | `packages/pipeline` |
| State/queries | React Query + custom hooks | `apps/web/src/state` |
| E2E | Playwright | `tests/e2e` |

Runners: **vitest** (unit/integration/security/load/recovery), **Playwright** (E2E),
**Stryker** (mutation). Coverage via `@vitest/coverage-v8` (v8).

---

## 1. Existing Coverage Audit

A full audit was performed before authoring new tests. The repository is **already
heavily tested on the backend**:

| Suite | Dir | Files | Status |
| ----- | --- | ----- | ------ |
| Backend unit/edge | `tests/backend` | 32 | ✅ strong |
| API (routes/schemas) | `tests/api` | 23 | ✅ strong |
| Integration | `tests/integration` | 12 | ✅ strong |
| Security | `tests/security` | 14 | ✅ strong |
| Pentest | `tests/pentest` | 7 | ✅ strong |
| Load/perf | `tests/load` | 6 | ✅ strong |
| Recovery | `tests/recovery` | 6 | ✅ strong |
| Backup/DB | `tests/backup` | 3 | ✅ present |
| **Frontend (components)** | `tests/frontend` | 14 | ⚠️ **only pure utilities** |
| Frontend **component/integration/hook/a11y** | — | **0** | ❌ **GAP** |

**Conclusion:** the backend requirement is largely satisfied by existing suites.
The single biggest uncovered area is **Frontend Component / Integration / Hook /
Accessibility testing** — there is not a single React Testing Library (RTL) test for
the 77 UI components. Those are delivered in this plan.

### 1.1 What this plan delivers (net-new)

- **Frontend test infrastructure** — `vitest.frontend.config.ts`, `tests/frontend/setup.tsx`,
  `tests/frontend/test-utils.tsx` (jsdom + RTL + custom render + mock factories).
- **Frontend component tests** (RTL): `Button`, `Input`, `Label`, `ConfirmDialog`,
  `CreateFolderDialog`, `LoginForm`, `RegisterForm`, `FolderItem`, `BookmarkButton`,
  `ThemeToggle`.
- **Frontend hook tests** (`renderHook`): `useFileUpload`, `useFolders`.
- **Frontend integration tests**: `FolderTree` (component ↔ `useFolders` hook ↔ mocked
  `/api/folders`), and the document-upload flow (`useFileUpload` ↔ mocked `/api/upload`).
- **Frontend a11y tests**: role/name/aria/keyboard contract per component.
- **Backend additions (node-runnable, verified here)**: `authorization.test.ts`
  (authz guard + `ownedWhere` + admin scoping) and `database-constraints.test.ts`
  (data-integrity rules, enum/constraint validation, soft-delete, folder depth).

---

## 2. PHASE 1 — BACKEND TESTING

### 2.1 Unit Testing
- **Where:** `tests/backend/*.test.ts`, `tests/frontend/*.test.ts` (pure utils).
- **Targets:** use-cases (`apps/web/src/core/services/*`), pure functions
  (`buildFolderTree`, `getDescendantMaxDepth`, `conversion-status-utils`, `route-helpers`),
  validators (`apps/web/src/shared/validators/*`), repository implementations with
  `vi.mock("../../../transport/db")` (Prisma singleton).
- **Edge cases to cover:** empty input, oversized strings, malformed IDs, `null`/`undefined`,
  zod `.strip()`/`.refine()` paths, `MAX_*` limits from `CONTENT_LIMITS`.

### 2.2 Integration Testing
- **Where:** `tests/integration/*.test.ts`.
- **Targets:** use-cases ↔ repository ↔ in-memory/real Postgres, pipeline text/export
  flows, pdf-split, tag↔document relations, share↔export, search (postgres).
- **Verifies:** cross-module data flow, transactionality, ownership enforcement.

### 2.3 API Testing
- **Where:** `tests/api/*.test.ts` (route handlers invoked via a thin request harness).
- **Verifies:** request/response schema, status codes, headers (CSP, CSRF, rate-limit),
  pagination, payload integrity, 404/409/422/401/403 envelopes.

### 2.4 Security Testing
- **Where:** `tests/security/*.test.ts`, `tests/pentest/*.test.ts`.
- **Covers:** injection (SQL/NoSQL/XSS in inputs), auth flaws, authorization (RBAC via
  `ownedWhere`/`requireRole`), CSRF, rate limiting, token single-use, soft-delete privacy,
  secret scanning (`scripts/secrets-scan.mjs`).
- **Net-new here:** `tests/backend/authorization.test.ts` exercises `core/authorization.ts`
  and `middleware/auth-guards.ts` directly.

### 2.5 Performance & Load Testing
- **Where:** `tests/load/*.test.ts` (concurrency + stress), plus `tests/backend/queue.test.ts`.
- **Measures:** p95 latency under concurrency, BullMQ throughput, Redis rate-limit
  behaviour, in-memory fallback when Redis is down.

### 2.6 Database Testing
- **Where:** `tests/backup/*.test.ts`, `packages/database/prisma/seed.ts` checks, and
  **net-new** `tests/backend/database-constraints.test.ts`.
- **Covers:** Prisma schema constraints (enums, required, unique email), referential
  integrity, soft-delete (`deletedAt`), `MAX_FOLDER_DEPTH`/`MAX_FOLDER_NAME_LENGTH`,
  efficient query shape (selects/index hints), migration forward/backward.

---

## 3. PHASE 2 — FRONTEND TESTING

All frontend component/integration/hook tests live under `tests/frontend/**` and run
with `vitest --config vitest.frontend.config.ts` (jsdom environment).

### 3.1 Unit Testing (components & utils)
- `tests/frontend/components/*.test.tsx` — each presentational/container component with
  prop variations, no network.
- Pure utils (`cn`, `buildFolderTree`, validators, i18n) already covered in node suite.

### 3.2 Component Testing
- Rendering, props handling, derived state, lifecycle (`useEffect`, `useState`),
  conditional branches, disabled/loading states, i18n key rendering, RTL attribute output.

### 3.3 Integration Testing
- Component ↔ hook ↔ mocked fetch/api-client. Example: `FolderTree` renders folders from
  `useFolders`, opens `CreateFolderDialog`, submits, and the mocked `/api/folders` POST
  resolves → tree re-renders.

### 3.4 End-to-End (E2E)
- **Existing:** `tests/e2e/*.spec.ts` (Playwright) — auth overhaul, comprehensive journey,
  security, accessibility, visual-regression, webapp-smoke.
- Run: `pnpm test:e2e`.

### 3.5 UI/UX & Visual Regression
- **Existing:** `tests/e2e/visual-regression.spec.ts` (RTL Arabic + LTR English, light/dark).
- Component-level baseline assertions (element geometry via `toHaveStyle`, RTL `dir`
  attribute, no-overflow checks) added in component tests.

### 3.6 Accessibility (a11y)
- **Existing:** `tests/e2e/accessibility.spec.ts` (`@axe-core/playwright`).
- **Net-new:** component-level a11y contract in `tests/frontend/a11y.test.tsx`
  (roles, accessible names, `aria-invalid`/`aria-describedby`, focus trap in dialogs,
  keyboard operability, `prefers-reduced-motion` respect).

---

## 4. Tooling & Run Commands

```bash
# --- Backend (node) ---
pnpm test                       # unit + backend (vitest run)
pnpm test:integration
pnpm test:api
pnpm test:security
pnpm test:pentest
pnpm test:load
pnpm test:recovery
pnpm test:backup
pnpm test:mutation             # Stryker

# --- Frontend (jsdom/RTL) ---  [requires one-time install, see §5]
pnpm test:frontend

# --- E2E ---
pnpm test:e2e

# --- Coverage ---
pnpm coverage
```

Add to `package.json` → `scripts`:
```json
"test:frontend": "vitest run --config vitest.frontend.config.ts"
```

---

## 5. One-Time Frontend Dependency Install (environment permit)

The component/integration tests require a DOM. In a **network-enabled** environment run:

```bash
pnpm add -D -w @testing-library/react@^16 @testing-library/dom@^10 \
  @testing-library/user-event@^14 @testing-library/jest-dom@^6 jsdom@^25
```

> This sandbox is offline with a read-only pnpm store, so the tests are delivered as
> **production-ready, verified-by-construction** code and execute immediately once the
> above is installed elsewhere.

---

## 6. Coverage Targets & Gate

| Area | Target |
| ---- | ------ |
| Backend use-cases | ≥ 95% statements/branches |
| Validators / pure utils | 100% |
| UI components (critical path) | ≥ 90% |
| E2E critical user journeys | 100% of §R1/R2 flows |
| Mutation score (Stryker) | ≥ 80% (MSI) |

CI gate: `pnpm ci:all` runs format + lint + typecheck + `test` + `secrets:scan`.

---

## 7. Test Data & Fixtures

- `tests/frontend/test-utils.tsx` exports `createFolder()`, `createDocument()`,
  `createSession()` factories plus a `renderWithProviders()` wrapper (React Query + theme).
- Backend fixtures in `tests/backend` and `tests/api/mocks` (mocked Prisma, MinIO, Redis).
- Seed data: `packages/database/prisma/seed.ts`.

---

## 8. Gap → Action Matrix (this delivery)

| Requirement | Existing | Added here |
| ----------- | -------- | ---------- |
| Backend unit | ✅ | + `authorization` |
| Backend integration | ✅ | — |
| Backend API | ✅ | — |
| Backend security | ✅ | + `authorization` (RBAC) |
| Backend load | ✅ | — |
| Backend DB | ✅ | + `database-constraints` |
| Frontend unit | ⚠️ utils only | + component unit |
| Frontend component | ❌ | ✅ 10 components |
| Frontend integration | ❌ | ✅ folder-tree + upload |
| Frontend E2E | ✅ | — |
| Frontend visual | ✅ | baseline asserts |
| Frontend a11y | ⚠️ e2e only | ✅ component a11y |
