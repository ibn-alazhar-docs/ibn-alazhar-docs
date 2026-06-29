---
name: backup-strategy
description: "Design and verify a 3-2-1 backup strategy covering databases (pg_dump + WAL archiving + PITR), files (S3 versioning + cross-region replication), and configuration (git + secrets in vault). Invoked at Phase 7 (OBSERVABILITY) and Phase 8 (ROLLOUT) whenever a production data store, file bucket, or config store is introduced. Triggers automatically when CENSUS shows a Postgres/MySQL/MongoDB instance, an S3/GCS bucket marked persistent, or a secrets store."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: data
---

# Backup Strategy

> Owns the disaster-recovery surface: what gets backed up, how often, where it lives, how fast it can come back, and whether it actually restores. Treats untested backups as no backups.

## When to Use

| Phase | Trigger | Why |
|-------|---------|-----|
| Phase 2 — AUDIT | CENSUS lists a database, object store, or secrets manager | Confirm a recovery path exists before changing anything |
| Phase 7 — OBSERVABILITY | Always, after first prod deploy | Backups ARE observability — they tell you what you can survive |
| Phase 8 — ROLLOUT | Migrations that change schema or move data | Snapshot BEFORE the migration, document the restore path |
| Phase 13 — RETROSPECTIVE | Monthly restore drill | Prove the backups still restore |

**Do NOT use this sub-skill for:** application-level soft-delete / trash bins (product feature, not DR), or replicated hot-standbys (HA, not backup — they replicate `DROP TABLE users;` instantly). Backups must be point-in-time and immutable.

## What It Does

1. Inventories every persistent state store in the project (DBs, file buckets, queues with durability, secrets, search indexes).
2. For each store, assigns a recovery profile:
   - **RPO** (Recovery Point Objective) — max acceptable data loss: 5 min, 1 hr, 24 hr.
   - **RTO** (Recovery Time Objective) — max acceptable downtime: 5 min, 1 hr, 4 hr.
3. Maps each store to a backup mechanism that satisfies RPO/RTO:
   - Postgres → `pg_dump` nightly + WAL archiving to S3 for PITR (RPO ≈ 0).
   - MySQL → `mysqldump` nightly + binlog archiving.
   - MongoDB → `mongodump` nightly + oplog tailing for PITR.
   - S3 files → bucket versioning ON + cross-region replication (CRR).
   - Config → git (history is the backup) + secrets mirrored in vault with versioned storage.
4. Encrypts every backup at rest (AES-256, KMS-managed key) and in transit (TLS).
5. Schedules a **monthly restore drill** into an isolated environment, runs smoke tests, and files a `RESTORE_DRILL.md` report.
6. Emits a `BACKUP_MATRIX.md` listing every store, its mechanism, schedule, encryption, offsite copy, and last successful restore date.

## Integration Contract

```
INPUT:
  - census_path: path to CENSUS.md (required)
  - target_env: dev|staging|prod (default prod)
  - rpo_minutes: int (default 60, override per store)
  - rto_minutes: int (default 60, override per store)
  - drill: bool (default false — set true on the 1st of each month)

OUTPUT (JSON to stdout):
  {
    "status": "ok|warn|error",
    "stores": [
      {
        "name": "primary-postgres",
        "kind": "postgres",
        "mechanism": "pg_dump + wal-g to s3://backups/db/",
        "rpo_minutes": 5,
        "rto_minutes": 30,
        "encrypted": true,
        "offsite": true,
        "last_restore_drill": "2026-05-01",
        "verdict": "ok|gap"
      }
    ],
    "matrix_path": "BACKUP_MATRIX.md",
    "drill_report_path": "RESTORE_DRILL.md"
  }

SIDE EFFECTS:
  - Writes BACKUP_MATRIX.md into the project root
  - On drill=true, spins up an isolated restore target (docker compose) and tears it down
```

## CLI

```bash
# Generate the backup matrix from CENSUS
python3 scripts/backup_strategy.py plan \
  --census CENSUS.md \
  --env prod \
  --rpo-minutes 60 \
  --rto-minutes 60

# Verify all scheduled backups ran in the last window
python3 scripts/backup_strategy.py verify \
  --matrix BACKUP_MATRIX.md \
  --window-hours 25

# Run a restore drill (1st of the month)
python3 scripts/backup_strategy.py drill \
  --matrix BACKUP_MATRIX.md \
  --target-env docker-compose.restore.yml \
  --smoke "curl -fsS http://localhost:8080/healthz"
```

## Decision Tree (autonomous)

```
Q: What kind of store?
  Postgres / MySQL / MongoDB
    → Q: RPO ≤ 15 min?
        YES → enable WAL/binlog/oplog archiving to object storage (PITR)
                + nightly logical dump for cross-version restore
        NO  → nightly logical dump only, accept up to 24h loss
  Object store (S3/GCS/R2)
    → enable bucket versioning (always)
    → Q: Same region as primary?
        YES → MUST add cross-region replication (CRR) — hard rule
        NO  → acceptable, still enable versioning
  Config / IaC
    → git history (commit often, tag releases)
    → secrets: NEVER in git — store in vault with versioning enabled
  Search index (Elasticsearch / OpenSearch)
    → don't back up the index — rebuild from source of truth
    → exception: snapshot API for multi-hour rebuilds
  Message queue with durability (Kafka, SQS)
    → Kafka: enable tiered storage to S3
    → SQS: dead-letter queue is NOT a backup; mirror critical events to S3
  Redis / cache
    → NOT backed up by default (cache is disposable)
    → exception: RDB snapshot if rebuild cost > RTO

Q: Is the backup in the same region as primary?
  YES → FAIL — add cross-region replication before proceeding
  NO  → ok

Q: Is the backup encrypted at rest?
  NO → FAIL — enable KMS-managed encryption before proceeding
  YES → ok

Q: Has a restore been performed in the last 31 days?
  NO → schedule drill, mark verdict=warn
  YES → ok
```

## Retention Policy

Default retention (override per store in `BACKUP_MATRIX.md`):

| Tier | Count | Storage | Purpose |
|------|-------|---------|---------|
| Daily | 7 | Hot (S3 Standard) | Quick recovery from yesterday's fat-finger |
| Weekly | 4 | Warm (S3 Standard-IA) | Recovery from a bug that took a week to notice |
| Monthly | 12 | Cold (S3 Glacier Instant) | Compliance, audit, long-running data corruption |
| Yearly | 7 | Cold (S3 Glacier Deep Archive) | Long-horizon regulatory retention |

Lifecycle rule enforces this automatically — old tiers expire on schedule. Object-lock prevents deletion before the window expires, even by root.

## Failure Modes & Recovery

| Symptom | Cause | Recovery |
|---------|-------|----------|
| `pg_dump: FATAL: remaining connection slots are reserved` | Backup job saturates the connection pool | Use a `pg_dump` replica with `hot_standby=on`, or set `max_connections` higher on the replica |
| WAL archive to S3 stalled for >1h | Network blip or IAM rotation | Re-run `pgbackrest archive-push`, verify IAM role, alert PagerDuty if >2h |
| Restore drill fails: `FATAL: data directory is not empty` | Target dir left dirty from last drill | `rm -rf /var/lib/postgresql/restore/*` and re-run; add cleanup step to drill script |
| Restore drill: schema mismatch | Backup taken from a newer DB version than restore target | Pin restore target to the same major version as production; document version-drift policy |
| S3 CRR lagging >15 min | Bucket size grew past auto-scaling threshold | Open AWS support ticket, switch to S3 Batch Replication for backlog |
| `vault: permission denied` reading secret version | Token expired between backup runs | Use vault's `approle` auth with periodic token renewal, not static token |
| Encrypted backup can't be decrypted | KMS key was rotated, old key disabled | NEVER disable old KMS keys — schedule them for deletion only after all backups using them expire (≥ retention) |

## Self-Healing Loop

Every backup run, verify, and drill writes a structured record to `OMNIPROJECT_SELF_IMPROVEMENT.md`:
- Store name, mechanism, success/failure, duration, bytes backed up, error class if any.

`meta-auditor` reads this in Phase 13. Patterns it acts on:
- Same error class appearing ≥3 times across projects → `self-patch-generator` produces a rule (e.g., "always set `--no-owner --no-privileges` on `pg_dump` to avoid restore failures").
- Restore drill consistently slower than RTO → flag store as needing a faster mechanism (e.g., snapshot-based restore instead of logical dump).
- Backup size growing >20% week-over-week with no traffic change → flag possible log bloat or orphaned data.

## Quality Gates

- [ ] Every persistent store has an entry in `BACKUP_MATRIX.md` with mechanism, RPO, RTO, encryption status, offsite status, last-restore date.
- [ ] Every backup is encrypted at rest (KMS-managed key, AES-256).
- [ ] No backup lives in the same region as its primary (cross-region replication confirmed).
- [ ] No secret appears in plaintext in any backup (verified via `gitleaks` scan of `pg_dump` output).
- [ ] A restore drill has been performed in the last 31 days and the smoke test passed.
- [ ] RPO and RTO targets are documented per store and met by the chosen mechanism.
- [ ] WAL/binlog/oplog archiving is enabled for any store with RPO ≤ 15 min.
- [ ] Backup retention is documented (e.g., 7 daily, 4 weekly, 12 monthly) and enforced via lifecycle policy.

## Tools

- **pg_dump / pg_dumpall** — nightly logical backup of Postgres.
- **WAL-G / pgBackRest** — WAL archiving to S3/GCS for PITR. WAL-G is lighter; pgBackRest has parallel restore.
- **mysqldump / Percona XtraBackup** — MySQL logical + physical backups.
- **mongodump / mongorestore** — MongoDB logical backups; oplog tailing for PITR.
- **AWS S3 / GCS / R2** — backup target; enable versioning + CRR + lifecycle policy.
- **HashiCorp Vault / AWS Secrets Manager / Doppler** — versioned secret storage (the secrets' own backup).
- **Velero** — Kubernetes cluster state + PVC backups.
- **restic / BorgBackup** — file-level deduplicated, encrypted backups for self-hosted.
- **gitleaks / trufflehog** — scan backups for leaked secrets (defense in depth).

## Hard Rules

1. **3-2-1 or nothing.** Three copies of the data, on two different media, with at least one offsite. Anything less is a partial backup, not a backup.
2. **Never store a backup in the same region as the primary.** Cross-region replication is mandatory, not optional — a regional outage must not take out both copies.
3. **Never store secrets in plaintext in any backup.** Database dumps must not contain raw tokens; use vault with versioned storage for secrets, and redact or encrypt columns containing secrets before dumping.
4. **Untested backups do not exist.** A monthly restore drill with a passing smoke test is the only acceptable proof. A backup that has never been restored is a hypothesis, not a backup.
5. **Never disable KMS keys while backups encrypted with them still exist.** Key deletion is irreversible and silently bricks every backup that used it.
6. **Always snapshot before a destructive migration.** `DROP TABLE`, `ALTER TABLE ... TYPE`, and shard splits get a fresh backup taken in the 30 minutes before the change runs, verified by checksum.
7. **Backups are immutable.** Once written, no process — including root — may overwrite or delete a backup before its retention window expires. Use object-lock (S3 Object Lock, GCS Bucket Lock) to enforce this.
