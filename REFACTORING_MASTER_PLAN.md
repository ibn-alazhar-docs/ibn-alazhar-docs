# REFACTORING_MASTER_PLAN.md — Ibn Al-Azhar Docs

> **Generated:** 2026-06-23
> **Scope:** Architecture-level refactoring across entire codebase
> **Constraint:** Preserve all behavior, tests, APIs, and security
> **Gate:** All 677 unit tests must remain green after each phase

---

## Phase Overview

| Phase | Focus                                             | Files Changed | Risk   | Effort   |
| ----- | ------------------------------------------------- | ------------- | ------ | -------- |
| **0** | Dead code + DRY cleanup                           | 8             | LOW    | 1h       |
| **1** | Error handling consolidation                      | 6             | LOW    | 1.5h     |
| **2** | Missing use-case layers                           | 5 new         | MEDIUM | 4h       |
| **3** | DocumentUseCases split                            | 4             | MEDIUM | 3h       |
| **4** | Route modernization (withAuth + handleRouteError) | 32            | LOW    | 4h       |
| **5** | Pipeline quality fixes                            | 6             | LOW    | 1.5h     |
| **6** | Worker improvements                               | 2             | LOW    | 1h       |
| **7** | Export subsystem cleanup                          | 4             | LOW    | 1.5h     |
|       | **Total**                                         | **~65**       |        | **~18h** |

---

## Phase 0: Dead Code + DRY Cleanup

**Goal:** Remove dead code and consolidate duplicates. Zero behavior change.

### 0.1 Remove dead `types.ts` re-export

- **File:** `apps/web/src/lib/types.ts`
- **Action:** Delete file (3 lines)
- **Update:** Find all imports from `@/lib/types` → change to `@/lib/errors`
- **Impact:** 0

### 0.2 Consolidate status mappings

- **Files:** `apps/web/src/lib/document-status.ts`, `apps/web/src/lib/conversion-status-utils.ts`
- **Action:** Merge into `conversion-status-utils.ts` (it's the superset). Delete `document-status.ts`. Update imports.
- **Impact:** 0 — both files define the same status→display mapping

### 0.3 Remove duplicate `getPythonCommand`

- **Files:** `packages/pipeline/src/ocr.ts`, `packages/pipeline/src/ocr-providers/types.ts`
- **Action:** Keep in `types.ts` only. Update `ocr.ts` to import from `./ocr-providers/types`.
- **Impact:** 0

### 0.4 Remove duplicate heading detection regex

- **File:** `packages/pipeline/src/text.ts`
- **Action:** Extract shared regex constants. `detectArabicHeadings` and `detectPostReconstructionHeadings` share identical regex patterns — extract to module-level constants.
- **Impact:** 0

### 0.5 Consolidate brand name constants

- **Files:** `apps/web/src/lib/brand.ts`, `apps/web/src/lib/metadata.ts`
- **Action:** Import `BRAND_NAME` from `brand.ts` in `metadata.ts`. Remove duplicated `siteName`/`siteNameAr`.
- **Impact:** 0

### 0.6 Resolve `ExportFormat` name collision

- **Files:** `apps/web/src/lib/validators/share.ts`, `apps/web/src/lib/export/types.ts`
- **Action:** Rename share's format to `ShareExportFormat` and rename the constant to `SHARE_EXPORT_FORMATS`. Update barrel exports.
- **Impact:** 0 — different contexts, intentional superset vs subset

### 0.7 Remove duplicate `bulkUntagSchema`

- **File:** `apps/web/src/lib/validators/tag.ts`
- **Action:** Make `bulkUntagSchema` an alias of `bulkTagSchema` (they're identical)
- **Impact:** 0

### 0.8 Add shared `Role` type

- **File:** New `apps/web/src/lib/auth-types.ts` (or add to `errors.ts`)
- **Action:** `export type Role = "ADMIN" | "STUDENT" | "TEACHER"` + `export const ROLE_VALUES: Role[] = [...]`
- **Update:** Replace string literals in `auth.ts`, `auth-guards.ts`, `validators/auth.ts`
- **Impact:** 0

### Validation

```bash
pnpm typecheck && pnpm lint && pnpm test
```

---

## Phase 1: Error Handling Consolidation

**Goal:** Unify error classes and migrate routes to `handleRouteError`.

### 1.1 Consolidate auth error classes

- **Files:** `apps/web/src/lib/errors.ts`, `apps/web/src/lib/auth-guards.ts`
- **Action:** Remove `AuthError` from `auth-guards.ts`. Use `AuthorizationError` (401) and `ForbiddenError` (403) from `errors.ts`. Update `requireRole` to throw `ForbiddenError`. Update imports in all routes that catch `AuthError`.
- **Impact:** Internal API change only (error class name)

### 1.2 Add missing error codes to `handleRouteError`

- **File:** `apps/web/src/lib/route-helpers.ts`
- **Action:** Add missing codes: `SEARCH_SUGGEST_ERROR`, `CONVERSION_STATUS_ERROR`, `CIRCULAR_REFERENCE` (already present). Ensure all `AppError.code` values have a matching entry.
- **Impact:** 0

### 1.3 Add try/catch to 3 routes missing it

- **Files:** `api/conversion/list/route.ts`, `api/conversion/[id]/status/route.ts`, `api/stream/route.ts`
- **Action:** Wrap Prisma queries in try/catch blocks with `handleRouteError`.
- **Impact:** 0 — error paths become handled instead of raw 500

### 1.4 Fix `storage-helper.ts` to throw `AppError`

- **File:** `apps/web/src/lib/storage-helper.ts`
- **Action:** Replace `throw new Error(...)` with `throw new NotFoundError(...)` or `throw new AppError(...)`.
- **Impact:** 0 — error message becomes mappable

### 1.5 Replace `console.warn` with logger in pipeline

- **Files:** `packages/pipeline/src/storage.ts`, `packages/pipeline/src/ocr-provider.ts`, `packages/pipeline/src/ocr-providers/gemini.ts`
- **Action:** Import and use `console.warn` → structured logger or at minimum keep `console.warn` consistent (pipeline has no logger dependency — leave as-is or create a minimal pipeline logger)
- **Impact:** 0

### Validation

```bash
pnpm typecheck && pnpm lint && pnpm test
```

---

## Phase 2: Missing Use-Case Layers

**Goal:** Extract business logic from 16 raw-Prisma routes into proper use-case classes.

### 2.1 Create `TagUseCases`

- **New file:** `apps/web/src/core/use-cases/tag.use-cases.ts`
- **Extract from:** `api/tags/route.ts`, `api/tags/[id]/route.ts`, `api/tags/merge/route.ts`
- **Methods:** `getTags`, `createTag`, `updateTag`, `deleteTag`, `mergeTags`
- **Business rules to extract:**
  - Max tags per user (50) enforcement
  - Duplicate name check
  - Merge algorithm (find unique docs, reassign, cleanup)
  - Cascade delete (tagDocument + tag)

### 2.2 Create `SearchUseCases`

- **New file:** `apps/web/src/core/use-cases/search.use-cases.ts`
- **Extract from:** `api/search/route.ts`, `api/search/suggest/route.ts`
- **Methods:** `search`, `getSuggestions`
- **Business rules to extract:**
  - Arabic text normalization for search
  - SQL construction (parameterized)
  - tsvector ranking and excerpt generation
  - Suggestion aggregation across documents/tags

### 2.3 Create `UserUseCases`

- **New file:** `apps/web/src/core/use-cases/user.use-cases.ts`
- **Extract from:** `api/users/route.ts`, `api/profile/route.ts`
- **Methods:** `getUsers`, `updateUserRole`, `deleteUser`, `updateProfile`, `deleteAccount`
- **Business rules to extract:**
  - Role-change self-prevention
  - Password verification for account deletion
  - Soft-delete of user and cascade

### 2.4 Create `ConversionUseCases`

- **New file:** `apps/web/src/core/use-cases/conversion.use-cases.ts`
- **Extract from:** `api/conversion/start/route.ts`, `api/conversion/list/route.ts`, `api/conversion/[id]/status/route.ts`
- **Methods:** `startConversion`, `listJobs`, `getJobStatus`
- **Business rules to extract:**
  - Document ownership verification
  - Job construction and pipeline enqueue
  - Status normalization and progress calculation

### 2.5 Refactor routes to use new use-cases

- **Files:** All routes listed above
- **Action:** Replace inline Prisma + business logic with use-case calls
- **Pattern:** `requireAuth() → use-case.execute() → response`

### Validation

```bash
pnpm typecheck && pnpm lint && pnpm test
```

---

## Phase 3: DocumentUseCases Split

**Goal:** Break the 304-line god class into 4 focused use-case classes.

### 3.1 Create `DocumentCrudUseCases`

- **Methods from DocumentUseCases:** `getDocuments`, `getDocumentById`, `updateDocument`, `deleteDocument`, `restoreDocument`
- **Lines:** ~100

### 3.2 Create `DocumentMoveUseCases`

- **Methods from DocumentUseCases:** `moveDocument`, `bulkMoveDocuments`
- **Lines:** ~60

### 3.3 Create `DocumentTagUseCases`

- **Methods from DocumentUseCases:** `getDocumentTags`, `addTagToDocument`, `setDocumentTags`, `removeTagFromDocument`, `bulkTagDocuments`, `bulkUntagDocuments`
- **Lines:** ~100

### 3.4 Create `DocumentShareUseCases`

- **Methods from DocumentUseCases:** `getShareLink`, `createShareLink`, `regenerateShareLink`, `deleteShareLink`
- **Lines:** ~80

### 3.5 Update barrel export

- **File:** `apps/web/src/core/use-cases/index.ts` (create if missing)
- **Action:** Export all 4 classes + singleton instances

### 3.6 Update all route imports

- **Files:** All document routes that import from `document.use-cases.ts`
- **Action:** Update to import from the specific sub-use-case

### Validation

```bash
pnpm typecheck && pnpm lint && pnpm test
```

---

## Phase 4: Route Modernization

**Goal:** Migrate all 32 remaining routes to `withAuth` + `handleRouteError`.

### 4.1 Define target pattern

```typescript
// BEFORE (typical current route)
export async function GET(request: NextRequest) {
  const session = await requireAuth().catch(() => null);
  if (!session) return unauthorizedResponse();
  try {
    const result = await useCase.execute(params.id, session.user.id);
    return NextResponse.json({ data: result });
  } catch (error) {
    return handleRouteError(error, "route-name", "Fallback message");
  }
}

// AFTER (withAuth + handleRouteError)
export const GET = withAuth(async (request, { session, params }) => {
  const result = await useCase.execute(params.id!, session.user.id);
  return NextResponse.json({ data: result });
});
```

### 4.2 Migrate document routes (15 files)

- Apply `withAuth` wrapper
- Replace manual try/catch with `handleRouteError`
- Standardize response format

### 4.3 Migrate folder routes not yet migrated (4 files)

- `folders/route.ts`, `folders/[id]/route.ts`, `folders/[id]/tags/route.ts`, `folders/[id]/tree/route.ts`

### 4.4 Migrate tag routes (3 files)

- `tags/route.ts`, `tags/[id]/route.ts`, `tags/merge/route.ts`

### 4.5 Migrate remaining routes

- `search/route.ts`, `search/suggest/route.ts`
- `upload/route.ts`
- `export/route.ts`, `export/[id]/[format]/route.ts`, `export/batch/route.ts`, `export/folder/route.ts`, `export/tag/route.ts`
- `conversion/start/route.ts`, `conversion/list/route.ts`, `conversion/[id]/status/route.ts`
- `users/route.ts`
- `profile/route.ts`
- `stream/route.ts`

### 4.6 Remove duplicate share delete route

- **File:** `api/documents/[id]/share/delete/route.ts`
- **Action:** Delete — the DELETE method in `api/documents/[id]/share/route.ts` already handles this

### Validation

```bash
pnpm typecheck && pnpm lint && pnpm test
```

---

## Phase 5: Pipeline Quality Fixes

**Goal:** Fix code smells and DRY violations in the pipeline package.

### 5.1 Fix Google Drive query injection

- **File:** `packages/pipeline/src/google-drive.ts`
- **Action:** Escape single quotes in `folderName` before interpolating into query string
- **Impact:** Security fix

### 5.2 Fix hardcoded Chinese character

- **File:** `apps/web/src/lib/export/zip-builder.ts`
- **Action:** Replace `"根"` with `"root"` or use a constant

### 5.3 Fix N+1 query in `resolveFolderForExport`

- **File:** `apps/web/src/lib/export/metadata.ts`
- **Action:** Use the batch approach from `bulk-export-helpers.ts` (fetch all folders, build Map, resolve ancestors from Map)

### 5.4 Remove duplicate OCR/Pipeline resolvers

- **Files:** `apps/web/src/lib/export/metadata.ts`, `apps/web/src/lib/export/bulk-export-helpers.ts`
- **Action:** `bulk-export-helpers.ts` should import from `metadata.ts` instead of duplicating

### 5.5 Fix `buildExportMetadata` hardcoded format

- **File:** `apps/web/src/lib/export/metadata.ts`
- **Action:** Accept `format` parameter instead of hardcoding `"zip"`

### 5.6 Add prisma.$disconnect to export-worker

- **File:** `workers/export-worker/src/index.ts`
- **Action:** Add `await prisma.$disconnect()` to SIGTERM/SIGINT handlers

### Validation

```bash
pnpm typecheck && pnpm lint && pnpm test
```

---

## Phase 6: Worker Improvements

**Goal:** Improve the OCR worker without changing behavior.

### 6.1 Extract pipeline stage handlers

- **File:** `workers/ocr-worker/src/index.ts`
- **Action:** Extract each stage handler into a separate function in the same file (not a new file — keep it simple). The `main()` function becomes a thin orchestrator calling `handleValidation()`, `handleSplitting()`, `handleOcr()`, `handleCleaning()`, `handleGeneration()`.
- **Impact:** 0 — same code, better organization

### 6.2 Extract helper functions

- **File:** `workers/ocr-worker/src/index.ts`
- **Action:** Move `parsePageRange`, `downloadDocumentBuffer`, `uploadExportBuffer` to module level (they're currently inside `main()` or duplicated)
- **Impact:** 0

### 6.3 Remove redundant PDF validation

- **File:** `workers/ocr-worker/src/index.ts`
- **Action:** Stage 1 re-validates PDF even though Stage 0 already validated. Remove the redundant check.
- **Impact:** 0 — removes one file read per job

### Validation

```bash
pnpm typecheck && pnpm lint && pnpm test
```

---

## Phase 7: Export Subsystem Cleanup

**Goal:** Clean up the export module's internal duplication and concerns.

### 7.1 Consolidate content-type mapping

- **Files:** `apps/web/src/lib/share-helpers.ts`, `apps/web/src/lib/export/profiles.ts`
- **Action:** `share-helpers.ts` `getContentType` should import from `export/profiles.ts` (which is the canonical source)
- **Impact:** 0

### 7.2 Fix `content.cleaned = rawText` in zip-builder

- **File:** `apps/web/src/lib/export/zip-builder.ts`
- **Action:** Either use `cleanArabicText(rawText)` for `content.cleaned` or remove the field
- **Impact:** 0 — output field change

### 7.3 Fix shared helper return type

- **File:** `apps/web/src/lib/share-helpers.ts`
- **Action:** Add a discriminant field to the return type: `{ ok: true, share: ... }` | `{ ok: false, error: string, status: number }`
- **Impact:** 0 — internal API improvement

### 7.4 Fix `resolveTagsForExport` ownership

- **File:** `apps/web/src/lib/export/metadata.ts`
- **Action:** Add `session` parameter and use `ownedWhere` for the tag query
- **Impact:** Security improvement

### Validation

```bash
pnpm typecheck && pnpm lint && pnpm test
```

---

## Measurement Targets

| Metric                            | Before | After (Target)                         |
| --------------------------------- | ------ | -------------------------------------- |
| God objects (>200 lines)          | 6      | 2 (text.ts, content.ts — acceptable)   |
| Duplicate code instances          | 8      | 0                                      |
| Missing use-case subsystems       | 6      | 0                                      |
| Routes with manual error handling | 31     | 0                                      |
| Routes with manual auth           | 35     | 0                                      |
| Dead code files                   | 1      | 0                                      |
| Competing error classes           | 3      | 2 (AuthorizationError, ForbiddenError) |
| ExportFormat name collisions      | 1      | 0                                      |
| Missing try/catch routes          | 3      | 0                                      |
| Files changed                     | —      | ~65                                    |

---

## Risk Assessment

| Phase | Risk                                          | Mitigation                           |
| ----- | --------------------------------------------- | ------------------------------------ |
| 0     | Import path changes could break               | Run typecheck after each sub-step    |
| 1     | Error class rename could break catch blocks   | Grep for `AuthError` before removing |
| 2     | New use-cases could have different behavior   | Extract verbatim, don't optimize yet |
| 3     | Splitting DocumentUseCases could break routes | Update all imports in same commit    |
| 4     | withAuth changes auth flow                    | Test each route manually             |
| 5     | Export format changes                         | Existing tests cover export paths    |
| 6     | Worker changes could break jobs               | Worker changes are internal only     |
| 7     | Export output changes                         | Existing tests cover export paths    |

---

## Execution Order

**Strict dependency:**

```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7
```

**Rationale:**

- Phase 0 (DRY) must come first — removes duplicates that would conflict with later phases
- Phase 1 (errors) must come before Phase 4 (route modernization) — routes need the consolidated error classes
- Phase 2 (use-cases) must come before Phase 4 (routes) — routes need the use-cases to call
- Phase 3 (DocumentUseCases split) must come after Phase 2 (other use-cases) — to avoid circular dependencies
- Phase 4 (routes) must come after Phase 2+3 — routes depend on use-cases
- Phases 5-7 are independent of 2-4 and can be done in any order

---

_This plan addresses 23 architectural improvements across 8 phases. Each phase is independently testable and preserves all existing behavior._
