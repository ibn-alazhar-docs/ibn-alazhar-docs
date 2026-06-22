# API_TEST_REPORT.md

## Test Suite Execution Summary
- **Test Command:** `pnpm test:api`
- **Total Tests:** 104 tests
- **Total Test Files:** 8 files
- **Result:** 100% Pass Rate (104/104 tests passed)

## Endpoint Coverage
Every public and protected endpoint requested has been successfully covered.
Here is the breakdown by category:
1. **Health APIs**: 1 test (Coverage across basic liveness).
2. **Authentication APIs**: 7 tests (Covering user registration logic, weak passwords, and conflict logic/deleted accounts).
3. **Folder APIs**: 17 tests (Coverage for listing, specific `parentId` scoping, creation, renaming, moves, and deletions).
4. **Document APIs**: 17 tests (Extensive coverage across basic CRUD, document moving, restoration from trash, bulk operations, and tag assignments).
5. **Tags APIs**: 19 tests (Coverage for tag listing, creation, renaming, and document tag querying logic).
6. **Search APIs**: 10 tests (Verifying search queries, folder filters, suggest APIs, and exact keyword matches).
7. **Export APIs**: 18 tests (Coverage across zip exports, batch endpoints, format validation, and single export constraints).
8. **Share APIs**: 15 tests (Validating link creation, access expirations, token usage, and public file reads).

## Security Findings
During test execution and configuration, multiple security and architectural findings were identified and fortified:
- **Mocking Integrity**: Successfully bypassed `next-auth` using an injection strategy that guarantees real endpoints are tested in isolated node environments while simulating standard authentication.
- **Unauthorized Validation**: Validated that every route effectively rejects requests without an authentication session (yielding HTTP 401 Unauthorized), guaranteeing endpoints properly utilize `requireAuth()`.

## Ownership Findings
- Cross-user contamination tests all passed successfully.
- Verified that a user cannot retrieve, patch, move, tag, or delete another user's documents or folders. Attempts to do so correctly resulted in 404 Not Found or 403 Forbidden HTTP responses.
- Verified that bulk operations explicitly scope inputs down to `userId` using the `ownedWhere` auth-guard filter, thereby preventing users from hijacking bulk inputs to manipulate foreign database records.

## Validation Issues
- **BigInt Serialization Issue**: Found and fixed a JSON serialization crash in the `Documents` API. When updating/moving/restoring documents, Next.js `NextResponse.json` crashed due to Prisma returning `fileSize` as a `BigInt` (since `BigInt` has no native JSON representation). Casted the field properly before rendering responses.
- **SQL Identifier Formatting**: Identified a bug in `documentRepository.updateSearchVector` where the Postgres column `"fileName"` was incorrectly referenced without quotes in an `$executeRaw` query. The tests helped track and fix this `column "filename" does not exist` runtime error.

## Performance Metrics
- **Overall Speed**: The entire integration-level API suite executed 104 individual HTTP mock-requests passing through Prisma ORM to a real PostgreSQL test database in just `~17 seconds` of pure testing duration (`~44 seconds` total wall-clock including TS transforms and environment setups).
- **Subsystem Concurrency**: Concurrent vitest execution handled test isolation efficiently with zero database locking or connection pooling issues across Prisma's lifecycle.
