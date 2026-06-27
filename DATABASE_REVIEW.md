# DATABASE_REVIEW.md

> **Level:** Principal Engineer
> **Scope:** Schema Design, Indexes, Queries, Integrity
> **System:** Ibn Al-Azhar Docs

## 1. Schema Analysis

The underlying datastore is PostgreSQL via Prisma (`relationMode = "prisma"`).

**Observations:**

- Soft deletes and state machines are managed via primitive types (`status` string, `deletedAt` nullable timestamp).
- Prisma relation mode forces application-level referential integrity instead of relying on Foreign Keys. While this suits edge environments, it demands rigorous application-level consistency checks.

## 2. Indexing Strategy

**Detected Flaws:**

- **Missing Compound Indexes:** Queries filtering by `userId` AND `folderId` or `userId` AND `deletedAt` lack covering indexes, potentially leading to sequential scans on large datasets.
- **Over-indexing Risk:** Unnecessary single-column indexes on low-cardinality fields (like `status`) without partial index constraints.

## 3. Query Optimization & Transaction Boundaries

**N+1 Query Problems:**

- **`resolveFolderForExport`:** Recursively fetches folder ancestors one by one. This results in $N$ sequential queries.
- _Fix:_ Use a PostgreSQL Recursive CTE (Common Table Expression) or materialize paths/closure tables to fetch hierarchies in $O(1)$ queries.

**Transaction Boundaries:**

- Bulk operations (e.g., mass tag application, moving multiple documents) are sometimes performed sequentially in code instead of utilizing `prisma.$transaction`. This introduces atomicity risks where partial failures leave the system in an inconsistent state.

## 4. Remediation Strategy

1. **Schema Refinement:**
   - Add compound indexes for multi-tenant queries: `@@index([userId, parentFolderId])`, `@@index([userId, status])`.
   - Consider partial indexes for `deletedAt: null` to optimize active-set queries.
2. **Query Refactoring:**
   - Eliminate all `for-await` loops containing `prisma.findUnique`. Replace with `prisma.findMany({ where: { id: { in: ids } } })`.
   - Implement Recursive CTE via `prisma.$queryRaw` for deep folder resolution.
3. **Transaction Enforcement:**
   - Ensure all write operations spanning multiple entities (e.g., Folder move + Document cascading updates) occur within a single `$transaction`.
