---
name: risk-manager
description: "Assesses risk of planned changes before execution. Scores each change on a 4-axis risk matrix (blast radius, reversibility, test coverage, team familiarity). If total risk exceeds threshold, auto-creates a fallback branch and flags for human sign-off. Never skips risk assessment on production-critical paths."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: meta
---

# Risk Manager

> Phase 5 sub-skill. The skill's safety officer. Before any EXECUTE on a risky change, this sub-skill scores the risk and decides go/no-go. High-risk changes get a fallback branch and a mandatory human sign-off — no autonomous merge without it.

## When to Use

| Phase | Trigger | Why |
|-------|---------|-----|
| Phase 5 — PRIORITIZE | Plan items marked `risky` or touching production-critical paths | Score before sequencing |
| Phase 5 — PRIORITIZE | Plan items involving DB migrations, auth changes, payment flows | High blast radius by definition |
| Phase 6 — EXECUTE (pre) | Before any EXECUTE on a critical-path item | Last-chance go/no-go |
| Phase 11 — ROLLOUT | Before production deployment | Final risk check |
| Manual trigger | User asks "how risky is this change?" | Diagnostic |

**Do NOT use this sub-skill for:** trivial changes (typo fixes, comment updates — risk too low to assess), changes already covered by an experimental sub-skill (those have their own safety gates), or post-hoc risk analysis (use `meta-auditor`).

## What It Does

1. Reads the plan (BLUEPRINT.md) and identifies items tagged `risky` or matching risky patterns (DB migrations, auth changes, payment flows, infra changes, contract changes).
2. For each risky item, scores on 4 axes (1-5 each):
   - **Blast radius**: 1 (single file) → 5 (production-critical, multi-system)
   - **Reversibility**: 1 (easy revert, e.g. code change) → 5 (irreversible, e.g. DB migration that drops data)
   - **Test coverage**: 1 (well-tested, > 80% coverage on affected files) → 5 (no tests)
   - **Familiarity**: 1 (we've done this many times) → 5 (first time, unfamiliar)
3. Computes total risk = sum of 4 axes (4-20).
4. If total > 15: **auto-creates a fallback branch** + flags for human sign-off.
5. If total 10-15: creates a fallback branch, but proceeds autonomously with heightened verification.
6. If total < 10: proceeds normally.
7. Writes `risk-assessment.md` with per-item scores and decisions.

## Risk Matrix

| Axis | 1 (low) | 3 (medium) | 5 (high) |
|------|---------|------------|----------|
| Blast radius | Single file, no external effect | Multiple files, single service | Production-critical, multi-system, customer-facing |
| Reversibility | `git revert` (code only) | Config change + redeploy | DB migration, data loss possible, irreversible |
| Test coverage | > 80% on affected files, integration tests exist | 40-80%, some integration tests | < 40%, no integration tests |
| Familiarity | Done this 10+ times | Done this 2-9 times | First time, or done once with friction |

### Total Risk Scoring

| Total | Action |
|-------|--------|
| 4-9 (low) | Proceed normally |
| 10-15 (medium) | Create fallback branch; proceed with heightened verification (every commit verified, not just every PR) |
| 16-20 (high) | Create fallback branch; **mandatory human sign-off** before EXECUTE; no autonomous merge |

## Integration Contract

```
INPUT:
  - blueprint_path: path to BLUEPRINT.md
  - item_ids: optional list of specific items to assess (default: all risky items)
  - create_fallback_branches: bool (default true)

OUTPUT (files):
  - risk-assessment.md          # per-item scores + decisions
  - fallback-branches.json      # list of created fallback branches

OUTPUT (stdout JSON):
  {
    "items_assessed": 5,
    "high_risk_count": 1,
    "medium_risk_count": 2,
    "low_risk_count": 2,
    "fallback_branches_created": 3,
    "human_signoff_required": ["item-7"],
    "decisions": [
      {
        "item_id": "item-7",
        "title": "Drop deprecated user_settings table",
        "scores": {"blast_radius": 4, "reversibility": 5, "test_coverage": 3, "familiarity": 3},
        "total_risk": 15,
        "action": "fallback_branch + human_signoff",
        "fallback_branch": "fallback/item-7-pre-migration",
        "rollback_cmd": "git checkout fallback/item-7-pre-migration && git reset --hard"
      },
      ...
    ]
  }
```

## Fallback Branch Protocol

For any item with total risk ≥ 10:

1. Create a branch `fallback/<item-id>-pre-<change>` from the current HEAD.
2. Push the branch to remote (so it's recoverable even if local repo is lost).
3. Record the rollback command in `risk-assessment.md` and the audit trail.
4. Tag the commit `pre-<item-id>-<timestamp>` for easy reference.
5. After the risky change is verified, the fallback branch can be deleted (after 30 days, to allow for late-discovered regressions).

For total risk ≥ 16, additionally:
- Flag the item in `audit-trail.jsonl` as `human_signoff_required: true`.
- Halt Phase 6 EXECUTE on this item until a human explicitly approves (via `risk-manager approve --item-id <id>`).
- No autonomous merge — even if all tests pass.

## CLI

```bash
# Assess all risky items in the plan
python3 scripts/risk_manager.py assess \
  --blueprint ./BLUEPRINT.md \
  --create-fallback-branches

# Assess a specific item
python3 scripts/risk_manager.py assess --item-ids item-7

# Human approves a high-risk item (after review)
python3 scripts/risk_manager.py approve --item-id item-7 --reason "Reviewed migration plan with DBA; rollback tested"

# Rollback to fallback branch (if change went wrong)
python3 scripts/risk_manager.py rollback --item-id item-7

# List all current fallback branches
python3 scripts/risk_manager.py list-fallbacks
```

## Decision Tree (autonomous)

```
Q: Is the item tagged risky or matching a risky pattern?
  YES → assess
  NO  → skip (low risk, proceed normally)

Q: What's the blast radius?
  Single file → 1
  Multi-file, single service → 3
  Multi-service or production-critical → 5

Q: Is the change reversible?
  Code only (git revert) → 1
  Config + redeploy → 2
  DB migration (additive) → 3
  DB migration (destructive) → 5
  Auth/contract change → 4

Q: What's the test coverage on affected files?
  > 80% with integration tests → 1
  40-80% with some integration → 3
  < 40% or no integration tests → 5

Q: How familiar is this?
  Done 10+ times → 1
  Done 2-9 times → 3
  First time / done once with friction → 5

Q: Total risk?
  ≤ 9 → proceed normally
  10-15 → create fallback branch, proceed with heightened verification
  ≥ 16 → create fallback branch, halt for human signoff

Q: Is this a production-critical path?
  YES → always assess, even if not tagged risky (rule: never skip on prod-critical)
  NO  → only assess if tagged or pattern-matched
```

## Risky Patterns (auto-detect)

These patterns trigger assessment even without explicit `risky` tag:

| Pattern | Detection | Default risk boost |
|---------|-----------|-------------------|
| DB migration with `DROP TABLE` / `DROP COLUMN` | SQL scan | reversibility=5 |
| Auth flow change (login, session, JWT) | file path match `auth/`, `login/` | blast_radius+=1 |
| Payment flow change | file path match `payment/`, `billing/`, `checkout/` | blast_radius=5 |
| Infra change (Terraform, CloudFormation) | file extension `.tf`, `.yaml` in `infra/` | reversibility+=1 |
| Contract change (API/DB/event) | multi-repo-orchestrator flagged | blast_radius+=1 |
| Production config change | file match `production.yml`, `prod.env` | blast_radius=5 |
| Dependency major version bump | `package.json` / `requirements.txt` diff | familiarity+=1 |
| First-time tech (no knowledge-base entry) | KB lookup returns empty | familiarity=5 |

## Self-Improvement Hook

Every risk assessment appends to `audit-trail.jsonl`:

```json
{"ts": "...", "phase": "5", "action": "risk-assess", "item_id": "item-7", "total_risk": 15, "action_taken": "fallback_branch + human_signoff", "fallback_branch": "fallback/item-7-pre-migration"}
```

`meta-auditor` checks post-project: did any item with total risk ≥ 10 actually cause friction? If yes, the risk matrix is under-scoring → `self-patch-generator` tunes the scoring. If no item with risk ≥ 10 caused friction but several with risk < 10 did, the matrix is under-detecting → tighten the risky patterns list.

## Failure Modes & Recovery

| Symptom | Cause | Recovery |
|---------|-------|----------|
| Risk assessment skipped on a prod-critical item | Pattern not in risky list | Add pattern to risky list (self-patch); retroactively assess |
| Fallback branch creation failed | Git remote unavailable | Halt EXECUTE; do not proceed without fallback for risk ≥ 10 |
| Human signoff never comes | Reviewer unavailable | Halt; surface to user; do not auto-merge under any circumstance |
| Risk matrix under-scoring (hindsight) | Friction on a low-risk item | `meta-auditor` flags → `self-patch-generator` tunes scoring |
| Risk matrix over-scoring (too cautious) | Everything flagged high | Tune thresholds; not every DB migration is risk=5 |

## Tools

- **git** — fallback branches, tags, rollback
- **BLUEPRINT.md** — source of items to assess
- **knowledge-base** — familiarity lookup (has this been done before?)
- **meta-auditor** — feedback loop for scoring accuracy
- **No direct code execution** — only assesses, never executes changes

## Permissions

- Filesystem: read `BLUEPRINT.md`, `knowledge/`; write `risk-assessment.md`, `fallback-branches.json`, append to `audit-trail.jsonl`
- Network: push fallback branches to git remote
- Processes: spawn `git` (branch, tag, push)

## Hard Rules

1. **Always create a fallback branch for irreversible changes.** Risk ≥ 10 with reversibility = 5 → mandatory fallback, no exceptions.
2. **Never skip risk assessment on production-critical paths.** Even if not tagged risky, prod-critical items always get assessed.
3. **Always time-box the assessment.** Assessment should take < 5 min per item; if it's taking longer, the item is too complex to assess quickly → flag as high risk by default.
4. **Never auto-merge items with total risk ≥ 16.** Human sign-off is mandatory; no autonomous merge, even if all tests pass.
5. **Always record the rollback command.** Every fallback branch has a documented rollback command in `risk-assessment.md` and the audit trail.
6. **Always cite the scoring rationale.** Each axis score has a one-line justification ("reversibility=5 because DROP COLUMN loses data") — no scores without rationale.
7. **Always learn from hindsight.** If `meta-auditor` shows the matrix under- or over-scored, `self-patch-generator` tunes it; the matrix is not static.
8. **Never delete a fallback branch within 30 days.** Late-discovered regressions need rollback; keep fallbacks for at least 30 days post-merge.
