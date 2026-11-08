# Models Map — source files, purpose + size (T005)

Scope: apps/web/src (331 files, 28,203 lines TS/TSX) · packages/pipeline (100 src files, 18,639 lines) · packages/database (2 src files, 155 lines + schema 448 lines) · packages/shared (7 src files, 1,868 lines) · workers/ocr-worker (12 src files, ~1,431 lines) · workers/export-worker (3 src files, 329 lines). Verified 2026-11-08 via find+wc.

## 1. apps/web/src — top-level layout (331 files)

- `middleware.ts` (292 lines) + `instrumentation.ts` + `global.d.ts` — Next.js entry, request middleware, observability hooks.
- `api/api-client.ts` (138 lines) — typed fetch client (client-safe API layer).
- `clients/redis/` (5 files, 407 lines: `index.ts`, `rate-limit.ts`, `store.ts`, `redis.ts`, `distributed-lock.ts`) — Redis rate-limit + distributed lock.
- `lib/` (10 files, 740 lines) — `email/` (client/send + templates incl. reset/verification/welcome) · `msw/` (mock server for tests) · `pdfjs-config.ts` (PDF.js worker config).
- `transport/db.ts` — DB transport seam (single-file).
- `styles/` (7 css files) — global/brand/landing/reading/fonts/view-transitions.
- `messages/ar.json` + `i18n/` (3 files: routing/request/navigation) — Arabic-only i18n (locale `ar`, next-intl).

## 2. apps/web/src/app (142 files, 8,801 lines)

- `layout.tsx`, `error.tsx`, `global-error.tsx`, `loading.tsx`, `not-found.tsx`, `manifest.ts`, `robots.ts`, `sitemap.ts` — root App Router shell, SEO, error boundaries.
- `app/api/` — 78 `route.ts` handlers: auth (NextAuth), documents CRUD/export/share/tags/move/bulk-*, conversions, bookmarks, dashboard/stream, actuator/health, debug/pg|exec, docs/openapi. Thin handlers delegating to `core/`.
- `app/[locale]/` — pages: `(site)/page.tsx` (landing), `(public)/share/[token]/page.tsx` (348 lines, public share), `(auth)/login|register|forgot|reset`, `(dashboard)/dashboard|files|folders|tags|search|analytics|conversions|bookmarks|users|settings|tools|preview/[id]` (+ loading/error per group).
- `app/fonts/` — vendored woff2 (Almarai, Amiri, FiraCode) + OFL.txt; `app/docs/page.tsx` — docs viewer page.

## 3. apps/web/src/domain (17 files, 484 lines)

- `types.ts` (139 lines) — shared domain types; `auth.ts` (15 lines) — auth types.
- `repositories/` (15 interface files, ~330 lines total) — `document|user|folder|tag|tag-document|share|bookmark|conversion-job|search|analytics|storage|webhook|verification-token|account` + `prisma-types.ts` (1 line re-export). Pure contracts; no `@/app|ui|core` imports.

## 4. apps/web/src/core (45 files, 5,289 lines)

- `composition-root.ts` — DI composition root wiring repositories → use-cases.
- `authorization.ts`, `folder-tree.ts` — authz + folder tree helpers.
- `services/` (~29 files) — largest: `export.use-cases.ts` (418), `upload-document.use-case.ts` (340), `analytics.use-cases.ts` (263), `auto-tag.use-cases.ts` (218), `webhook.use-cases.ts` (217), `document-crud|folder|tag|search|conversion|bookmark|tag-document|share|download|move` use-cases, `dashboard.service.ts`, `stream.service.ts`. `services/export/` (6 files: validators/types/profiles/metadata/zip-builder/bulk-export-helpers).
- `repositories/` (13 files) — Prisma implementations for each domain interface.

## 5. apps/web/src/ui (71 files, 7,028 lines) · state (3 files, 681 lines)

- `ui/` — design-system primitives (`button|card|input|label|skeleton|badge|heading|text|icons|section`) plus feature folders: `auth/` (5), `files/` (5), `folders/` (6), `layout/` (7), `pipeline/` (7 incl. `share-modal.tsx` 357, `conversion-status.tsx` 314), `search/` (3), `sections/` (4), `tags/` (5), `theme/` (3), `mdx/`, `documents/`, `brand-logo.tsx`, `geometric-star.tsx`, `container|stack|portal|confirm-dialog|page-transition|loading-shell`, `cn.ts`, `brand.ts`, `fonts.ts`, `metadata.ts`, stories (`heading|skeleton.stories.tsx`).
- `state/` (3 files: `use-files-manager.ts` 446, `use-queries.ts`, `use-file-upload.ts`) — client data/upload hooks.
- `shared/` (19 files, 3,619 lines incl. `openapi.ts` 2,600 generated) — `api|constants|errors|logger|security|validation|route-helpers|safe-file-name|arabic-*|conversion-status-utils|debug-diagnostics` + `validators/` (auth|document|folder|share|tag|webhook).

## 6. packages/pipeline (100 src files, 18,639 lines) — OCR → IR → output core

- `index.ts` (barrel) + `types.ts`, `config.ts` + `config/` (5 files), `storage.ts` + `storage/` (3), `ocr.ts`, `ocr-provider.ts`, `ocr-chain.ts`, `ocr-providers/` (5: gemini|google|surya|tesseract|types), `keypool.ts`, `provider-health.ts`, `alerts.ts`, `cloud-cost-guard.ts`, `qa-gates.ts`, `verify-quotes.ts`, `clean-structure.ts`, `document-router.ts`, `booklet.ts`, `book-factory.ts`, `google-drive.ts`, `audit/vault`.
- `ir/` (7 files) — document IR: `converter-base`, `gemini-ir-converter`, `detection/{heading|list|paragraph}-detector`, `utils`.
- `text/` (26 files) — Arabic text cleaning/diacritics: `clean/` (contextual, diacritize, html, numbers, quranic, similarity, structural, structure, text-cleaner, unicode, uthmani, verbatim-spans, whitespace) + `diacritize/` (deterministic, lexicon, protected-spans, python-backend, types) + `analyze.ts`, `constants.ts`, `index.ts`.
- `output/` (16 files) — generators: `docx-generator`, `docx-rtl`, `epub-rtl`, `markdown(-generator)`, `pdf(-from-ir)`, `json(-from-ir)`, `txt(-from-ir)`, `pandoc`, `embed-fonts`, `page-geometry`, `generator-base`, `index.ts`.
- `queue/` (18 files) — BullMQ/Postgres dual driver: `connection|driver|drivers/{pg|redis}-driver`, `enqueue|workers|pg-worker|pg-handler-factory`, `dlq|errors|job-error|metrics|manifest|routing|retry-policy|categorize|validate-config`, `index.ts`.
- `assets/` — vendored `reference_rtl.docx`, `fonts/` (Amiri ttf + OFL.txt), `LICENSE.reference_rtl` (to-exclude, §7).

## 7. packages/database · packages/shared · workers

- `packages/database/src/` — `index.ts` (73 lines: PrismaClient singleton + token-encryption middleware) + `encryption.ts` (82 lines). `prisma/schema.prisma` (448 lines) + `prisma/migrations/` (20+ `migration.sql`). Purpose: single DB seam.
- `packages/shared/src/` — `index.ts` (43, barrel), `types.ts` (106), `types/document-ir.ts` (198) + `document-ir.test.ts` (392), `types/health.ts` (20), `service-health.ts` (434), `logger.ts` (13), `health-server.ts` (33). Purpose: cross-repo types + health/logger.
- `workers/ocr-worker/src/` (12 files, ~1,431 lines) — `index.ts` (116, entry: queue + health + sweepers), `helpers.ts` (236), `geometry.ts` (70), `pg/handlers.ts` (35), `stages/{validate,split,ocr,clean,generate}` (70–225 lines each), `sweepers/{stuck-documents,failed-uploads}`.
- `workers/export-worker/src/` (3 files, 329 lines) — `index.ts` (98, entry + health), `export-handler.ts` (204), `pg/handlers.ts` (27). Purpose: async DOCX/PDF/ZIP export jobs.

## 8. Generated / vendored / to-exclude (not source)

- `node_modules/` (root + per-package) + `apps/web/.next/` + `**/dist/` (pipeline, database, shared build outputs) + `coverage/`, `test-results/`, `.refactor/` scratch — EXCLUDE.
- `packages/pipeline/dist/`, `packages/database/dist/`, `packages/shared/dist/` — generated, not to map.
- Vendored (map only as assets): `packages/pipeline/assets/` (reference_rtl.docx, Amiri fonts), `apps/web/src/app/fonts/` (woff2), `uthmani-data.json`. Referenced by build, not edited.
- `apps/web/src/shared/openapi.ts` (2,600 lines) — generated OpenAPI client spec; treat as generated.

_Map method: `find … | wc -l` + `glob`/`read` slices. Sizes = `wc -l`. No file contents copied._
