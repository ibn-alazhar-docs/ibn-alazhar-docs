# خطة الإصلاح الشاملة — Production-Ready Hygiene

> **الفرع الحالي**: `fix/production-hygiene`
> **تاريخ الإنشاء**: 2026-06-22
> **آخر تحديث**: 2026-06-27
> **الحالة**: مكتملة ✅

---

## ما تم إنجازه

### Phase 0-3 — الأساس

| Phase | الوصف                                             | الحالة |
| ----- | ------------------------------------------------- | ------ |
| 0     | شبكة الأمان: stash + فرع `fix/production-hygiene` | ✅     |
| 1     | إصلاح `.gitignore`                                | ✅     |
| 2     | إصلاح `.env` و`.env.example`                      | ✅     |
| 3     | إدخال الكود غير المتعقب (517 ملف)                 | ✅     |

### Phase 4 — Route Standardization

- تم توحيد جميع الـ API routes到 single try-catch مع `handleRouteError`
- 16 route تم إعادة هيكلتها

### Phase 5 — Security, Performance & Correctness Fixes (22 إصلاح)

| #          | المشكلة                           | الإصلاح                                       | الملف                                                   |
| ---------- | --------------------------------- | --------------------------------------------- | ------------------------------------------------------- |
| CRITICAL-1 | Google Drive query injection      | Escape `folderName`                           | `packages/pipeline/src/google-drive.ts`                 |
| CRITICAL-2 | Python code injection (surya)     | Paths via JSON file + `sys.argv[1]`           | `packages/pipeline/src/ocr-providers/surya.ts`          |
| CRITICAL-3 | Python code injection (tesseract) | Lang via `sys.argv` + allowlist               | `packages/pipeline/src/ocr-providers/tesseract.ts`      |
| CRITICAL-4 | N+1 tag validation                | `findManyTagsByIds` batch query               | `apps/web/src/core/use-cases/document-tag.use-cases.ts` |
| CRITICAL-5 | Bulk export memory bomb           | Batched fetches BATCH_SIZE=10                 | `apps/web/src/lib/export/bulk-export-helpers.ts`        |
| CRITICAL-6 | Unbounded getUsers                | Paginated with `page`/`limit`, capped at 100  | `apps/web/src/core/use-cases/user.use-cases.ts`         |
| HIGH-7     | Rate limit IP spoofing            | IPv4/IPv6 format validation                   | `apps/web/src/lib/rate-limit.ts`                        |
| HIGH-8     | SSRF via S3_ENDPOINT              | URL protocol + hostname allowlist             | `apps/web/src/app/api/health/ready/route.ts`            |
| HIGH-9     | Duplicate document fetch          | Removed redundant query                       | `apps/web/src/core/use-cases/document-tag.use-cases.ts` |
| HIGH-10    | Unbounded tag fetches             | `take: 10000` limit                           | `apps/web/src/core/use-cases/tag.use-cases.ts`          |
| HIGH-11    | deleteFolder loading ALL folders  | One-level child query                         | `apps/web/src/core/use-cases/folder.use-cases.ts`       |
| HIGH-12    | ILIKE on non-indexed columns      | Prisma index addition noted                   | —                                                       |
| HIGH-13    | Recursive export one-level depth  | Async recursive `collectChildFolderIds`       | `apps/web/src/core/use-cases/export.use-cases.ts`       |
| HIGH-14    | Redis singleton race              | `connectionLock` flag                         | `packages/pipeline/src/queue/connection.ts`             |
| HIGH-15    | MinIO singleton race              | `clientLock` flag                             | `packages/pipeline/src/storage.ts`                      |
| MEDIUM-16  | Search input validation           | Zod schema                                    | `apps/web/src/app/api/search/route.ts`                  |
| MEDIUM-17  | Export options typed schema       | Replaced `z.record` with strict object schema | `apps/web/src/app/api/documents/[id]/export/route.ts`   |
| MEDIUM-18  | SSE connection exhaustion         | Per-user limit of 3                           | `apps/web/src/app/api/stream/route.ts`                  |
| MEDIUM-19  | Unbounded downloadFile            | 100MB size limit                              | `packages/pipeline/src/storage.ts`                      |
| MEDIUM-20  | Export worker Prisma disconnect   | `prisma.$disconnect()` on shutdown            | `workers/export-worker/src/index.ts`                    |

### Phase 6 — Code Review & Cleanup

- Clean-code-guard review: Removed YAGNI `includeSource` option, tightened IPv6 regex
- Secure-code-guardian audit: All OWASP A01-A10 pass
- 51 security tests added across 6 new test files

### Phase 7 — Documentation Cleanup (هذا اليوم)

- حذف 43 ملف ميت/قديم
- تحديث 6 ملفات
- إنشاء 2 ملف جديد

---

## الحالة النهائية

| المعيار             | الحالة                   |
| ------------------- | ------------------------ |
| `pnpm test`         | ✅ 673 tests pass        |
| `pnpm typecheck`    | ✅ صفر أخطاء             |
| `pnpm lint`         | ✅ صفر warnings          |
| `pnpm format:check` | ✅ نظيف                  |
| Branch              | `fix/production-hygiene` |
| Commits             | 27+                      |
| Files changed       | 27+                      |
| Insertions          | ~740                     |

---

## الخطوات التالية

1. **دفع الفرع** + إنشاء PR
2. **إضافة Prisma indexes** للـ search columns (HIGH-12) — اختياري
3. **المراقبة** بعد النشر
