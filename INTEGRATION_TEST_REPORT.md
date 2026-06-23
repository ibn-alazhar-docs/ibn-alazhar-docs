# INTEGRATION_TEST_REPORT.md — Phase 3B Integration Test Suite

## Test Count

Total tests run: **95 tests** across **8 test files**.
All tests successfully passed.

**Test breakdown:**
- `document-ownership.test.ts` (13 tests)
- `folder-documents.test.ts` (13 tests)
- `pipeline-export-flow.test.ts` (12 tests)
- `pipeline-text-flow.test.ts` (12 tests)
- `search-postgres.test.ts` (8 tests)
- `share-export.test.ts` (12 tests)
- `tags-documents.test.ts` (14 tests)
- `zip-builder-flow.test.ts` (11 tests)

## Coverage

The integration test suite successfully covers:
- **Success paths:** Data flow across multiple subsystems (OCR -> Cleanup -> Markdown -> Export, Multi-doc ZIP creation).
- **Failure paths:** Verified correct failure modes, missing inputs, and proper soft deletion handling.
- **Invalid state transitions:** Ensured proper isolation during transitions (e.g., trying to move a document to a non-owned folder or applying a non-owned tag).
- **Ownership boundaries:** Fully verified that users cannot access, update, tag, or assign folders to documents owned by other users.
- **Data consistency:** Ensured proper cleanup and data consistency on folder soft deletion, cascading document orphaning, and accurate search vector updates.

## Integration Bugs

During the implementation and testing phase, several integration bugs and edge-case issues were discovered and resolved:
1. **Prisma Schema Drift**: `prisma db push` overrides raw SQL migrations (like the `searchvector` column). The database provisioning sequence had to be corrected to synchronize `schema.prisma` first and then apply the Postgres-specific full-text search migrations (`20260616120000_db_hardening`).
2. **Missing Dependencies**: Found that the test helper heavily relies on `.env` variables which required `dotenv` dependency injection during `pnpm test:integration`. Installed `dotenv` locally and properly updated `.env`.
3. **Database Syntax Drift**: Corrected Postgres-specific column casing errors where `fileName` was not properly quoted during the `$executeRaw` query for updating the `searchvector` text corpus.

## Data Consistency Issues

Data consistency checks flagged Prisma's lack of support for cascading `deleteMany` operations on self-referencing models (e.g., the `FolderHierarchy`). 
- **Issue**: Standard `deleteMany` operations violate foreign key constraints in tests when wiping out folder structures due to nested hierarchies.
- **Resolution**: Implemented raw SQL queries (`DELETE FROM "folders"`) explicitly dropping folders directly during test teardowns. This bypasses the Prisma application-level restriction while keeping test databases perfectly clean and isolated between tests.

## Ownership Issues

Cross-user contamination risk was extensively tested and successfully mitigated.
- Users strictly access their own folders.
- `updateMany` queries efficiently cascade updates safely scoped by `userId`.
- Document sharing links explicitly enforce data privacy rules and only expose exactly what the user permitted for a specific document without inadvertently leaking access to other files. All ownership tests are now passing successfully.
