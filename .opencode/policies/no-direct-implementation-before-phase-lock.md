# Policy: No Direct Implementation Before Phase Lock

> **File:** `policies/no-direct-implementation-before-phase-lock.md`
> **Status:** Active
> **Enforced by:** Spec-guardian agent, architect agent

---

## Purpose

Prevent implementation from starting before the phase is locked and approved.

## Rules

1. **Phase gate must pass.** No implementation starts for a phase until the previous phase gate passes.
2. **Specs must be locked.** No implementation starts for a feature until its spec is locked.
3. **Scope must be defined.** No implementation starts without a defined scope.

## Enforcement

- Spec-guardian flags implementation without locked phase.
- Architect blocks phase transition without gate review.
- CI can check phase gate status before allowing implementation PRs.

## Violations

| Violation | Action |
|-----------|--------|
| Implementation before phase lock | Revert, require gate review |
| Implementation before spec lock | Revert, require spec review |
| Implementation outside phase scope | Revert, require scope approval |

## Reference

- `PHASE_GATES.md`
- `AI_OPERATING_RULES.md` (Rules 2, 3, 4)
- `EXECUTION_ENGINE.md`
