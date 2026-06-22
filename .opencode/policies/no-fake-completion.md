# Policy: No Fake Completion

> **File:** `policies/no-fake-completion.md`
> **Status:** Active
> **Enforced by:** All agents, human review

---

## Purpose

Ensure all status claims are verified and accurate.

## Rules

1. **No unverified completion.** Never claim a feature is complete without verification.
2. **No unverified test passes.** Never claim tests pass without running them.
3. **No unverified review.** Never claim a review was performed without evidence.
4. **No unverified CI.** Never claim CI passes without checking.
5. **No exaggerated status.** Report actual progress, not aspirational progress.

## Enforcement

- All agents verify before claiming.
- Human review validates status claims.
- CI provides objective verification.
- Session records log actual work done.

## Violations

| Violation                       | Action                                 |
| ------------------------------- | -------------------------------------- |
| Claiming unverified completion  | Flag, require verification             |
| Claiming unverified test passes | Run tests, correct status              |
| Claiming unverified review      | Perform review, correct status         |
| Exaggerated status              | Correct status, note in session record |

## Reference

- `RUNTIME_MANIFESTO.md` (Principle 5)
- `SESSION_RULES.md`
- `AI_OPERATING_RULES.md`
