---
name: web-design
description: "Web design principles — visual hierarchy, typography, color theory, whitespace, layout grids, modern aesthetics. Generates the design system (palette, type scale, spacing, motion) that css-styling implements and frontend-bridge enforces. Triggers in Phase 4 (visual audit) and Phase 6 (UI redesign)."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: frontend
---

# Web Design

> Before tokens, before Tailwind, before components: design principles. Hierarchy, contrast, repetition, alignment, proximity (Gestalt). This sub-skill owns the *why* of the visual system; `css-styling` owns the *how*; `frontend-bridge` owns the *enforcement*.

## When to Use

| Phase | Trigger | Why |
|-------|---------|-----|
| Phase 4 — AUDIT | Dimension 13 (Visual Consistency) | Score the design, find drift |
| Phase 6 — EXECUTE | "Redesign the homepage", "Build a landing page" | Generate the design system first |
| Phase 6 — EXECUTE | New brand / rebrand | Generate palette + type scale from brand brief |
| Phase 9 — ACCEPTANCE | "Does it look professional?" AC | Audit against principles |

**Do NOT use this sub-skill for:** implementing tokens (use `css-styling`), enforcing polish (use `frontend-bridge`), or running browsers (use `browser-launcher`). This sub-skill produces the *design blueprint* — palette, type, layout, motion — that other sub-skills implement.

## What It Does

1. Reads the design brief (or extracts one from existing pages via screenshots)
2. Generates a **design system**: 4-6 named colors, 2 typefaces + scale, spacing scale, motion tokens, radius scale, shadow scale
3. Validates the system against principles: hierarchy, contrast (WCAG AA), repetition, alignment, proximity
4. Produces a layout grid (12-column desktop, 4-column mobile, max-width 1200-1440px)
5. Outputs a `tokens.css` draft for `css-styling` to install
6. Outputs a Figma-ready spec (color, type, spacing, components) for handoff
7. Flags AI-slop defaults (cream/serif/terracotta, black/acid-green, broadsheet/hairline) and forces a deliberate choice

## Integration Contract

```
INPUT:
  - brief: string (required) — what's the product, audience, single job of the page
  - brand: optional {colors: string[], fonts: string[], logo_url: string}
  - reference_screenshots: string[] (optional) — extract system from existing design
  - aesthetic: optional string — "minimalist" | "maximalist" | "editorial" | "technical"
  - target_audience: string (optional)

OUTPUT (JSON to stdout):
  {
    "status": "ok|needs-brief",
    "design_system": {
      "palette": {"bg": "#fafafa", "text": "#0a0a0a", "brand": "#6366f1", "accent": "#ec4899", "muted": "#71717a"},
      "type": {"display": "Inter Tight", "body": "Inter", "mono": "JetBrains Mono", "scale": [12,14,16,18,20,24,30,36,48]},
      "spacing": [4,8,16,24,32,48,64],
      "radius": {"sm": 4, "md": 8, "lg": 12, "full": 9999},
      "shadow": {"sm": "0 1px 2px rgb(0 0 0/.05)", "md": "0 4px 6px rgb(0 0 0/.07)", "lg": "0 10px 15px rgb(0 0 0/.1)"},
      "motion": {"fast": "150ms ease-out", "normal": "250ms ease-out", "slow": "400ms ease-out"}
    },
    "layout": {"grid": "12-col", "max_width": "1280px", "breakpoints": {"sm": 640, "md": 768, "lg": 1024, "xl": 1280}},
    "principles_check": {"hierarchy": "PASS", "contrast": "PASS", "repetition": "PASS", "alignment": "PASS", "proximity": "PASS"},
    "tokens_css_path": "/tmp/ct-<uuid>/tokens.css",
    "figma_spec_path": "/tmp/ct-<uuid>/design-spec.json"
  }

SIDE EFFECTS:
  - Writes tokens.css draft for css-styling to install
  - Writes design-spec.json for Figma import or human review
```

## CLI

```bash
# Generate a design system from a brief
python3 scripts/frontend_agent.py design --brief "B2B analytics dashboard for data engineers" --aesthetic technical

# Generate from existing brand assets
python3 scripts/frontend_agent.py design --brief "E-commerce for handmade ceramics studio" --brand '{"colors":["#3d2817","#c4a484"], "logo_url":"./logo.svg"}'

# Extract design system from a reference screenshot
python3 scripts/frontend_agent.py design --reference ./inspiration.png --brief "Indie newsletter platform"

# Audit an existing page against design principles
python3 scripts/frontend_agent.py design --audit --url http://localhost:3000
```

## Design Principles

| Principle | What it means | How to check |
|-----------|---------------|--------------|
| **Hierarchy** | Most important thing is biggest/boldest/darkest | Squint test: can you still see the structure? |
| **Contrast** | Difference between elements (size, weight, color, space) | Adjacent elements either clearly same or clearly different |
| **Repetition** | Same patterns reused (button, card, list style) | Audit: are there 4 button styles? consolidate |
| **Alignment** | Everything aligns to a grid column or baseline | No "loose" elements; everything snaps |
| **Proximity** (Gestalt) | Related items grouped, unrelated items separated | White space between groups > white space within |
| **Whitespace** | Negative space carries the design | 50%+ of any page is whitespace |

## Typography Rules

- **Max 2 typefaces**: a characterful display + a readable body (+ optional mono for data)
- **Line-height**: 1.5-1.7 for body, 1.1-1.3 for display headings
- **Line length**: 60-75 characters per line for body text (longer = harder to read)
- **Fluid type**: `clamp()` for responsive scaling
  ```css
  --font-size-body: clamp(1rem, 0.9rem + 0.5vw, 1.125rem);
  --font-size-display: clamp(2rem, 1.5rem + 2vw, 3.5rem);
  ```
- **Weights**: 400 body, 500 emphasis, 600 headings, 700 display (don't use 300 light for body — too thin on screens)
- **Avoid**: Inter alone (too default), system-ui alone (too generic), Roboto (overused), more than 2 families

## Color Rules

- **60-30-10 rule**: 60% dominant (bg), 30% secondary (text/cards), 10% accent (CTAs/highlights)
- **Semantic colors**: success (green), warning (amber), error (red), info (blue) — defined once, used everywhere
- **WCAG AA contrast**: 4.5:1 for body, 3:1 for large text (≥24px or ≥18.66px bold), 3:1 for UI components
- **Never pure black/white**: `#0a0a0a` text, `#fafafa` background — softer, less eye strain
- **Test in dark mode**: every color token needs a `.dark` counterpart (route to `css-styling`)
- **Palette size**: 4-6 named colors. More than 8 = indecision.

## Layout Rules

- **Grid**: 12-column desktop, 4-column mobile, 12-column tablet
- **Max-width**: 1200-1440px for content; full-bleed for hero images/video
- **Breakpoints** (Tailwind defaults): sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536
- **Vertical rhythm**: spacing scale on 4/8px grid; never `margin: 14px`
- **Safe areas**: account for `env(safe-area-inset-*)` on mobile (notches)
- **Reflow at 320px**: no horizontal scroll on smallest viewport (WCAG 1.4.10)

## Modern Aesthetics (current conventions)

- **Subtle gradients**: brand-500 → brand-600, 135deg, no rainbow
- **Soft shadows**: `0 4px 6px rgb(0 0 0 / 0.07)` — not the harsh 1990s drop shadow
- **Rounded corners**: 4-12px (4 sm, 8 md, 12 lg); sharp corners = editorial, full pill = playful
- **Micro-animations**: hover scale 1.02, active scale 0.98, page transitions 200ms ease-out
- **Glassmorphism**: use sparingly (one element, not the whole page); pairs with `backdrop-blur`
- **Skeleton loaders**: shimmer instead of spinner for lists/grids

## AI-Slop Defaults to Avoid

Three looks that AI generates regardless of brief — all are legitimate for *some* briefs but appear by default:

1. **Cream + serif + terracotta** — `#F4F1EA` bg, high-contrast serif display, terracotta accent
2. **Near-black + acid accent** — `#0a0a0a` bg, single bright acid-green or vermilion accent
3. **Broadsheet + hairlines** — zero border-radius, dense newspaper columns, `1px` rules

If the brief doesn't pin down the aesthetic, spend the freedom on something *specific to this brief*, not one of these defaults. State the choice and the reason in the design spec.

## Failure Modes & Recovery

| Symptom | Cause | Recovery |
|---------|-------|----------|
| Generated palette looks AI-default | Brief too generic | Ask for a specific subject, audience, single job — regenerate |
| Type scale inconsistent | Manual sizes, no clamp | Switch to `clamp()` with `--font-size-*` tokens |
| Contrast fails WCAG | Brand color too light on white | Darken brand by 10-15%, re-check with `accessibility-auditor` |
| Dark mode contrast fails | Token not flipped correctly | Route to `css-styling` to add `.dark` counterparts |
| Layout breaks at 320px | Fixed widths, no reflow | Switch to `flex/grid` + `max-w-*`, test with `responsive-validator` |
| Looks like 4 different designers made it | No repetition rule enforced | Consolidate button/card/list variants, audit with `frontend-bridge` |

## Self-Healing Loop

When a principle check fails:
1. Identify the broken principle (hierarchy flat, contrast low, repetition broken, alignment loose, proximity wrong)
2. Apply the mechanical fix (raise heading weight, darken text, consolidate variants, snap to grid, group items)
3. Re-screenshot, re-check
4. If the fix changes brand identity → route to human review (don't auto-pick a new palette)
5. Max 3 self-heal attempts per principle, then escalate

## Quality Gates (enforced before "design approved")

- [ ] 4-6 named colors (no more)
- [ ] Max 2 typefaces (display + body, optional mono)
- [ ] Type scale on `clamp()` (fluid, accessible at all viewports)
- [ ] Spacing on 4/8px grid
- [ ] Body contrast ≥ 4.5:1 (light + dark)
- [ ] Layout reflows at 320px (no horizontal scroll)
- [ ] Max-width 1200-1440px on content
- [ ] 5 component states defined (default/hover/focus/active/disabled)
- [ ] Motion tokens defined (fast/normal/slow, all ease-out)
- [ ] Not one of the 3 AI-slop defaults (or, if it is, justification recorded)

## Tools

- **Figma** — design source of truth; spec exported as JSON for handoff
- **Tailwind CSS** — implements tokens (delegates to `css-styling`)
- **Radix UI Themes** — accessible primitives with built-in color system
- **shadcn/ui** — component library that consumes the design tokens
- **Geist (Vercel)** — Inter alternative that's less default-looking
- **Fontsource** — self-hosted fonts (privacy + perf, no Google Fonts request)
- **coolors.co** — palette generation (reference, not in-tool)
- **Realtime Colors** — preview palette + typography in context

## Hard Rules

1. **Never use pure black or white.** `#0a0a0a` for text, `#fafafa` for background. Pure values cause eye strain and look harsh.
2. **Never use more than 2 typefaces.** One display + one body (optional mono). More = visual noise.
3. **Always design dark mode.** Every color token has a `.dark` counterpart. A "light only" design is incomplete.
4. **Always respect `prefers-reduced-motion`.** Animations drop to instant (or 0.01ms) when the user opts out. Non-negotiable.
5. **Always meet WCAG AA contrast.** 4.5:1 body, 3:1 large text, 3:1 UI components. Route failures to `accessibility-auditor`.
6. **Always design on a grid.** 12-column desktop, 4-column mobile. Snap everything; no "loose" elements.
7. **Never ship an AI-slop default.** If the design is cream+serif+terracotta / black+acid / broadsheet+hairlines, justify why this brief needs that look — or pick something specific.
8. **Always define motion tokens.** 150ms fast, 250ms normal, 400ms slow, all `ease-out`. Ad-hoc durations are forbidden (route to `css-styling` to enforce).
9. **Always design all 5 component states.** Default, hover, focus, active, disabled. A component without these is half-designed.
10. **Never use line length > 75 characters.** Long lines hurt readability. Cap with `max-width: 65ch` on body text containers.
