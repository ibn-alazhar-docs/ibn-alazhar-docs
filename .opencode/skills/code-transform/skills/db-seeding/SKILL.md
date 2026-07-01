---
name: db-seeding
description: "Generate realistic, idempotent seed data for databases using Faker (Python/Node) and factory libraries (factory_boy, @faker-js/faker, Prisma seed). Environment-aware: thousands of rows in dev, anonymized subsets in staging, only admin/system accounts from env vars in prod. Triggers in Phase 6 EXECUTE (new project setup) and Phase 8 TESTING (test fixtures)."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: backend
---

# DB Seeding

> Owns the seed-data lifecycle: factories, idempotent inserts, environment tiers, and reversibility. Works alongside `data-migration` (schema changes) and `db-design` (schema definition) but is responsible ONLY for row data, not schema.

## When to Use

| Phase               | Trigger                                                                                         | Why                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Phase 6 — EXECUTE   | New project bootstrap; schema migrations just ran against an empty DB                           | Need baseline data (admin accounts, reference tables, demo content) before app starts         |
| Phase 6 — EXECUTE   | User says "I need demo data" or "seed the database"                                             | Explicit request                                                                              |
| Phase 8 — TESTING   | Test suite needs deterministic fixtures but tests should share setup, not each create their own | Seed once per test run, tests assert against known rows                                       |
| Phase 8 — TESTING   | Integration tests against a real DB need a known starting state                                 | Seed before test suite, truncate after                                                        |
| Phase 11 — ROLLOUT  | New staging environment stood up                                                                | Seed with anonymized prod subset OR Faker-generated data so QA has something to click through |
| Phase 12 — MAINTAIN | Onboarding new dev; they cloned the repo and need local data fast                               | `npm run seed` should give them a working local app in < 60s                                  |

**Do NOT use this sub-skill for:** production user data (never seed real PII), schema changes (use `data-migration`), performance/load test data at scale > 100k rows (use a dedicated load-test seed with bulk-insert paths, not Faker one-row-at-a-time), or one-off admin scripts (those go in `scripts/` not the seed pipeline).

## What It Does

1. **Detects the ORM/migration stack** — Prisma (Node), Alembic+SQLAlchemy (Python), Knex (Node), Django migrations + manage.py (Python), Rails (Ruby) — and emits seed scripts in the matching style.
2. **Defines factories** (not fixtures) for each entity:
   - `UserFactory`, `PostFactory`, `OrderFactory` — each returns a valid row dict, randomized via Faker.
   - Factories compose: `OrderFactory.create(user=UserFactory.create())` handles foreign keys automatically.
   - Factories expose traits: `UserFactory.admin()` sets `role='admin'`; `UserFactory.unverified()` sets `email_verified_at=NULL`.
3. **Runs idempotently** — every insert uses `INSERT ... ON CONFLICT DO NOTHING` (Postgres), `INSERT IGNORE` (MySQL), or `merge`/`upsert` patterns so re-running `seed` is safe and produces no duplicates.
4. **Respects environment tiers**:
   - **dev**: 1000 users, 5000 posts, 200 orders — Faker-generated, fictional but realistic.
   - **staging**: 100 users (anonymized subset of prod OR Faker), 500 posts, 20 orders.
   - **prod**: 0 Faker rows. Only admin/system accounts created from env vars (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`), with a startup banner warning if no admin env vars are set.
5. **Seed scripts are versioned alongside migrations** — `prisma/seed.ts`, `migrations/seed/2026_01_15_initial.py`. Each seed script has a matching `seed:undo` (or `seed:revert`) script that deletes only the rows it created (tracked by a `seeded_by` column or by stable ID prefixes).
6. **Reference data is hardcoded, transactional data uses Faker**:
   - Countries, currencies, subscription plans, permission names → static arrays in code (these are real values, not fake).
   - Users, posts, orders, comments → Faker (these are sample data).
7. **Deterministic mode** — `SEED_FAKER_SEED=42` env var sets `faker.seed(42)` so two runs produce identical data (essential for snapshot tests and reproducible bug reports).

## Integration Contract

```
INPUT:
  - orm: prisma|sqlalchemy|knex|django|rails (auto-detected if omitted)
  - environment: dev|staging|prod (required — read from NODE_ENV / APP_ENV if omitted)
  - entities: list of table names to seed (default: all)
  - count_overrides: JSON map e.g. {"users": 5000, "posts": 20000}
  - faker_seed: int (default random; set for deterministic mode)
  - anonymize_source: optional DSN for staging seed from prod (staging only — prod data MUST be anonymized before copying)
  - undo: bool (default false — run the matching seed:undo scripts instead)

OUTPUT (JSON to stdout):
  {
    "status": "ok|error",
    "environment": "dev",
    "orm": "prisma",
    "scripts_created": ["prisma/seed.ts", "prisma/seed-undo.ts", "prisma/factories/user.ts", "prisma/factories/post.ts"],
    "rows_inserted": {"users": 1000, "posts": 5000, "orders": 200},
    "rows_skipped": {"users": 0, "posts": 12},   # idempotency: rows that already existed
    "duration_ms": 8420,
    "faker_seed": 42,
    "env_vars_required": ["SEED_ADMIN_EMAIL", "SEED_ADMIN_PASSWORD"],
    "warnings": []
  }

SIDE EFFECTS:
  - Writes seed scripts into the project's migration/seed directory
  - Inserts rows into the target database (idempotent — safe to re-run)
  - Creates a `seed_runs` audit table tracking: timestamp, environment, scripts run, rows inserted, operator
  - In prod: refuses to run unless --confirm-prod flag is passed AND SEED_ADMIN_EMAIL is set
```

## CLI

```bash
# Bootstrap seed scripts for a Prisma project (auto-detects schema.prisma)
python3 scripts/seed_agent.py init --orm prisma

# Seed dev environment with default counts
NODE_ENV=development npm run seed

# Seed with custom counts
NODE_ENV=development npm run seed -- --counts '{"users": 5000, "posts": 20000}'

# Deterministic seed (same data every run — for snapshot tests)
SEED_FAKER_SEED=42 npm run seed

# Seed staging from anonymized prod snapshot
NODE_ENV=staging npm run seed -- --anonymize-source "$PROD_READ_ONLY_DSN"

# Undo the last seed run (deletes only rows created by it)
npm run seed:undo

# Prod seed — only admin accounts, requires explicit confirmation
NODE_ENV=production npm run seed -- --confirm-prod

# Validate seed without writing (dry run)
npm run seed -- --dry-run
```

## Decision Tree (autonomous)

```
Q: What environment is this running in?
  DEV     → Q: Does the project already have seed scripts?
              YES → just run `npm run seed` (idempotent)
              NO  → init factories for every entity in the schema, default 1000 users / 5000 posts / 200 orders
  STAGING → Q: Is anonymized prod data available (read replica + PII scrubber)?
              YES → seed from anonymized snapshot (best fidelity for QA)
              NO  → Faker with reduced counts (100 users / 500 posts / 20 orders)
  PROD    → Q: Is this a first-time bootstrap (empty DB)?
              YES → seed ONLY admin/system accounts from env vars, refuse to seed Faker data
              NO  → REFUSE to run. Print: "Production DB is not empty. Use data-migration for ongoing changes."
                    (This guard prevents accidental `npm run seed` against prod wiping or duplicating data)

Q: Does the entity have foreign keys?
  YES → seed parents before children (factories handle this, but the topological order matters for raw SQL)
  NO  → seed in any order

Q: Is the seed idempotent?
  YES → run it
  NO  → REFUSE to run. Print: "Seed is not idempotent (no ON CONFLICT / INSERT IGNORE). Refusing to run twice."

Q: Is reference data or sample data?
  REFERENCE (countries, currencies, plans) → hardcode as static arrays, insert with ON CONFLICT DO NOTHING
  SAMPLE (users, posts, orders) → Faker, idempotent insert
```

## Environment Tier Defaults

| Entity             | Dev           | Staging                        | Prod                    |
| ------------------ | ------------- | ------------------------------ | ----------------------- |
| Users              | 1000 (Faker)  | 100 (anonymized prod OR Faker) | 0 (admin from env only) |
| Posts              | 5000 (Faker)  | 500 (Faker)                    | 0                       |
| Orders             | 200 (Faker)   | 20 (Faker)                     | 0                       |
| Comments           | 10000 (Faker) | 1000 (Faker)                   | 0                       |
| Countries          | 249 (static)  | 249 (static)                   | 249 (static)            |
| Currencies         | 168 (static)  | 168 (static)                   | 168 (static)            |
| Subscription plans | 4 (static)    | 4 (static)                     | 4 (static)              |
| Admin accounts     | 0 (use env)   | 1 (from env)                   | 1+ (from env, required) |

Counts are overridable via `--counts` flag or `SEED_COUNT_<ENTITY>` env vars. Production NEVER accepts Faker counts — the override is ignored with a warning.

## Failure Modes & Recovery

| Symptom                                           | Cause                                                                                                   | Recovery                                                                                                                                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ForeignKeyViolation` during seed                 | Factories inserted child before parent, or parent factory failed silently                               | Check factory composition order; ensure each factory returns the created row's ID; wrap each entity seed in a transaction so partial failures roll back                                     |
| `UniqueViolation: duplicate key`                  | Seed not idempotent — used plain `INSERT` not `ON CONFLICT DO NOTHING`                                  | Rewrite all inserts as upserts; re-run is now safe; clean up duplicates via `seed:undo` then re-seed                                                                                        |
| Prod accidentally seeded with Faker data          | `NODE_ENV` was wrong, or `--confirm-prod` was passed without checking env                               | `seed:undo` immediately (within the same `seed_runs` audit row); audit `seed_runs` table to confirm scope; rotate any credentials that might have been Faker-generated; postmortem required |
| Staging has real PII from prod                    | Anonymization step skipped or scrubber config out of date                                               | Run PII scanner (`scripts/scan_pii.py`) against staging; delete offending rows; rerun anonymization with updated config; notify privacy officer if regulated data leaked                    |
| Seed runs slowly (> 60s in dev)                   | Inserting one row at a time                                                                             | Batch inserts (1000 rows per `INSERT`); use `COPY` (Postgres) or `LOAD DATA` (MySQL) for > 10k rows; Faker is fast, the round-trips are slow                                                |
| Tests flaky because seed data varied between runs | `faker.seed` not set                                                                                    | Set `SEED_FAKER_SEED=42` in test env; use snapshot tests against deterministic seed output                                                                                                  |
| `seed:undo` deleted too much                      | Undo script used `DELETE FROM users` instead of `DELETE FROM users WHERE seeded_by = 'seed_2026_01_15'` | Restore from nightly backup; rewrite undo script to scope by `seeded_by` column or stable ID prefix (`seed_`); never let undo touch rows it didn't create                                   |
| Anonymized prod data still has PII                | Faker `replace` only swapped names but kept emails, or left PII in JSON columns                         | Use a typed scrubber: name→Faker.name, email→`userN@example.test`, phone→Faker.phone, JSON→recursive scrub; add a CI check that scans staging for PII patterns                              |

## Self-Healing Loop

When a seed run fails partway:

1. **Detect** — seed runner catches the exception, records it in `seed_runs` with status `failed` and the offending entity + error.
2. **Roll back** — if a transaction was open, roll it back. If the failure was mid-batch, the idempotent inserts already done are kept (no harm — re-running is safe).
3. **Diagnose** — `seed_agent.py diagnose --run-id <id>` reports: which entity failed, the SQL error, the last successful row, and a suggested fix (e.g. "FK violation — seed users before posts").
4. **Re-run** — because seeds are idempotent, re-running `npm run seed` skips already-inserted rows and resumes from the failure point. No `seed:undo` needed unless the partial state is corrupt.
5. **Verify** — after a successful re-run, `seed_agent.py verify` checks: row counts match expected, no orphans (every `post.user_id` resolves), no duplicate IDs.
6. **Learn** — failure + fix written to `OMNIPROJECT_SELF_IMPROVEMENT.md`. If the same FK-ordering mistake recurs across projects, `self-patch-generator` adds a topological-sort step to `seed_agent.py init`.

## Quality Gates

- [ ] Idempotency: running `npm run seed` twice produces 0 new rows on the second run
- [ ] Idempotency: running `npm run seed:undo` then `npm run seed` returns to the same state
- [ ] FK integrity: `SELECT count(*) FROM posts p LEFT JOIN users u ON p.user_id=u.id WHERE u.id IS NULL` returns 0
- [ ] No PII in dev/staging seed: `scripts/scan_pii.py` returns 0 findings
- [ ] Deterministic mode: `SEED_FAKER_SEED=42 npm run seed` produces byte-identical data on two runs
- [ ] Prod guard: `NODE_ENV=production npm run seed` without `--confirm-prod` exits non-zero with a clear message
- [ ] Prod guard: even with `--confirm-prod`, Faker entity counts are forced to 0
- [ ] Admin from env: prod seed creates admin account using `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD`; refuses if either is missing
- [ ] Performance: dev seed completes in < 60s for the default 1000/5000/200 counts
- [ ] Reversibility: `seed:undo` for each seed script exists and is tested
- [ ] Audit: `seed_runs` table records every run with operator, environment, rows inserted, duration
- [ ] Docs: README has "Seeding" section with: how to run per env, how to add a new factory, how to undo

## Tools

- **@faker-js/faker (Node)** — `npm i @faker-js/faker`. The maintained fork of the original faker.js. Use `faker.person.firstName()` not the deprecated `faker.name.firstName()`.
- **faker (Python)** — `pip install faker`. Same API surface, Python idioms.
- **factory_boy (Python)** — `pip install factory_boy`. Factory classes with traits and SubFactories for FK composition. Pair with Faker via `factory.Faker('email')`.
- **@prisma/factory (Node, community pattern)** or `@prisma/client` direct — Prisma doesn't ship factories; the community pattern is `prisma/factories/*.ts` with `make<User>()` functions. `prisma/seed.ts` is the official entrypoint invoked by `prisma db seed`.
- **Knex seed files** — `knex seed:make users` generates `seeds/users.ts`; run with `knex seed:run`.
- **Django fixtures** — JSON files loaded via `manage.py loaddata`. Use ONLY for static reference data; for sample data use a `management/commands/seed.py` script with Faker (fixtures don't compose well with FKs).
- **psql `\copy`** — for bulk-loading > 10k rows; faster than ORM inserts by 100x. Generate CSV with Faker, load with `\copy`.
- **anonymization: faker-mock, data-anonymizer, mimesis** — typed PII scrubbers. `mimesis` (Python) is faster than Faker for bulk.

## Hard Rules

1. **Never seed production with Faker data.** Prod seed creates ONLY admin/system accounts from env vars. The seed runner must refuse to insert Faker-generated rows when `NODE_ENV=production`, even if `--confirm-prod` is passed. This is a one-line guard that prevents catastrophic data pollution.
2. **Always be idempotent.** Every insert uses `ON CONFLICT DO NOTHING` / `INSERT IGNORE` / `upsert`. A seed script that fails on second run is broken by definition. Idempotency is what makes re-runs safe and what makes recovery from partial failures trivial.
3. **Always be reversible.** Every seed script has a matching `seed:undo` script. The undo deletes only rows created by that seed (scoped by `seeded_by` column or stable ID prefix). If you can't undo it, you can't safely run it.
4. **Never commit real user data as seed.** A "convenience" seed file with `alice@company.com` from prod is a PII leak waiting to happen. Seed data is either Faker-generated (clearly fake) or static reference data (countries, currencies). Real emails/phones/names never belong in `git`.
5. **Always use factories, not fixtures, for transactional data.** Fixtures are brittle (one fixture per row, can't scale to 1000 rows, hard to vary). Factories compose (FK handled), parameterize (traits), and scale (`Factory.create_batch(1000)`). Use fixtures only for static reference data where the exact values matter.
6. **Always version seed scripts alongside migrations.** Seeds live in the same `prisma/` or `migrations/` directory, in the same PR as the schema change that requires them. A new column that needs default data gets its seed script in the same commit — not "we'll add the seed later" (later never comes, and prod runs without the default data).
7. **Always set a `seeded_by` marker on seeded rows.** Column or stable ID prefix. Without this, `seed:undo` can't scope its deletes and you risk deleting real user data. The marker is also how you audit "did this row come from a seed or from a real user?" — critical for prod hygiene.
