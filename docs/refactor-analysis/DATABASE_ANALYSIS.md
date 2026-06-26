# DATABASE_ANALYSIS.md

> **Level:** Principal Engineer / Staff Engineer
> **Scope:** Schema design, data access patterns, queries, performance
> **System:** Ibn Al-Azhar Docs

---

## 1. Schema Overview

**PostgreSQL 16** with Prisma ORM (`relationMode = "prisma"` — no foreign keys at DB level).

| Model         | Records Est. | Indexes    | Concerns                     |
| ------------- | ------------ | ---------- | ---------------------------- |
| User          | Low          | 3          | Soft-delete, cascade         |
| Account       | Low          | 2          | OAuth tokens                 |
| Session       | Medium       | 2          | JWT (not session-based)      |
| Document      | High         | 7          | Core asset, status lifecycle |
| Folder        | Medium       | 5          | Hierarchy, soft-delete       |
| Tag           | Low          | 1 (unique) | User-scoped                  |
| TagDocument   | Medium       | 2          | M:N join                     |
| ConversionJob | High         | 7          | Pipeline tracking            |
| ShareLink     | Low          | 3          | Token uniqueness             |
| UserSetting   | Low          | 1 (unique) | Key-value                    |
| AuditLog      | High         | 5          | Audit trail                  |

---

## 2. Index Analysis

### 2.1 Document Table

```sql
@@index([userId])           -- ownership queries ✅
@@index([folderId])         -- folder listing ✅
@@index([status])           -- status filtering ✅
@@index([userId, status])   -- compound ownership+status ✅
@@index([userId, createdAt]) -- compound ownership+time ✅
@@index([deletedAt])        -- soft-delete filtering ✅
@@index([status, createdAt]) -- compound status+time ✅
```

**Missing indexes:**

- `searchvector` — GIN index exists via raw SQL migration, not in Prisma schema
- No index on `storageKey` — unique constraint provides this

### 2.2 Folder Table

```sql
@@index([userId])              -- ownership ✅
@@index([parentId])            -- hierarchy ✅
@@index([userId, parentId])    -- compound ✅
@@index([userId, parentId, order]) -- compound with ordering ✅
@@index([deletedAt])           -- soft-delete ✅
```

**Assessment:** Well-indexed for current query patterns.

### 2.3 ConversionJob Table

```sql
@@index([userId])           -- ownership ✅
@@index([documentId])       -- document lookup ✅
@@index([status])           -- status filtering ✅
@@index([userId, status])   -- compound ✅
@@index([status, createdAt]) -- stuck job detection ✅
@@index([createdAt])        -- time-based queries ✅
```

---

## 3. Data Access Patterns

### 3.1 Repository Implementations

| Repository                | Methods                                                                                                    | Issues                         |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `DocumentRepository`      | create, createRaw, findById, findFirst, findMany, count, update, updateRaw, updateSearchVector, updateMany | 10 methods — too many          |
| `FolderRepository`        | findMany, findById, getMaxOrder, create, update, restore, findWithDeleted, transaction                     | Mixed abstraction levels       |
| `TagRepository`           | findMany, findFirst, count, create, update, delete, findFolderTags                                         | OK                             |
| `TagDocumentRepository`   | findMany, createMany, deleteMany                                                                           | OK                             |
| `UserRepository`          | findMany, findFirst, findByEmail, create, updateRole, softDelete                                           | OK                             |
| `ConversionJobRepository` | findMany, count                                                                                            | Too few — missing update, find |
| `ShareRepository`         | findFirst, create, delete, findWithDocument                                                                | OK                             |

### 3.2 Raw SQL Usage

| Location                       | Purpose                                     | Risk                      |
| ------------------------------ | ------------------------------------------- | ------------------------- |
| `document.repository.ts:53-61` | `updateSearchVector` — raw SQL for tsvector | Low (contained)           |
| `search.use-cases.ts:104-166`  | Full-text search query building             | HIGH — SQL injection risk |
| `search.use-cases.ts:219-255`  | Suggestion queries                          | MEDIUM — parameterized    |

**Critical:** `search.use-cases.ts` builds SQL dynamically with string concatenation. While parameters are used, the query construction pattern is fragile and hard to maintain.

### 3.3 Transaction Usage

| Location                      | Transaction                    | Purpose                          |
| ----------------------------- | ------------------------------ | -------------------------------- |
| `folder.use-cases.ts:98-107`  | `folderRepository.transaction` | Delete folder + move documents   |
| `folder.use-cases.ts:114-124` | `folderRepository.transaction` | Empty folder + reparent children |

**Missing transactions:**

- Tag merge (`tag.use-cases.ts:83-98`) — 4 operations without transaction
- Bulk tag/untag operations
- Document move between folders

---

## 4. Query Performance

### 4.1 N+1 Risks

| Location                    | Pattern                                 | Risk                                |
| --------------------------- | --------------------------------------- | ----------------------------------- |
| `folder.use-cases.ts:70-78` | Loads ALL user folders to build tree    | HIGH — for users with many folders  |
| `export.use-cases.ts:67-78` | Finds child folders one level at a time | MEDIUM — only for recursive exports |
| `search.use-cases.ts:118`   | `params` array rebuilt per query        | LOW — not N+1                       |

### 4.2 Missing Optimizations

| Issue                         | Location                       | Fix                             |
| ----------------------------- | ------------------------------ | ------------------------------- |
| `findMany` with full includes | `document.repository.ts:30-32` | Consider field selection        |
| No query result caching       | All repositories               | Redis caching for hot paths     |
| No connection pooling config  | `prisma.ts`                    | Default pool is fine for dev    |
| No read replicas              | All queries                    | Consider for search-heavy loads |

---

## 5. Schema Design Issues

### 5.1 Soft-Delete Pattern

Soft-delete is implemented via `deletedAt` column on User, Document, Folder. **Issues:**

- No global soft-delete filter (each query must check `deletedAt: null`)
- `findWithDeleted` exists only on FolderRepository — inconsistent
- No `unique` constraint on (userId, name) for Folders — duplicate names allowed

### 5.2 Relation Mode

Prisma `relationMode = "prisma"` means no foreign keys at DB level. **Impact:**

- Referential integrity enforced by Prisma only
- No cascade delete at DB level
- Potential orphaned records if Prisma is bypassed

### 5.3 JSON Columns

- `Document.outputKeys` — `Json?` — stores export file keys
- `Document.outputFormats` — `String[]` — output format list
- `AuditLog.metadata` — `Json?` — audit metadata

**Issue:** JSON columns are not queryable efficiently. `outputKeys` is read-only (never queried), which is acceptable.

---

## 6. Recommendations

| #   | Priority | Recommendation                                             |
| --- | -------- | ---------------------------------------------------------- |
| 1   | P0       | Add transaction to tag merge operation                     |
| 2   | P0       | Refactor search to use parameterized query builder         |
| 3   | P1       | Add transaction to bulk tag/untag operations               |
| 4   | P1       | Optimize folder tree query (CTE or cached)                 |
| 5   | P2       | Add global soft-delete scope middleware                    |
| 6   | P2       | Consider adding (userId, name) unique constraint on Folder |
| 7   | P3       | Add Redis caching for hot paths (search, folder tree)      |

---

_This analysis represents the current state. Refactoring must be approved phase by phase._
