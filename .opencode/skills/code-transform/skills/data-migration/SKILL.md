---
name: data-migration
description: "Plan and execute zero-downtime database migrations using the expand/contract pattern: add new columns (expand), backfill in batches, dual-write and switch reads, then drop old (contract) after a safety period. Handles column renames, type changes, table splits, and large backfills without locking prod tables. Triggers in Phase 6 EXECUTE when changing DB schema on a table with existing data."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: backend
---

# Data Migration

> Owns the schema-change lifecycle for tables with existing data. Coordinates with `db-design` (initial schema), `db-seeding` (new row data, not migrations), and `audit-trail` (every migration is recorded). The golden rule: **zero downtime, zero data loss, always reversible until the contract step.**

## When to Use

| Phase | Trigger | Why |
|-------|---------|-----|
| Phase 6 — EXECUTE | Spec requires renaming a column, splitting a table, changing a column type, or backfilling a new column from existing data | In-place renames/changes break running app — must use expand/contract |
| Phase 6 — EXECUTE | New column needs `NOT NULL` but existing rows have no value | Must add nullable, backfill, then add NOT NULL constraint in a separate step |
| Phase 6 — EXECUTE | Index needed on a large table (> 1M rows) | `CREATE INDEX` blocks writes; must use `CONCURRENTLY` (Postgres) or online alter (MySQL) |
| Phase 6 — EXECUTE | Cross-database migration (MySQL → Postgres, etc.) | Expand/contract over a dual-write bridge |
| Phase 12 — MAINTAIN | Cleanup task: dedupe rows, archive old data, normalize enums | Same backfill + batch patterns, even without schema change |
| Phase 12 — MAINTAIN | Drop a column flagged for removal > 1 week ago | Execute the contract step now that safety period has elapsed |

**Do NOT use this sub-skill for:** initial schema creation on an empty DB (use `db-design`), seed data (use `db-seeding`), application-level data transforms that don't touch schema (write a one-off script in `scripts/`), or migrations on tables with zero rows (just use the ORM's `alter table` — no expand/contract needed when there's no data to migrate).

## What It Does

1. **Classifies the change** into one of: add column (safe), rename column (expand/contract), change type (expand/contract), split table (expand/contract), drop column (expand/contract with safety period), add index (concurrent), backfill only (no schema change).
2. **Generates a multi-step migration plan** — each step is a separate migration file with its own deploy. Steps NEVER combine expand + contract in one migration (that defeats the zero-downtime property).
3. **For expand/contract, emits 5 migrations:**
   - **M1 EXPAND** — add new column nullable with `DEFAULT NULL` (or new table for splits). Safe on any DB.
   - **M2 MIGRATE** — backfill `UPDATE new_col = transform(old_col) WHERE new_col IS NULL` in batches of 1000 rows, sleeping 100ms between batches. Idempotent (re-runnable).
   - **M3 SWITCH-WRITE** — app code deploys to dual-write (write to both old + new). Migration adds a trigger or app-level sync as a safety net.
   - **M4 SWITCH-READ** — app code deploys to read from new. Old column still written but no longer read.
   - **M5 CONTRACT** — drop old column. Only runs after a safety period (default 1 week) with zero read/write errors on old.
4. **Batch backfill engine** — `UPDATE ... WHERE id BETWEEN ? AND ? LIMIT 1000` (or `ctid` paging for Postgres when no monotonic id), with adaptive throttling based on DB load (`pg_stat_activity` connection count, replication lag).
5. **Validation gates** — between every step: row count match, checksum match on key columns, spot-check 100 random rows, app test suite passes.
6. **Rollback plan** — every step before M5 CONTRACT is reversible. M5 CONTRACT (drop) is the point of no return — requires explicit `--i-understand-this-is-destructive` flag and a verified backup from < 24h ago.

## Integration Contract

```
INPUT:
  - change_type: add_column|rename_column|change_type|split_table|drop_column|add_index|backfill (required)
  - table: string (required)
  - column: string (required for column-level changes)
  - new_column: string (required for rename/split — the new name)
  - transform: SQL expression for backfill, e.g. "LOWER(old_col)" or "old_col::bigint" (required for change_type/backfill)
  - batch_size: int (default 1000, max 10000)
  - sleep_ms: int (default 100)
  - safety_period_days: int (default 7 — min time between M4 and M5)
  - db: postgres|mysql (auto-detected)
  - concurrent: bool (default true — use CONCURRENTLY for indexes)

OUTPUT (JSON to stdout):
  {
    "status": "ok|error",
    "change_type": "rename_column",
    "plan": [
      {"step": "M1_EXPAND", "file": "migrations/2026_01_15_001_expand_users_email_lower.sql", "reversible": true},
      {"step": "M2_MIGRATE", "file": "migrations/2026_01_15_002_backfill_email_lower.sql", "reversible": true, "estimated_rows": 4500000, "estimated_minutes": 38},
      {"step": "M3_SWITCH_WRITE", "file": "migrations/2026_01_15_003_add_sync_trigger.sql", "app_deploy_required": true, "reversible": true},
      {"step": "M4_SWITCH_READ", "file": null, "app_deploy_required": true, "reversible": true},
      {"step": "M5_CONTRACT", "file": "migrations/2026_02_12_001_drop_email_old.sql", "earliest_run": "2026-02-22T00:00:00Z", "reversible": false, "requires_flag": "--i-understand-this-is-destructive"}
    ],
    "validation_queries": ["SELECT count(*) FROM users", "SELECT md5(string_agg(email_lower ORDER BY id)) FROM users"],
    "rollback_plan": "M3 and M4 are app-rollbacks; M2 is reversible by UPDATE email_lower = NULL WHERE email_lower IS NOT NULL; M1 is reversible by ALTER TABLE users DROP COLUMN email_lower"
  }

SIDE EFFECTS:
  - Writes migration files into the project's migrations directory
  - Writes a backfill runner script into scripts/migrate/
  - Creates a migrations_audit table (if not exists) tracking: migration_id, step, started_at, finished_at, rows_affected, status, operator
  - M5 CONTRACT refuses to run if safety period not elapsed OR backup age > 24h
```

## CLI

```bash
# Plan a column rename (generates 5 migration files + backfill script)
python3 scripts/migration_agent.py plan --change-type rename_column \
  --table users --column email --new-column email_lower

# Plan a type change (e.g. integer id → bigint for scale)
python3 scripts/migration_agent.py plan --change-type change_type \
  --table orders --column id --new-column id_big --transform "id::bigint"

# Plan a table split (users → users + user_profiles)
python3 scripts/migration_agent.py plan --change-type split_table \
  --table users --new-table user_profiles \
  --moved-columns "bio,avatar_url,location,birthdate"

# Run a backfill (M2) with progress bar
python3 scripts/migration_agent.py backfill --migration 2026_01_15_002 --batch-size 2000 --sleep-ms 50

# Validate after backfill — row count + checksum + spot check
python3 scripts/migration_agent.py validate --migration 2026_01_15_002

# Check if it's safe to run M5 CONTRACT yet
python3 scripts/migration_agent.py contract-check --table users --column email
# → prints: safety_period_elapsed: true, backup_age_hours: 3, read_errors_since_switch: 0, write_errors_since_switch: 0
# → verdict: SAFE_TO_CONTRACT or WAIT (with reason)

# Execute M5 CONTRACT (irreversible — requires explicit flag)
python3 scripts/migration_agent.py contract --migration 2026_02_12_001 --i-understand-this-is-destructive

# Dry-run any step (print SQL without executing)
python3 scripts/migration_agent.py dry-run --migration 2026_01_15_002
```

## Decision Tree (autonomous)

```
Q: What is the change?
  ADD COLUMN with default (modern Postgres ≥11 / MySQL ≥8) → SAFE, single migration, no expand/contract
  ADD COLUMN NOT NULL with no default → EXPAND/CONTRACT (add nullable, backfill default, add NOT NULL)
  RENAME COLUMN → EXPAND/CONTRACT (NEVER rename in place — running app breaks)
  CHANGE COLUMN TYPE → EXPAND/CONTRACT (NEVER alter type in place — locks table, may fail on bad data)
  SPLIT TABLE → EXPAND/CONTRACT (add new table, backfill, dual-write, switch reads, drop old columns)
  DROP COLUMN → EXPAND/CONTRACT with safety period (NEVER drop immediately — dual-write stop first, wait 1 week)
  ADD INDEX → CONCURRENT (CREATE INDEX CONCURRENTLY on Postgres, ALTER TABLE ... ALGORITHM=INPLACE on MySQL)
  BACKFILL ONLY (no schema change) → batch UPDATE engine, idempotent, throttle by load

Q: Is the table empty?
  YES → skip expand/contract, run a plain ALTER (still emit a migration file for audit)
  NO  → proceed with full expand/contract plan

Q: How many rows?
  < 10,000 → backfill in one transaction (still batched internally, no throttle needed)
  10,000 – 1,000,000 → batched backfill, 1000 rows/batch, 100ms sleep
  > 1,000,000 → batched backfill with adaptive throttle: monitor pg_stat_activity, if active_conns > 80% of max, pause; monitor replication lag, if > 5s, pause

Q: Does the transform have a possibility of failure (e.g. "old_col::bigint" on non-numeric data)?
  YES → pre-flight scan: SELECT count(*) WHERE old_col !~ '^[0-9]+$' → if > 0, halt and report sample bad rows
  NO  → proceed

Q: Has the safety period elapsed for M5 CONTRACT?
  NO  → REFUSE to run. Print: "Safety period ends at <date>. Re-run after."
  YES → check backup age. If > 24h, REFUSE: "Take a fresh backup before contract."
        check error counters since M4. If > 0, REFUSE: "Investigate errors before dropping."
        Otherwise: require --i-understand-this-is-destructive flag, then execute.
```

## Expand/Contract in Detail

### Rename column `users.email` → `users.email_canonical`

```
M1 EXPAND (deploy immediately, safe):
  ALTER TABLE users ADD COLUMN email_canonical TEXT;
  -- nullable, no default, no constraint — zero lock contention

M2 MIGRATE (backfill, throttled):
  -- generated runner script:
  SET statement_timeout = '5s';
  WHILE exists(SELECT 1 FROM users WHERE email_canonical IS NULL LIMIT 1):
    UPDATE users SET email_canonical = LOWER(TRIM(email))
      WHERE id IN (SELECT id FROM users WHERE email_canonical IS NULL LIMIT 1000);
    PERFORM pg_sleep(0.1);
  -- idempotent: WHERE email_canonical IS NULL means re-runs skip done rows

M3 SWITCH-WRITE (app deploy + trigger safety net):
  -- migration:
  CREATE OR REPLACE FUNCTION sync_email_canonical() RETURNS TRIGGER AS $$
  BEGIN
    NEW.email_canonical = LOWER(TRIM(NEW.email));
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  CREATE TRIGGER users_email_canonical_sync
    BEFORE INSERT OR UPDATE OF email ON users
    FOR EACH ROW EXECUTE FUNCTION sync_email_canonical();
  -- app deploy: stop writing to email (or keep dual-write, trigger handles new col)

M4 SWITCH-READ (app deploy only, no migration):
  -- app code reads from email_canonical, ignores email
  -- email is still written (by app or trigger) but no longer read
  -- monitor for 1 week: read_errors=0, write_errors=0, drift=0
  -- drift check (cron): SELECT count(*) WHERE email_canonical != LOWER(TRIM(email)) → must be 0

M5 CONTRACT (after safety period, irreversible):
  ALTER TABLE users DROP TRIGGER users_email_canonical_sync;
  DROP FUNCTION sync_email_canonical();
  ALTER TABLE users DROP COLUMN email;
  -- email is gone. email_canonical is the source of truth.
```

## Failure Modes & Recovery

| Symptom | Cause | Recovery |
|---------|-------|----------|
| `lock_timeout exceeded` during backfill | Batch too large, or concurrent long-running transactions | Reduce batch_size to 500; reduce statement_timeout to 2s; check `pg_stat_activity` for blocking queries and terminate the blocker, not the backfill |
| `permission denied` on a migration step | Migration runner role lacks ALTER privilege | Grant ALTER on the table to the migration role; never run migrations as superuser (masks permission bugs) |
| Backfill rows don't match (drift > 0 after M3) | App kept writing to old column after trigger created, but trigger only fires on UPDATE OF email | Fix trigger to fire on any INSERT/UPDATE; re-run drift check; if drift persists, investigate app code paths that bypass ORM |
| Type conversion fails on row 3,000,000 of 5,000,000 | Bad data in old_col that pre-flight scan missed (scan sampled, didn't exhaust) | Backfill is idempotent — the 3M done rows are safe. Fix the bad row manually (`UPDATE users SET old_col = NULL WHERE id = X`), re-run backfill, it resumes from row 3,000,001 |
| M5 CONTRACT ran too early, app still reads old column | Safety period not actually elapsed, or app deploy for M4 was rolled back | **EMERGENCY**: restore from backup taken < 24h before M5; re-deploy app at M4 state; postmortem on why contract-check passed (likely the read_errors counter wasn't wired to the right metric) |
| Replication lag spikes during backfill | Batch writes faster than replica can apply | Pause backfill (it's resumable); increase sleep_ms to 500; check replica CPU/IO; consider running backfill during off-peak |
| `CREATE INDEX CONCURRENTLY` failed mid-way (left invalid index) | Concurrent index build can fail if a conflicting transaction holds a lock | `DROP INDEX CONCURRENTLY idx_name;` then retry `CREATE INDEX CONCURRENTLY`. Never `DROP INDEX` (non-concurrent) on a prod table — it takes an exclusive lock |
| FK violation during table split | New table's FK to parent not yet in place when app dual-writes | Add FK with `NOT VALID` first (doesn't lock, doesn't scan existing rows), then `VALIDATE CONSTRAINT` separately (scans but doesn't block writes) |

## Self-Healing Loop

When a migration step fails:

1. **Detect** — migration runner catches the error, records to `migrations_audit` with `status=failed`, `error_message`, `failed_at_batch`.
2. **Assess safety** — because every step before M5 is reversible, a failure never leaves prod in a broken state. The new column exists but is unused; the old column still works.
3. **Diagnose** — `migration_agent.py diagnose --migration <id>` reports: which batch failed, the SQL error, blocking queries, replica lag at time of failure, suggested fix (reduce batch size, terminate blocker, fix bad data row).
4. **Re-run** — backfill is idempotent (`WHERE new_col IS NULL` skips done rows). Re-running resumes from failure point. No rollback needed.
5. **Validate** — after successful re-run, `migration_agent.py validate` checks: row count old vs new, checksum match, drift check (`new_col != transform(old_col)` must be 0), spot check 100 random rows.
6. **Learn** — failure + fix written to `OMNIPROJECT_SELF_IMPROVEMENT.md`. If the same failure mode (e.g. lock timeout on a specific table size) recurs ≥3 times, `self-patch-generator` tunes the default `batch_size` and `sleep_ms` for that table profile.

## Quality Gates

- [ ] M1 EXPAND runs in < 1s with no table lock (verified by `pg_locks` monitoring during run)
- [ ] M2 MIGRATE backfill is idempotent: run twice, second run affects 0 rows
- [ ] M2 MIGRATE never holds a lock > 1s per batch (verified by `pg_stat_activity` query duration monitoring)
- [ ] M2 MIGRATE reports progress: `rows_done / rows_total` updates every batch
- [ ] M3 SWITCH-WRITE: drift check (`new_col != transform(old_col)`) returns 0 after 24h of dual-write
- [ ] M4 SWITCH-READ: read_errors counter is 0 for 7 consecutive days before M5 is allowed
- [ ] M5 CONTRACT: `contract-check` returns `SAFE_TO_CONTRACT` (safety period elapsed + backup < 24h + 0 errors)
- [ ] M5 CONTRACT: requires `--i-understand-this-is-destructive` flag, refuses without it
- [ ] Rollback tested: every step before M5 has been rolled back in staging and the app continued functioning
- [ ] Backup verified: a backup from < 24h ago exists and was test-restored to a scratch DB
- [ ] Validation: row count old == new, checksum old == new, 100 random rows match field-by-field
- [ ] Audit: `migrations_audit` table records every step with operator, timestamps, rows affected
- [ ] Docs: migration PR description includes: change summary, rollback plan, safety period end date, validation results

## Tools

- **Alembic (Python/SQLAlchemy)** — migration framework with `op.add_column`, `op.batch_alter_table` (for SQLite-style online alters on SQLite). Use `op.execute()` for raw SQL when Alembic's helpers don't fit expand/contract.
- **Prisma Migrate (Node)** — schema-first migrations. Good for M1/M5 (declarative), but for M2 backfills you write raw SQL in a custom migration via `prisma migrate dev --create-only`.
- **Knex migrations (Node)** — `knex.migrations` with `up`/`down` functions. Full SQL control, good for expand/contract.
- **gh-ost (MySQL)** — GitHub's online schema change tool. Trigger-based, pauseable, throttled. Use for MySQL type changes and large ALTERs that would otherwise block.
- **pg_repack (Postgres)** — rebuilds tables without long exclusive locks. Use for vacuum/bloat, not for column changes.
- **pgloader** — for cross-database migration (MySQL → Postgres). Streams rows, transforms types, parallel by table.
- **Percona Toolkit `pt-online-schema-change`** — MySQL online alter with copy-and-swap. Alternative to gh-ost.
- **`pg_stat_activity` + `pg_locks`** — Postgres system views for monitoring backfill impact. Migration runner queries these between batches to throttle adaptively.
- **`statement_timeout`** — set per-migration to `5s` so a runaway query fails fast instead of locking the table for minutes.

## Hard Rules

1. **Never rename a column in place.** `ALTER TABLE ... RENAME COLUMN` breaks every running app instance that references the old name until redeployed. Always expand (add new) → backfill → dual-write → switch reads → contract (drop old). The rename appears seamless to the app because the old name works throughout the transition.
2. **Never drop a column without a safety period.** Minimum 1 week between switching reads to the new column and dropping the old one. During the safety period, monitor for any read of the old column (which would indicate an app instance still on old code). If any read occurs, the safety clock resets. Dropping prematurely is irreversible data loss.
3. **Never hold a table lock for more than 1 second in production.** Backfills run in batches of ≤ 1000 rows with `statement_timeout = '5s'` and a sleep between batches. Index creation uses `CREATE INDEX CONCURRENTLY` (Postgres) or `ALGORITHM=INPLACE` (MySQL). If a migration step would lock the table for > 1s, redesign it as a batched or concurrent operation.
4. **Always test on a staging copy first.** A full staging restore from prod backup + migration dry-run catches data issues (bad rows that fail the transform) and performance issues (backfill takes 6h, not 6min) before prod. No migration ships to prod without a green staging run on a recent prod-sized dataset.
5. **Always have a rollback plan before M5.** Every step before M5 CONTRACT must be reversible, and the rollback must be tested in staging. M5 (drop) is the point of no return — by the time you run it, the old column has been unused for a week, backups are verified, and you have a documented plan for "if we discover we still need the old column, here's how we restore it from backup." No rollback plan = no M5.
6. **Always make backfills idempotent and resumable.** The backfill's `WHERE` clause must target only un-migrated rows (`WHERE new_col IS NULL`), so a crash mid-backfill resumes cleanly. Never write a backfill that does `UPDATE ALL ROWS` — a crash forces a full restart and a partial second pass corrupts already-migrated rows.
7. **Always record migrations in an audit table.** `migrations_audit` tracks: migration_id, step, started_at, finished_at, rows_affected, status, operator. This is how you answer "when did we drop the email column, and who did it?" without digging through git history. Required for compliance (SOC2, HIPAA) and essential for incident response.
