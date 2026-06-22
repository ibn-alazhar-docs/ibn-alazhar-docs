# Policy: No Unverified Claims

> **File:** `policies/no-unverified-claims.md`
> **Status:** Active
> **Enforced by:** All agents, human review

---

## Purpose

Ensure all claims about the project's state, capabilities, and progress are verified.

## Rules

1. **No hosting claims.** Do not claim free-forever hosting. The platform is free-first.
2. **No production claims.** Do not claim production readiness until production deployment is complete.
3. **No feature claims.** Do not claim a feature works without verification.
4. **No performance claims.** Do not claim performance metrics without measurement.
5. **No security claims.** Do not claim security without security review.

## Enforcement

- All agents verify claims before reporting.
- Human review validates claims.
- Metrics must be measured, not estimated.
- Security claims require security-reviewer sign-off.

## Violations

| Violation                    | Action                                 |
| ---------------------------- | -------------------------------------- |
| Unverified hosting claim     | Correct claim, note in session record  |
| Unverified production claim  | Correct claim, note in session record  |
| Unverified feature claim     | Verify feature, correct if needed      |
| Unverified performance claim | Measure performance, correct if needed |
| Unverified security claim    | Run security review, correct if needed |

## Reference

- `RUNTIME_MANIFESTO.md` (Principle 5)
- `AI_OPERATING_RULES.md` (Rules 9, 10)
- `docs/30_HOSTING_AND_DEPLOYMENT_OPTIONS.md`
