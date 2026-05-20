# Skill: Consistency Audit

> **Category:** Review
> **File:** `skills/review/consistency-audit.md`
> **Status:** Active

---

## Purpose

Audit consistency across docs, specs, code, and memory to detect drift and conflicts.

## Activation Conditions

- PR is opened.
- Phase gate review is triggered.
- Consistency is questioned.
- Docs-sync agent detects potential conflict.
- Periodic audit is scheduled.

## Expected Inputs

- `docs/` — All documentation.
- `specs/` — All specifications.
- Code in repository.
- `memory/` — Project memory.
- `docs/ADR/` — Architecture decision records.

## Workflow Integration

This skill runs during review cycles:

```
PR Opened → Consistency Audit → Findings → Resolution → Review Complete
```

## Outputs

- Consistency audit report.
- List of inconsistencies found.
- Severity rating per inconsistency.
- Remediation recommendations.

## Escalation Behavior

| Condition | Action |
|-----------|--------|
| Critical inconsistency (code vs spec) | Flag to spec-guardian + human |
| Doc conflict between files | Flag to docs-sync + architect |
| Memory inconsistent with state | Flag to docs-sync |
| ADR conflicts with implementation | Flag to architect |

## Review Requirements

- Audit findings should be reviewed by relevant agents.
- Critical inconsistencies must be resolved before merge.
- Audit report should be stored in `reviews/`.
