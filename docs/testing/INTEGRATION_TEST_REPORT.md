# INTEGRATION_TEST_REPORT.md — Phase 3B Integration Test Suite

## Summary

| Metric                  | Value |
| ----------------------- | ----- |
| Test Files              | 8     |
| Tests (total)           | 95    |
| Tests Passing           | 95    |
| Tests Failing           | 0     |
| Integration Bugs Found  | 1     |
| Data Consistency Issues | 0     |
| Ownership Issues        | 0     |
| Suite Duration          | 5.9s  |

---

## Test Inventory

| #   | Test File                      | Category  | Tests  | Status       |
| --- | ------------------------------ | --------- | ------ | ------------ |
| 1   | `pipeline-text-flow.test.ts`   | A (no DB) | 12     | PASS         |
| 2   | `pipeline-export-flow.test.ts` | A (no DB) | 12     | PASS         |
| 3   | `zip-builder-flow.test.ts`     | A (no DB) | 11     | PASS         |
| 4   | `document-ownership.test.ts`   | B (DB)    | 13     | PASS         |
| 5   | `folder-documents.test.ts`     | B (DB)    | 13     | PASS         |
| 6   | `tags-documents.test.ts`       | B (DB)    | 14     | PASS         |
| 7   | `share-export.test.ts`         | B (DB)    | 12     | PASS         |
| 8   | `search-postgres.test.ts`      | B (DB)    | 8      | PASS         |
|     | **Total**                      |           | **95** | **ALL PASS** |

---

## Coverage by Subsystem

### 1. OCR → Cleanup → Markdown (12 tests)

- Raw Arabic OCR text through `cleanArabicText` → `generateMarkdown`
- Bidi control characters removed from final markdown
- HTML tags stripped
- Page noise (standalone numbers, page markers) removed
- Heading structure preserved
- Corrupted OCR text recovered
- Repeated words collapsed
- OCR exclamation artifacts removed
- Table rows preserved
- Metadata accurately reflects processed content
- Empty text handled gracefully
- `analyzeText` on cleaned output matches `generateMarkdown` metadata

### 2. Cleanup → Markdown → Export (12 tests)

- TXT export strips markdown headings
- TXT metadata header includes correct fields (Pages, Words, Confidence)
- TXT without metadata has no header
- TXT preserves Arabic text
- JSON export is valid JSON
- JSON contains all expected top-level keys
- JSON source field matches input
- JSON `content.raw` matches original input
- JSON metadata matches cleaned text metadata
- JSON `generatedAt` is valid ISO timestamp
- TXT and JSON contain same core Arabic content
- Markdown frontmatter present when requested

### 3. Multi-document → ZIP (11 tests)

- Valid ZIP buffer produced
- Research profile includes `.md` and `_metadata.json`
- Plain profile includes only `.txt`
- `manifest.json` always present with correct structure
- README.md included for multi-doc exports
- Manifest lists all documents
- Folder prefix applied to multi-doc exports
- Source buffer included when `includeSource` is true
- Source not included when `includeSource` is false
- `totalSize` matches sum of file sizes
- Each document file in manifest matches ZIP contents

### 4. Document CRUD + Ownership (13 tests)

- User can create and read own document
- User can update own document
- Soft delete sets `deletedAt`
- Restore clears `deletedAt`
- User B cannot see user A's documents via scoped query
- Scoped `findFirst` returns null for wrong owner
- Admin can see all documents (no userId filter)
- User A sees only own documents in list
- Soft-deleted docs excluded from user's list
- Document starts as UPLOADED
- Status transitions through pipeline stages
- Failed status is terminal-safe
- Deleting user cascades to their documents

### 5. Folder → Documents (13 tests)

- User can create and retrieve a folder
- User B cannot see user A's folders
- Soft-delete folder removes from queries
- Document assigned to folder
- Folder document count reflects assignments
- Moving document to another folder updates folderId
- Moving document to root (null folderId)
- Child folder references parent
- Multi-level nesting works (3 levels)
- Children query returns only direct children
- Deleting folder orphans documents (folderId → null)
- Cascade soft-delete of subfolder documents
- Cross-user folder isolation

### 6. Tags → Documents (14 tests)

- User can create a tag
- Tag name uniqueness per user enforced
- Different users can have same tag name
- Tag assigned to document
- Same tag cannot be assigned twice to same document
- Multiple tags on one document
- One tag on multiple documents
- Bulk tag adds tag to multiple documents
- Bulk untag removes tag from multiple documents
- Bulk tag skips already-tagged documents
- Document with tags returns tag details
- Document count per tag reflects assignments
- User B cannot see user A's tags
- User B cannot tag with user A's tag

### 7. Share → Export (12 tests)

- Create share link for completed document
- Share link includes document title
- One share link per document per user (unique constraint)
- Valid token finds the share
- Invalid token returns null
- Expired share link detected
- Non-expired share link passes check
- Null expiresAt means never expires
- Accessing share for deleted document detects deletion
- Regenerating token creates new token for same document
- Deleting share link removes from database
- Deleting document cascades to share link

### 8. Search → PostgreSQL (8 tests)

- Updating title creates a search vector
- Updating title updates the search vector
- Description contributes to search results
- User A search does not return user B's documents
- Each user only sees own search results
- Deleted documents not found in search
- Title match ranks higher than description match
- Normalized alef forms found in search

---

## Integration Bugs Found

### BUG-001: Missing `searchvector` column (severity: HIGH)

**What:** The `documents` table is missing `searchvector` (tsvector), `searchpreview` (text), and `wordcount` (integer) columns. These columns are referenced in:

- `apps/web/src/core/repositories/document.repository.ts:37-47` — `updateSearchVector()` raw SQL
- `apps/web/src/app/api/search/route.ts:60-128` — full-text search queries

But they were never added to any migration. The `20260615120000_db_updates` migration adds the `normalize_arabic()` PostgreSQL function but not the columns that use it.

**Impact:** Search functionality is completely broken at runtime. Any `updateSearchVector()` call or search API request will throw `column "searchvector" does not exist`.

**Fix:** Add a new migration:

```sql
ALTER TABLE documents ADD COLUMN searchvector tsvector;
ALTER TABLE documents ADD COLUMN searchpreview text;
ALTER TABLE documents ADD COLUMN wordcount integer;
CREATE INDEX documents_searchvector_idx ON documents USING gin(searchvector);
```

**Workaround in tests:** The `search-postgres.test.ts` creates these columns in `beforeAll` using idempotent DDL.

---

## Data Consistency Issues

**None found.** All tested flows maintain data consistency:

- Soft-deleted records correctly excluded from queries
- Cascade deletes work (user → documents, document → share links, document → tag_documents)
- Folder deletion correctly orphans documents
- Tag-document uniqueness constraint enforced
- Share link uniqueness per document per user enforced

## Ownership Issues

**None found.** All ownership boundaries correctly enforced:

- User-scoped queries (`findFirst`/`findMany` with `userId`) prevent cross-user access
- Admin bypass works (no `userId` filter)
- Tags isolated per user (`@@unique([userId, name])`)
- Folder access scoped to owner

---

## Infrastructure Created

| File                              | Purpose                                                                                                     |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `vitest.integration.config.ts`    | Separate vitest config for integration tests                                                                |
| `tests/integration/helpers/db.ts` | DB helpers: `createTestUser`, `createTestDocument`, `createTestFolder`, `createTestTag`, `cleanupTestUsers` |
| `test:integration` script         | `vitest run --config vitest.integration.config.ts`                                                          |
| `jszip@3.10.1` (devDep)           | For ZIP verification in tests                                                                               |

## How to Run

```bash
# Category A only (no DB needed):
pnpm test:integration tests/integration/pipeline-text-flow.test.ts
pnpm test:integration tests/integration/pipeline-export-flow.test.ts
pnpm test:integration tests/integration/zip-builder-flow.test.ts

# Full suite (requires PostgreSQL):
./ibn.sh dev-infra              # Start Postgres on port 5433
pnpm db:generate && pnpm db:migrate
pnpm test:integration
```
