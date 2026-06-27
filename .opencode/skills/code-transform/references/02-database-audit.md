# Database Audit — Schema, Indexes, Queries, Migrations

> Read this during Dimension 2 (Database) of the AUDIT phase.

## Audit Checklist

```
[ ] Does every table have a primary key?
[ ] Does every foreign key have an index?
[ ] Are there N+1 query patterns (query in a loop)?
[ ] Are migrations versioned and reversible?
[ ] Is connection pooling used (not open/close per request)?
[ ] Are there SELECT * queries (should name columns)?
[ ] Is the schema normalized to at least 3NF?
[ ] Are there polymorphic associations (item_type + item_id)?
[ ] Is there an EAV (Entity-Attribute-Value) anti-pattern?
[ ] Are JSON blobs used where columns should be?
[ ] Are transactions used for multi-step operations?
[ ] Are migrations using expand/contract for breaking changes?
```

## Normalization Check

### 1NF: Atomic values

- No repeating groups (arrays in columns, comma-separated values)
- Each cell has one value

### 2NF: No partial dependencies

- Non-key attributes depend on the WHOLE primary key, not part
- (Only relevant for composite keys)

### 3NF: No transitive dependencies

- Non-key attributes don't depend on other non-key attributes
- Example: `orders(customer_id, customer_name)` — customer_name depends on customer_id, not the order. Move to a `customers` table.

### BCNF: Every determinant is a candidate key

- Stricter version of 3NF

### When to Denormalize

- Only with PROVEN read-performance needs
- Document WHY you denormalized each instance
- Never denormalize preemptively

## Index Audit

### What to Index

- Every primary key (automatic in most DBs)
- Every foreign key (NOT automatic in MySQL/PostgreSQL — must add explicitly!)
- Columns used in WHERE clauses
- Columns used in JOIN conditions
- Columns used in ORDER BY

### What NOT to Index

- Small tables (< 100 rows)
- Columns with low cardinality (boolean, gender)
- Frequently updated columns (indexes slow down writes)

### Check for Missing Indexes

```sql
-- PostgreSQL: find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- MySQL: find tables without indexes on FKs
SELECT TABLE_NAME, COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE REFERENCED_TABLE_NAME IS NOT NULL
  AND CONCAT(TABLE_NAME, '.', COLUMN_NAME) NOT IN (
    SELECT CONCAT(TABLE_NAME, COLUMN_NAME)
    FROM INFORMATION_SCHEMA.STATISTICS
  );
```

## N+1 Query Detection

### Pattern

```python
# N+1: 1 query for users + N queries for orders
users = db.query("SELECT * FROM users")
for user in users:
    orders = db.query("SELECT * FROM orders WHERE user_id = ?", user.id)  # ← N queries!
```

### Fix: JOIN or batch

```python
# JOIN: 1 query
results = db.query("SELECT u.*, o.* FROM users u LEFT JOIN orders o ON o.user_id = u.id")

# Batch: 2 queries
users = db.query("SELECT * FROM users")
user_ids = [u.id for u in users]
orders = db.query("SELECT * FROM orders WHERE user_id IN (?)", user_ids)
```

### Detection

- ORM with lazy loading (SQLAlchemy `relationship`, Django `ForeignKey`) is the #1 cause
- Enable SQL logging, look for repeated similar queries
- In Django: `django.db.connection.queries` in tests

## Migration Safety (Expand/Contract)

### Never do breaking schema changes in one step.

**Expand/Contract pattern**:

1. **Expand**: Add new column/table alongside old
2. **Dual-write**: Write to both old and new
3. **Backfill**: Copy old data to new
4. **Switch reads**: Read from new
5. **Contract**: Remove old column/table

See `references/02-database-audit.md` in the refactor skill for full details.

## Common Database Smells

### DBS1. Missing Index on Foreign Key

**Impact**: Slow JOINs, full table scans.
**Fix**: `CREATE INDEX idx_orders_user_id ON orders(user_id);`

### DBS2. EAV Anti-Pattern

**Pattern**: `attributes(entity_id, name, value)` — "flexible" schema that destroys queryability.
**Fix**: Use proper columns, or a JSONB column with GIN index (PostgreSQL).

### DBS3. Polymorphic Association

**Pattern**: `comments(item_type, item_id)` — can't have FK constraint.
**Fix**: Use separate tables (`post_comments`, `video_comments`) or a polymorphic association table with FKs.

### DBS4. SELECT \*

**Impact**: Unnecessary data transfer, breaks when columns added.
**Fix**: Name columns explicitly: `SELECT id, name, email FROM users`.

### DBS5. No Connection Pooling

**Impact**: Connection overhead per request.
**Fix**: Use PgBouncer (PostgreSQL), HikariCP (Java), SQLAlchemy pool (Python).

## Database Improvement Recipes

### DBR1. Add Missing Index

```sql
-- Before: slow JOIN
SELECT * FROM orders o JOIN users u ON o.user_id = u.id;
-- EXPLAIN shows sequential scan on orders

-- After: add index
CREATE INDEX CONCURRENTLY idx_orders_user_id ON orders(user_id);
-- EXPLAIN shows index scan
```

### DBR2. Fix N+1 with JOIN

```python
# Before: N+1
for user in users:
    user.orders = order_repo.get_by_user(user.id)

# After: single JOIN
users_with_orders = db.query("""
    SELECT u.*, o.id as order_id, o.total as order_total
    FROM users u
    LEFT JOIN orders o ON o.user_id = u.id
""")
```

### DBR3. Rename Column (expand/contract)

1. Add new column
2. Dual-write
3. Backfill
4. Switch reads
5. Drop old column

See refactor skill `references/25-database-refactoring.md` for full details.

## Summary

- Every table: PK, every FK indexed, named columns (no SELECT \*)
- Normalize to 3NF, denormalize only with proven need
- N+1 queries are always a bug — use JOIN or batch
- Migrations use expand/contract for breaking changes
- Connection pooling always
- Use EXPLAIN ANALYZE, don't guess at performance
