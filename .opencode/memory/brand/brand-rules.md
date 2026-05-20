# Memory: Brand Rules

> **File:** `memory/brand/brand-rules.md`
> **Purpose:** Persistent brand constraints for all UI work.

---

## Official Brand Colors

| Color | Hex | RGB | Usage |
|-------|-----|-----|-------|
| Primary Green | `#16A34A` | 22, 163, 74 | Buttons, links, primary actions |
| Heritage Gold | `#CA8A04` | 202, 138, 4 | Heritage accents, distinctions |
| Dark Text Gray | `#1F2937` | 31, 41, 55 | Body text, headings |
| Pure White | `#FFFFFF` | 255, 255, 255 | Backgrounds, surfaces |

**CRITICAL:** Primary green is `#16A34A`, NOT `#10B981` (Emerald). This is a common mistake.

## Typography

| Element | Font | Notes |
|---------|------|-------|
| Arabic text | Cairo | Primary font, self-hosted |
| Latin text | Cairo (or Inter as fallback) | Cairo preferred for consistency |
| Code | Fira Code | Monospace for code blocks |

## Brand Tone

- **Calm academic product** — Professional, trustworthy, not flashy.
- **Educational focus** — Serves students, teachers, and supervisors.
- **Heritage-aware** — Respects Al-Azhar tradition while being modern.
- **Clear and direct** — No marketing fluff, no exaggerated claims.

## Design Tokens

All brand colors must be used via CSS custom properties (design tokens), never hardcoded:

```css
--color-primary-600: #16A34A;    /* Primary green */
--color-gold-600: #CA8A04;       /* Heritage gold */
--color-neutral-800: #1F2937;    /* Dark text gray */
--color-white: #FFFFFF;          /* Pure white */
```

## Logo and Icon

- **App icon:** Green primary (#16A34A) with heritage gold (#CA8A04) accent.
- **Favicon:** Simplified version of app icon.
- **No third-party icon sources** — All icons should be self-hosted or from approved icon library.

## Violations to Avoid

| Violation | Correct Value |
|-----------|--------------|
| Using `#10B981` (Emerald) | Use `#16A34A` |
| Using Inter as primary Arabic font | Use Cairo |
| Hardcoding brand colors | Use design tokens |
| Flashy or consumer-grade aesthetics | Calm academic tone |
| LTR-first design | RTL-first design |

## Reference

- Full guide: `docs/29_BRAND_IMPLEMENTATION_GUIDE.md`
- Design system: `docs/04_UI_DESIGN_SYSTEM.md`
- Impeccable workflow: `docs/32_IMPECCABLE_DESIGN_WORKFLOW.md`

## Last Updated

2026-05-20
