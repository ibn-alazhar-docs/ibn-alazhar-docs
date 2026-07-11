# Changelog

All notable changes to Ibn Al-Azhar Docs.

Format based on [Keep a Changelog](https://keepachangelog.com/).

---

## [Unreleased]

### Added

- Tag soft-delete with `deletedAt` field and migration
- `SuggestionList` component extracted from search-bar
- `useFileUpload` hook extracted from file-upload
- Empty state for tag-filter-sidebar when no tags exist
- `useFolders` hook extracted from folder-tree component
- Rate limiting on all unprotected API endpoints (18 routes)
- Named constants for magic numbers (UI_TIMING, DURATIONS, CONTENT_LIMITS, SUGGESTION_LIMITS, PAGINATION)
- Accessibility improvements (aria-expanded, aria-label, focus trap, aria-hidden)
- Dependabot configuration for automated dependency scanning
- Bundle size check in CI (50MB threshold)
- `IConversionJobRepository` interface for conversion job queries
- `FolderTreeService` domain service for tree traversal logic
- `login()` helper in E2E tests to reduce duplication
- Preview deployment workflow for PRs (Docker images tagged with PR number)
- Use-case-level integration tests for DocumentCrudUseCases and TagUseCases
- Domain behavior functions: Document (isOwner, canDelete, statusTransitions), Folder (isRoot, getPath, getDepth), Tag (isOwnedBy, hasSameName)
- `@ibn-al-azhar-docs/shared` package: DocStatus, ERROR_CODES, FailureCategory, DOC_STATUS_MAP, STATUS_LABELS shared across web app + pipeline

### Changed

- `folder-tree.tsx` reduced from 266 to 173 lines
- `search-bar.tsx` reduced from 206 to 142 lines
- `file-upload.tsx` reduced from 263 to 151 lines
- `stream/route.ts` flattened from 217 to 165 lines
- E2E tests: removed 25+ `force: true` clicks, replaced with proper waits
- `bulk-export-helpers.ts` now uses `ExportRepositories` instead of direct prisma
- `ExportUseCases` constructor expanded (6 params, added conversionJobRepository)
- Export tests: removed pipeline mock (kept zip-builder mock)
- `folder.use-cases.ts` simplified by extracting tree logic to FolderTreeService

### Fixed

- E2E tests: proper `waitForSelector`/`waitForLoadState` instead of `force: true`
- Bulk export: uses repository interface instead of direct Prisma imports
- Export tests: less aggressive mocking (pipeline mock removed)

---

## [1.0.0] - 2026-06-28

### Added - Batch 1: Safety + Quick Wins

- Removed `privileged: true` from cadvisor container
- Arabic aria-labels on theme and locale toggles
- Skip-to-content link for keyboard navigation
- Prisma `@@index([userId])` on UserSetting model

### Added - Batch 2: Type Safety

- Domain repository interfaces decoupled from Prisma types
- `DocumentWithTags` interface for proper return types
- Removed `as any` in test setup
- Prisma cast cleanup in repositories

### Added - Batch 3: Code Quality

- `DocumentRowActions` sub-component extracted
- `buildSingleFileExport` deduplication
- `rateLimitResponse()` helper for DRY rate limiting
- Replaced all inline 429 blocks
- Replaced `localhost:3000` with `APP_URL`
- Converted type aliases to interfaces
- `getContentType()` from profiles

### Added - Batch 4: Testing

- 11 new test files with 110 new tests
- Unit tests for 10 use-cases (document CRUD, folders, tags, search, conversion, user, profile, registration)

### Added - Batch 5: Database

- Iterative loop replacing recursive CTE
- Composite indexes for documents, folders, and shareLinks

### Added - Batch 6: Quick Wins

- PrismaClient singleton via `globalThis`
- Cache headers on 17 GET endpoints
- Stale test fix (epub → csv)

### Added - Batch 7: useFilesManager Hook

- Extracted `useFilesManager()` hook with 14 state + 14 callbacks
- Simplified files page from 419 to ~200 lines

### Added - Batch 8: Storage Extraction

- `IStorageRepository` interface (10 methods + 7 key builders)
- `MinioStorageRepository` implementation
- Zero `@ibn-al-azhar-docs/pipeline` imports in web app

### Added - Batch 9: Error Handling

- Enhanced global, root, locale, and dashboard error boundaries
- `requestId` on every API error response
- `parseApiError()` utility for consistent client-side error parsing

### Added - Batch 10: Final Polish

- Updated FINAL_REPORT.md with all batch results

### Added - Batch 11: Accessibility

- `aria-expanded` on folder expand buttons
- `aria-label` on folder edit inputs and sidebar nav
- `aria-hidden` on all decorative SVGs
- Focus trap on ConfirmDialog (Tab/Shift+Tab cycling)

### Added - Batch 12: Magic Numbers → Constants

- `UI_TIMING`, `DURATIONS`, `CONTENT_LIMITS`, `SUGGESTION_LIMITS`, `PAGINATION` constants
- Updated 11 files to use named constants

### Added - Batch 13: Rate Limiting

- 12 IP-based rate limit rules
- 15 user-based rate limit rules
- Protected 18 previously unprotected routes
- All 45 API routes now rate-limited

### Added - Batch 14: folder-tree Split

- Extracted `useFolders` hook (93 lines)
- `folder-tree.tsx` reduced from 266 to 173 lines

---

## Statistics

| Metric                    | Before | After |
| ------------------------- | ------ | ----- |
| Source files              | 385    | 389   |
| Test files                | 22     | 33    |
| Tests                     | 673    | 783   |
| API routes rate-limited   | 0      | 45    |
| Pipeline imports in web   | 10+    | 0     |
| Error boundaries enhanced | 0      | 4     |
