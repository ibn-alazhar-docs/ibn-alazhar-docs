# Visual System Notes — ملاحظات النظام البصري

> **Phase:** 1B  
> **Type:** Design Reference  
> **Last Updated:** 2026-05-24

---

## 1. Design Language

The visual system is defined by three qualities:

| Quality          | Manifestation                                                  |
| ---------------- | -------------------------------------------------------------- |
| **Calm**         | Generous whitespace, muted neutrals, no loud contrasts         |
| **Premium**      | Carefully spaced typography, subtle gradients, refined borders |
| **Intellectual** | Typography-first, minimal decoration, content as decoration    |

## 2. Color Application

```
Background:          #FFFFFF (white)
Section alt-bg:      #F9FAFB (neutral-50 at 50% opacity)
Text primary:        #1F2937 (neutral-800)
Text muted:          #6B7280 (neutral-500)
Accent primary:      #16A34A (primary-600)
Accent gold:         #CA8A04 (gold-600)
Card border:         #E5E7EB / 60% opacity (neutral-200/60)
Section border:      #F3F4F6 (neutral-100)
```

### When to use Gold

Gold is used sparingly as a heritage accent:

- Mission vision blockquote border
- Principles cards alternate borders
- NOT for buttons or primary actions

### When to use Green

Green is the primary brand color:

- Buttons and CTAs
- Eyebrow badge backgrounds
- Knowledge card icon backgrounds
- Hero decorative gradient

## 3. Typography System

### Scale

| Token                     | Size           | Weight | Usage                |
| ------------------------- | -------------- | ------ | -------------------- |
| Hero h1                   | 4.5rem (7xl)   | 800    | Landing headline     |
| Hero subtitle             | 1.25rem (xl)   | 400    | Supporting tagline   |
| Section eyebrow           | 0.75rem (xs)   | 700    | Section labels       |
| Section heading (implied) | 1.875rem (3xl) | 800    | CTA heading          |
| Card title                | 1.125rem (lg)  | 700    | Knowledge area title |
| Card body                 | 0.875rem (sm)  | 400    | Descriptions         |
| Mission body              | 1.25rem (xl)   | 400    | Core message         |
| Feature list              | 0.875rem (sm)  | 400    | Bullet features      |

### Line Height

- Headlines: `leading-[1.1]` (tight)
- Body text: `leading-8` to `leading-9` (generous)
- Small text: `leading-relaxed`

### Text Balance

All headings and paragraph text use `text-balance` to prevent orphaned words and create visually even text blocks.

## 4. Spacing System

All spacing follows the design system tokens defined in `brand.css`. Key vertical rhythm:

| Context                  | Token       | Value            |
| ------------------------ | ----------- | ---------------- |
| Section vertical padding | `py-24`     | 6rem             |
| Card gap in grids        | `gap-6`     | 1.5rem           |
| Card internal padding    | `p-6`       | 1.5rem           |
| Button padding           | `px-6 py-3` | 1.5rem / 0.75rem |
| Eyebrow to content       | `gap-6`     | 1.5rem           |
| Hero content gap         | `gap-8`     | 2rem             |

## 5. Cards System

Two card patterns exist in this slice:

### Knowledge Cards (KnowledgeAreas)

- Border: `neutral-200/60` with `rounded-2xl`
- Background: White
- Hover: `border-primary-200/60`, subtle shadow
- Icon area: 48px square, `rounded-xl`, `primary-50` background
- Internal: `flex flex-col gap-4`, `p-6`

### Principle Cards (Principles)

- Border: Alternate `primary-200` / `gold-200` with `rounded-2xl`
- Background: White with subtle gradient overlay
- Number: 32px, `extrabold`, `neutral-200`
- Internal: `flex flex-col gap-3`, `p-8`
- Gradient overlays alternate between green and gold tones

## 6. Motion System

All motion is defined in `motion.css` as `@keyframes` + `@utility` for Tailwind v4.

### Available Animations

| Utility              | Effect             | Duration | Easing                        |
| -------------------- | ------------------ | -------- | ----------------------------- |
| `animate-fade-in-up` | Fade + translate Y | 0.8s     | cubic-bezier(0.16, 1, 0.3, 1) |
| `animate-fade-in`    | Fade only          | 0.6s     | ease-out                      |

### Delay Classes

`animate-delay-1` through `animate-delay-8` provide 100ms increments for staggered entry.

### Application

The Hero section uses staggered animation:

- Eyebrow + h1: `animate-fade-in-up` (no delay)
- Subtitle: `animate-fade-in-up` + `animate-delay-2`
- CTA buttons: `animate-fade-in-up` + `animate-delay-4`

No other sections use animation. The hero alone benefits from the reveal effect.

### Reduced Motion

All animations are disabled and elements shown at full opacity when `prefers-reduced-motion: reduce` is active.

## 7. Border & Divider System

- **Section dividers**: `border-t border-neutral-100` between every section
- **No internal borders**: Within sections, spacing provides separation
- **Card borders**: 1px, 60% opacity for subtle definition
- **Blockquote border**: Gold (`gold-400`), 2px right border (`border-r-2`)

## 8. Shadows

- **Buttons**: `shadow-sm` (0 1px 2px 0 rgb(0 0 0 / 0.05)) with `hover:shadow-md` (0 4px 6px -1px rgb(0 0 0 / 0.1))
- **Cards**: No default shadow, `shadow-sm` only on hover for knowledge cards
- **Header**: No shadow, only `border-b` for bottom definition
