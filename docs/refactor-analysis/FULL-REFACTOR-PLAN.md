# Full Refactor Plan — A-to-Z

**Scope**: Entire codebase (apps/web, packages/pipeline, workers)
**Mode**: Large-Scale (Mikado Method — each step is revertible)
**Baseline**: 677 tests pass, typecheck clean
**Date**: 2026-06-26

## Behavior Surface (Frozen)

All API responses, UI rendering, auth flows, export outputs, OCR pipeline results,
search results, and queue processing must remain IDENTICAL.

---

## Batch 1 — Dead Code Cleanup (Low Risk, Mechanical)

| #   | Fowler             | Target                                                       | Risk |
| --- | ------------------ | ------------------------------------------------------------ | ---- |
| 1.1 | Delete Dead Code   | `lib/api-client.ts` — never imported                         | Low  |
| 1.2 | Delete Dead Code   | `lib/format-utils.ts` — never imported                       | Low  |
| 1.3 | Remove Dead Export | `lib/errors.ts` — `AuthorizationError` class                 | Low  |
| 1.4 | Remove Dead Export | `lib/content.ts` — `generateSearchIndex`, `SearchIndexEntry` | Low  |
| 1.5 | Remove Dead Export | `lib/export/profiles.ts` — `getProfileFormats`               | Low  |

**Verification**: `pnpm typecheck && pnpm test`

---

## Batch 2 — Fix Circular Dependency + Layering Violation (Medium Risk)

| #   | Fowler           | Target                                                                       | Risk   |
| --- | ---------------- | ---------------------------------------------------------------------------- | ------ |
| 2.1 | Move Method      | `lib/share-helpers.ts` ↔ `lib/export/profiles.ts` circular re-exports        | Medium |
| 2.2 | Remove Re-export | `lib/errors.ts` re-exporting `Role, ROLE, isAdminRole` from `domain/auth.ts` | Medium |

**Verification**: `pnpm typecheck && pnpm test`

---

## Batch 3 — Fix Architecture Violations (Medium Risk)

| #   | Fowler            | Target                                                                                        | Risk   |
| --- | ----------------- | --------------------------------------------------------------------------------------------- | ------ |
| 3.1 | Move Method       | `export.use-cases.ts` — remove file-level singleton, all routes use composition-root          | Medium |
| 3.2 | Move Method       | `stream/route.ts` + `share/[token]/route.ts` — use composition-root instead of barrel import  | Medium |
| 3.3 | Extract Interface | `domain/repositories/search.repository.interface.ts` — separate interface from implementation | Medium |

**Verification**: `pnpm typecheck && pnpm test`

---

## Batch 4 — Extract `content.ts` God Object (High Impact)

| #   | Fowler           | Target                                                                           | Risk   |
| --- | ---------------- | -------------------------------------------------------------------------------- | ------ |
| 4.1 | Extract Module   | `content.ts` → `content/i18n.ts` (category labels, descriptions, journey titles) | Medium |
| 4.2 | Extract Module   | `content.ts` → `content/journeys.ts` (journey definitions)                       | Medium |
| 4.3 | Extract Module   | `content.ts` → `content/loader.ts` (MDX file I/O, frontmatter parsing)           | Medium |
| 4.4 | Extract Module   | `content.ts` → `content/navigation.ts` (doc ordering, prev/next, related docs)   | Medium |
| 4.5 | Extract Module   | `content.ts` → `content/search-index.ts` (search indexing)                       | Medium |
| 4.6 | Re-export Barrel | `content.ts` becomes barrel re-exporting from sub-modules                        | Low    |

**Verification**: `pnpm typecheck && pnpm test`

---

## Batch 5 — Extract `search.use-cases.ts` Raw SQL (High Impact)

| #   | Fowler              | Target                                                        | Risk   |
| --- | ------------------- | ------------------------------------------------------------- | ------ |
| 5.1 | Extract Class       | Move raw SQL from `search.use-cases.ts` to `SearchRepository` | High   |
| 5.2 | Introduce Interface | Create `ISearchRepository` in domain layer                    | Medium |
| 5.3 | Wire DI             | Add `searchRepository` to composition-root                    | Low    |

**Verification**: `pnpm typecheck && pnpm test`

---

## Batch 6 — Extract `stream/route.ts` Concerns (High Impact)

| #   | Fowler         | Target                                                 | Risk   |
| --- | -------------- | ------------------------------------------------------ | ------ |
| 6.1 | Extract Module | Stream polling logic → `lib/streaming/poll-manager.ts` | Medium |
| 6.2 | Extract Module | SSE helpers → `lib/streaming/sse-helpers.ts`           | Low    |
| 6.3 | Simplify       | Dual-source polling → single abstraction               | Medium |

**Verification**: `pnpm typecheck && pnpm test`

---

## Batch 7 — Split `rate-limit.ts` (Medium Impact)

| #   | Fowler           | Target                                          | Risk |
| --- | ---------------- | ----------------------------------------------- | ---- |
| 7.1 | Extract Module   | Redis rate limiting → `lib/rate-limit/redis.ts` | Low  |
| 7.2 | Extract Module   | In-memory fallback → `lib/rate-limit/memory.ts` | Low  |
| 7.3 | Extract Utility  | IP extraction → `lib/rate-limit/ip.ts`          | Low  |
| 7.4 | Re-export Barrel | `rate-limit.ts` becomes barrel                  | Low  |

**Verification**: `pnpm typecheck && pnpm test`

---

## Batch 8 — Split `export.use-cases.ts` (Medium Impact)

| #   | Fowler         | Target                                               | Risk |
| --- | -------------- | ---------------------------------------------------- | ---- |
| 8.1 | Extract Method | `buildZipExport` → `export/zip-builder.ts`           | Low  |
| 8.2 | Extract Method | `buildSingleFileExport` → `export/single-builder.ts` | Low  |
| 8.3 | Extract Type   | `ExportMetadata` → `export/types.ts`                 | Low  |

**Verification**: `pnpm typecheck && pnpm test`

---

## Deferred (Not in this session)

- Page components >300 lines (tags, files, search, share, conversions)
- `text/clean.ts` pipeline decomposition (already well-structured internally)
- `folder.use-cases.ts` split (221 lines, 10 methods — borderline)
- Frontend component decomposition
