# Skill: Security Audit

> **Category:** Review
> **File:** `skills/review/security-audit.md`
> **Status:** Active

---

## Purpose

Audit security compliance for all code changes, ensuring the security baseline is met.

## Activation Conditions

- Code change is implemented.
- Security review is requested.
- Security-reviewer agent is activated.
- Security issue is reported.
- Auth code is modified.

## Expected Inputs

- Code changes (diff).
- `docs/08_SECURITY_PRIVACY.md` — Security and privacy requirements.
- `docs/ADR/ADR-010-security-baseline.md` — Security baseline ADR.
- `docs/06_API_SPEC.md` — API specification.
- Auth middleware and routes.
- File upload handling code.
- Environment variable usage.

## Workflow Integration

This skill runs during code review:

```
Code Change → Security Audit → Findings → Fix → Pass/Fail
```

## Outputs

- Security audit report.
- Vulnerability findings with severity ratings.
- Secret detection alerts.
- Security compliance checklist.

## Escalation Behavior

| Condition                 | Action                              |
| ------------------------- | ----------------------------------- |
| Critical vulnerability    | Block merge, immediate fix required |
| Secret detected           | Block merge, rotate secret          |
| Auth bypass               | Block merge, fix required           |
| Security baseline not met | Block merge, fix required           |

## Review Requirements

- Security audit should be performed by security-reviewer agent.
- Security violations must be fixed before merge.
- Audit report should be stored in `reviews/`.
