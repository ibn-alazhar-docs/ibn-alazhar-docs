# AUDIT_REPORT.md — Ibn Al-Azhar Docs

**Date:** 2026-06-28
**Mode:** PERFECT (10-dimension audit)
**Codebase:** 385 files, 47,431 LOC, TypeScript monorepo

---

## Executive Summary

| Dimension        | Critical | High   | Medium | Low    | Total   |
| ---------------- | -------- | ------ | ------ | ------ | ------- |
| 1. Architecture  | 0        | 2      | 4      | 4      | 10      |
| 2. Database      | 0        | 1      | 5      | 5      | 11      |
| 3. Testing       | 2        | 2      | 4      | 0      | 8       |
| 4. Security      | 0        | 0      | 3      | 4      | 7       |
| 5. Performance   | 0        | 6      | 14     | 5      | 25      |
| 6. UI/UX         | 0        | 6      | 10     | 5      | 21      |
| 7. Code Quality  | 0        | 16     | 17     | 11     | 44      |
| 8. DevOps        | 1        | 3      | 8      | 8      | 20      |
| 9. Documentation | 0        | 1      | 4      | 2      | 7       |
| 10. Full-Stack   | 0        | 0      | 3      | 1      | 4       |
| **TOTAL**        | **3**    | **37** | **72** | **45** | **157** |

**Overall Assessment:** Well-structured codebase with strong foundations (Clean Architecture, RTL, design system, auth). Main gaps: zero unit tests for use-cases, type safety casts, code duplication, missing CI security scanning, and god components.

---

## Dimension 1: Architecture

**Findings:** 10 | **Critical:** 0 | **High:** 2 | **Medium:** 4 | **Low:** 4

### Critical Issues

None.

### High Issues

- **[D1-H1]** `apps/web/src/domain/repositories/*.interface.ts` — Domain repo interfaces import `@prisma/client` types (PrismaWhereInput, PrismaArgs). Couples domain contracts to PostgreSQL. → Define domain-level filter interfaces in `domain/types.ts`.
- **[D1-H2]** `apps/web/src/domain/repositories/*.interface.ts` — Repository interfaces return Prisma model types instead of domain types. → Hydrate to `DomainDocument`, `DomainUser`, etc. at repository boundary.

### Medium Issues

- **[D1-M1]** `apps/web/src/core/use-cases/export.use-cases.ts` — Use-case performs direct MinIO storage I/O. Should delegate to infrastructure service.
- **[D1-M2]** `apps/web/src/core/use-cases/conversion.use-cases.ts:13` — Direct `import("@ibn-al-azhar-docs/pipeline")` from use-case. Should inject queue interface.
- **[D1-M3]** `apps/web/src/lib/export/bulk-export-helpers.ts:12-18` — Bypasses repository layer, calls `prisma.*` directly.
- **[D1-M4]** `apps/web/src/core/repositories/document.repository.ts` — Returns Prisma types instead of domain types. Callers do `Number(fileSize)` conversions.

### Low Issues

- **[D1-L1]** `apps/web/src/core/use-cases/user.use-cases.ts:20` — Role passed as `string` instead of `Role` domain type.
- **[D1-L2]** `apps/web/src/core/composition-root.ts` — `repos` object exposes concrete types instead of interfaces.
- **[D1-L3]** `apps/web/src/domain/types.ts` — Anemic domain model (pure interfaces, no behavior).
- **[D1-L4]** `apps/web/src/core/use-cases/folder.use-cases.ts:82-130` — Complex tree traversal logic in use-case.

---

## Dimension 2: Database

**Findings:** 11 | **Critical:** 0 | **High:** 1 | **Medium:** 5 | **Low:** 5

### Critical Issues

None.

### High Issues

- **[D2-H1]** `prisma/schema.prisma` (UserSetting) — Missing `@@index([userId])`. Only composite unique exists.

### Medium Issues

- **[D2-M1]** `apps/web/src/core/use-cases/export.use-cases.ts:127-134` — Recursive folder collection queries DB at each depth level. Should single-fetch + in-memory BFS.
- **[D2-M2]** `prisma/schema.prisma` (UserSetting) — EAV pattern makes type safety impossible.
- **[D2-M3]** `prisma/schema.prisma` (Tag) — No `deletedAt` field. Hard delete with cascade. Inconsistent with Document/Folder.
- **[D2-M4]** `apps/web/src/core/use-cases/tag.use-cases.ts:47` — Redundant `deleteMany` before cascade delete.
- **[D2-M5]** `apps/web/src/core/use-cases/document-crud.use-cases.ts:68-72` — `findMany` for single-record check. Use `findFirst`.

### Low Issues

- **[D2-L1]** Migration has redundant `share_links_token_idx` (unique constraint already creates index).
- **[D2-L2]** `prisma/seed.ts` creates separate PrismaClient (correct for seed scripts).
- **[D2-L3]** `Document.outputKeys` is unstructured JSON (acceptable, only accessed by ID).
- **[D2-L4]** `AuditLog` uses string entity reference (acceptable for audit).
- **[D2-L5]** Missing composite index for folder tree covering name/color/icon.

---

## Dimension 3: Testing

**Findings:** 8 | **Critical:** 2 | **High:** 2 | **Medium:** 4 | **Low:** 0

### Critical Issues

- **[D3-C1]** `tests/` — **Inverted test pyramid.** Zero unit tests in `tests/unit/`. `pnpm test` only runs frontend+backend (22 files). Core business logic (14 use-cases) has zero isolated unit tests.
- **[D3-C2]** `apps/web/src/core/use-cases/` — **14/14 use-cases have zero unit tests.** All rely on API/integration tests that exercise them indirectly.

### High Issues

- **[D3-H1]** 5 use-cases have no API test coverage either: `user.use-cases.ts`, `profile.use-cases.ts`, `upload-document.use-case.ts`, `conversion.use-cases.ts`, `export-document.use-case.ts`.
- **[D3-H2]** `tests/e2e/e2e-scenarios.spec.ts` — Serial mode with step dependencies. Single flaky test cascades failures.

### Medium Issues

- **[D3-M1]** E2E tests use brittle CSS/text selectors. Should use `data-testid` or `getByRole()`.
- **[D3-M2]** E2E tests use `force: true` extensively (12+ occurrences). Masks UI bugs.
- **[D3-M3]** Export API tests mock too aggressively (pipeline + zip-builder fully mocked).
- **[D3-M4]** Integration tests test Prisma queries, not use-cases. Should exercise through composition root.

---

## Dimension 4: Security

**Findings:** 7 | **Critical:** 0 | **High:** 0 | **Medium:** 3 | **Low:** 4

### Critical Issues

None.

### High Issues

None.

### Medium Issues

- **[D4-M1]** `apps/web/src/core/repositories/search.repository.ts:27` — Uses `$queryRawUnsafe` with string concatenation. Safe today but risky for future refactors.
- **[D4-M2]** `apps/web/src/lib/auth.ts:22-28` — Dev secret fallback when `AUTH_SECRET` not set. Safe only if `NODE_ENV=production` is correct.
- **[D4-M3]** No automated dependency scanning (Dependabot/Snyk) in CI pipeline.

### Low Issues

- **[D4-L1]** `.env` contains weak dev passwords (in `.gitignore` but risky if exposed).
- **[D4-L2]** Several endpoints lack rate limiting: `/api/profile`, `/api/folders`, `/api/tags`, `/api/conversion`.
- **[D4-L3]** `next-auth` at beta version `5.0.0-beta.31`.
- **[D4-L4]** Google OAuth scope includes `drive.file` — users should be clearly informed.

---

## Dimension 5: Performance

**Findings:** 25 | **Critical:** 0 | **High:** 6 | **Medium:** 14 | **Low:** 5

### Critical Issues

None.

### High Issues

- **[D5-H1]** `apps/web/src/components/files/document-row.tsx` — Not memoized. Re-renders on every parent state change (21+ props).
- **[D5-H2]** `packages/pipeline/src/stages/split.ts` — Sequential page uploads. Should parallelize for 5-10x speedup.
- **[D5-H3]** Workers create duplicate PrismaClient instances. Should share singleton.
- **[D5-H4]** `apps/web/src/core/repositories/tag.repository.ts` — Missing `@@index([userId])` on Tag model.
- **[D5-H5]** API routes lack cache headers. Every request hits the database.
- **[D5-H6]** `apps/web/src/app/api/stream/route.ts` — 211-line SSE handler with complex nested polling.

### Medium Issues (14 total)

- `document-row.tsx` parent callbacks not stabilized with `useCallback`
- `folder-tree.tsx` 266 lines — should split
- `search-bar.tsx` 206 lines — should extract hook
- `file-upload.tsx` 263 lines — should extract hook
- `share-modal.tsx` 250 lines — should split
- `export.use-cases.ts` 284 lines — god class
- `folder.use-cases.ts` 216 lines — 10 methods
- `stream/route.ts` deep nesting (5+ levels)
- `ocr.ts` stage deep nesting
- `moveFolder` fetches all user folders into memory
- `findFolderTags` duplicates where clause
- Missing indexes on common query patterns
- No Redis/PostgreSQL/MinIO exporters in Prometheus
- Monitoring services lack health checks

### Low Issues (5 total)

- Worker health check only checks PID 1
- `helpers.ts` should be in domain modules
- Export worker switch statement could use strategy pattern
- Backup alert references unexported metric
- No bundle size checks in CI

---

## Dimension 6: UI/UX

**Findings:** 21 | **Critical:** 0 | **High:** 6 | **Medium:** 10 | **Low:** 5

### Critical Issues

None.

### High Issues

- **[D6-H1]** `components/theme/theme-toggle.tsx:13` — Hardcoded English `aria-label`.
- **[D6-H2]** `components/locale/locale-toggle.tsx:37` — Hardcoded English `aria-label`.
- **[D6-H3]** `components/files/document-row.tsx:143-144` — Hardcoded English "Share" `aria-label`.
- **[D6-H4]** `app/[locale]/layout.tsx` — No skip-to-content link.
- **[D6-H5]** `components/files/document-row.tsx` — 302 lines, god component.
- **[D6-H6]** `components/folders/folder-tree.tsx` — 266 lines, monolithic.

### Medium Issues (10 total)

- Prop drilling in `files/page.tsx` (21+ state vars, 12+ handlers)
- `folder-item.tsx` missing `aria-expanded`
- Inline editing not accessible (no `aria-label`)
- `confirm-dialog.tsx` no focus trap, missing `aria-labelledby`/`aria-describedby`
- Hardcoded Arabic fallback strings in dialog defaults
- `search-bar.tsx` hardcoded English `aria-label`
- Missing `aria-label` on `<nav>` in sidebar
- `file-upload.tsx` 263 lines
- `share-modal.tsx` 250 lines
- `document-table.tsx` hardcoded Arabic aria-label

### Low Issues (5 total)

- Inconsistent error handling (console.error, no toast)
- No `aria-hidden` on decorative SVGs in sidebar
- No empty state for tag-filter-sidebar
- `react-markdown` without explicit sanitization
- Hardcoded test counts in README

---

## Dimension 7: Code Quality

**Findings:** 44 | **Critical:** 0 | **High:** 16 | **Medium:** 17 | **Low:** 11

### Critical Issues

None.

### High Issues (16 total)

- **5x `as unknown as` type casts** in repositories (document, folder, user) and use-cases (document-tag, folder)
- **3x god classes**: `export.use-cases.ts` (284 lines), `folder.use-cases.ts` (216 lines), `stream/route.ts` (211 lines)
- **2x deep nesting**: `stream/route.ts` (5+ levels), `folder.use-cases.ts` (4 levels)
- **3x code duplication**: `downloadDocumentBuffer` copy-pasted, export error handling x3, rate-limit response x7
- **2x complex conditionals**: `getDescendantMaxDepth` inline recursive, `buildWhereClause` 50-line SQL builder
- **1x API design**: `folder.repository.ts` union parameter with `typeof` check

### Medium Issues (17 total)

- 3x magic numbers (hardcoded python3, port 9090, repeated `searchable.pdf`)
- 3x error handling (silent catches in audit, upload, split)
- 2x performance (moveFolder loads all folders, findFolderTags duplicates where)
- 2x content-type mapping duplicated
- Rate-limit response construction repeated 7x
- `as unknown as` casts in prisma.ts, metrics route
- `export.use-cases.ts` type aliases should be interfaces

### Low Issues (11 total)

- 4x type assertions on credentials/share/auth objects
- 4x naming (`type` vs `interface` inconsistency)
- `lib/constants.ts` hardcoded URL (acceptable as fallback)
- `lib/auth.ts` hardcoded dev secret string
- `metrics/route.ts` sentinel values (-1)

---

## Dimension 8: DevOps

**Findings:** 20 | **Critical:** 1 | **High:** 3 | **Medium:** 8 | **Low:** 8

### Critical Issues

- **[D8-C1]** `docker-compose.yml:180` — `cadvisor` has `privileged: true`. Full host access. Security risk.

### High Issues

- **[D8-H1]** `.github/workflows/ci.yml` — No security scanning stage (SAST, dependency, container).
- **[D8-H2]** `.github/workflows/ci.yml` — No CD pipeline. No auto-deployment on merge.
- **[D8-H3]** No zero-downtime deployment strategy. `ibn.sh restart` causes downtime.

### Medium Issues (8 total)

- Docker Compose: monitoring in prod compose (should separate)
- Docker Compose: db-migrate no health check
- CI: No integration tests job
- CI: No preview deployment for PRs
- Secrets: `.env` contains actual dev secrets
- Secrets: `secrets-scan.mjs` only scans staged diffs
- Logging: No automatic request_id injection
- Monitoring: Backup alert references unexported metric

### Low Issues (8 total)

- Dockerfile runner installs wget for health check
- Dockerfile.worker switches to root for apt-get
- Worker health check only checks PID 1
- Redis config differs across environments
- No environment parity checks in CI
- No bundle size checks
- No external secret manager integration
- Dev compose has no security hardening (acceptable)

---

## Dimension 9: Documentation

**Findings:** 7 | **Critical:** 0 | **High:** 1 | **Medium:** 4 | **Low:** 2

### Critical Issues

None.

### High Issues

- **[D9-H1]** No OpenAPI/Swagger documentation for 14+ API route groups.

### Medium Issues

- **[D9-M1]** No architecture diagram (Mermaid/PlantUML) in README or docs.
- **[D9-M2]** Inline comments explain WHAT, not WHY.
- **[D9-M3]** No CHANGELOG.md.
- **[D9-M4]** ADR-011 is bilingual but others are English-only.

### Low Issues

- **[D9-L1]** README test counts hardcoded (will drift).
- **[D9-L2]** ADR language inconsistency.

---

## Dimension 10: Full-Stack Coordination

**Findings:** 4 | **Critical:** 0 | **High:** 0 | **Medium:** 3 | **Low:** 1

### Critical Issues

None.

### High Issues

None.

### Medium Issues

- **[D10-M1]** Frontend `Doc` type in `document-table.tsx` duplicates `DomainDocument`. Can drift.
- **[D10-M2]** Tags POST returns Zod error message instead of translated string.
- **[D10-M3]** No type sharing mechanism (tRPC/OpenAPI codegen) between frontend and API.

### Low Issues

- **[D10-L1]** `file-upload.tsx` error parsing is fragile (ad-hoc type checking).
