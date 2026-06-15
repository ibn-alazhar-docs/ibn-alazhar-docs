# Visual Consistency Audit

## Scope

Full audit of the Ibn Al-Azhar Docs frontend (22 components, 5 CSS files, 10 pages) for visual consistency across all surfaces.

## Navigation & Chrome

### Public Header

- Fixed position, `bg-white/80 backdrop-blur-md`, z-50
- Logo: primary-600 text, primary-100 badge — **consistent with brand**
- Nav links: `text-sm font-medium text-neutral-500 hover:text-primary-600`
- **Verdict**: Consistent. No issues.

### Breadcrumbs

- `text-xs` (0.8125rem), `text-neutral-400`
- Separator: `›` (single chevron), `text-neutral-300`
- Current: `text-neutral-700 font-medium`
- **Verdict**: Consistent. Added `overflow: hidden text-overflow: ellipsis` for long titles.

### Doc Metadata Bar

- Category badge: `rounded-full bg-primary-50 text-primary-700 text-xs font-semibold`
- Reading time/date: `text-xs text-neutral-400`
- **Verdict**: Consistent.

### Reading Progress

- Changed from CSS-only (`animation-timeline: scroll()`) to lightweight JS-based
- 3px height, `reading-progress` background for the track, `reading-progress-bar` for the indicator
- Respects `prefers-reduced-motion` (hidden when reduced)
- **Verdict**: Now consistent across all browsers (Chrome + Firefox + Safari).

## Typography

### Font Stack

| Element | Spec                                                  | Actual                                            |
| ------- | ----------------------------------------------------- | ------------------------------------------------- |
| Body    | `--font-family-cairo`                                 | Cairo (next/font) → Noto Sans Arabic → sans-serif |
| Prose   | `--font-family-cairo`                                 | Cairo (next/font) → Noto Sans Arabic → sans-serif |
| Code    | `JetBrains Mono, Fira Code, Cascadia Code, monospace` | Matches                                           |

### Responsive Font Sizing

| Element           | Mobile        | Tablet+                 |
| ----------------- | ------------- | ----------------------- |
| Prose body        | `1rem` (16px) | `1.125rem` (18px) at lg |
| h2                | `1.5rem`      | `1.75rem`               |
| h3                | `1.25rem`     | `1.375rem`              |
| Knowledge hero h1 | `2rem`        | `2.5rem`                |

**Fixes made:**

- Prose body sizes were not responsive before — now they scale down on mobile
- Hero/headers were using fixed sizes — now using `clamp`-like responsive scaling
- All heading sizes now have `@media (min-width: 640px)` breakpoints
- **Verdict**: Systematic responsive sizing now applied across all heading levels.

## Color Drift

### Brand Colors in Use

| Token         | Correct Value | Used Consistently?                       |
| ------------- | ------------- | ---------------------------------------- |
| `primary-600` | `#16A34A`     | Yes — links, buttons, badges             |
| `gold-400`    | `#FBBF24`     | Yes — blockquote border, timeline accent |
| `neutral-800` | `#1F2937`     | Yes — body text                          |
| `neutral-900` | `#111827`     | Yes — headings                           |
| `neutral-500` | `#6B7280`     | Yes — secondary text                     |
| `neutral-400` | `#9CA3AF`     | Yes — metadata                           |

### Semantic Colors

- `info-50` + `info-400` border → callout-info (consistent)
- `warning-50` + `warning-400` border → callout-warning (consistent)
- `success-50` + `success-400` border → callout-success (consistent)

**Verdict**: No color drift. All color tokens match the brand spec.

## Spacing Consistency

### Vertical Rhythm

| Pattern           | Before              | After             |
| ----------------- | ------------------- | ----------------- |
| Prose line-height | 2 (20px @ 1.125rem) | 2 (responsive)    |
| h2 margin-top     | 3rem                | 3rem              |
| h3 margin-top     | 2.5rem              | 2.5rem            |
| p margin-bottom   | 1.5rem              | 1.5rem            |
| Blockquote margin | 2rem 0              | 2rem 0            |
| Callout margin    | 1.5rem 0            | 1.5rem 0          |
| hr                | 2.5rem              | 2.5rem (gradient) |
| Section padding   | py-12               | py-12             |

**Fixes made:**

- Blockquote padding increased: `1rem 1.5rem` → `1.25rem 1.5rem`
- Pre padding: `1rem 1.25rem` → `1.125rem 1.25rem`
- Added `p:last-child: margin-bottom: 0` to prevent orphan spacing
- Added `li p` spacing for multi-paragraph list items
- **Verdict**: Consistent, with subtle breathing room added.

## Border Consistency

| Element        | Border                        | Radius                                |
| -------------- | ----------------------------- | ------------------------------------- |
| Category cards | `1px solid neutral-100`       | `1rem`                                |
| Journey cards  | `1px solid neutral-100`       | `1rem`                                |
| Doc cards      | `1px solid neutral-100`       | `0.75rem`                             |
| Doc nav        | `1px solid neutral-100`       | `0.75rem`                             |
| Callouts       | No border except inline-start | `0.75rem`                             |
| Pre            | No border                     | `0.75rem`                             |
| Blockquote     | `3px inline-start gold-400`   | `0 0.75rem 0.75rem 0` (RTL: mirrored) |

**Verdict**: Border styling consistent. All interaction surfaces use `1px solid neutral-100` with border-radius ranging from `0.75rem` to `1rem`.

## Shadow Consistency

| Element             | Shadow                               |
| ------------------- | ------------------------------------ |
| Category card hover | `0 4px 12px rgba(22, 163, 74, 0.08)` |
| Journey card hover  | `0 4px 16px rgba(202, 138, 4, 0.08)` |
| Doc nav hover       | `0 2px 8px rgba(22, 163, 74, 0.06)`  |
| Doc card hover      | None (border-color change only)      |

**Verdict**: Slight inconsistency in hover shadow values. These are intentional distinctions (primary vs gold category) but could benefit from a unified token system in a future phase.

## Micro-interactions

### Hover States

| Element | Transition    | Effect               |
| ------- | ------------- | -------------------- |
| Links   | `color 0.15s` | Primary hover        |
| Cards   | `all 0.15s`   | Border + shadow      |
| TOC     | `color 0.2s`  | Color change         |
| Doc nav | `all 0.2s`    | Border + bg + shadow |

**Fixes made:**

- Inline links: added `text-decoration-color` transition with `0.2s` for smoother underline fade
- TOC: `transition` changed from `0.15s` to `0.2s ease` for smoother feel
- Doc nav link: `0.15s` → `0.2s ease` for consistency
- Reading progress: `transition: width 0.1s linear` for smooth bar animation

### Focus States

- Global: `*:focus-visible` with `2px solid primary-500`, `offset 2px` — **consistent**
- Buttons/links in sections: custom `focus-visible` with specific outline colors
- **Fixes made**: Added `focus-visible` to heading anchor links, doc nav links, all interactive cards

## Visual Noise Audit

| Surface                | Issues Found                                                          | Resolved |
| ---------------------- | --------------------------------------------------------------------- | -------- |
| Homepage hero gradient | Present but intentional — creates depth                               | Leave    |
| Section dividers       | `section-divider` hr element — clean                                  | Leave    |
| Journey timeline       | Pseudo-element line + dots — clean                                    | Leave    |
| Card borders           | Present — necessary for delineation                                   | Leave    |
| Callout backgrounds    | Solid color → `linear-gradient(135deg, color, white)` for softer look | Fixed    |
| Blockquote backgrounds | Solid gold-50 → gradient for softer look                              | Fixed    |
| Page `hr`              | Solid line → subtle gradient for visual softness                      | Fixed    |

**Verdict**: Minimal visual noise. Background gradients in callouts and blockquotes were softened. If anything, the platform is under-decorated — which aligns with the "calm" and "scholarly" design intent.

## Summary

| Category                | Score         | Notes                                        |
| ----------------------- | ------------- | -------------------------------------------- |
| Color consistency       | ✅ Pass       | All tokens match brand spec                  |
| Typography consistency  | ✅ Pass       | Responsive sizing now applied systematically |
| Spacing consistency     | ✅ Pass       | Minor additions for refinement               |
| Border consistency      | ✅ Pass       | Uniform pattern across all surfaces          |
| Shadow consistency      | ⚠️ Acceptable | Slight intentional variation                 |
| Interaction consistency | ✅ Pass       | Hover/focus/transition now unified           |
| Visual noise            | ✅ Pass       | Minimal, intentional                         |
