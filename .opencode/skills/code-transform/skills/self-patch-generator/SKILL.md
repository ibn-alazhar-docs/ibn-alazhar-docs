---
name: self-patch-generator
description: "Generates patches to the skill's own heuristics, thresholds, and rules based on lessons routed from meta-learning. Every patch is versioned, reversible, tested against past cases before applying, and logged with rationale. Never patches without a test case — an untested patch is a regression waiting to happen."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: meta
---

# Self-Patch Generator

> Phase 14 sub-skill. Mutates the skill's own behavior in response to friction. The most dangerous meta sub-skill — a bad patch can regress every future project. Hence the iron grip: tested, reversible, versioned, logged.

## When to Use

| Phase | Trigger | Why |
|-------|---------|-----|
| Phase 14 — SELF-UPGRADE | `meta-learning` routed a `weak_heuristic` lesson to `queue.self-patch-generator.jsonl` | A rule gave the wrong answer; refine it |
| Phase 14 — SELF-UPGRADE | `meta-auditor` flagged a systemic friction pattern (reverts > 3 on same area) | Heuristic missed the pattern |
| Phase 14 — SELF-UPGRADE | User intervention recorded in `audit-trail.jsonl` | A rule should have caught it before the human had to |
| Manual trigger | User explicitly asks "fix the rule that flagged X" | Direct patch request |

**Do NOT use this sub-skill for:** adding new capabilities (use `sub-skill-generator`), updating knowledge entries (use `knowledge-base`), or rewriting specs (use `spec-sync`). This sub-skill only *refines existing rules*.

## What It Does

1. Pops a work item from `queue.self-patch-generator.jsonl`.
2. Reads the referenced lesson candidate (from `meta-learning`) and the original friction evidence (from `audit-trail.jsonl`).
3. Drafts one or more candidate patches (see Patch Types below).
4. For each candidate, runs a **regression test** against the last 20 projects' audit-trail entries — the patch must not change outcomes on cases where the old rule was correct.
5. Picks the highest-scoring patch (maximizes fix on the friction case, minimizes regression on past cases).
6. Applies the patch: writes the new rule, marks the old rule `superseded` (not deleted), bumps the policy version, logs to `policy-evolution`'s changelog.
7. Marks the patch `experimental` for the next 3 projects — if any of them shows friction attributable to this patch, auto-revert.

## Patch Types

| Type | Description | Example |
|------|-------------|---------|
| Threshold adjustment | Change a numeric threshold | "Long-method threshold for test files: 30 → 40 lines" |
| New rule | Add a conditional rule that didn't exist | "Before suggesting Extract Class, check if the class has >50% test coverage — if not, require test additions in same patch" |
| Heuristic refinement | Add a condition to an existing heuristic | "H1 Long Method: add exception for test setup methods (annotated `@pytest.fixture` or `@Test setUp`)" |
| Removal (deprecation) | A rule is no longer relevant | "Deprecate the 'no-arrow-functions-in-class' rule — modern JS supports class fields" |
| Weight tuning | Adjust scoring weights | "Risk matrix: increase 'blast radius' weight from 0.3 to 0.4 for prod-critical files" |

## Integration Contract

```
INPUT:
  - lesson_id: string (from meta-learning queue)
  - friction_evidence: audit-trail entries (auto-pulled)
  - dry_run: bool (default true — must explicitly set false to apply)

OUTPUT (dry_run=true):
  {
    "patch_candidates": [
      {
        "type": "threshold_adjustment",
        "target_rule": "H1_long_method",
        "old_value": 30,
        "new_value": 40,
        "rationale": "Test setup methods are legitimately long; flagging them causes noise.",
        "regression_test": {"cases_run": 20, "regressions": 0, "improvements": 3}
      },
      ...
    ],
    "recommended": 0
  }

OUTPUT (dry_run=false):
  {
    "applied": true,
    "patch_id": "patch-2024-11-22-001",
    "policy_version": "1.4.7",
    "supersedes": "policy-1.4.6/rule-H1",
    "experimental_until": "2024-12-15",   // 3 projects or 30 days, whichever first
    "rollback_cmd": "python3 scripts/policy.py revert --patch-id patch-2024-11-22-001"
  }
```

## Regression Testing

Before a patch is applied, it's tested against the last 20 projects' audit-trail entries. For each historical case:

1. Re-run the relevant rule (e.g. H1 Long Method) with the **old** threshold → record outcome.
2. Re-run with the **new** threshold → record outcome.
3. Compare: did the new threshold *fix* the friction case (good), *break* a case that was previously correct (regression), or *not affect* it (neutral)?

Scoring:
- +1 per friction case fixed
- −3 per regression (regressions are 3× more costly than fixes are beneficial)
- 0 per neutral case

Patch is only eligible to apply if score > 0. If multiple candidates, pick the highest.

## CLI

```bash
# Dry-run: see candidate patches for the next lesson in queue
python3 scripts/self_patch.py next --dry-run

# Apply the recommended patch (after reviewing dry-run output)
python3 scripts/self_patch.py apply --patch-id patch-2024-11-22-001

# Rollback if experimental patch causes friction
python3 scripts/self_patch.py revert --patch-id patch-2024-11-22-001

# List all patches applied in last 30 days
python3 scripts/self_patch.py list --since 30d
```

## Decision Tree (autonomous)

```
Q: Is there a work item in queue.self-patch-generator.jsonl?
  YES → pop the highest-priority one
  NO  → emit "no patches pending" and exit

Q: Can the friction be fixed by an existing sub-skill (not a rule change)?
  YES → re-route to that sub-skill, do NOT patch
  NO  → continue

Q: Is the friction a one-off or recurring (frequency ≥ 2)?
  ONE-OFF → defer patch (one-offs aren't worth the regression risk)
  RECURRING → continue

Q: Can you draft at least one candidate patch with a regression test?
  YES → run regression test
  NO  → escalate to sub-skill-generator (the rule isn't wrong, it's missing)

Q: Does the best candidate have score > 0?
  YES → mark `recommended`, write to dry-run output for review
  NO  → log "no clean patch found" and re-route the lesson to knowledge-base as a known-limitation

Q: Did the user (or orchestrator) approve apply?
  YES → apply, mark experimental, schedule 3-project observation
  NO  → leave in dry-run state
```

## Experimental Period

Every applied patch is marked `experimental` for either 3 projects or 30 days, whichever comes first. During this period:

- `meta-auditor` checks whether the friction pattern reoccurs (patch didn't help) OR a new friction pattern emerges (patch caused regression).
- If reoccurs → patch is insufficient; `meta-learning` queues a refinement.
- If new friction → patch is reverted automatically; the lesson is re-queued with a "previous patch failed" note.
- If neither → after the observation period, the patch is promoted to `stable` and the old rule is fully archived.

## Self-Improvement Hook

Every applied patch appends to `policy-evolution`'s changelog:

```json
{
  "patch_id": "patch-2024-11-22-001",
  "ts": "2024-11-22T14:33:00Z",
  "type": "threshold_adjustment",
  "target_rule": "H1_long_method",
  "old_value": 30, "new_value": 40,
  "rationale": "Test setup methods are legitimately long; flagging causes noise.",
  "source_lesson": "lesson-2024-11-22-auth-reverts",
  "regression_score": 5,
  "experimental_until": "2024-12-15",
  "status": "experimental"
}
```

`meta-auditor` reads this in the next 3 projects to decide whether to promote or revert.

## Failure Modes & Recovery

| Symptom | Cause | Recovery |
|---------|-------|----------|
| Regression test can't run (missing historical data) | audit-trail.jsonl pruned | Skip patch, log "insufficient test data", escalate to human review |
| Patch fixes the friction case but breaks 2 others | Over-fitted patch | Reject, re-route lesson as "needs redesign" |
| Experimental patch caused friction in project N | Bad patch | Auto-revert, restore old rule, re-queue lesson with "patch attempt N failed because Y" |
| Two patches target the same rule | Concurrency | Serialize by patch_id timestamp; second patch re-tests against first's outcome |

## Tools

- **policy-evolution** (sibling) — actually writes the patched rule to the policy file
- **audit-trail.jsonl** — historical cases for regression testing
- **meta-learning** — source of patch work items
- **No direct edits to source code** — only to policy/rule files

## Permissions

- Filesystem: read `queue.self-patch-generator.jsonl`, `audit-trail.jsonl`; write `policy.json` patches, `policy-evolution` changelog
- Network: none
- Processes: none

## Hard Rules

1. **Never patch without a test case.** Every patch must be validated against ≥20 historical cases — no exceptions, even for "obvious" fixes.
2. **Never apply an irreversible patch.** Every patch has a `revert` command recorded; if revert fails in testing, the patch is rejected.
3. **Always version.** Every patch bumps the policy version; old versions are archived, never overwritten.
4. **Always log the rationale and source lesson.** A patch without a `source_lesson` reference is rejected — patches don't appear from nowhere.
5. **Always mark `experimental` first.** No patch goes straight to `stable`; 3 projects or 30 days of clean observation is mandatory.
6. **Always auto-revert on regression.** If `meta-auditor` attributes friction to an experimental patch, revert immediately — do not "wait and see."
7. **Never patch a one-off.** If the friction has only happened once, it's not worth the regression risk; defer until it recurs.
