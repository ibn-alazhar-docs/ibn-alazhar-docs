# Policy: Brand Consistency

> **File:** `policies/brand-consistency.md`
> **Status:** Active
> **Enforced by:** Frontend-polish agent

---

## Purpose

Ensure all UI changes maintain brand consistency across colors, fonts, tone, and design quality.

## Rules

1. **Primary green is `#16A34A`.** Never use `#10B981` (Emerald) or any other green as the primary brand color.
2. **Heritage gold is `#CA8A04`.** Use for accents and distinctions only.
3. **Text gray is `#1F2937`.** Use for body text and headings.
4. **Backgrounds are `#FFFFFF`.** Use pure white for surfaces.
5. **Cairo font for Arabic.** Never use alternative Arabic fonts without approval.
6. **Design tokens required.** Never hardcode brand colors. Always use CSS custom properties.
7. **Calm academic tone.** UX copy should be professional, clear, and direct. No marketing language.
8. **Component consistency.** Use shadcn/ui components with brand-customized tokens.

## Enforcement

- Frontend-polish agent reviews all UI changes.
- Brand violations block merge.
- Hardcoded brand colors must be converted to tokens.
- Wrong fonts must be corrected.

## Reference

- `docs/29_BRAND_IMPLEMENTATION_GUIDE.md`
- `memory/brand/brand-rules.md`
- `docs/04_UI_DESIGN_SYSTEM.md`
