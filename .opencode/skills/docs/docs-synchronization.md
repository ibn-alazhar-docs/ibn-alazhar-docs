# Skill: Docs Synchronization

> **Category:** Docs
> **File:** `skills/docs/docs-synchronization.md`
> **Status:** Active

---

## Purpose

Detect when code changes impact documentation and ensure docs are updated accordingly.

## Activation Conditions

- Code is merged.
- PR is opened with code changes.
- Docs-sync agent is activated.
- Doc inconsistency is suspected.
- Project state changes.

## Expected Inputs

- Code changes (diff).
- `docs/` — All documentation.
- `memory/` — Project memory.
- `docs/15_DOCUMENTATION_PLAN.md` — Documentation plan.
- Doc impact detection table (from `AGENT_RULES.md`).

## Workflow Integration

This skill operates after code changes:

```
Code Change → Docs Sync Detection → Impact Assessment → Doc Update → Verification
```

## Outputs

- Doc impact report.
- List of docs that need updating.
- Updated doc files (when authorized).
- Updated memory files.
- Cross-reference validation report.

## Escalation Behavior

| Condition | Action |
|-----------|--------|
| Doc impact is unclear | Flag to human |
| Doc update requires technical knowledge | Escalate to architect |
| Multiple docs conflict | Flag to human + architect |
| Memory is stale | Update memory, flag for review |

## Review Requirements

- Doc updates should be reviewed by docs-sync agent.
- Technical doc updates should be reviewed by relevant technical agent.
- Memory updates should be verified against project state.
