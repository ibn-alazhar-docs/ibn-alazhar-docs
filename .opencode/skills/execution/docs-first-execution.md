# Skill: Docs-First Execution

> **Category:** Execution
> **File:** `skills/execution/docs-first-execution.md`
> **Status:** Active

---

## Purpose

Enforce the docs-first principle: specs and documentation must exist and be reviewed before any implementation begins.

## Activation Conditions

- Implementation is requested.
- Feature is being planned.
- Spec is being drafted.
- Phase gate review is triggered.

## Expected Inputs

- Feature request or idea.
- `docs/` — Existing documentation.
- `specs/` — Existing specifications.
- `docs/31_SPEC_KIT_WORKFLOW.md` — Spec Kit workflow.
- `AI_OPERATING_RULES.md` — Operating rules (Rule 1: Read specs before writing code).

## Workflow Integration

This skill gates implementation:

```
Idea → Spec Draft → Spec Review → Docs-First Gate → Implementation Authorized
```

## Outputs

- Spec completeness assessment.
- Docs readiness verification.
- Implementation authorization decision.
- Flag if docs are not ready.

## Escalation Behavior

| Condition | Action |
|-----------|--------|
| No spec exists | Block implementation, create spec first |
| Spec is incomplete | Return for revision |
| Spec not reviewed | Block implementation, request review |
| Docs conflict with spec | Flag to docs-sync + architect |

## Review Requirements

- Docs-first gate should be verified by spec-guardian.
- Implementation should not start without docs-first clearance.
