# Design System Foundation — أساس نظام التصميم

> **Version:** 1.0.0  
> **Phase:** 1A — Foundation Execution  
> **Last updated:** 2026-05-24  
> **Source file:** `apps/web/src/styles/brand.css`

---

## 1. Design Tokens

### 1.1 Color

| Token                        | Value              | Usage                         |
| ---------------------------- | ------------------ | ----------------------------- |
| `primary-50` → `primary-900` | Green scale        | Main brand color              |
| `gold-50` → `gold-900`       | Amber/gold scale   | Heritage accent               |
| `neutral-50` → `neutral-900` | Gray scale         | UI text, backgrounds, borders |
| `error-50` → `error-900`     | Red scale          | Errors, destructive actions   |
| `warning-50` → `warning-900` | Yellow/amber scale | Warnings                      |
| `success-50` → `success-900` | Green scale        | Success states                |
| `info-50` → `info-900`       | Blue scale         | Informational states          |

**Key colors:**

- `primary-600`: `#16A34A` — Primary brand green
- `gold-600`: `#CA8A04` — Heritage gold accent
- `neutral-800`: `#1F2937` — Default text color
- `neutral-500`: `#6B7280` — Muted text

### 1.2 Typography

| Token                     | Value                                     |
| ------------------------- | ----------------------------------------- |
| `--font-family-cairo`     | `"Cairo", "Noto Sans Arabic", sans-serif` |
| `--font-weight-regular`   | `400`                                     |
| `--font-weight-bold`      | `700`                                     |
| `--font-weight-extrabold` | `800`                                     |

**Font faces loaded (Cairo):**

- `Cairo-Regular` (400) — Body text
- `Cairo-Bold` (700) — Headings, emphasis
- `Cairo-ExtraBold` (800) — Display headings

All with `font-display: swap` and `unicode-range: U+0600-06FF...` (Arabic block).

### 1.3 Spacing Scale

| Token        | Rem     | px (approx) |
| ------------ | ------- | ----------- |
| `spacing-1`  | 0.25rem | 4px         |
| `spacing-2`  | 0.5rem  | 8px         |
| `spacing-3`  | 0.75rem | 12px        |
| `spacing-4`  | 1rem    | 16px        |
| `spacing-5`  | 1.25rem | 20px        |
| `spacing-6`  | 1.5rem  | 24px        |
| `spacing-8`  | 2rem    | 32px        |
| `spacing-10` | 2.5rem  | 40px        |
| `spacing-12` | 3rem    | 48px        |
| `spacing-16` | 4rem    | 64px        |
| `spacing-20` | 5rem    | 80px        |
| `spacing-24` | 6rem    | 96px        |

### 1.4 Border Radius

| Token        | Value          |
| ------------ | -------------- |
| `radius-sm`  | 0.25rem (4px)  |
| `radius-md`  | 0.375rem (6px) |
| `radius-lg`  | 0.5rem (8px)   |
| `radius-xl`  | 0.75rem (12px) |
| `radius-2xl` | 1rem (16px)    |

### 1.5 Shadows

| Token         | Value                               |
| ------------- | ----------------------------------- |
| `shadow-sm`   | `0 1px 2px 0 rgb(0 0 0 / 0.05)`     |
| `shadow-md`   | `0 4px 6px -1px rgb(0 0 0 / 0.1)`   |
| `shadow-lg`   | `0 10px 15px -3px rgb(0 0 0 / 0.1)` |
| `shadow-xl`   | `0 20px 25px -5px rgb(0 0 0 / 0.1)` |
| `shadow-gold` | `0 4px 14px 0 rgb(202 138 4 / 0.3)` |

### 1.6 Focus Ring

```
--color-ring: var(--color-primary-500)
--ring-offset-width: 2px
--ring-offset-color: #fff
```

Applied globally via `*:focus-visible` outline.

---

## 2. Semantic Color Mapping

| Context         | Token         | Purpose                       |
| --------------- | ------------- | ----------------------------- |
| Text (primary)  | `neutral-800` | Body, headings                |
| Text (muted)    | `neutral-500` | Labels, descriptions          |
| Text (inverse)  | `white`       | Text on dark bg               |
| Brand (primary) | `primary-600` | Buttons, links, active states |
| Brand (accent)  | `gold-600`    | Heritage highlights           |
| Surface (page)  | `white`       | Main background               |
| Surface (card)  | `white`       | Card/dialog bg                |
| Surface (hover) | `neutral-100` | Hover states                  |
| Border          | `neutral-200` | Dividers, borders             |
| Error           | `error-600`   | Error text, icons             |
| Warning         | `warning-600` | Warning text, icons           |
| Success         | `success-600` | Success text, icons           |
| Info            | `info-600`    | Info text, icons              |

---

## 3. Typography Scale

| Level        | Font Size      | Line Height | Weight          | Usage              |
| ------------ | -------------- | ----------- | --------------- | ------------------ |
| Display      | 4xl (2.25rem)  | Tight       | 800 (ExtraBold) | Hero headings      |
| H1           | 3xl (1.875rem) | Snug        | 700 (Bold)      | Page titles        |
| H2           | 2xl (1.5rem)   | Snug        | 700 (Bold)      | Section titles     |
| H3           | xl (1.25rem)   | Normal      | 700 (Bold)      | Card titles        |
| H4           | lg (1.125rem)  | Normal      | 700 (Bold)      | Sub-section titles |
| Body         | base (1rem)    | Normal      | 400 (Regular)   | Paragraphs         |
| Body (small) | sm (0.875rem)  | Normal      | 400 (Regular)   | Metadata           |
| Caption      | xs (0.75rem)   | Normal      | 400 (Regular)   | Labels             |

---

## 4. Responsive Breakpoints

| Breakpoint | Min Width | Container      | Usage            |
| ---------- | --------- | -------------- | ---------------- |
| `sm`       | 640px     | fluid          | Mobile landscape |
| `md`       | 768px     | fluid          | Tablet           |
| `lg`       | 1024px    | 1280px (7xl)   | Desktop          |
| `xl`       | 1280px    | 1440px (90rem) | Wide desktop     |

Layout philosophy: **mobile-first** (base styles = mobile, breakpoints add complexity).

---

## 5. Spacing Rhythm

| Context      | Vertical Gap      | Horizontal Padding     |
| ------------ | ----------------- | ---------------------- |
| Page section | `py-12` (3rem)    | `px-4 sm:px-6 lg:px-8` |
| Card content | `gap-4` (1rem)    | `p-4 sm:p-6`           |
| Form fields  | `gap-6` (1.5rem)  | —                      |
| Lists        | `gap-2` (0.5rem)  | —                      |
| Navigation   | `gap-1` (0.25rem) | —                      |

---

## 6. RTL-Specific Rules

- `margin-inline-start` / `margin-inline-end` for logical spacing
- `padding-inline-start` / `padding-inline-end` for logical padding
- `border-inline-start` / `border-inline-end` for logical borders
- Sidebar is on the **right** in RTL (via `right-0` + `border-l`)
- `text-align: right` when `html[dir="rtl"]`

---

## 7. Global Styles

- **Reset:** margin/padding/border reset via `* { margin-inline-*: 0; padding-inline-*: 0; border-inline-*: 0 }`
- **Scrollbar:** custom width (8px), primary-color thumb
- **Selection:** green-tinted background
- **Print:** black text, white background
- **Font smoothing:** `antialiased` on body
