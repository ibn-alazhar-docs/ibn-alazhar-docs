# ARCHITECTURAL_REVIEW.md — Ibn Al-Azhar Docs

> **Review date:** 2026-06-23
> **Last updated:** 2026-06-24 (resolved issues section added)
> **Reviewer:** Principal Software Architect
> **Scope:** Full codebase — 197+ files, ~21,400+ lines
> **Verdict:** CONDITIONAL GO → **IMPROVED** — significant architectural debt resolved

---

## Resolved Issues

The following items from the original review have been addressed since 2026-06-23:

| #   | Issue                                                     | Resolution                                                                                        | Date       |
| --- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------- |
| ✅  | **DocumentUseCases god class** (SRP violation, 304 lines) | Split into 4 focused classes: CRUD, Move, Tag, Share (barrel file, 72L)                           | 2026-06-24 |
| ✅  | **No use-case layer for Tag, Search, Conversion, Users**  | `tag.use-cases.ts`, `search.use-cases.ts`, `conversion.use-cases.ts`, `user.use-cases.ts` created | 2026-06-24 |
| ✅  | **No use-case layer for Profile**                         | `profile.use-cases.ts` created                                                                    | 2026-06-24 |
| ✅  | **No use-case layer for Export routes**                   | `export.use-cases.ts` created                                                                     | 2026-06-24 |
| ✅  | **16 of 45 routes bypass use-case layer**                 | Reduced to **6** (3 infrastructure, 3 complex: stream, register, share)                           | 2026-06-24 |
| ✅  | **Role type as raw string** (primitive obsession)         | `ROLE` const object + `isAdminRole()` in `errors.ts`                                              | 2026-06-24 |
| ✅  | **Missing domain types**                                  | `domain/types.ts` created (`DomainDocument`, `DomainTag`, etc.)                                   | 2026-06-24 |
| ✅  | **TagRepository missing interface**                       | `ITagRepository` with `BatchCount` type, `TagRepository implements ITagRepository`                | 2026-06-24 |
| ✅  | **ShareRepository missing interface**                     | `IShareRepository` with `DomainShareLink`/`CreateShareLinkInput` types                            | 2026-06-24 |
| ✅  | **Missing error handling in conversion/start**            | Added try/catch + `handleRouteError`                                                              | 2026-06-24 |
| ✅  | **Missing error handling in upload**                      | Wrapped `formData` in try/catch + `handleRouteError`                                              | 2026-06-24 |
| ✅  | **Missing error handling in share/regenerate**            | Added try/catch                                                                                   | 2026-06-24 |
| ✅  | **share/delete uses direct Prisma**                       | Now delegates to `documentUseCases.deleteShareLink`                                               | 2026-06-24 |
| ✅  | **export tag/folder/batch routes use direct Prisma**      | Now delegate to `exportUseCases`                                                                  | 2026-06-24 |
| ✅  | **profile route uses direct Prisma**                      | Now delegates to `ProfileUseCases`                                                                | 2026-06-24 |
| ✅  | **export-metadata test broken** (not matching $queryRaw)  | Test fixture/mock updated                                                                         | 2026-06-24 |

### Remaining Gaps (after fixes)

- **6 routes still import Prisma directly:** 3 infrastructure (`health`, `health/ready`, `metrics` — acceptable), 3 complex (`stream`, `auth/register`, `share/[token]`)
- **`share-helpers.ts`** still imports Prisma directly (should go through repository)
- **`export/metadata.ts`** still imports Prisma directly
- **`export/bulk-export-helpers.ts`** still imports Prisma directly

---

## Executive Summary

The Ibn Al-Azhar Docs codebase is a **well-tested, security-conscious production application** with 1,113 tests, solid auth, and Docker-first deployment. However, it exhibits the classic pattern of a rapidly-grown codebase: **feature velocity outpaced architectural discipline**, resulting in god objects, missing abstraction layers, and scattered cross-cutting concerns.

The core architecture (Clean Architecture layers, repository pattern, use-case pattern, BullMQ workers) is sound. The problems are **concentrated in 6 files** that together account for ~40% of the technical debt.

**Notable progress:** Since the initial review, significant architectural debt has been repaid — the use-case layer expanded from 4 files to 14, the DocumentUseCases god class was split into 4 focused classes, and direct Prisma access in routes dropped from 16 to 6. Role types are now properly typed, and domain types provide a shared contract layer.

---

## Architecture Overview

### Layer Diagram (Current)

```
┌─────────────────────────────────────────────────────┐
│  API Routes (45+ files, ~3,200 lines)                │
│  ├─ Auth: 3 patterns coexist                         │
│  ├─ Error handling: 3 patterns coexist               │
│  └─ Data access: use-case (39) / raw prisma (6)      │
├─────────────────────────────────────────────────────┤
│  Use Cases (14 files, ~1,800+ lines)                 │
│  ├─ Document*: CRUD | Move | Tag | Share (split)    │
│  ├─ FolderUseCases: OK (239 lines)                   │
│  ├─ TagUseCases: NEW (extracted from raw routes)     │
│  ├─ SearchUseCases: NEW (extracted from raw routes)  │
│  ├─ ConversionUseCases: NEW (extracted)              │
│  ├─ UserUseCases: NEW (extracted from register)      │
│  ├─ ProfileUseCases: NEW (replaces direct Prisma)    │
│  ├─ ExportUseCases: NEW (replaces direct Prisma)     │
│  ├─ ExportDocumentUseCase: OK (51 lines)             │
│  └─ UploadDocumentUseCase: OK (93 lines)             │
├─────────────────────────────────────────────────────┤
│  Repositories (6 files, ~400 lines)                  │
│  ├─ document.repository.ts: 58 lines                 │
│  ├─ folder.repository.ts: 76 lines                   │
│  ├─ tag.repository.ts: 80 lines (implements ITagRepo)│
│  ├─ share.repository.ts: 36 lines (implements IShare)│
│  ├─ user.repository.ts: NEW                          │
│  └─ Interfaces: ITagRepository, IShareRepository     │
├─────────────────────────────────────────────────────┤
│  Shared Libs (28 files, ~1,800 lines)               │
│  ├─ errors.ts: clean hierarchy + ROLE const          │
│  ├─ content.ts: GOD FILE (491 lines)                 │
│  ├─ types.ts: DEAD CODE (3 lines)                    │
│  └─ Mixed concerns across helpers                    │
├─────────────────────────────────────────────────────┤
│  Pipeline Package (12 files, ~2,500 lines)          │
│  ├─ queue.ts: GOD MODULE (437 lines, 24 exports)    │
│  ├─ text.ts: GOD FILE (718 lines)                    │
│  ├─ storage.ts: OK but singleton-coupled             │
│  └─ ocr-provider.ts: clean after refactor            │
├─────────────────────────────────────────────────────┤
│  Workers (2 files, ~755 lines)                       │
│  ├─ ocr-worker: GOD FILE (587 lines)                 │
│  └─ export-worker: OK (168 lines)                    │
└─────────────────────────────────────────────────────┘
```

---

## Dimension Analysis

### 1. Separation of Concerns — 7/10 (improved from 6/10)

**Strengths:**

- Clean repository layer (persistence only)
- Pipeline package is properly isolated
- Workers are separate processes
- **NEW:** Use-case layer expanded from 4 to 14 files (Tag, Search, Conversion, User, Profile, Export + Document split into 4)

**Weaknesses:**

- ~~16 of 45~~ **6 of 45** API routes bypass the use-case layer and call Prisma directly (was 16, now 6)
- ~~Tags, Search, Users, Profile, Conversion subsystems have NO use-case layer~~ → **All now have use-case layers**
- ~~DocumentUseCases is a god class~~ → **Split into 4 focused classes** (CRUD, Move, Tag, Share)
- Business logic still lives in some helper files (share-helpers, export helpers)
- `share-helpers.ts`, `export/metadata.ts`, `export/bulk-export-helpers.ts` still import Prisma directly

### 2. Dependency Direction — 8/10 (unchanged)

**Strengths:**

- Routes → Use Cases → Repositories → Prisma (correct dependency flow)
- Pipeline package has no upward dependencies
- Workers depend on pipeline (one-way)
- **NEW:** TagRepository and ShareRepository now implement domain interfaces

**Weaknesses:**

- `share-helpers.ts` depends on Prisma directly (should go through repository)
- `export/metadata.ts` depends on Prisma directly (should go through repository)
- `export/bulk-export-helpers.ts` depends on Prisma directly

### 3. SOLID Compliance — 6/10 (improved from 5/10)

| Principle | Violation                                                                            | Location                     | Severity |
| --------- | ------------------------------------------------------------------------------------ | ---------------------------- | -------- |
| **SRP**   | ~~DocumentUseCases handled 4+ concerns~~ → ✅ **Now split into CRUD/Move/Tag/Share** | ~~`document.use-cases.ts`~~  | RESOLVED |
| **SRP**   | queue.ts handles connections + workers + queues + enqueue + DLQ + metrics            | `queue.ts`                   | HIGH     |
| **SRP**   | ocr-worker handles 5 pipeline stages + helpers                                       | `ocr-worker/index.ts`        | HIGH     |
| **SRP**   | content.ts handles parsing + navigation + journeys + search + categories             | `content.ts`                 | HIGH     |
| **SRP**   | text.ts handles 18 cleaning stages + heading detection + line reconstruction         | `text.ts`                    | MEDIUM   |
| **SRP**   | share-helpers.ts handles validation + filename + content-type                        | `share-helpers.ts`           | LOW      |
| **OCP**   | OCR provider switch not exhaustive, new providers require code changes               | `ocr-provider.ts`            | LOW      |
| **DIP**   | Routes depend on Prisma directly (not through abstractions)                          | ~~16 routes~~ → **6 routes** | MEDIUM   |

### 4. Code Smells — 7/10 (static, some resolved)

| Smell                  | Count             | Files                                                                                                                           |
| ---------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| God objects/classes    | 6                 | queue.ts, ocr-worker, text.ts, content.ts, ocr-worker, ~~document.use-cases~~ (resolved)                                        |
| Duplicate code         | 8                 | getPythonCommand, heading detection, bulk schemas, status maps, brand names, ExportFormat, content-type, OCR/Pipeline resolvers |
| Dead code              | 1                 | types.ts (pointless re-export)                                                                                                  |
| Feature envy           | 3                 | ~~routes that need repository access~~ → 6 remaining naked routes + 3 helper files with direct Prisma                           |
| Primitive obsession    | ~~2~~ → **1**     | ~~role as `string`~~ ✅ **Resolved** (ROLE const + isAdminRole), ExportFormat name collision (open)                             |
| Hidden side effects    | 2                 | rate-limit.ts setInterval, metadata.ts hardcoded format                                                                         |
| Missing error handling | ~~3~~ → **fewer** | conversion/start ✅ fixed, upload ✅ fixed, share/regenerate ✅ fixed; stream still needs work                                  |

### 5. Coupling — 7/10 (unchanged)

**High coupling hotspots:**

- `queue.ts` — 24 exports, module-level singletons, mutable state
- `storage.ts` — module-level singletons, 6 mutable variables
- `ocr-providers/google.ts` — module-level singleton Drive client
- `export/metadata.ts` — direct Prisma access, no ownership guards
- `share-helpers.ts` — direct Prisma access

**Low coupling (good):**

- Repositories (thin Prisma wrappers — now with domain interfaces)
- Validators (pure Zod schemas)
- Export types (pure interfaces)
- Pipeline types (pure types)

### 6. Error Handling — 7/10 (improved from 6/10)

**Strengths:**

- Well-defined error hierarchy in `errors.ts` (AppError + 5 subclasses)
- `handleRouteError` centralizes code-to-response mapping
- `getErrorMessage` / `getErrorStatusCode` utilities
- **NEW:** conversion/start, upload, share/regenerate now have try/catch + handleRouteError

**Weaknesses:**

- 3 competing error classes for auth: `AuthError`, `AuthorizationError`, `ForbiddenError`
- 31 of 45 routes manually check error strings instead of using `handleRouteError`
- `getErrorMessage` returns `code` for AppError but `message` for Error — implicit contract with `route-helpers.ts`
- `storage-helper.ts` throws generic `Error` (not `AppError`)
- ~~3~~ **At least 1 route still missing try/catch** (stream initial — SSE makes it complex)
- `console.warn` in library code instead of logger

### 7. Performance — 8/10 (unchanged)

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

### 8. Security — 9/10 (unchanged)

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

### 9. Maintainability — 7/10 (improved from 6/10)

**Strengths:**

- Clean file organization (by feature/domain)
- Consistent naming conventions
- TypeScript strict mode
- ESLint zero-warning policy
- **NEW:** Shared domain types provide a single source of truth for entity shapes
- **NEW:** Repository interfaces enforce contract consistency (ITagRepository, IShareRepository)
- **NEW:** Role is now a typed const object with `isAdminRole()` helper

**Weaknesses:**

- ~~6~~ **5** god objects remain (document.use-cases no longer qualifies — see "improved" note: it's now a barrel file, but the 4 split classes are well-factored)
- 8 duplicate code instances create maintenance burden
- ~~No shared role type (`"ADMIN" | "STUDENT"` scattered as string literals)~~ → ✅ **Resolved** (ROLE const + isAdminRole)
- Hardcoded Arabic strings not connected to i18n
- Inline validation schemas in routes (not in validators/)
- Two `ExportFormat` types with different values (name collision)

---

## Files with Highest Technical Debt

| #   | File                                                    | Lines   | Debt Score | Primary Issues                                 |
| --- | ------------------------------------------------------- | ------- | ---------- | ---------------------------------------------- |
| 1   | `packages/pipeline/src/queue.ts`                        | 437     | **HIGH**   | God module, 24 exports, mutable singletons     |
| 2   | `workers/ocr-worker/src/index.ts`                       | 587     | **HIGH**   | God file, 5 stages, raw SQL, embedded Python   |
| 3   | `packages/pipeline/src/text.ts`                         | 718     | **HIGH**   | God file, duplicated heading detection         |
| 4   | ~~`apps/web/src/core/use-cases/document.use-cases.ts`~~ | ~~304~~ | ~~MEDIUM~~ | ✅ **Resolved** — split into 4 focused classes |
| 5   | `apps/web/src/lib/content.ts`                           | 491     | **MEDIUM** | God file, hardcoded data, no i18n              |
| 6   | `apps/web/src/lib/export/bulk-export-helpers.ts`        | 239     | **MEDIUM** | Duplicated resolvers, no ownership guards      |
| 7   | `apps/web/src/lib/export/metadata.ts`                   | 152     | **MEDIUM** | N+1 queries, duplicated resolvers              |
| 8   | `apps/web/src/lib/share-helpers.ts`                     | 65      | **LOW**    | Mixed concerns, fragile return type            |
| 9   | `apps/web/src/lib/rate-limit.ts`                        | 155     | **LOW**    | Module-level side effects                      |
| 10  | `apps/web/src/lib/types.ts`                             | 3       | **LOW**    | Dead code (pointless re-export)                |

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

| Priority | Category       | Recommendation                                    | Effort | Status     |
| -------- | -------------- | ------------------------------------------------- | ------ | ---------- |
| P0       | Architecture   | Extract TagUseCases from raw Prisma routes        | 2h     | ✅ DONE    |
| P0       | Architecture   | Extract SearchUseCases from raw Prisma routes     | 3h     | ✅ DONE    |
| P0       | Architecture   | Extract UserUseCases from raw Prisma routes       | 1h     | ✅ DONE    |
| P0       | Architecture   | Extract ConversionUseCases from raw Prisma routes | 2h     | ✅ DONE    |
| P0       | Architecture   | Split DocumentUseCases into 4 focused classes     | 3h     | ✅ DONE    |
| P1       | Architecture   | Extract ExportUseCases from raw Prisma routes     | —      | ✅ DONE    |
| P1       | Architecture   | Extract ProfileUseCases from raw Prisma route     | —      | ✅ DONE    |
| P1       | Architecture   | Add domain types for entity contracts             | —      | ✅ DONE    |
| P1       | Architecture   | Add repository interfaces (Tag, Share)            | —      | ✅ DONE    |
| P1       | DRY            | Consolidate status mappings (2 files → 1)         | 1h     | ⬜ PENDING |
| P1       | DRY            | Remove duplicate getPythonCommand                 | 10m    | ⬜ PENDING |
| P1       | DRY            | Remove duplicate heading detection regex          | 30m    | ⬜ PENDING |
| P1       | DRY            | Remove duplicate bulk tag schemas                 | 10m    | ⬜ PENDING |
| P1       | DRY            | Consolidate brand name constants                  | 10m    | ⬜ PENDING |
| P1       | DRY            | Resolve ExportFormat name collision               | 30m    | ⬜ PENDING |
| P1       | DRY            | Remove dead types.ts re-export                    | 5m     | ⬜ PENDING |
| P1       | Error Handling | Migrate all routes to withAuth + handleRouteError | 4h     | ⬜ PENDING |
| P1       | Error Handling | Consolidate auth error classes                    | 30m    | ⬜ PENDING |
| P1       | Error Handling | Add try/catch to 3 routes missing it              | 30m    | ✅ DONE 🟡 |
| P2       | Quality        | Fix N+1 query in resolveFolderForExport           | 30m    | ⬜ PENDING |
| P2       | Quality        | Fix Google Drive query injection                  | 15m    | ⬜ PENDING |
| P2       | Quality        | Fix hardcoded Chinese character in zip-builder    | 5m     | ⬜ PENDING |
| P2       | Quality        | Add prisma.$disconnect to export-worker shutdown  | 5m     | ⬜ PENDING |
| P2       | Quality        | Replace console.warn with logger in pipeline      | 20m    | ⬜ PENDING |
| P3       | Polish         | Add shared Role type                              | 10m    | ✅ DONE    |
| P3       | Polish         | Connect hardcoded Arabic to i18n                  | 2h     | ⬜ PENDING |
| P3       | Polish         | Move inline Zod schemas to validators/            | 30m    | ⬜ PENDING |

**Legend:** ✅ DONE = Implemented | 🟡 Partial = Some items done, not all | ⬜ PENDING = Not yet started

---

### Next Priority (after this batch)

1. Strip `share-helpers.ts`, `export/metadata.ts`, `export/bulk-export-helpers.ts` of direct Prisma access
2. Consolidate the 3 auth error classes into one (`AuthError`)
3. Break up the 5 remaining god objects (queue.ts, ocr-worker, text.ts, content.ts, ocr-worker)
4. Address the 8 duplicate code instances
5. Tackle P2 security/quality issues

---

_This review identified 23 actionable improvements across 6 priority tiers. As of 2026-06-24, **9 of 23 items are resolved**, including the most impactful architectural items (use-case layer expansion, DocumentUseCases split, role types, domain types). The codebase is production-ready and now significantly more maintainable._
