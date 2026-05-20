# Skill: RTL Audit

> **Category:** Review
> **File:** `skills/review/rtl-audit.md`
> **Status:** Active

---

## Purpose

Audit RTL compliance for all UI changes, ensuring correct Arabic rendering and RTL behavior.

## Activation Conditions

- UI change is implemented.
- RTL audit is requested.
- RTL-auditor agent is activated.
- RTL issue is reported.

## Expected Inputs

- UI implementation (components, pages, CSS).
- `docs/ADR/ADR-011-arabic-rtl-first.md` — Arabic/RTL ADR.
- `docs/04_UI_DESIGN_SYSTEM.md` — UI design system.
- Cairo font configuration.
- Tailwind CSS RTL configuration.

## Workflow Integration

This skill runs during UI review:

```
UI Change → RTL Audit → Findings → Fix → Pass/Fail
```

## Outputs

- RTL audit report.
- RTL violation findings with file/line references.
- Arabic rendering assessment.
- RTL compliance checklist.

## Escalation Behavior

| Condition | Action |
|-----------|--------|
| RTL direction broken | Block merge, fix required |
| Arabic text not rendering | Block merge, fix required |
| CSS uses LTR assumptions | Flag for fix |
| Responsive RTL broken | Flag for fix |

## Review Requirements

- RTL audit should be performed by rtl-auditor agent.
- RTL violations must be fixed before merge.
- Audit report should be stored in `reviews/`.
