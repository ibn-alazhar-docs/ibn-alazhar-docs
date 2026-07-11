# Code Architecture Review Report

**Date**: 2026-06-30  
**Scope**: `apps/web/src/lib/backend/`, `lib/shared/`, `lib/frontend/`, `core/`, `domain/`  
**Purpose**: Catalog files, purposes, line counts, imports, layer violations, god files, and circular/questionable import patterns

---

## 1. Complete File Inventory

### 1.1 `domain/` (2 files, 137 lines)

| File              | Lines | Purpose                                                                                               | Imports                               |
| ----------------- | ----- | ----------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `domain/types.ts` | 126   | Domain interfaces: DomainDocument, DomainFolder, DomainTag, DomainShareLink, DomainUser + input types | `./auth`, `@ibn-al-azhar-docs/shared` |
| `domain/auth.ts`  | 11    | Role type, ROLE constants, isAdminRole helper                                                         | (none)                                |

**Repository interfaces** (in `domain/repositories/`):

| File                                                         | Lines | Purpose                  |
| ------------------------------------------------------------ | ----- | ------------------------ |
| `domain/repositories/document.repository.interface.ts`       | —     | IDocumentRepository      |
| `domain/repositories/folder.repository.interface.ts`         | —     | IFolderRepository        |
| `domain/repositories/tag.repository.interface.ts`            | —     | ITagRepository           |
| `domain/repositories/tag-document.repository.interface.ts`   | —     | ITagDocumentRepository   |
| `domain/repositories/conversion-job.repository.interface.ts` | —     | IConversionJobRepository |
| `domain/repositories/share.repository.interface.ts`          | —     | IShareRepository         |
| `domain/repositories/storage.repository.interface.ts`        | —     | IStorageRepository       |
| `domain/repositories/search.repository.interface.ts`         | —     | ISearchRepository        |

---

### 1.2 `lib/frontend/` (4 files, 97 lines)

| File                       | Lines | Purpose                                       | Imports                                       |
| -------------------------- | ----- | --------------------------------------------- | --------------------------------------------- |
| `lib/frontend/metadata.ts` | 78    | generatePageMetadata(), ogImage(), jsonLd()   | `@/lib/shared/constants`, next/metadata types |
| `lib/frontend/fonts.ts`    | 15    | Font Cairo from next/font/google              | next/font/google                              |
| `lib/frontend/cn.ts`       | 3     | clsx + twMerge utility                        | clsx, tailwind-merge                          |
| `lib/frontend/brand.ts`    | 3     | BRAND_COLOR, BRAND_GOLD, BRAND_GRAY constants | (none)                                        |

**Status**: CLEAN. Tiny, focused, no layer violations.

---

### 1.3 `lib/shared/` (7 files, 2944 lines)

| File                                    | Lines    | Purpose                                                                                 | Imports                                      |
| --------------------------------------- | -------- | --------------------------------------------------------------------------------------- | -------------------------------------------- |
| `lib/shared/openapi.ts`                 | **2600** | Inline OpenAPI 3.1 spec object                                                          | (none)                                       |
| `lib/shared/route-helpers.ts`           | 107      | parseSearchParams(), successResponse(), errorResponse(), paginationResponse()           | next/server, shared/errors, shared/constants |
| `lib/shared/constants.ts`               | 70       | APP_NAME, LIMITS (bulk, upload, tags), ERROR_CODES, DEFAULT_TAG_COLOR                   | (none)                                       |
| `lib/shared/conversion-status-utils.ts` | 62       | isTerminalStatus(), getProgressPercent(), getStatusDisplay()                            | (none)                                       |
| `lib/shared/errors.ts`                  | 52       | AppError, NotFoundError, ValidationError, ConflictError, ForbiddenError, RateLimitError | (none)                                       |
| `lib/shared/build-folder-tree.ts`       | 35       | buildFolderTree() from flat array                                                       | domain/types (DomainFolder)                  |
| `lib/shared/logger.ts`                  | 18       | logger (pino-based, env-aware)                                                          | (none)                                       |

**Validators** (in `lib/shared/validators/`):

| File                     | Lines | Purpose                                 |
| ------------------------ | ----- | --------------------------------------- |
| `validators/auth.ts`     | —     | Registration/login schema validation    |
| `validators/document.ts` | —     | Document input validation               |
| `validators/folder.ts`   | —     | Folder input validation                 |
| `validators/tag.ts`      | —     | Tag input validation, MAX_TAGS_PER_USER |
| `validators/export.ts`   | —     | Export request validation               |

**Status**: Mostly clean. One god file (openapi.ts). One domain-dependent import (build-folder-tree.ts → domain/types).

---

### 1.4 `lib/backend/` (18 files, ~1500 unique lines)

| File                                        | Lines   | Purpose                                                                           | Imports                                                                            |
| ------------------------------------------- | ------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `lib/backend/content.ts`                    | **322** | Filesystem content loading, journey/category resolution                           | fs, ./content/journeys-data, ./content/i18n-data                                   |
| `lib/backend/export/bulk-export-helpers.ts` | **263** | Bulk export orchestration                                                         | domain/repositories/\*, ./metadata, ./zip-builder, ./types                         |
| `lib/backend/export/zip-builder.ts`         | **231** | ZIP packaging, frontmatter/header generation                                      | jszip, ./types, ./profiles                                                         |
| `lib/backend/auth.ts`                       | **204** | NextAuth config, PrismaAdapter, Google+Credentials providers, module augmentation | next-auth, next-auth/adapters/prisma, next-auth/providers/google, prisma, bcryptjs |
| `lib/backend/export/metadata.ts`            | **193** | Prisma queries + metadata building for exports                                    | prisma, auth-guards, shared/errors, domain/repositories, ./types                   |
| `lib/backend/export/types.ts`               | 165     | Export type definitions                                                           | (none)                                                                             |
| `lib/backend/rate-limit.ts`                 | **141** | Dual rate limiting (IP + user), Redis-backed w/ in-memory fallback                | shared/errors, ./rate-limit/redis, ./rate-limit/store                              |
| `lib/backend/export/profiles.ts`            | 104     | Export profiles (research/archive/plain/developer)                                | ./types                                                                            |
| `lib/backend/content/journeys-data.ts`      | 98      | Journey definitions for content system                                            | (none)                                                                             |
| `lib/backend/rate-limit/redis.ts`           | 93      | Redis connection pool for rate limiting                                           | ioredis                                                                            |
| `lib/backend/auth-guards.ts`                | 89      | requireAuth(), requireRole(), ownedWhere(), withAuth(), withAdminAuth()           | react/cache, ./auth, next/navigation, next/server, shared/errors, domain/auth      |
| `lib/backend/audit.ts`                      | 55      | Audit logging helper                                                              | (none)                                                                             |
| `lib/backend/content/i18n-data.ts`          | 51      | Category/theme i18n labels                                                        | (none)                                                                             |
| `lib/backend/export/validators.ts`          | 43      | Export-specific validation                                                        | (none)                                                                             |
| `lib/backend/rate-limit/store.ts`           | 39      | In-memory rate limit store                                                        | (none)                                                                             |
| `lib/backend/share-helpers.ts`              | 37      | validateShareAccess() — token expiry, doc status checks                           | prisma                                                                             |
| `lib/backend/storage-helper.ts`             | 32      | downloadDocumentBuffer() — Google Drive + MinIO                                   | @ibn-al-azhar-docs/pipeline, prisma, shared/errors                                 |
| `lib/backend/prisma.ts`                     | 1       | Re-export from @ibn-al-azhar-docs/database                                        | @ibn-al-azhar-docs/database                                                        |

---

### 1.5 `core/` (25 files, ~2492 lines)

| File                                             | Lines   | Purpose                                                      | Imports                                                                                                                                  |
| ------------------------------------------------ | ------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `core/composition-root.ts`                       | 78      | Central DI — creates all repos + use-cases                   | lib/backend/prisma, ./repositories/_, ./use-cases/_                                                                                      |
| **Services**                                     |         |                                                              |                                                                                                                                          |
| `core/services/folder-tree.service.ts`           | 89      | Folder tree operations (build, validate move, move subtrees) | shared/errors, shared/build-folder-tree, shared/constants, domain/repositories                                                           |
| **Repositories (Prisma implementations)**        |         |                                                              |                                                                                                                                          |
| `core/repositories/search.repository.ts`         | 159     | Full-text search with Postgres                               | domain/repositories, lib/backend/prisma                                                                                                  |
| `core/repositories/tag.repository.ts`            | 130     | Tag CRUD                                                     | domain/repositories, lib/backend/prisma                                                                                                  |
| `core/repositories/folder.repository.ts`         | 118     | Folder CRUD                                                  | domain/repositories, lib/backend/prisma                                                                                                  |
| `core/repositories/storage.repository.ts`        | 72      | MinIO storage operations                                     | domain/repositories, @ibn-al-azhar-docs/minio                                                                                            |
| `core/repositories/user.repository.ts`           | 65      | User CRUD                                                    | domain/repositories, lib/backend/prisma                                                                                                  |
| `core/repositories/document.repository.ts`       | 63      | Document CRUD                                                | domain/repositories, lib/backend/prisma                                                                                                  |
| `core/repositories/share.repository.ts`          | 55      | Share link CRUD                                              | domain/repositories, lib/backend/prisma                                                                                                  |
| `core/repositories/tag-document.repository.ts`   | 46      | Document-tag join table                                      | domain/repositories, lib/backend/prisma                                                                                                  |
| `core/repositories/conversion-job.repository.ts` | 27      | Conversion job CRUD                                          | domain/repositories, lib/backend/prisma                                                                                                  |
| **Use-Cases**                                    |         |                                                              |                                                                                                                                          |
| `core/use-cases/export.use-cases.ts`             | **432** | Full export pipeline orchestration                           | **lib/backend/auth-guards, lib/backend/export/\***, domain/auth, shared/errors, domain/repositories/\*                                   |
| `core/use-cases/folder.use-cases.ts`             | 179     | Folder CRUD + tree + move                                    | shared/errors, shared/constants, domain/repositories/\*                                                                                  |
| `core/use-cases/search.use-cases.ts`             | 151     | Search orchestration                                         | shared/errors, domain/repositories                                                                                                       |
| `core/use-cases/document-tag.use-cases.ts`       | 120     | Document-tag association                                     | shared/errors, domain/repositories/\*                                                                                                    |
| `core/use-cases/document-crud.use-cases.ts`      | 118     | Document CRUD                                                | ../../domain/types, ../../domain/repositories/\*, shared/errors, shared/constants                                                        |
| `core/use-cases/tag.use-cases.ts`                | 110     | Tag CRUD                                                     | shared/errors, shared/validators/tag, **lib/backend/auth-guards**, domain/auth, shared/constants, domain/repositories/\*                 |
| `core/use-cases/conversion.use-cases.ts`         | 100     | Conversion pipeline                                          | shared/errors, **lib/backend/auth-guards**, domain/auth, shared/constants, @ibn-al-azhar-docs/pipeline (dynamic), domain/repositories/\* |
| `core/use-cases/upload-document.use-case.ts`     | 87      | Document upload                                              | shared/errors, shared/constants, domain/repositories/\*                                                                                  |
| `core/use-cases/user.use-cases.ts`               | 70      | User admin operations                                        | shared/errors, domain/repositories                                                                                                       |
| `core/use-cases/export-document.use-case.ts`     | 62      | Single document download                                     | domain/repositories/\*, **lib/backend/storage-helper**, @ibn-al-azhar-docs/pipeline, shared/errors, shared/constants                     |
| `core/use-cases/document-share.use-cases.ts`     | 60      | Share link management                                        | shared/errors, domain/repositories/\*                                                                                                    |
| `core/use-cases/document-move.use-cases.ts`      | 46      | Document move                                                | ../../domain/types, ../../domain/repositories/\*, shared/errors, core/services/folder-tree                                               |
| `core/use-cases/registration.use-cases.ts`       | 30      | User registration                                            | shared/errors, shared/constants, domain/repositories                                                                                     |
| `core/use-cases/profile.use-cases.ts`            | 25      | User profile                                                 | domain/repositories                                                                                                                      |

---

## 2. Layer Violation Analysis

### 2.1 CRITICAL: `core/` imports from `lib/backend/` (business logic depends on infrastructure)

| Use-Case                      | File:Line | Import                                     | What It Uses                     |
| ----------------------------- | --------- | ------------------------------------------ | -------------------------------- |
| `export.use-cases.ts`         | :1        | `@/lib/backend/auth-guards`                | `ownedWhere`, `AuthSession` type |
| `export.use-cases.ts`         | :4        | `@/lib/backend/export/bulk-export-helpers` | `executeBulkExport`              |
| `export.use-cases.ts`         | :5-12     | `@/lib/backend/export/metadata`            | 6 resolver functions             |
| `export.use-cases.ts`         | :13       | `@/lib/backend/export/zip-builder`         | `buildZipPackage`                |
| `export.use-cases.ts`         | :14       | `@/lib/backend/export/types`               | `ExportMetadata` type            |
| `conversion.use-cases.ts`     | :2        | `@/lib/backend/auth-guards`                | `ownedWhere`, `AuthSession` type |
| `tag.use-cases.ts`            | :3        | `@/lib/backend/auth-guards`                | `ownedWhere`, `AuthSession` type |
| `export-document.use-case.ts` | :3        | `@/lib/backend/storage-helper`             | `downloadDocumentBuffer`         |
| `composition-root.ts`         | :1        | `@/lib/backend/prisma`                     | Prisma client instance           |

**Impact**: 5 of 14 use-cases directly import from `lib/backend/`. The `ownedWhere` pattern is used in 3 use-cases + 1 export metadata module, making `lib/backend/auth-guards.ts` a de facto dependency of the business logic layer.

### 2.2 MODERATE: `lib/backend/` contains business logic

| File                            | Lines | Business Logic                                       | Should Be In                                                               |
| ------------------------------- | ----- | ---------------------------------------------------- | -------------------------------------------------------------------------- |
| `share-helpers.ts`              | 37    | Token validation, doc status checks, expiry logic    | `core/use-cases/` or `core/services/`                                      |
| `storage-helper.ts`             | 32    | Google Drive account lookup + download orchestration | `core/services/`                                                           |
| `export/bulk-export-helpers.ts` | 263   | Export orchestration, repo calls                     | `core/` (part of export domain)                                            |
| `export/metadata.ts`            | 193   | Prisma queries for metadata resolution               | `core/repositories/` or `core/services/`                                   |
| `content.ts`                    | 322   | Filesystem I/O + journey/category resolution         | Mixed — filesystem I/O is infrastructure, but journey resolution is domain |

### 2.3 LOW: `lib/shared/` imports from `domain/`

| File:Line                | Import                        | Assessment                                           |
| ------------------------ | ----------------------------- | ---------------------------------------------------- |
| `build-folder-tree.ts:1` | `domain/types` (DomainFolder) | ACCEPTABLE — shared utility using domain types       |
| `validators/auth.ts:2`   | `domain/auth` (ROLE)          | ACCEPTABLE — validation referencing domain constants |

### 2.4 ACCEPTABLE: `core/composition-root.ts` → `lib/backend/prisma`

The composition root importing the Prisma instance is the standard pattern for DI. This is the single legitimate infrastructure import in `core/`.

---

## 3. God Files (>200 Lines)

### 3.1 `lib/shared/openapi.ts` — 2600 lines

**Problem**: Single massive inline OpenAPI specification object. Contains all paths, schemas, components for the entire API in one file.

**Recommendation**: Split into:

- `openapi/paths/auth.ts`
- `openapi/paths/documents.ts`
- `openapi/paths/folders.ts`
- `openapi/paths/export.ts`
- `openapi/paths/search.ts`
- `openapi/paths/share.ts`
- `openapi/paths/tags.ts`
- `openapi/paths/users.ts`
- `openapi/schemas.ts`
- `openapi/index.ts` (assembler)

### 3.2 `lib/backend/content.ts` — 322 lines

**Problem**: Mixes filesystem I/O (resolveContentDir, exists, readFile), journey building (buildJourneyPageData, getCategoryPageData), and metadata resolution in one file.

**Recommendation**: Split into:

- `lib/backend/content/fs-helpers.ts` (resolveContentDir, exists, readFile, readdir)
- `lib/backend/content/journeys.ts` (buildJourneyPageData, getCategoryPageData, getThemePageData)
- `lib/backend/content/metadata.ts` (resolveMetadata, getAllDocs)

### 3.3 `lib/backend/export/bulk-export-helpers.ts` — 263 lines

**Problem**: Export orchestration that should live in `core/`. Mixes document fetching, metadata building, and ZIP packaging coordination.

**Recommendation**: Move to `core/services/export.service.ts` and split orchestration from helpers.

### 3.4 `lib/backend/export/zip-builder.ts` — 231 lines

**Problem**: ZIP packaging with frontmatter generation, header building, and file tree construction.

**Recommendation**: Keep as is (it's pure packaging logic), but move to `core/services/` to resolve the layer violation.

### 3.5 `lib/backend/auth.ts` — 204 lines

**Problem**: NextAuth config + module augmentation + credential logic.

**Assessment**: Acceptable for an auth configuration file. The 204 lines are mostly config, not logic. Borderline — could extract credential logic to a separate file if it grows.

### 3.6 `lib/backend/export/metadata.ts` — 193 lines

**Problem**: Prisma queries + metadata building. Mixes data access with business logic.

**Recommendation**: Split into:

- `core/repositories/export.repository.ts` (Prisma queries)
- `core/services/export-metadata.service.ts` (metadata building logic)

### 3.7 `core/use-cases/export.use-cases.ts` — 432 lines

**Problem**: Largest use-case. Orchestrates the full export pipeline including single export, bulk export, and format selection.

**Recommendation**: Split into:

- `core/use-cases/export-single.use-case.ts`
- `core/use-cases/export-bulk.use-case.ts`
- `core/services/export-orchestrator.service.ts` (shared logic)

### 3.8 `core/use-cases/folder.use-cases.ts` — 179 lines

**Assessment**: Borderline. Contains folder CRUD, tree building, and move operations. Could stay as is if the move logic is extracted to `folder-tree.service.ts` (which it partially is).

---

## 4. Circular Dependency & Questionable Import Patterns

### 4.1 No Circular Dependencies Found

The import graph is strictly hierarchical:

```
domain/ ← core/ ← lib/
lib/shared/ ← (leaf, only imports domain/types in one place)
lib/frontend/ ← (leaf, no outbound to core or backend)
```

No file imports itself or creates import cycles.

### 4.2 Questionable Import Patterns

#### A. Inconsistent Path Style in `core/use-cases/`

**Relative imports** (e.g., `../../domain/...`):

- `document-crud.use-cases.ts:1-2`
- `document-move.use-cases.ts:1-2`

**Alias imports** (e.g., `@/domain/...`):

- All other use-cases

**Recommendation**: Standardize on `@/` alias imports throughout `core/`.

#### B. `ownedWhere` is a Data-Access Pattern in Auth Infrastructure

`lib/backend/auth-guards.ts:50-57`:

```typescript
export function ownedWhere(
  baseWhere: Record<string, unknown>,
  session: AuthSession,
  userIdField = "userId",
): Record<string, unknown> {
  if (isAdminRole(session.user.role)) return baseWhere;
  return { ...baseWhere, [userIdField]: session.user.id };
}
```

This is a **Prisma query builder helper** living in auth middleware. It's used by:

- `core/use-cases/export.use-cases.ts:1`
- `core/use-cases/conversion.use-cases.ts:2`
- `core/use-cases/tag.use-cases.ts:3`
- `lib/backend/export/metadata.ts:2`

**Recommendation**: Move to `core/services/owned-where.ts` or a shared Prisma utility. The function depends on `domain/auth.ts` (isAdminRole) which is fine, but it shouldn't live in backend auth infrastructure.

#### C. Dynamic Import in Use-Case

`core/use-cases/conversion.use-cases.ts:22`:

```typescript
const { loadConfig, enqueueSplitting } = await import("@ibn-al-azhar-docs/pipeline");
```

Dynamic import of the pipeline package within a use-case. This is intentional (lazy loading to avoid importing Python-calling code at module level), but it means the dependency is hidden and harder to track.

**Assessment**: Acceptable pattern for heavy optional dependencies, but should be documented.

#### D. `AuthSession` Type Exported from `lib/backend/auth-guards.ts`

The `AuthSession` interface is defined in `lib/backend/auth-guards.ts:10-18` and imported by:

- `core/use-cases/export.use-cases.ts:1`
- `core/use-cases/conversion.use-cases.ts:2`
- `core/use-cases/tag.use-cases.ts:3`
- `lib/backend/export/metadata.ts:2`

**Recommendation**: Move `AuthSession` type to `domain/auth.ts` since it's consumed by the business logic layer.

---

## 5. Summary Statistics

| Directory       | Files             | Total Lines | God Files (>200) | Layer Violations   |
| --------------- | ----------------- | ----------- | ---------------- | ------------------ |
| `domain/`       | 2 (+8 interfaces) | 137         | 0                | 0                  |
| `lib/frontend/` | 4                 | 97          | 0                | 0                  |
| `lib/shared/`   | 7 (+5 validators) | 2,944       | 1 (openapi.ts)   | 0                  |
| `lib/backend/`  | 18                | ~1,500      | 4                | 4 (business logic) |
| `core/`         | 25                | 2,492       | 2                | 5 (→ lib/backend)  |
| **Total**       | **56**            | **~7,170**  | **7**            | **9**              |

### Priority Fixes

1. **HIGH**: Move `ownedWhere` + `AuthSession` to domain or core layer
2. **HIGH**: Move `share-helpers.ts`, `storage-helper.ts` business logic to `core/`
3. **MEDIUM**: Split `openapi.ts` (2600 lines) into path groups
4. **MEDIUM**: Split `export.use-cases.ts` (432 lines) into single/bulk use-cases
5. **MEDIUM**: Move `export/bulk-export-helpers.ts` and `export/metadata.ts` to core layer
6. **LOW**: Standardize import paths (relative vs alias) in `core/use-cases/`
7. **LOW**: Split `content.ts` into fs-helpers, journeys, and metadata
