# Skill: Spec Sync

> **Category:** Core
> **File:** `skills/core/spec-sync.md`
> **Status:** Active

---

## Purpose

Keep specifications synchronized with implementation, docs, and project state throughout the spec lifecycle.

## Activation Conditions

- Spec is created or updated.
- Implementation PR is opened.
- Code is merged.
- Spec status changes.
- Docs-sync agent detects spec impact.

## Expected Inputs

- `specs/<NNN>-<name>/spec.md` — Feature specification.
- `specs/<NNN>-<name>/tasks.md` — Implementation tasks.
- `specs/<NNN>-<name>/review.md` — Review notes.
- `docs/31_SPEC_KIT_WORKFLOW.md` — Spec Kit workflow definition.
- Implementation code changes.
- Review findings.

## Workflow Integration

This skill operates throughout the spec lifecycle:

```
Spec Draft → Spec Sync (track status) → Implementation → Spec Sync (track progress) → Merge → Spec Sync (update status)
```

## Outputs

- Updated spec status.
- Spec-to-implementation alignment report.
- Spec lifecycle status tracking.
- Flag if spec and implementation diverge.

## Escalation Behavior

| Condition                       | Action                |
| ------------------------------- | --------------------- |
| Spec and implementation diverge | Flag to spec-guardian |
| Spec is stale (no activity)     | Flag to human         |
| Spec references outdated docs   | Flag to docs-sync     |
| Spec status is unclear          | Flag to spec-guardian |

## Review Requirements

- Spec sync findings should be reviewed by spec-guardian.
- Divergence findings should be reviewed by human.
