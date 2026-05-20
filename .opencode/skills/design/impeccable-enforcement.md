# Skill: Impeccable Enforcement

> **Category:** Design
> **File:** `skills/design/impeccable-enforcement.md`
> **Status:** Active

---

## Purpose

Enforce impeccable design quality across all UI changes, ensuring brand consistency, visual hierarchy, and calm academic product tone.

## Activation Conditions

- UI change is implemented.
- Brand audit is requested.
- Frontend-polish agent is activated.
- Design quality review is needed.
- Impeccable design workflow is triggered (per `docs/32_IMPECCABLE_DESIGN_WORKFLOW.md`).

## Expected Inputs

- UI implementation (components, pages, CSS).
- `docs/29_BRAND_IMPLEMENTATION_GUIDE.md` — Brand implementation guide.
- `docs/04_UI_DESIGN_SYSTEM.md` — UI design system.
- `memory/brand/brand-rules.md` — Brand rules.
- `docs/32_IMPECCABLE_DESIGN_WORKFLOW.md` — Impeccable workflow.
- shadcn/ui component defaults.

## Workflow Integration

This skill activates during UI review:

```
UI Change → Impeccable Enforcement → Brand Audit → Frontend-Polish Review → Pass/Fail
```

## Outputs

- Design quality assessment.
- Brand consistency verification.
- Visual hierarchy review.
- Tone verification.
- Specific fix recommendations.

## Escalation Behavior

| Condition | Action |
|-----------|--------|
| Brand colors wrong | Flag to frontend-polish |
| Design quality below standard | Flag to human |
| Generic AI aesthetics detected | Flag for redesign |
| Conflicts with RTL audit | Escalate to architect |

## Review Requirements

- Findings must be reviewed by frontend-polish agent.
- Brand violations must be resolved before merge.
- Design quality issues should be addressed in same PR.
