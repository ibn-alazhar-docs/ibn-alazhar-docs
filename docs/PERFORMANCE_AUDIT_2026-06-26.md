# Performance Audit Report — Ibn Al-Azhar Docs

**Date:** 2026-06-26
**Auditor:** Architect Agent
**Scope:** Full codebase — 10 checklist areas from `.opencode/skills/code-transform/references/05-performance-audit.md`

---

## 1. N+1 QUERIES

### 1.1 — `moveFolder` loads all folders for circular reference check — HIGH
- **File:** `apps/web/src/core/use-cases/folder.use-cases.ts`, line 121
- `findMany(userId, { select: { id: true, parentId: true } })` fetches ALL folders for the user to build an in-memory graph. `getDescendantMaxDepth` (line 148) is O(n²) via `Array.from(folderMap.entries()).filter(...)`.
- **Fix:** Use a recursive CTE query in PostgreSQL to detect cycles and compute depth in one DB roundtrip.

### 1.2 — `getFolderTree` loads all folders then builds tree in JS — MEDIUM
- **File:** `apps/web/src/core/use-cases/folder.use-cases.ts`, line 180
- Fetches ALL folders via `findMany()` and builds tree in JS with recursive `buildTree()`. Fine for small datasets, bottleneck for many folders.
- **Fix:** Use PostgreSQL recursive CTE to build tree server-side, or add pagination/depth limits.

### 1.3 — `exportByFolder` recursively collects child folder IDs one-by-one — MEDIUM
- **File:** `apps/web/src/core/use-cases/export.use-cases.ts`, lines 225-235
- `collectChildFolderIds()` issues a separate DB query per folder level. A 5-level deep hierarchy = 5 sequential queries.
- **Fix:** Single recursive CTE query to collect all descendant folder IDs.

### 1.4 — `deleteShareLink` fetches document then share link separately — LOW
- **File:** `apps/web/src/core/use-cases/document-share.use-cases.ts`, lines 50-57
- Document fetch (line 51) is redundant; `deleteShareLinkByDocumentId` already scopes by `documentId` and `userId`.
- **Fix:** Remove the document existence check; rely on `count === 0` from delete.

---

## 2. MISSING INDEXES

### 2.1 — `Tag` model missing index on `userId` — HIGH
- **File:** `prisma/schema.prisma`, line 172-184
- `Tag` has `@@unique([userId, name])` but no standalone `@@index([userId])`. Queries filtering by `userId` alone do full composite-index scans.
- **Fix:** Add `@@index([userId])` to the `Tag` model.

### 2.2 — `AuditLog` — OK
- Has indexes on `(userId)`, `(entity, entityId)`, `(createdAt)`, `(action, createdAt)`, `(userId, createdAt)`. Well-indexed.

---

## 3. BUNDLE SIZE

### 3.1 — `motion/react` (Framer Motion) imported in `DocumentRow` — HIGH
- **File:** `apps/web/src/components/files/document-row.tsx`, line 5
- `motion.tr`, `motion.button`, `motion.div` for every row. Framer Motion adds ~30-40KB gzipped. With 50 rows × multiple elements = significant bundle cost for table animation.
- **Fix:** Replace `motion.*` with CSS `@keyframes` and Tailwind transitions.

### 3.2 — Motion instances per button — MEDIUM
- **File:** `apps/web/src/components/files/document-row.tsx`, lines 134-147, 150-176, 207-233, 265-291
- Every action button uses `motion.button` with `whileHover`/`whileTap`. 50 rows × 4 buttons = 200 motion instances.
- **Fix:** Use CSS `transition-transform` and `:hover`/`:active` pseudo-classes.

### 3.3 — Static pipeline imports in `upload-document.use-case.ts` — LOW
- **File:** `apps/web/src/core/use-cases/upload-document.use-case.ts`, lines 1-6
- Statically imports `loadConfig`, `ensureBucket`, `enqueueValidation`, `uploadFile` from pipeline. May pull entire pipeline bundle into server bundle.
- **Fix:** Use dynamic imports or verify `serverExternalPackages` handles it.

---

## 4. MEMORY LEAKS

### 4.1 — Workers create PrismaClient instances at module scope — HIGH
- **Files:**
  - `workers/ocr-worker/src/index.ts`, line 18
  - `workers/export-worker/src/index.ts`, line 8
  - `workers/export-worker/src/export-handler.ts`, line 20
  - `workers/ocr-worker/src/helpers.ts`, line 27
  - `workers/ocr-worker/src/stages/generate.ts`, line 16
- Multiple PrismaClient instances = multiple connection pools. Only `index.ts` disconnects on shutdown; others are never cleaned up.
- **Fix:** Share a single PrismaClient across all worker modules. Pass via function params or shared module. Ensure all disconnect on shutdown.

### 4.2 — `OcrManager` created per job without cleanup guarantee — MEDIUM
- **File:** `workers/ocr-worker/src/stages/ocr.ts`, line 23
- Created inside worker callback per job. No `finally` block to call `manager.cleanup()` if job fails mid-processing.
- **Fix:** Add `try/finally` to ensure `manager.destroy()` is called.

### 4.3 — `generateSearchablePdf` temp file cleanup not guaranteed — MEDIUM
- **File:** `workers/ocr-worker/src/helpers.ts`, lines 108-126
- Writes temp PNG + PDF per page, deletes in loop body. If process crashes, temp files accumulate.
- **Fix:** Track all temp files, add top-level `finally` to clean up all of them.

---

## 5. UNNECESSARY RE-RENDERS

### 5.1 — `DocumentRow` is not memoized — HIGH
- **File:** `apps/web/src/components/files/document-row.tsx`, line 32
- Receives 17 props including callbacks recreated on every parent render. Not wrapped in `React.memo`. Every state change in `FilesPage` re-renders ALL document rows.
- **Fix:** Wrap in `React.memo`. Ensure parent callbacks use `useCallback`.

### 5.2 — Inline arrow functions in `FilesPage` — MEDIUM
- **File:** `apps/web/src/app/[locale]/(dashboard)/files/page.tsx`, lines 335-339
- `onCancelEdit={() => { ... }}` and `onDelete={(docId) => ...}` create new references every render.
- **Fix:** Wrap in `useCallback`.

### 5.3 — `FilesPage` has 16+ useState hooks — MEDIUM
- **File:** `apps/web/src/app/[locale]/(dashboard)/files/page.tsx`, lines 33-46
- `loadDocuments` depends on `selectedTagIds` but has empty `useCallback` deps `[]` — captures stale reference.
- **Fix:** Fix dependency array. Consider splitting into smaller components or `useReducer`.

### 5.4 — `FolderItem` re-renders entire subtree on expand/collapse — LOW
- **File:** `apps/web/src/components/folders/folder-item.tsx`, line 28
- Not memoized; toggling one folder re-renders the entire tree.
- **Fix:** Wrap in `React.memo` with custom comparator.

---

## 6. SLOW ALGORITHMS

### 6.1 — `moveFolder` descendant depth check is O(n²) — MEDIUM
- **File:** `apps/web/src/core/use-cases/folder.use-cases.ts`, lines 148-156
- `getDescendantMaxDepth` recursively scans entire map per node. Deep linear chain = O(n²).
- **Fix:** Pre-build adjacency list (Map<string, string[]>) once, then traverse. O(n).

### 6.2 — `parsePageRange` — OK
- Called once per job, O(p) where p = pages in range. Fine.

---

## 7. CACHING

### 7.1 — No cache headers on document list API — HIGH
- **File:** `apps/web/src/app/api/documents/route.ts`, line 45
- `GET /api/documents` returns without `Cache-Control`. Every navigation triggers fresh API call.
- **Fix:** Add `Cache-Control: private, max-age=0, must-revalidate` or use `stale-while-revalidate`.

### 7.2 — No cache headers on tags API — MEDIUM
- **File:** `apps/web/src/app/api/tags/route.ts`, line 11
- Tags change rarely; `TagPicker` fetches on mount every time.
- **Fix:** Add `Cache-Control: private, max-age=60, stale-while-revalidate=300`.

### 7.3 — No cache headers on search suggestions API — MEDIUM
- **File:** `apps/web/src/app/api/search/suggest/route.ts`, line 21
- Called on every keystroke (debounced 300ms). Same queries fetched repeatedly.
- **Fix:** Client-side cache with TTL or server-side `Cache-Control`.

### 7.4 — No cache headers on folder tree API — MEDIUM
- **File:** `apps/web/src/app/api/folders/route.ts`, line 15
- `FolderTree` fetches on mount and after every mutation. Folder structures are stable.
- **Fix:** Add cache headers or client-side cache with invalidation on mutations.

---

## 8. DATABASE QUERIES

### 8.1 — `restoreDocument` uses `findMany` instead of `findFirst` — MEDIUM
- **File:** `apps/web/src/core/use-cases/document-crud.use-cases.ts`, line 109
- Checks `if (!document.length)` instead of `if (!document)`.
- **Fix:** Replace with `findFirst()`.

### 8.2 — `getDocuments` loads full tag relations for every document — MEDIUM
- **File:** `apps/web/src/core/use-cases/document-crud.use-cases.ts`, lines 41-46
- `tags: { include: { tag: { select: { id, name, color } } } }` on every query. JOIN multiplies result set.
- **Fix:** Load tags separately only when needed, or use raw query with aggregation.

### 8.3 — `exportByTag` loads full documents then filters in JS — MEDIUM
- **File:** `apps/web/src/core/use-cases/export.use-cases.ts`, lines 183-196
- Filters `deletedAt === null` and ownership in JavaScript after fetching all records.
- **Fix:** Push filtering to DB: `where: { tagId, document: { deletedAt: null, userId: session.user.id } }`.

### 8.4 — Search suggestions use `ILIKE` without index support — HIGH
- **File:** `apps/web/src/core/repositories/search.repository.ts`, lines 70-105
- `ILIKE '%query%'` with `normalize_arabic()`. Leading wildcard cannot use B-tree indexes. `searchvector` GIN index is not used by suggestions.
- **Fix:** Use `plainto_tsquery('simple', $query)` for title suggestions. Add `pg_trgm` GIN index on `name` for folder/tag suggestions.

---

## 9. WORKER EFFICIENCY

### 9.1 — Sequential page upload in split stage — HIGH
- **File:** `workers/ocr-worker/src/stages/split.ts`, lines 53-58
- Uploads page images one-by-one in a `for` loop. 100-page PDF = 100 sequential uploads.
- **Fix:** Use `Promise.all` with concurrency limiter (e.g., `p-limit`, 5-10 concurrent). 5-10x speedup.

### 9.2 — Sequential page existence checks in OCR stage — MEDIUM
- **File:** `workers/ocr-worker/src/stages/ocr.ts`, lines 37-46
- 100-page document = 100 sequential `fileExists` calls.
- **Fix:** Check page-001 first, then check page-N at known upper bound, or batch checks.

### 9.3 — Export worker processes formats sequentially — MEDIUM
- **File:** `workers/export-worker/src/export-handler.ts`, lines 38-80
- Generates md, txt, json, docx, epub, pdf sequentially in one job.
- **Fix:** Generate independent formats in parallel. Split into separate jobs per format.

### 9.4 — `generateSearchablePdf` runs Python scripts sequentially — MEDIUM
- **File:** `workers/ocr-worker/src/helpers.ts`, lines 108-126
- Each page invokes `python3 generate_pdf.py` via `execFileAsync`. Python startup overhead ~200-500ms × pages.
- **Fix:** Use long-running Python process with IPC, or batch pages into single invocation, or replace with Node.js PDF library.

---

## 10. IMAGE/FONT OPTIMIZATION

### 10.1 — No Next.js `Image` component usage — MEDIUM
- **File:** `apps/web/src/app/[locale]/(dashboard)/dashboard-content.tsx`, lines 124-152
- Uses inline SVG icons (fine). No actual images that benefit from `next/image`.
- **Fix:** When thumbnails are added, use `next/image` with `loading="lazy"`.

### 10.2 — Fonts from Google CDN — OK
- **File:** `apps/web/src/lib/fonts.ts`, lines 1-15
- Cairo + Amiri via `next/font/google` with `display: "swap"`. Correctly optimized.

### 10.3 — `logo.png` referenced without optimization — LOW
- **File:** `apps/web/src/app/layout.tsx`, lines 15-18
- Static PNG for icons. Should be compressed and under 50KB.
- **Fix:** Compress, add `.webp` variant.

---

## SUMMARY

| Severity | Count |
|----------|-------|
| **High** | 6 |
| **Medium** | 14 |
| **Low** | 5 |

### Top 5 Priority Fixes

| # | Finding | Impact |
|---|---------|--------|
| 1 | Memoize `DocumentRow` + stabilize callbacks (5.1, 5.2) | Immediate UI responsiveness |
| 2 | Parallelize page uploads in split stage (9.1) | 5-10x faster PDF splitting |
| 3 | Fix PrismaClient duplication in workers (4.1) | Connection pool efficiency + cleanup |
| 4 | Add `@@index([userId])` to Tag model (2.1) | Faster tag queries |
| 5 | Add cache headers to API routes (7.1-7.4) | Fewer network requests, less server load |
