# Workflow: Phase Gate

> **File:** `workflows/release/phase-gate.md`
> **Purpose:** Define the phase gate workflow from phase completion to transition.

---

## Phase Gate Workflow

```
Phase Complete → Gate Request → Gate Review → Decision → Transition or Remediation
```

## Step 1: Phase Complete

**Trigger:** All phase deliverables are claimed complete.
**Verification:**

- All specs implemented and merged.
- All tests passing.
- CI green on main branch.
- Docs updated.

## Step 2: Gate Request

**Trigger:** Phase team requests gate review.
**Action:**

- Architect agent initiates gate review.
- All agent reviews must be complete.
- Gate review template loaded from `templates/phase-gate-template.md`.

## Step 3: Gate Review

**Led by:** Architect agent.
**Participants:** All relevant agents + human engineer.

### Review Checklist

Per `PHASE_GATES.md` phase-specific criteria:

- [ ] All deliverables verified
- [ ] CI green on main
- [ ] Docs updated
- [ ] Memory updated
- [ ] No blocking issues
- [ ] Human approval recorded

### Agent Inputs

| Agent             | Input                                      |
| ----------------- | ------------------------------------------ |
| spec-guardian     | All specs implemented and compliant        |
| security-reviewer | Security baseline met                      |
| rtl-auditor       | RTL foundation solid (for UI phases)       |
| frontend-polish   | Brand consistency verified (for UI phases) |
| docker-auditor    | Docker stack working                       |
| qa-lead           | Tests adequate and passing                 |
| docs-sync         | Docs current and consistent                |

## Step 4: Decision

### Pass

**Criteria:** All checklist items satisfied.
**Action:**

- Record gate decision in `docs/19_DECISION_LOG.md`.
- Update `runtime/runtime-status.md` to next phase.
- Update `memory/project/current-status.md`.
- Authorize next phase planning.

### Fail

**Criteria:** Blocking issues exist.
**Action:**

- Document blocking issues.
- Create remediation tasks.
- Schedule re-review.
- Do NOT start next phase.

### Conditional

**Criteria:** Non-blocking issues exist.
**Action:**

- Document conditions.
- Set deadline for condition resolution.
- Authorize next phase with conditions.
- Monitor condition resolution.

## Step 5: Transition or Remediation

### Transition (Pass/Conditional)

- Begin next phase planning.
- Create specs for next phase.
- Set up next phase gate criteria.

### Remediation (Fail)

- Address blocking issues.
- Re-run gate review when ready.
- Repeat until gate passes.

---

## Gate Record Format

```markdown
# Phase Gate: Phase N → Phase N+1

- Date: YYYY-MM-DD
- Reviewer: [name/agent]
- Status: PASS | FAIL | CONDITIONAL

## Deliverables Checklist

- [ ] Deliverable 1
- [ ] Deliverable 2
- ...

## Blocking Issues

- None | [list]

## Conditional Requirements

- None | [list with deadline]

## Agent Inputs

- spec-guardian: [input]
- security-reviewer: [input]
- rtl-auditor: [input]
- frontend-polish: [input]
- docker-auditor: [input]
- qa-lead: [input]
- docs-sync: [input]

## Decision

[Pass / Fail / Conditional with conditions]
```

---

## Reference

- `PHASE_GATES.md` — Phase gate criteria.
- `templates/phase-gate-template.md` — Gate review template.
- `docs/19_DECISION_LOG.md` — Decision log.
