---
name: audit-trail
description: "Permanent, append-only record of every autonomous decision, action, file change, and test result. JSONL format, rotated monthly, archived to S3. Queried for compliance ('why did we choose X?') and debugging ('when did this break?'). Never deleted, never rewritten — the skill's immutable memory."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: meta
---

# Audit Trail

> The skill's immutable ledger. Every phase, every decision, every action — recorded with timestamp, rationale, and alternatives considered. Without it, "why did the skill do X?" is unanswerable and compliance audits fail. With it, every autonomous decision is traceable to evidence.

## When to Use

| Phase                       | Trigger                                        | Why                                       |
| --------------------------- | ---------------------------------------------- | ----------------------------------------- |
| Every phase, every decision | Always                                         | This is a background service, always on   |
| Phase 7 — VERIFY            | User asks "why did you choose X over Y?"       | Query audit trail for the decision record |
| Phase 13 — META-AUDIT       | `meta-auditor` reads entries to score friction | Source of truth for what happened         |
| Compliance audit            | External auditor needs to verify decisions     | Export filtered audit trail               |
| Post-incident review        | Production issue, need to trace what changed   | Query by file/path/date                   |

**Do NOT use this sub-skill for:** ephemeral state (use PROGRESS.md), lesson classification (use `meta-learning`), or knowledge persistence (use `knowledge-base`). This sub-skill is purely the _what happened and why_ record.

## What It Does

1. Provides an append-only JSONL writer that every other sub-skill calls when making a decision or taking an action.
2. Provides a query interface: filter by timestamp range, phase, decision type, files affected, project_id.
3. Rotates the active log monthly (`audit-trail-YYYY-MM.jsonl`), keeping the current month in `audit-trail.jsonl`.
4. Archives rotated logs to S3 (or local archive dir if S3 not configured) with a 7-year retention default.
5. Enforces immutability: no entry can be modified or deleted; corrections are appended as new entries referencing the original.
6. Provides a "decision replay" feature: given a timestamp, return the full sequence of decisions that led to the state at that time.

## Audit Entry Schema

```json
{
  "ts": "2024-11-22T14:33:00.123Z", // ISO 8601, UTC, millisecond precision
  "project_id": "proj-2024-11-payments",
  "phase": "6", // 1-15
  "subskill": "auth-setup", // which sub-skill made the decision
  "decision": "chose JWT over session cookies for auth",
  "rationale": "stateless, scales better, matches API-first architecture",
  "alternatives_considered": [
    {
      "option": "session cookies + Redis store",
      "rejected_reason": "adds Redis dependency, stateful"
    },
    {
      "option": "OAuth2 + Passport",
      "rejected_reason": "overkill for this scope, no third-party auth needed"
    }
  ],
  "files_affected": ["src/auth/jwt.ts", "src/auth/middleware.ts"],
  "tests_run": [{ "name": "auth.test.ts", "passed": true }],
  "outcome": "success", // success | failure | partial | pending
  "reverses_entry": null, // ID of a prior entry this corrects (if applicable)
  "metadata": {
    // optional, free-form per sub-skill
    "library_version": "jsonwebtoken@9.0.0"
  }
}
```

Every entry has a unique ID (auto-generated as `<ts>-<uuid8>`).

## Integration Contract

```
INPUT (write):
  - entry: object matching schema above (minus ts and id, which are auto-generated)

OUTPUT (write):
  {
    "id": "2024-11-22T14:33:00.123Z-a1b2c3d4",
    "ts": "2024-11-22T14:33:00.123Z",
    "written": true
  }

INPUT (query):
  - project_id: optional string
  - phase: optional int (1-15)
  - subskill: optional string
  - ts_from: optional ISO timestamp
  - ts_to: optional ISO timestamp
  - files_affected: optional string (substring match)
  - decision_contains: optional string (full-text search)
  - limit: int (default 100, max 1000)

OUTPUT (query):
  {
    "entries": [ ... ],   // matching entries, newest first by default
    "count": 42,
    "truncated": false
  }
```

## CLI

```bash
# Write an entry (called by other sub-skills, not usually by humans)
python3 scripts/audit_trail.py write \
  --project-id proj-2024-11-payments \
  --phase 6 \
  --subskill auth-setup \
  --decision "chose JWT over session cookies" \
  --rationale "stateless, scales better" \
  --files-affected src/auth/jwt.ts,src/auth/middleware.ts

# Query: why did we choose X?
python3 scripts/audit_trail.py query \
  --project-id proj-2024-11-payments \
  --decision-contains "JWT"

# Query: what happened in phase 6 of this project?
python3 scripts/audit_trail.py query \
  --project-id proj-2024-11-payments \
  --phase 6 \
  --limit 500

# Replay decisions for a file (post-incident review)
python3 scripts/audit_trail.py replay \
  --files-affected src/auth/jwt.ts \
  --ts-from 2024-11-01

# Export for compliance audit
python3 scripts/audit_trail.py export \
  --project-id proj-2024-11-payments \
  --format pdf \
  --out audit-export.pdf

# Monthly rotation (cron job)
python3 scripts/audit_trail.py rotate
```

## Decision Replay

Given a file or topic, the replay feature returns the full sequence of decisions that affected it, in chronological order. This is critical for post-incident reviews:

```
$ python3 scripts/audit_trail.py replay --files-affected src/auth/jwt.ts

2024-11-15 09:12  [Phase 1] project_analyzer: identified auth as critical path
2024-11-15 10:45  [Phase 1] spec-generator: SP-7 defined (JWT auth with refresh tokens)
2024-11-18 14:20  [Phase 5] risk-manager: assessed SP-7 as risk=12 (medium), fallback branch created
2024-11-19 09:00  [Phase 6] auth-setup: chose JWT, implemented in src/auth/jwt.ts
2024-11-19 09:30  [Phase 6] auth-setup: tests run, all passed
2024-11-19 11:00  [Phase 6] spec-sync: SP-7 marked implemented
2024-11-20 16:00  [Phase 7] verification-gate: SP-7 verified, AC all met
2024-11-22 14:33  [Phase 13] meta-auditor: SP-7 scored efficiency=4, no friction
```

## Rotation & Archival

- **Active log:** `audit-trail.jsonl` (current month)
- **Monthly rotation:** on the 1st of each month, rename to `audit-trail-YYYY-MM.jsonl` and start fresh
- **Archival:** rotated logs are uploaded to S3 (or local `audit-archive/` if S3 not configured) with 7-year retention
- **Local cleanup:** rotated logs are deleted from local disk 30 days after successful S3 upload
- **Integrity:** each rotated log gets a SHA-256 hash; the hash is stored in `audit-archive/index.json` for tamper detection

If S3 upload fails, the rotated log stays local and the rotation is retried hourly until success.

## Immutability Enforcement

- The writer opens the file in append-only mode (`O_APPEND`); existing content cannot be overwritten.
- Filesystem permissions: `audit-trail.jsonl` is `0640` (readable by owner and group, not world).
- A background job computes SHA-256 of the file hourly and compares to the previous hash; any mismatch triggers an alert (tamper detection).
- Corrections to prior entries are made by appending a new entry with `reverses_entry: <original_id>` — the original is never modified.

## Query Patterns

| Question                         | Query                                |
| -------------------------------- | ------------------------------------ |
| Why did we choose X?             | `decision_contains: X`               |
| What changed in this file?       | `files_affected: path/to/file`       |
| What happened in phase N?        | `phase: N`                           |
| What did sub-skill X do?         | `subskill: X`                        |
| What happened on this date?      | `ts_from`, `ts_to`                   |
| Show me the full project history | `project_id: <id>`, no other filters |

## Self-Improvement Hook

`meta-auditor` queries the audit trail in Phase 13 to:

- Count decisions per phase (low count = phase was rushed or skipped)
- Count `outcome: failure` entries (high count = lots of friction)
- Find decisions where `alternatives_considered` is empty (no alternatives = snap decision, may be a process gap)
- Find long gaps between decisions (dead time = debugging or stuck)

If `meta-auditor` finds decisions without `rationale` or `alternatives_considered`, it emits a lesson candidate for `self-patch-generator` to enforce those fields.

## Failure Modes & Recovery

| Symptom                         | Cause                                 | Recovery                                                                    |
| ------------------------------- | ------------------------------------- | --------------------------------------------------------------------------- |
| Write fails (disk full)         | Local disk exhausted                  | Halt all decisions; cannot proceed without audit trail; surface immediately |
| Rotation failed                 | File in use (rare)                    | Retry in 1 hour; if still failing, force-rotate with explicit lock          |
| S3 upload fails repeatedly      | Credentials / network                 | Keep local; alert; never delete local until S3 confirmed                    |
| Tamper detected (hash mismatch) | File was modified (security incident) | Halt; alert security; do not proceed until investigated                     |
| Query slow (> 5s)               | Log too large, no index               | Build index on `project_id`, `phase`, `ts`; archive old entries             |

## Tools

- **Filesystem** — JSONL files, append-only
- **S3** (optional) — long-term archival
- **SHA-256** — tamper detection
- **SQLite index** (optional) — fast queries on large logs; rebuilt from JSONL

## Permissions

- Filesystem: append-only to `audit-trail*.jsonl`; read-only on archived logs
- Network: outbound HTTPS to S3 (if configured) for archival
- Processes: none (this sub-skill is I/O only)

## Hard Rules

1. **Never delete an entry.** Append-only is the core contract; corrections are new entries with `reverses_entry`, not modifications.
2. **Always log the rationale.** Every decision entry has a `rationale` field — decisions without rationale are rejected at write time.
3. **Always log alternatives considered.** Every decision entry lists the alternatives that were rejected and why — snap decisions without alternatives are flagged.
4. **Always log the outcome.** Decisions are not just "what was decided" but "what happened as a result" — `outcome` is mandatory.
5. **Never modify a rotated log.** Once a log is rotated and archived, it's immutable; tamper detection will catch any modification.
6. **Always timestamp in UTC with millisecond precision.** Local timezones cause confusion across projects and timezones; UTC is universal.
7. **Always include `project_id` and `phase`.** Entries without these are unqueryable and useless for trend analysis.
8. **Never proceed if the audit trail is unavailable.** If the write fails, halt the workflow — decisions without audit records are compliance violations.
