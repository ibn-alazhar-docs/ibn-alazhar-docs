---
name: policy-evolution
description: "Manages the skill's own policies (heuristics, thresholds, rules). Append-only with sunset: policies are versioned, never deleted (archived instead), and old policies get sunset dates. Applies patches from self-patch-generator, prunes policies not referenced in 90 days, resolves conflicts by newest-active-wins."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: spec-kit
---

# Policy Evolution

> Phase 14 sub-skill. The skill's constitution manager. Owns the rulebook that the rest of the skill follows. Without it, patches from `self-patch-generator` would overwrite each other and old rules would silently linger. With it, every rule has a version, a rationale, a sunset date, and a clear successor chain.

## When to Use

| Phase | Trigger | Why |
|-------|---------|-----|
| Phase 14 — SELF-UPGRADE | `self-patch-generator` produced an approved patch | Apply the patch to the policy file |
| Phase 14 — SELF-UPGRADE | `meta-learning` routed a lesson requiring a new rule | Draft and add the rule |
| Phase 14 — SELF-UPGRADE (monthly) | Prune sweep: policies not referenced in 90 days → sunset candidates | Keep the rulebook lean |
| Phase 13 — META-AUDIT | `meta-auditor` needs to know which policy version was active during a project | Look up policy version by timestamp |
| Manual trigger | User asks "what rules are active?" or "when did rule X change?" | Diagnostic |

**Do NOT use this sub-skill for:** writing new sub-skills (use `sub-skill-generator`), capturing domain knowledge (use `knowledge-base`), or one-off decisions (use `audit-trail`). This sub-skill manages *persistent rules* that govern the skill's behavior.

## What It Does

1. Maintains `policy.json` — the active rulebook (one entry per rule, with version).
2. Maintains `policy-archive/` — every prior version of every rule, never deleted.
3. Applies patches from `self-patch-generator`: creates a new version of the rule, marks the old version `superseded`, sets sunset date.
4. Resolves conflicts: if two rules apply to the same situation, the newest active version wins; older versions are flagged as conflict-resolved.
5. Runs monthly prune sweep: rules not referenced in `audit-trail.jsonl` for 90 days → marked `sunset_candidate`; after 30 more days with no reference → `sunset` (archived but still queryable).
6. Provides a query interface: "what rules were active on date X?" (time-travel query for post-mortems).

## Policy Schema

```json
{
  "id": "rule-H1-long-method",
  "version": "1.4.7",
  "rule": "Flag any method > 30 lines as H1 Long Method, EXCEPT test setup methods (annotated @pytest.fixture or @Test setUp), which use threshold 40.",
  "rationale": "Test setup methods are legitimately long; flagging them causes noise. Threshold raised from 30 to 40 for test setups in v1.4.7 based on lesson-2024-11-22-auth-reverts.",
  "category": "smell-detection",
  "created": "2024-01-15",
  "supersedes": "rule-H1-long-method@1.4.6",
  "superseded_by": null,
  "sunset_date": null,
  "status": "active",
  "source_lesson": "lesson-2024-11-22-auth-reverts",
  "source_patch": "patch-2024-11-22-001",
  "references": ["audit-trail:2024-11-22T14:33:00Z", "audit-trail:2024-12-01T09:15:00Z"]
}
```

## Lifecycle

```
draft → active → superseded → archived
                ↘ sunset → archived
```

| State | Meaning |
|-------|---------|
| `draft` | Proposed but not yet active (e.g. experimental patch pending validation) |
| `active` | Currently enforced by the skill |
| `superseded` | Replaced by a newer version; no longer enforced but kept for audit |
| `sunset` | Marked for archival due to no references in 90+30 days; not enforced |
| `archived` | Moved to `policy-archive/`; queryable but not enforced; never deleted |

**Never deleted.** A policy may move from `active` to `superseded` to `archived`, but the record is always retained. This is the audit trail for the skill's own behavior.

## Integration Contract

```
INPUT (apply patch):
  - patch_id: string (from self-patch-generator)
  - target_rule_id: string (e.g. "rule-H1-long-method")
  - new_rule_text: string
  - rationale: string
  - source_lesson: string
  - experimental: bool (default true)

OUTPUT (apply patch):
  {
    "applied": true,
    "old_version": "1.4.6",
    "new_version": "1.4.7",
    "old_status": "superseded",
    "new_status": "active" (or "draft" if experimental),
    "sunset_date_for_old": "2025-02-22"  // 90 days from supersede
  }

INPUT (query):
  - rule_id: optional string
  - status: optional enum (active | superseded | sunset | archived | all)
  - active_as_of: optional date (time-travel query)
  - category: optional string

OUTPUT (query):
  {
    "rules": [ ... ],  // matching rules
    "count": 3
  }
```

## CLI

```bash
# Apply a patch (called by self-patch-generator after approval)
python3 scripts/policy_evolution.py apply \
  --patch-id patch-2024-11-22-001 \
  --target-rule rule-H1-long-method \
  --new-rule "Flag methods > 30 lines as H1, EXCEPT test setups (> 40)." \
  --rationale "Test setups are legitimately long." \
  --source-lesson lesson-2024-11-22-auth-reverts

# List all active rules
python3 scripts/policy_evolution.py list --status active

# Time-travel query: what rules were active on date X?
python3 scripts/policy_evolution.py list --active-as-of 2024-06-15

# Show the full history of a rule
python3 scripts/policy_evolution.py history --rule-id rule-H1-long-method

# Run monthly prune sweep
python3 scripts/policy_evolution.py prune --dry-run
python3 scripts/policy_evolution.py prune --apply

# Promote an experimental rule to stable (after 3 clean projects)
python3 scripts/policy_evolution.py promote --rule-id rule-H1-long-method

# Rollback a patch (revert to previous version)
python3 scripts/policy_evolution.py rollback --patch-id patch-2024-11-22-001
```

## Conflict Resolution

When two active rules apply to the same situation:

1. **Newest active version wins.** If rule A v1.4.7 and rule A v1.4.6 are both somehow active (shouldn't happen, but defensive), v1.4.7 wins.
2. **More specific rule wins.** If rule A says "flag methods > 30 lines" and rule B says "for test files, flag methods > 40 lines", rule B wins for test files, rule A wins elsewhere.
3. **Explicit override.** A rule can declare `overrides: [rule-X, rule-Y]` to explicitly take precedence.
4. **Unresolved conflicts** → surface to user; do not silently pick.

## Prune Sweep (Monthly)

```
For each rule in policy.json:
  Q: Was this rule referenced in audit-trail.jsonl in the last 90 days?
    YES → leave active
    NO  → mark `sunset_candidate`, set `sunset_proposed_date` = today + 30 days

For each rule marked `sunset_candidate`:
  Q: Has the 30-day window elapsed with no new references?
    YES → mark `sunset`, move to `policy-archive/`, remove from active policy.json
    NO  → leave as `sunset_candidate` (will be checked next month)

Rules in `sunset` state are still queryable but not enforced.
Rules can be `revived` from `sunset` if a new reference appears (within 1 year).
```

Prune sweep is always dry-run first; the user (or orchestrator) reviews `sunset_candidates.json` and approves before `--apply`.

## Decision Tree (autonomous)

```
Q: Is there a patch to apply?
  YES → continue
  NO  → check for prune sweep (monthly)

Q: Does the target rule exist?
  YES → create new version, supersede old
  NO  → create new rule (v1.0.0)

Q: Is the patch experimental?
  YES → mark new version `draft`, keep old as `active` until promoted
  NO  → mark new version `active`, old becomes `superseded`

Q: Should the old version be sunset immediately?
  NO (default) → old version stays `superseded` but queryable; sunset after 90 days no references
  YES (explicit) → old version goes straight to `sunset`

Q: Did the patch cause a conflict with another active rule?
  YES → resolve per Conflict Resolution; if unresolved, halt and surface
  NO  → done
```

## Self-Improvement Hook

Every policy change appends to `audit-trail.jsonl`:

```json
{"ts": "...", "phase": "14", "action": "policy-apply", "patch_id": "patch-2024-11-22-001", "rule_id": "rule-H1-long-method", "old_version": "1.4.6", "new_version": "1.4.7", "experimental": true}
```

Every prune sweep appends:

```json
{"ts": "...", "phase": "14", "action": "policy-prune", "candidates": 3, "archived": 2, "revived": 0}
```

`meta-auditor` checks:
- Are experimental rules being promoted within 3 projects? (If not, the rule isn't being exercised — may be wrong)
- Are rules being frequently rolled back? (If yes, self-patch-generator is producing bad patches)
- Are prune sweeps actually running monthly? (If not, the rulebook is growing unbounded)

## Failure Modes & Recovery

| Symptom | Cause | Recovery |
|---------|-------|----------|
| Two active versions of the same rule | Apply race condition | Force-resolve: newest wins, older → `superseded` immediately |
| Rule referenced in audit-trail but marked `sunset` | Prune sweep was too aggressive | Revive the rule from `sunset` to `active` |
| Patch references a rule that doesn't exist | Stale patch | Halt; ask self-patch-generator to revalidate |
| Rollback fails (old version archived) | Old version was already archived | Restore from `policy-archive/` to `superseded` state, then `active` |
| Rulebook grows unbounded | Prune sweep not running | Force-run prune; surface sunset candidates |

## Tools

- **policy.json** — active rulebook (single file, versioned in git)
- **policy-archive/** — historical rules (one file per archived rule, named `<rule-id>@<version>.json`)
- **audit-trail.jsonl** — reference tracking for prune sweep
- **self-patch-generator** (upstream) — source of patches
- **git** — policy.json is committed like code; every change is a commit

## Permissions

- Filesystem: read/write `policy.json`, `policy-archive/`; read `audit-trail.jsonl`; append to `audit-trail.jsonl`
- Network: none
- Processes: spawn `git` for commits

## Hard Rules

1. **Never delete a policy.** Archive instead — `active → superseded → archived` is the only path; deletion is forbidden.
2. **Always version.** Every change creates a new version (semver: major for breaking, minor for additive, patch for refinement); old versions are kept.
3. **Always cite rationale.** Every rule has a `rationale` field; rules without rationale are rejected at apply time.
4. **Always set a sunset date.** When a rule is superseded, its `sunset_date` is set (90 days default); after sunset, it's archived but still queryable.
5. **Never silently pick a winner in a conflict.** Conflict resolution follows explicit rules (newest / most specific / explicit override); unresolved conflicts surface to the user.
6. **Always run prune sweep monthly.** The rulebook grows unbounded without pruning; monthly sweep is mandatory.
7. **Always dry-run prune first.** Sunset candidates are surfaced for review; never auto-archive without approval.
8. **Always log policy changes to audit-trail.** Every apply, rollback, prune, revive is an audit event; without it, `meta-auditor` can't reconstruct what rules were active when.
9. **Never promote an experimental rule without 3 clean projects.** Experimental → active requires evidence of safe operation; do not shortcut.
