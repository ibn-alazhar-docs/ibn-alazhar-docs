# ARCHITECTURAL_REVIEW.md — Ibn Al-Azhar Docs

> **Review date:** 2026-06-23
> **Reviewer:** Principal Software Architect
> **Scope:** Full codebase — 197 files, ~21,400 lines
> **Verdict:** CONDITIONAL GO — strong foundation with concentrated technical debt

---

## Executive Summary

The Ibn Al-Azhar Docs codebase is a **well-tested, security-conscious production application** with 1,113 tests, solid auth, and Docker-first deployment. However, it exhibits the classic pattern of a rapidly-grown codebase: **feature velocity outpaced architectural discipline**, resulting in god objects, missing abstraction layers, and scattered cross-cutting concerns.

The core architecture (Clean Architecture layers, repository pattern, use-case pattern, BullMQ workers) is sound. The problems are **concentrated in 6 files** that together account for ~40% of the technical debt.

---

## Architecture Overview

### Layer Diagram (Current)

```
┌─────────────────────────────────────────────────────┐
│  API Routes (45 files, ~3,200 lines)                │
│  ├─ Auth: 3 patterns coexist                        │
│  ├─ Error handling: 3 patterns coexist              │
│  └─ Data access: use-case (24) / raw prisma (16)    │
├─────────────────────────────────────────────────────┤
│  Use Cases (4 files, ~687 lines)                    │
│  ├─ DocumentUseCases: GOD CLASS (304 lines)         │
│  ├─ FolderUseCases: OK (239 lines)                  │
│  ├─ ExportDocumentUseCase: OK (51 lines)            │
│  └─ UploadDocumentUseCase: OK (93 lines)            │
├─────────────────────────────────────────────────────┤
│  Repositories (4 files, ~250 lines)                 │
│  ├─ document.repository.ts: 58 lines                │
│  ├─ folder.repository.ts: 76 lines                  │
│  ├─ tag.repository.ts: 80 lines                     │
│  └─ share.repository.ts: 36 lines                   │
├─────────────────────────────────────────────────────┤
│  Shared Libs (28 files, ~1,800 lines)               │
│  ├─ errors.ts: clean hierarchy                      │
│  ├─ content.ts: GOD FILE (491 lines)                │
│  ├─ types.ts: DEAD CODE (3 lines)                   │
│  └─ Mixed concerns across helpers                   │
├─────────────────────────────────────────────────────┤
│  Pipeline Package (12 files, ~2,500 lines)          │
│  ├─ queue.ts: GOD MODULE (437 lines, 24 exports)    │
│  ├─ text.ts: GOD FILE (718 lines)                   │
│  ├─ storage.ts: OK but singleton-coupled            │
│  └─ ocr-provider.ts: clean after refactor           │
├─────────────────────────────────────────────────────┤
│  Workers (2 files, ~755 lines)                      │
│  ├─ ocr-worker: GOD FILE (587 lines)                │
│  └─ export-worker: OK (168 lines)                   │
└─────────────────────────────────────────────────────┘
```

---

## Dimension Analysis

### 1. Separation of Concerns — 6/10

**Strengths:**

- Clean repository layer (persistence only)
- Pipeline package is properly isolated
- Workers are separate processes

**Weaknesses:**

- 16 of 45 API routes bypass the use-case layer and call Prisma directly
- Tags, Search, Users, Profile, Conversion subsystems have NO use-case layer
- Business logic lives in routes (tag merge algorithm, search SQL construction, export orchestration)
- DocumentUseCases is a god class handling documents, tags, share links, bulk operations

### 2. Dependency Direction — 8/10

**Strengths:**

- Routes → Use Cases → Repositories → Prisma (correct dependency flow)
- Pipeline package has no upward dependencies
- Workers depend on pipeline (one-way)

**Weaknesses:**

- `share-helpers.ts` depends on Prisma directly (should go through repository)
- `export/metadata.ts` depends on Prisma directly (should go through repository)
- `export/bulk-export-helpers.ts` depends on Prisma directly
- Some routes import from `@/lib/prisma` directly

### 3. SOLID Compliance — 5/10

| Principle | Violation                                                                    | Location                | Severity |
| --------- | ---------------------------------------------------------------------------- | ----------------------- | -------- |
| **SRP**   | DocumentUseCases handles documents + tags + shares + bulk ops                | `document.use-cases.ts` | HIGH     |
| **SRP**   | queue.ts handles connections + workers + queues + enqueue + DLQ + metrics    | `queue.ts`              | HIGH     |
| **SRP**   | ocr-worker handles 5 pipeline stages + helpers                               | `ocr-worker/index.ts`   | HIGH     |
| **SRP**   | content.ts handles parsing + navigation + journeys + search + categories     | `content.ts`            | HIGH     |
| **SRP**   | text.ts handles 18 cleaning stages + heading detection + line reconstruction | `text.ts`               | MEDIUM   |
| **SRP**   | share-helpers.ts handles validation + filename + content-type                | `share-helpers.ts`      | LOW      |
| **OCP**   | OCR provider switch not exhaustive, new providers require code changes       | `ocr-provider.ts`       | LOW      |
| **DIP**   | Routes depend on Prisma directly (not through abstractions)                  | 16 routes               | MEDIUM   |

### 4. Code Smells — 7/10 (needs work)

| Smell                  | Count | Files                                                                                                                           |
| ---------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------- |
| God objects/classes    | 6     | document.use-cases, queue.ts, ocr-worker, text.ts, content.ts, ocr-worker                                                       |
| Duplicate code         | 8     | getPythonCommand, heading detection, bulk schemas, status maps, brand names, ExportFormat, content-type, OCR/Pipeline resolvers |
| Dead code              | 1     | types.ts (pointless re-export)                                                                                                  |
| Feature envy           | 3     | routes that need repository access but call Prisma directly                                                                     |
| Primitive obsession    | 2     | role as `string` (should be union type), ExportFormat name collision                                                            |
| Hidden side effects    | 2     | rate-limit.ts setInterval, metadata.ts hardcoded format                                                                         |
| Missing error handling | 3     | conversion/list, conversion/status, stream                                                                                      |

### 5. Coupling — 7/10

**High coupling hotspots:**

- `queue.ts` — 24 exports, module-level singletons, mutable state
- `storage.ts` — module-level singletons, 6 mutable variables
- `ocr-providers/google.ts` — module-level singleton Drive client
- `export/metadata.ts` — direct Prisma access, no ownership guards
- `share-helpers.ts` — direct Prisma access

**Low coupling (good):**

- Repositories (thin Prisma wrappers)
- Validators (pure Zod schemas)
- Export types (pure interfaces)
- Pipeline types (pure types)

### 6. Error Handling — 6/10

**Strengths:**

- Well-defined error hierarchy in `errors.ts` (AppError + 5 subclasses)
- `handleRouteError` centralizes code-to-response mapping
- `getErrorMessage` / `getErrorStatusCode` utilities

**Weaknesses:**

- 3 competing error classes for auth: `AuthError`, `AuthorizationError`, `ForbiddenError`
- 31 of 45 routes manually check error strings instead of using `handleRouteError`
- `getErrorMessage` returns `code` for AppError but `message` for Error — implicit contract with `route-helpers.ts`
- `storage-helper.ts` throws generic `Error` (not `AppError`)
- 3 routes have NO try/catch (conversion/list, conversion/status partial, stream initial)
- `console.warn` in library code instead of logger

### 7. Performance — 8/10

**Strengths:**

- Connection pooling via PgBouncer (25 pool, 200 max)
- Redis-backed rate limiting with in-memory fallback
- BullMQ with concurrency controls
- Load tested: p95 < 140ms for 100 concurrent operations

**Weaknesses:**

- N+1 query in `resolveFolderForExport` (5 sequential queries per ancestor)
- `getJobStatus` makes 5 sequential Redis calls (should be parallel)
- `GoogleDriveOcrProvider.extractPages` processes pages sequentially with 1s sleep
- `getPythonCommand` called twice (once per file)
- No connection pool health check on IORedis

### 8. Security — 9/10

**Strengths:**

- Consistent userId scoping across all queries
- Parameterized queries via Prisma (zero SQL injection)
- CSRF protection, rate limiting, CSP, HSTS
- No hardcoded secrets in source

**Weaknesses:**

- Google Drive query injection in `ensureDriveFolder` (folderName not escaped)
- Health endpoint leaks DB error messages to unauthenticated callers
- AUTH_SECRET warning checks wrong fallback value
- Ofelia has Docker socket access (container escape risk)
- cAdvisor runs privileged

### 9. Maintainability — 6/10

**Strengths:**

- Clean file organization (by feature/domain)
- Consistent naming conventions
- TypeScript strict mode
- ESLint zero-warning policy

**Weaknesses:**

- 6 god objects increase cognitive load for new developers
- 8 duplicate code instances create maintenance burden
- No shared role type (`"ADMIN" | "STUDENT"` scattered as string literals)
- Hardcoded Arabic strings not connected to i18n
- Inline validation schemas in routes (not in validators/)
- Two `ExportFormat` types with different values (name collision)

---

## Files with Highest Technical Debt

| #   | File                                                | Lines | Debt Score | Primary Issues                               |
| --- | --------------------------------------------------- | ----- | ---------- | -------------------------------------------- |
| 1   | `packages/pipeline/src/queue.ts`                    | 437   | **HIGH**   | God module, 24 exports, mutable singletons   |
| 2   | `workers/ocr-worker/src/index.ts`                   | 587   | **HIGH**   | God file, 5 stages, raw SQL, embedded Python |
| 3   | `packages/pipeline/src/text.ts`                     | 718   | **HIGH**   | God file, duplicated heading detection       |
| 4   | `apps/web/src/core/use-cases/document.use-cases.ts` | 304   | **MEDIUM** | God class, handles 4+ concerns               |
| 5   | `apps/web/src/lib/content.ts`                       | 491   | **MEDIUM** | God file, hardcoded data, no i18n            |
| 6   | `apps/web/src/lib/export/bulk-export-helpers.ts`    | 239   | **MEDIUM** | Duplicated resolvers, no ownership guards    |
| 7   | `apps/web/src/lib/export/metadata.ts`               | 152   | **MEDIUM** | N+1 queries, duplicated resolvers            |
| 8   | `apps/web/src/lib/share-helpers.ts`                 | 65    | **LOW**    | Mixed concerns, fragile return type          |
| 9   | `apps/web/src/lib/rate-limit.ts`                    | 155   | **LOW**    | Module-level side effects                    |
| 10  | `apps/web/src/lib/types.ts`                         | 3     | **LOW**    | Dead code (pointless re-export)              |

---

## Remaining P2 Issues (from PRODUCTION_READINESS_FINAL.md)

| #      | Issue                                             | Architectural Impact     |
| ------ | ------------------------------------------------- | ------------------------ |
| P2-001 | CSP connect-src mismatch                          | Config drift             |
| P2-002 | env.ts AUTH_SECRET warning checks wrong value     | Magic string duplication |
| P2-003 | Health endpoint leaks DB errors                   | Info disclosure          |
| P2-004 | db-migrate dependency commented out               | Startup ordering         |
| P2-005 | Worker health check doesn't verify job processing | Monitoring gap           |
| P2-009 | Public Cache-Control on private folder data       | CDN cache leakage        |
| P2-010 | Error messages leak Prisma/Zod internals          | Info disclosure          |
| P2-011 | User enumeration via registration                 | Security                 |

---

## Recommendations Summary

| Priority | Category       | Recommendation                                    | Effort |
| -------- | -------------- | ------------------------------------------------- | ------ |
| P0       | Architecture   | Extract TagUseCases from raw Prisma routes        | 2h     |
| P0       | Architecture   | Extract SearchUseCases from raw Prisma routes     | 3h     |
| P0       | Architecture   | Extract UserUseCases from raw Prisma routes       | 1h     |
| P0       | Architecture   | Extract ConversionUseCases from raw Prisma routes | 2h     |
| P0       | Architecture   | Split DocumentUseCases into 4 focused classes     | 3h     |
| P1       | DRY            | Consolidate status mappings (2 files → 1)         | 1h     |
| P1       | DRY            | Remove duplicate getPythonCommand                 | 10m    |
| P1       | DRY            | Remove duplicate heading detection regex          | 30m    |
| P1       | DRY            | Remove duplicate bulk tag schemas                 | 10m    |
| P1       | DRY            | Consolidate brand name constants                  | 10m    |
| P1       | DRY            | Resolve ExportFormat name collision               | 30m    |
| P1       | DRY            | Remove dead types.ts re-export                    | 5m     |
| P1       | Error Handling | Migrate all routes to withAuth + handleRouteError | 4h     |
| P1       | Error Handling | Consolidate auth error classes                    | 30m    |
| P1       | Error Handling | Add try/catch to 3 routes missing it              | 30m    |
| P2       | Quality        | Fix N+1 query in resolveFolderForExport           | 30m    |
| P2       | Quality        | Fix Google Drive query injection                  | 15m    |
| P2       | Quality        | Fix hardcoded Chinese character in zip-builder    | 5m     |
| P2       | Quality        | Add prisma.$disconnect to export-worker shutdown  | 5m     |
| P2       | Quality        | Replace console.warn with logger in pipeline      | 20m    |
| P3       | Polish         | Add shared Role type                              | 10m    |
| P3       | Polish         | Connect hardcoded Arabic to i18n                  | 2h     |
| P3       | Polish         | Move inline Zod schemas to validators/            | 30m    |

---

_This review identifies 23 actionable improvements across 6 priority tiers. The codebase is production-ready today, but addressing P0-P1 items would significantly improve maintainability and reduce onboarding cost for new engineers._
