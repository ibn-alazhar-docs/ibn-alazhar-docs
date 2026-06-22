# Skill: Spec Execution

> **Category:** Execution
> **File:** `skills/execution/spec-execution.md`
> **Status:** Active

---

## Purpose

Guide the implementation of a locked spec through coding, testing, and review to merge.

## Activation Conditions

- Phase gate passes.
- Spec is locked and approved for implementation.
- Implementation task is assigned.

## Expected Inputs

- Locked spec in `specs/<NNN>-<name>/spec.md`.
- `specs/<NNN>-<name>/tasks.md` — Implementation tasks.
- `docs/` — Relevant technical docs.
- `memory/` — Project memory.
- `AI_OPERATING_RULES.md` — Operating rules.

## Workflow Integration

This skill drives implementation:

```
Phase Gate Pass → Spec Locked → Spec Execution → Code Review → Merge
```

## Outputs

- Implementation following spec.
- Test files per test plan.
- Code review readiness.
- Flag if implementation deviates from spec.

## Escalation Behavior

| Condition                               | Action                             |
| --------------------------------------- | ---------------------------------- |
| Spec is ambiguous during implementation | Pause, clarify with architect      |
| Implementation reveals spec flaw        | Flag to spec-guardian, update spec |
| Implementation exceeds phase scope      | Flag to spec-guardian, pause       |
| Technical blocker found                 | Flag to architect                  |

## Review Requirements

- Implementation must be reviewed against spec by spec-guardian.
- Code review must verify spec compliance.
- Tests must verify acceptance criteria.
