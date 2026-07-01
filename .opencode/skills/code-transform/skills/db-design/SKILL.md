---
name: db-design
description: "Database schema design, migration safety, and query performance review — Postgres (default), ClickHouse, Redis, MongoDB, Neo4j. Reviews schemas against best practices, suggests indexes, sets up RLS policies, and validates every migration through the expand/contract pattern so zero-downtime deploys are guaranteed. Used in Phase 6 EXECUTE whenever tables, columns, constraints, or indexes change."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: backend
---

# Database Design

> Owns schema correctness, migration safety, and query performance. Reviews every DDL change before it ships, enforces the expand/contract pattern for zero-downtime migrations, and pairs with `api-contract` (which owns the API shape that sits on top of the schema). Calls into `data-migration` for large backfills and `db-seeding` for test fixtures.

## When to Use

| Phase                   | Trigger                                                                                                                                        | Why                                                             |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Phase 2 — AUDIT         | Dim 9 (Data Layer) finds: missing FKs, missing indexes on FKs, no RLS on tenant-scoped tables, N+1 queries, raw `SELECT *` in production paths | Establish the schema-quality baseline                           |
| Phase 6 — EXECUTE       | Any commit that touches a `.sql` migration, a Prisma schema file, a SQLAlchemy model, a `CREATE TABLE`/`ALTER TABLE`                           | Validate the migration is reversible, safe, and indexed         |
| Phase 6 — EXECUTE       | Adding a column, renaming a column, changing a column type, adding a constraint                                                                | Force the expand/contract pattern — never break the running app |
| Phase 7 — OBSERVABILITY | Slow query log shows a new query > 100ms                                                                                                       | EXPLAIN the query, suggest the index, generate the migration    |
| Phase 11 — ROLLOUT      | Pre-deploy check: every migration in the release has a tested `down` migration (or is intentionally irreversible, with sign-off)               | Catches un-reversible migrations before they hit prod           |

**Do NOT use this sub-skill for:** seeding test data (use `db-seeding`), large backfills (use `data-migration`), or app-level ORM tuning (use the language-specific best-practices skill). Those sub-skills _call into_ `db-design` to validate their schema changes — you call them, not this one.

## What It Does

1. **Detects the database engine** from config (`DATABASE_URL` scheme, `prisma/schema.prisma` `provider`, `docker-compose.yml` service image):
   - `postgres://` → Postgres (default, full feature set)
   - `clickhouse://` → ClickHouse (OLAP — different rules: no FKs, MergeTree engines, materialized views)
   - `redis://` → Redis (KV — no schema, but data-structure choice matters)
   - `mongodb://` → MongoDB (document — schema validation at the app layer, indexing rules differ)
   - `neo4j://` → Neo4j (graph — property indexes, constraint uniqueness)
2. **Reviews the schema** against engine-specific best practices:
   - Every FK column has an index (Postgres doesn't auto-index FKs)
   - Every tenant-scoped table has RLS policies (Postgres) or equivalent
   - No `SELECT *` in production code paths (use explicit column lists)
   - No N+1 queries (detect via query log or ORM `eager_load` / `selectinload`)
   - JSON columns have a GIN index if they're queried by key
   - Timestamp columns are `timestamptz`, not `timestamp` (the latter is a footgun)
3. **Validates migration safety** — every migration is classified:
   - **Expand** (safe, forward-only): add column, add index `CONCURRENTLY`, add table. Can run while app serves traffic.
   - **Contract** (safe, after app deploys): drop old column, drop old index, drop old table. Only after app no longer references it.
   - **Risky** (requires downtime or care): `ALTER TABLE ... ALTER COLUMN ... TYPE`, `ADD CONSTRAINT ... NOT NULL` on existing rows, `DROP COLUMN` without expand/contract.
   - **Forbidden** (block at review): `DROP TABLE` without expand/contract, `ALTER COLUMN ... TYPE` without a 3-step migration, `ADD NOT NULL` without a default on a large table.
4. **Suggests indexes** by analyzing `EXPLAIN (ANALYZE, BUFFERS)` output of slow queries — Seq Scan on a large table → missing index; Nested Loop with high rows → missing join index.
5. **Sets up RLS policies** for tenant-scoped tables (Postgres only):
   - Enable RLS: `ALTER TABLE todos ENABLE ROW LEVEL SECURITY;`
   - Policy: `CREATE POLICY tenant_isolation ON todos USING (tenant_id = current_setting('app.tenant_id')::uuid);`
   - Force the policy even for table owners: `ALTER TABLE todos FORCE ROW LEVEL SECURITY;`
6. **Generates the migration** via the project's migration tool (Prisma migrate, Alembic, Flyway, golang-migrate, goose) and validates it has both `up` and `down`.

## Integration Contract

```
INPUT:
  - project_dir: string (required)
  - migration_file: string (path to the .sql or migration script under review)
  - engine: auto|postgres|clickhouse|redis|mongodb|neo4j (default auto — detected from config)
  - review_mode: schema|migration|query (default schema if migration_file is new, migration if it modifies existing)
  - slow_query_log: optional path to pg_stat_statements / slow log (for query mode)
  - tenant_column: string (default "tenant_id" — used for RLS policy generation)
  - app_deploy_window: immediate|coordinated|blue-green (default immediate — affects which migrations are "safe")

OUTPUT (JSON to stdout):
  {
    "status": "ok|risky|forbidden|error",
    "engine": "postgres",
    "migration_classification": "expand|contract|risky|forbidden",
    "schema_issues": [
      {
        "severity": "critical|high|medium|low",
        "rule": "fk-missing-index|no-rls-on-tenant-table|select-star|n-plus-1|missing-gin-on-json|timestamp-without-tz|...",
        "table": "todos",
        "column": "user_id",
        "fix": "CREATE INDEX CONCURRENTLY ON todos(user_id);",
        "migration_safe": true
      }
    ],
    "index_suggestions": [
      {"table": "todos", "columns": ["tenant_id", "created_at"], "type": "btree", "concurrent": true, "reason": "Seq scan on tenant-scoped range query"}
    ],
    "rls_policies": [
      {"table": "todos", "policy": "tenant_isolation", "sql": "CREATE POLICY ..."}
    ],
    "down_migration_present": true|false,
    "down_migration_tested": true|false,
    "estimated_lock_duration_ms": 12,
    "duration_ms": 3456
  }

SIDE EFFECTS:
  - Writes the suggested indexes / RLS policies as a NEW migration file (does NOT modify the input migration)
  - Updates TRACEABILITY_MATRIX.md with table → migration → policy mapping
  - If status = forbidden, blocks the PR (returns non-zero exit code)
```

## CLI

```bash
# 1. Detect engine + review current schema (Prisma project)
npx prisma format && npx prisma validate
npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma --shadow-database-url $SHADOW_DB_URL

# 2. Review a SQL migration for safety (the core of this sub-skill)
psql $DATABASE_URL -f migrations/0042_add_todos.sql --dry-run  # syntax check
# Then the sub-skill's reviewer classifies each statement:
#   CREATE INDEX CONCURRENTLY → expand (safe)
#   ALTER TABLE todos ADD COLUMN priority int DEFAULT 0 → expand (safe, has default)
#   ALTER TABLE todos ALTER COLUMN priority TYPE text → RISKY (3-step needed)
#   DROP TABLE legacy_todos → FORBIDDEN (no expand/contract)

# 3. Generate the index migration from a slow query
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM todos WHERE tenant_id = $1 AND created_at > $2;
# If output shows "Seq Scan on todos (cost=0.00..1234.56 rows=100)" → suggest:
psql $DATABASE_URL -c "CREATE INDEX CONCURRENTLY idx_todos_tenant_created ON todos(tenant_id, created_at DESC);"

# 4. Enable RLS + write policy (Postgres)
psql $DATABASE_URL <<'SQL'
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON todos
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
SQL

# 5. Test the down migration (critical — every up must have a tested down)
psql $SHADOW_DB_URL -f migrations/0042_add_todos.sql         # up
psql $SHADOW_DB_URL -f migrations/0042_add_todos.down.sql    # down
psql $SHADOW_DB_URL -f migrations/0042_add_todos.sql         # up again — if this fails, the down was destructive

# 6. Detect N+1 queries (Rails example — the pattern is the same in every ORM)
# In dev, enable query logging and load a representative page. If you see:
#   SELECT * FROM users WHERE id = 1
#   SELECT * FROM todos WHERE user_id = 1
#   SELECT * FROM todos WHERE user_id = 2
#   SELECT * FROM todos WHERE user_id = 3
# → N+1. Fix: User.includes(:todos).find_each or selectinload in SQLAlchemy.

# 7. Alembic (Python) — generate a reversible migration
uv run alembic revision --autogenerate -m "add todos table"
# Sub-skill verifies the generated file has both upgrade() and downgrade() functions
```

## Decision Tree (autonomous)

```
Q: What engine is in use?
  Detect from DATABASE_URL scheme or prisma provider.
  Postgres → full review (indexes, RLS, migration safety, N+1)
  ClickHouse → OLAP rules: MergeTree engine required, ORDER BY is the primary index,
               no FKs, no RLS (use tenant_id in ORDER BY instead), no UPDATE (use ReplacingMergeTree)
  Redis     → data-structure choice (string vs hash vs zset), no schema review needed,
               TTL on every key (no unbounded growth), no KEYS * in production (use SCAN)
  Mongo     → schema validation at app layer (JSON Schema validator), compound indexes for
               equality-sort-range patterns, no transactions across shards without care
  Neo4j     → property indexes on lookup properties, uniqueness constraints on natural keys,
               no Cartesian products in Cypher (use WITH to limit rows)

Q: Is this a new migration or a schema review?
  NEW MIGRATION → classify every statement (expand/contract/risky/forbidden)
                  → if any forbidden: status = forbidden, block PR
                  → if any risky AND app_deploy_window = immediate: status = risky, request coordinated deploy
  SCHEMA REVIEW → run all best-practice checks (indexes, RLS, N+1, SELECT *)
                  → emit issues sorted by severity

Q: Does the migration have a tested down migration?
  NO  → status = error, "Every migration must be reversible. Add a down migration OR
        mark as intentionally irreversible with a comment + human sign-off."
  YES → run it against a shadow DB (up → down → up). If the second up fails, the down
        was destructive (e.g. dropped a column it shouldn't have). status = error.

Q: Is the migration a column type change or NOT NULL addition?
  YES → enforce 3-step expand/contract:
        Step 1 (expand):  add new column with new type, default, nullable
        Step 2 (migrate): backfill in batches (delegate to data-migration if >1M rows)
        Step 3 (contract): drop old column (after app no longer reads it)
        Reject any single-migration type change.

Q: Is the table tenant-scoped?
  Detect: has a tenant_id / org_id / workspace_id column AND the app authenticates per tenant.
  YES → RLS must be enabled with FORCE. Generate the policy if missing.
        Forbidden: any query that doesn't filter by tenant_id (would cross tenant boundary).
```

## Failure Modes & Recovery

| Symptom                                                        | Cause                                                                                                | Recovery                                                                                                                                                                        |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ALTER TABLE ... ADD COLUMN ... NOT NULL` hangs for 10 minutes | Postgres rewrites the whole table to enforce NOT NULL without a default                              | Pre-migrate: `ADD COLUMN ... DEFAULT 0 NOT NULL` (Postgres 11+ is metadata-only). Then backfill, then drop default if needed.                                                   |
| `CREATE INDEX` blocks writes                                   | Used plain `CREATE INDEX` instead of `CREATE INDEX CONCURRENTLY`                                     | Always use `CONCURRENTLY` in prod. If already running, wait it out; next time, use `CONCURRENTLY`.                                                                              |
| `ALTER COLUMN ... TYPE` locks the table for the full duration  | Type change requires a full rewrite                                                                  | Use the 3-step expand/contract pattern. Never do type changes in a single migration.                                                                                            |
| Lock contention crash on prod deploy                           | Migration took a heavy lock (e.g. `ALTER TABLE ... ADD CONSTRAINT ... NOT NULL`) during peak traffic | Run heavy migrations during the deploy window OR use `CREATE UNIQUE INDEX CONCURRENTLY` then `ALTER TABLE ... ADD CONSTRAINT ... USING INDEX`                                   |
| N+1 query causing 500ms page load                              | ORM default lazy-loads relations                                                                     | Add `includes` (Rails) / `selectinload` (SQLAlchemy) / `Include` (Prisma) / `eager_load` (ActiveRecord) at the call site                                                        |
| `SELECT *` breaks after column rename                          | App selected `*` and got the old column name from a stale cache                                      | Never use `SELECT *` in production code paths. Use explicit column lists. If the column is already renamed, expand/contract: add new name, dual-write, migrate reads, drop old. |
| RLS policy blocks the admin dashboard                          | RLS applies to all roles including admins                                                            | Create a `bypass_rls` role for admins, OR add a policy `USING (current_setting('app.role') = 'admin' OR tenant_id = ...)`                                                       |
| `down` migration drops a column the app still reads            | Down migration was destructive (dropped instead of renamed-back)                                     | Test down migrations on a shadow DB: up → down → up. If the second up fails, the down is destructive — rewrite it.                                                              |

## Self-Healing Loop

1. **Monitor**: `pg_stat_statements` reports mean query time per query fingerprint. The loop polls it hourly.
2. **Classify**: Any query with mean > 100ms OR calls > 10k/hr is a candidate.
3. **Auto-fix (missing index)**: `EXPLAIN (ANALYZE, BUFFERS)` the query. If Seq Scan on a large table → generate a `CREATE INDEX CONCURRENTLY` migration, test on shadow DB, queue for human approval (never auto-deploy index changes — they can lock or balloon disk).
4. **Auto-fix (N+1)**: detect the query pattern (same fingerprint, parameterized by parent ID, called N times per page load) → suggest the ORM `includes`/`selectinload` fix at the call site.
5. **Verify**: After the fix ships, mean query time should drop. If it doesn't within 24h, revert and re-analyze.
6. **Record**: Every slow query and its fix writes to `OMNIPROJECT_SELF_IMPROVEMENT.md` with the query fingerprint, the EXPLAIN output, the fix, and the before/after timing. `meta-auditor` reads this in Phase 13 to refine the index suggestion heuristics.

## Quality Gates (enforced before declaring "migration OK")

- [ ] Every statement in the migration is classified expand / contract / risky / forbidden (no unclassified statements)
- [ ] Zero `forbidden` statements (block at review)
- [ ] Every `risky` statement has a documented mitigation (3-step plan, deploy window, sign-off)
- [ ] `down` migration exists AND passes the up → down → up test on a shadow DB
- [ ] Every new FK column has a corresponding `CREATE INDEX CONCURRENTLY` in the same migration
- [ ] Every tenant-scoped table has RLS enabled with `FORCE` and a policy
- [ ] No `SELECT *` in any production code path (ORM `find`/`first` is OK if it returns explicit columns; raw `SELECT *` is not)
- [ ] No N+1 queries detected in the test suite (query count per test ≤ threshold)
- [ ] `EXPLAIN` shows no Seq Scan on tables > 10k rows for the new queries this migration enables
- [ ] TRACEABILITY_MATRIX.md has one row per table touched: `table → migration → policy → index`

If any gate fails: status = `forbidden` or `error`, do NOT proceed to Phase 11 deploy. Emit the failing gate and the relevant EXPLAIN / migration snippet so the orchestrator can route to `debug-entry`.

## Tools

- **`psql`** — the canonical Postgres client. Always use `--dry-run` for syntax checks before applying.
- **`prisma migrate`** (Node) / **`alembic`** (Python) / **`flyway`** (Java) / **`golang-migrate`** (Go) / **`goose`** (Go) — migration runners. The sub-skill is tool-agnostic but requires the chosen tool to support `up` + `down`.
- **`pg_stat_statements`** — Postgres extension that records query fingerprints + timings. Source of truth for slow-query detection.
- **`EXPLAIN (ANALYZE, BUFFERS)`** — the only reliable way to know if an index will help. Never suggest an index without running this first.
- **`pgrepack` / `pg_repack`** — for online index rebuilds without long locks (when `REINDEX` would block).
- **`hypopg`** — Postgres extension that lets you test a hypothetical index without creating it. Run before suggesting any index on a >1M row table.
- **`sqlfluff`** — SQL linter for style + basic correctness (catches `SELECT *`, missing `WHERE` on `UPDATE`/`DELETE`).

## Hard Rules

1. **Every FK needs an index.** Postgres does NOT auto-index FK columns. A FK without an index means every parent-row delete does a Seq Scan on the child table — that's how you get unbounded lock waits in prod. `CREATE INDEX CONCURRENTLY ON child(parent_id)` in the same migration as the FK.
2. **Every migration must be reversible.** Either provide a tested `down` migration, or mark it `-- IRREVERSIBLE: <reason>` with a human sign-off in the PR. Silent irreversibility is forbidden.
3. **Never `SELECT *` in production code paths.** A column rename or drop silently breaks every `SELECT *` consumer. Use explicit column lists (`SELECT id, title, tenant_id FROM todos`) — they survive renames via the expand/contract pattern.
4. **Never drop a column in the same migration as a rename.** Renaming + dropping in one step means there's no point where both old and new names work — you can't deploy the app gracefully. Use 3 steps: add new name → dual-write + dual-read → drop old name.
5. **Never `ALTER COLUMN ... TYPE` in a single migration.** Type changes rewrite the whole table and hold an `AccessExclusiveLock` for the duration. Use the 3-step expand/contract: add new column with new type → backfill in batches (delegate to `data-migration` if >1M rows) → drop old column.
6. **Never add `NOT NULL` without a default on an existing table.** `ALTER TABLE ... ADD COLUMN x int NOT NULL` on a table with rows requires Postgres to fill the column for every row — full table rewrite. Always `ADD COLUMN x int DEFAULT 0 NOT NULL` (metadata-only on Postgres 11+), then backfill if needed, then drop default if needed.
7. **Never run heavy migrations during peak traffic.** `CREATE INDEX`, `ADD CONSTRAINT NOT NULL`, `ALTER COLUMN TYPE` all hold locks. Either run them in a deploy window OR use the `CONCURRENTLY` / `USING INDEX` / 3-step patterns that avoid the lock. The migration runner should refuse to apply a risky migration outside the configured deploy window.
8. **Every tenant-scoped table has RLS with `FORCE`.** Without `FORCE`, the table owner (often the app's DB role) bypasses RLS — which means a bug in the app's `WHERE tenant_id = ...` becomes a cross-tenant data leak. RLS is the safety net, not the app.
