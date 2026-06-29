# BLUEPRINT.md — Ibn Al-Azhar Docs Transformation Plan

**Date:** 2026-06-28
**Based on:** AUDIT_REPORT.md (157 findings across 10 dimensions)

**Status:** 31 batches complete. 61/157 findings resolved (39%). 3 skipped (too invasive). 90 remaining (mostly P4-P5 backlog).

---

## Priority Matrix

| Priority              | Items | Action                      |
| --------------------- | ----- | --------------------------- |
| **P0 — Immediate**    | 5     | Fix in this session         |
| **P1 — Urgent**       | 8     | Fix in this session (batch) |
| **P2 — Quick Win**    | 12    | Fix in this session (batch) |
| **P3 — Strategic**    | 6     | Dedicated sessions          |
| **P4 — Backlog**      | 10    | Log for future              |
| **P5 — Nice-to-have** | 16    | Log for future              |

---

## P0 — Immediate (Fix NOW)

| #   | Dimension    | Finding                                            | File(s)                                                      | Effort |
| --- | ------------ | -------------------------------------------------- | ------------------------------------------------------------ | ------ |
| 1   | DevOps       | **Remove `privileged: true` from cadvisor**        | `docker-compose.yml:180`                                     | Low    |
| 2   | Testing      | **Create unit tests for 14 use-cases**             | `tests/unit/use-cases/`                                      | High   |
| 3   | UI/UX        | **Fix hardcoded English aria-labels** (3 files)    | `theme-toggle.tsx`, `locale-toggle.tsx`, `document-row.tsx`  | Low    |
| 4   | UI/UX        | **Add skip-to-content link**                       | `app/[locale]/layout.tsx`                                    | Low    |
| 5   | Code Quality | **Eliminate `downloadDocumentBuffer` duplication** | `lib/storage-helper.ts`, `workers/ocr-worker/src/helpers.ts` | Low    |

## P1 — Urgent (Fix in this session)

| #   | Dimension    | Finding                                                        | File(s)                                                                                                                    | Effort |
| --- | ------------ | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------ |
| 6   | Architecture | **Domain repo interfaces import Prisma types**                 | `domain/repositories/*.interface.ts`                                                                                       | Medium |
| 7   | Code Quality | **Fix `as unknown as` type casts** (5 high instances)          | `document.repository.ts`, `folder.repository.ts`, `user.repository.ts`, `document-tag.use-cases.ts`, `folder.use-cases.ts` | Medium |
| 8   | Code Quality | **Extract rate-limit response helper**                         | `lib/rate-limit.ts` + 7 route handlers                                                                                     | Low    |
| 9   | Code Quality | **Use `getContentType()` from profiles**                       | `app/api/export/[id]/[format]/route.ts`                                                                                    | Low    |
| 10  | Code Quality | **Convert `ExportOptions`/`SingleExportResult` to interfaces** | `export.use-cases.ts`                                                                                                      | Low    |
| 11  | Database     | **Add `@@index([userId])` to UserSetting**                     | `prisma/schema.prisma`                                                                                                     | Low    |
| 12  | Database     | **Refactor `exportByFolder` recursive query**                  | `export.use-cases.ts:127-134`                                                                                              | Medium |
| 13  | Security     | **Replace `$queryRawUnsafe` with `$queryRaw`**                 | `search.repository.ts`                                                                                                     | Medium |

## P2 — Quick Wins (Batch together)

| #   | Dimension    | Finding                                                                    | File(s)                                               | Effort |
| --- | ------------ | -------------------------------------------------------------------------- | ----------------------------------------------------- | ------ |
| 14  | UI/UX        | **Split `document-row.tsx`** (302 lines) into sub-components               | `components/files/document-row.tsx`                   | Medium |
| 15  | UI/UX        | **Split `folder-tree.tsx`** (266 lines)                                    | `components/folders/folder-tree.tsx`                  | Medium |
| 16  | UI/UX        | **Add `aria-expanded` to folder-item expand button**                       | `folder-item.tsx`                                     | Low    |
| 17  | UI/UX        | **Add `aria-label` to inline edit input**                                  | `folder-item.tsx`                                     | Low    |
| 18  | UI/UX        | **Add focus trap to confirm-dialog**                                       | `confirm-dialog.tsx`                                  | Low    |
| 19  | UI/UX        | **Add `aria-label` to sidebar `<nav>`**                                    | `sidebar.tsx`                                         | Low    |
| 20  | UI/UX        | **Add `aria-hidden` to decorative SVGs**                                   | `sidebar.tsx`                                         | Low    |
| 21  | Code Quality | **Replace magic numbers with constants**                                   | `helpers.ts`, `ocr-worker/src/index.ts`               | Low    |
| 22  | Code Quality | **Add logging to silent catch blocks**                                     | `audit.ts`, `upload-document.use-case.ts`, `split.ts` | Low    |
| 23  | Testing      | **Fix E2E serial mode** — make tests independent                           | `e2e-scenarios.spec.ts`                               | Medium |
| 24  | Testing      | **Replace E2E `force: true`** with proper waits                            | `e2e-scenarios.spec.ts`                               | Medium |
| 25  | Testing      | **Add API tests for untested routes** (users, profile, upload, conversion) | `tests/api/`                                          | Medium |

## P3 — Strategic (Dedicated sessions)

| #   | Dimension    | Finding                                                                               | Effort |
| --- | ------------ | ------------------------------------------------------------------------------------- | ------ |
| 26  | Architecture | **Extract storage I/O from use-cases** (ExportUseCases, ConversionUseCases)           | High   |
| 27  | Architecture | **Hydrate domain types in repositories** (return DomainDocument, not Prisma Document) | High   |
| 28  | UI/UX        | **Create `useFilesManager()` hook** to eliminate prop drilling in files/page.tsx      | Medium |
| 29  | DevOps       | **Add security scanning to CI** (Snyk/Semgrep/Trivy)                                  | Medium |
| 30  | DevOps       | **Implement zero-downtime deployment** (rolling updates)                              | High   |
| 31  | Docs         | **Add OpenAPI documentation** for 14 API route groups                                 | Medium |

## P4 — Backlog

| #   | Dimension    | Finding                                                |
| --- | ------------ | ------------------------------------------------------ |
| 32  | Architecture | Enrich domain model with behavior (anemic model)       |
| 33  | Database     | Add `deletedAt` to Tag model for soft delete           |
| 34  | Database     | Document soft-delete policy across models              |
| 35  | Security     | Add rate limiting to profile/folders/tags endpoints    |
| 36  | Security     | Add automated dependency scanning (Dependabot/Snyk)    |
| 37  | Performance  | Add cache headers to API routes                        |
| 38  | Performance  | Parallelize page uploads in split stage                |
| 39  | Performance  | Fix PrismaClient duplication in workers                |
| 40  | DevOps       | Separate monitoring into docker-compose.monitoring.yml |
| 41  | DevOps       | Add integration tests to CI                            |

## P5 — Nice-to-have

| #   | Dimension    | Finding                                          |
| --- | ------------ | ------------------------------------------------ |
| 42  | Architecture | Extract `FolderTree` domain service              |
| 43  | Database     | Consider JSONB for UserSetting instead of EAV    |
| 44  | Testing      | Replace aggressive mocking in export tests       |
| 45  | Testing      | Refactor integration tests to exercise use-cases |
| 46  | UI/UX        | Create `FilesContext` for state management       |
| 47  | UI/UX        | Extract `SuggestionList` from search-bar         |
| 48  | UI/UX        | Extract `useFileUpload()` hook                   |
| 49  | UI/UX        | Add empty state for tag-filter-sidebar           |
| 50  | Docs         | Add architecture diagram (Mermaid)               |
| 51  | Docs         | Add CHANGELOG.md                                 |
| 52  | Docs         | Add WHY comments for non-obvious decisions       |
| 53  | DevOps       | Add preview deployments for PRs                  |
| 54  | DevOps       | Add bundle size checks                           |
| 55  | DevOps       | Standardize Redis config across environments     |
| 56  | Full-Stack   | Establish type sharing (tRPC or shared package)  |
| 57  | Full-Stack   | Create `parseApiError()` utility                 |

---

## Execution Order (This Session)

**Batch 1 — Quick Safety + Quick Wins (P0 items 1,3,4,5 + P1 items 8,9,10,11,13):**

- Remove `privileged: true` from cadvisor
- Fix hardcoded aria-labels (3 files)
- Add skip-to-content link
- Eliminate `downloadDocumentBuffer` duplication
- Extract rate-limit response helper
- Use `getContentType()` from profiles
- Convert type aliases to interfaces
- Add `@@index([userId])` to UserSetting
- Replace `$queryRawUnsafe` with `$queryRaw`

**Batch 2 — Type Safety (P1 items 6,7):**

- Define domain-level filter interfaces
- Fix `as unknown as` type casts

**Batch 3 — Code Quality (P2 items 14-22):**

- Split god components
- Add accessibility attributes
- Replace magic numbers
- Add logging to silent catches

**Batch 4 — Testing (P0 item 2 + P2 items 23-25):**

- Create unit tests for use-cases
- Fix E2E tests

**Batch 5 — Database (P1 item 12):**

- Refactor recursive folder query

**Batch 6+7 — PrismaClient + Cache Headers (P4 items 37,39):**

- PrismaClient singleton via globalThis
- Cache headers on API routes

**Batch 8 — Storage Extraction (P3 item 26):**

- IStorageRepository, zero pipeline imports

**Batch 9 — Error Handling (P5 item 57):**

- Error boundaries, requestId, parseApiError

**Batch 10 — Documentation:**

- FINAL_REPORT.md, all batches documented

**Batch 11 — Accessibility (P2 items 16-20):**

- aria-expanded, aria-label, focus trap, nav landmark

**Batch 12 — Magic Numbers (P2 item 21):**

- UI_TIMING, DURATIONS, CONTENT_LIMITS constants

**Batch 13 — Rate Limiting (P3 item 35):**

- 45 routes, IP vs user strategy

**Batch 14 — Folder Tree Split (P2 item 15):**

- useFolders hook, folder-tree.tsx split

**Batch 15 — Quick Wins (P4/P5 items 33,47,48):**

- Tag soft-delete, SuggestionList, useFileUpload

**Batch 16 — Changelog + Diagrams (P5 items 50,51):**

- CHANGELOG.md, Mermaid diagrams

**Batch 17 — Memoization + Flatten (P2 items 14,46):**

- React.memo on DocumentRow, stream/route.ts flattened

**Batch 18 — E2E Hooks + CI (P3 items 41,45):**

- data-testid attributes, integration tests in CI

**Batch 19 — Docs (P5 items 34,52):**

- Soft-delete policy, architecture diagram in README

**Batch 20 — Performance (P3 items 38,55):**

- Parallelize uploads, Redis config, WHY comments

**Batch 21 — E2E Test Improvements (P2 items 23,24):**

- Remove force:true, login() helper, proper waits

**Batch 22 — Bulk Export Repository Fix:**

- IConversionJobRepository, TagDocumentRepository widened

**Batch 23 — Export Tests (P5 item 44):**

- Remove pipeline mock, keep zip-builder mock

**Batch 24 — Bundle Size CI (P5 item 54):**

- 50MB threshold, bundle report in CI

**Batch 25 — UserSetting JSONB (P5 item 43):**

- SKIPPED (not used in app code)

**Batch 26 — FolderTreeService (P5 item 42):**

- Tree traversal domain service, moveFolder simplified

**Batch 27 — Final Cleanup:**

- BLUEPRINT.md + FINAL_REPORT.md updated

**Batch 28 — Preview Deployments (P5 item 53):**

- Docker images tagged with PR number on PRs

**Batch 29 — Use-case Integration Tests (P5 item 45):**

- DocumentCrudUseCases + TagUseCases integration tests

**Batch 30 — Domain Model Behavior (P4 item 32):**

- Document, Folder, Tag behavior functions + tests

**Batch 31 — Final Sweep:**

- Documentation updated, all checks pass

---

## Remaining Items

| #   | Dimension  | Finding                                         |
| --- | ---------- | ----------------------------------------------- |
| 56  | Full-Stack | Establish type sharing (tRPC or shared package) |
