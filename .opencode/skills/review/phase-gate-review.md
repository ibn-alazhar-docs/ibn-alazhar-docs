# Skill: Phase Gate Review

> **Category:** Review
> **File:** `skills/review/phase-gate-review.md`
> **Status:** Active

---

## Purpose

Execute phase gate reviews to verify phase completeness and authorize phase transition.

## Activation Conditions

- Phase deliverables are claimed complete.
- Phase gate review is requested.
- Human requests phase transition.

## Expected Inputs

- `PHASE_GATES.md` — Phase gate criteria.
- `templates/phase-gate-template.md` — Gate review template.
- Phase deliverables (code, docs, tests).
- CI results.
- Review findings from all agents.
- `memory/project/current-status.md` — Current project status.

## Workflow Integration

This skill gates phase transitions:

```
Phase Deliveries → Phase Gate Review → Pass/Fail → Phase Transition or Remediation
```

## Outputs

- Phase gate decision (Pass/Fail/Conditional).
- Gate review report.
- List of blocking issues (if any).
- Conditional requirements (if any).

## Escalation Behavior

| Condition              | Action                              |
| ---------------------- | ----------------------------------- |
| Blocking issue found   | Fail gate, create remediation tasks |
| Deliverable incomplete | Fail gate, flag missing deliverable |
| CI failing             | Fail gate, fix CI first             |
| Conditional pass       | Document conditions, set deadline   |

## Review Requirements

- Gate review should be led by architect agent.
- All agent reviews should be complete before gate review.
- Gate decision should be recorded in `docs/19_DECISION_LOG.md`.
