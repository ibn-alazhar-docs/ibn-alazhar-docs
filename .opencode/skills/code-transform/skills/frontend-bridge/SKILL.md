---
name: frontend-bridge
description: "The anti-AI-slop design lead. Audits UI for templated defaults, missing states (empty/loading/error), lazy Tailwind slop, no keyboard support, no dark mode. Enforces design system + polish pass (spacing rhythm, focus rings, transitions, skeleton loaders). Triggers in Phase 6 (every UI commit) and Phase 9 (acceptance)."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: frontend
---

# Frontend Bridge

> AI-generated UI has a smell: generic Tailwind defaults, no dark mode, no loading state, no empty state, no error state, no animations, inconsistent buttons, no keyboard support. This sub-skill is the design lead who refuses to ship any of it.

## When to Use

| Phase | Trigger | Why |
|-------|---------|-----|
| Phase 6 — EXECUTE | Every UI commit (Visual Guard) | Catch slop before it lands |
| Phase 9 — ACCEPTANCE | "Does this feel polished?" AC | Final taste gate |
| Phase 4 — AUDIT | Dimension 13 (Visual Consistency) low score | Catalog slop to fix |
| Bug report | "Looks AI-generated" | Audit + polish pass |

**Do NOT use this sub-skill for:** running browsers (use `browser-launcher`), automated a11y scans (use `accessibility-auditor`), or color contrast math (use `accessibility`). This sub-skill is the *taste reviewer* — the human-in-loop design lead, automated.

## What It Does

1. Receives screenshots or live URL from the orchestrator
2. Runs the **AI-slop checklist** (12 patterns — see below); each pattern is a fail
3. Cross-checks against the project's design system (tokens, type scale, spacing scale, motion tokens)
4. Runs the **polish pass**: spacing rhythm (8px grid), focus rings visible, transitions (150-250ms ease-out), hover/active states, skeleton loaders for async, optimistic UI for mutations
5. Verifies **every component has 5 states**: default, hover, focus, active, disabled + async: loading, empty, error
6. Routes contrast violations to `accessibility-auditor`, RTL issues to `i18n`, schema issues to `css-styling`
7. Writes a polish report with before/after screenshots + specific token recommendations
8. Blocks merge if any critical slop pattern is present (no dark mode, no error state, no keyboard support)

## Integration Contract

```
INPUT:
  - url: string (required, alternative: screenshot_path)
  - routes: comma-separated list (default: "/")
  - viewport: "{width}x{height}" (default "1280x720")
  - dark_mode: bool (default true) — test both
  - design_system_path: string (default "src/styles/tokens.css")
  - strictness: critical|standard|relaxed (default standard)

OUTPUT (JSON to stdout):
  {
    "status": "pass|needs-polish|blocked",
    "slop_score": 4,            // 0-12, lower is better
    "violations": [
      {"pattern": "no-empty-state", "route": "/dashboard", "selector": "[data-empty-list]"},
      {"pattern": "no-loading-state", "route": "/profile", "fix": "add Skeleton"},
      {"pattern": "no-dark-mode", "route": "/settings", "fix": "add .dark counterparts"}
    ],
    "polish_pass": {
      "spacing_rhythm": "PASS",
      "focus_rings": "FAIL — buttons have no :focus-visible",
      "transitions": "PARTIAL — missing on modal open",
      "hover_states": "PASS",
      "skeleton_loaders": "FAIL — using spinner for lists"
    },
    "component_states": {"default": 4, "hover": 3, "focus": 2, "active": 4, "disabled": 1, "loading": 2, "empty": 1, "error": 0},
    "report_path": "/screenshots/frontend-bridge/report-<uuid>.html"
  }

SIDE EFFECTS:
  - May modify components to add states (loading, empty, error)
  - Writes before/after screenshots to /screenshots/frontend-bridge/
  - Calls css-styling to add missing tokens, accessibility-auditor for contrast fixes
```

## CLI

```bash
# Audit a live URL for AI-slop patterns
python3 scripts/frontend_agent.py bridge --url http://localhost:3000 --routes /,/dashboard,/settings

# Audit a screenshot
python3 scripts/frontend_agent.py bridge --screenshot ./before.png --design-system ./src/styles/tokens.css

# Apply polish pass (auto-fix what's safe)
python3 scripts/frontend_agent.py bridge --url http://localhost:3000 --auto-polish

# Verify only (Phase 9 — no fixes, just audit)
python3 scripts/frontend_agent.py bridge --url http://localhost:3000 --strictness critical --no-fix
```

## AI-Slop Checklist (12 patterns)

| # | Pattern | Detection | Fix |
|---|---------|-----------|-----|
| 1 | Generic Tailwind defaults only | All colors are `gray-500`, `blue-600` | Introduce brand tokens |
| 2 | No dark mode | `.dark` counterparts missing | Add per `css-styling` |
| 3 | No loading state | Component renders empty during fetch | Add `<Skeleton>` (shadcn/ui) |
| 4 | No empty state | "0 results" shows nothing | Add EmptyState component |
| 5 | No error state | Catch block returns null | Render `<ErrorState>` with retry |
| 6 | No animations | Layout jumps on state change | Add `transition` 150-250ms ease-out |
| 7 | No keyboard support | Interactive `<div onClick>` | Replace with `<button>`/`<a>` (route to `accessibility`) |
| 8 | Inconsistent button styles | 4 button variants across app | Consolidate to `<Button variant>` map |
| 9 | No hover/active states | Buttons only change cursor | Add `:hover` (subtle bg shift) + `:active` (scale 0.98) |
| 10 | No focus rings | `:focus` outline removed | `:focus-visible` ring 2px brand-500 |
| 11 | Spinner for everything | Lists show spinner, not skeleton | Use skeleton matching final layout |
| 12 | Pure black/white | `#000` bg, `#fff` text | Switch to `#0a0a0a` / `#fafafa` tokens |

Score: count of patterns present. 0 = polished; ≥4 = blocked.

## Polish Pass (auto-applied where safe)

### Spacing rhythm (8px grid)
- All margins/paddings use `--space-1` (4px), `--space-2` (8px), `--space-4` (16px), `--space-6` (24px), `--space-8` (32px)
- No `padding: 14px` magic numbers — route to `css-styling` to add a token

### Focus rings (visible)
```css
:focus-visible { outline: 2px solid var(--color-brand-500); outline-offset: 2px; }
```
Never `outline: none` without a replacement ring.

### Transitions (150-250ms ease-out)
- Buttons: `transition: background-color var(--motion-fast)` (150ms)
- Modals: `transition: opacity var(--motion-normal), transform var(--motion-normal)` (250ms)
- Page transitions: 200ms ease-out
- Never transition `width`, `height`, `top`, `left` (use `transform`)

### Hover/active states
- Hover: background shifts one shade, or text brightens
- Active: `transform: scale(0.98)` — gives "press" feedback
- Disabled: opacity 0.5, `cursor: not-allowed`, no hover

### Skeleton loaders (not spinners)
- For lists/grids: skeleton matching final layout (shimmer animation)
- For single values: spinner OK
- shadcn/ui `<Skeleton className="h-4 w-full" />`

### Optimistic UI
- Mutations update UI immediately, rollback on error
- Delegates to `state-management` for the wiring

## Design System Reference

| Token category | Values |
|----------------|--------|
| Spacing | 4 / 8 / 16 / 24 / 32 / 48 / 64 px |
| Type scale | 12 / 14 / 16 / 18 / 20 / 24 / 30 / 36 / 48 px |
| Radius | 4 (sm) / 8 (md) / 12 (lg) / full (pill) |
| Color | bg / text / brand-500 / success / warning / error / info |
| Motion | fast 150ms / normal 250ms / slow 400ms, all `ease-out` |
| Shadow | sm / md / lg / xl (elevation levels) |
| Z-index | dropdown 1000 / sticky 1100 / modal 1200 / toast 1300 |

If a project lacks these, `frontend-bridge` calls `css-styling` to generate them from `web-design` palette output before any polish work.

## Failure Modes & Recovery

| Symptom | Cause | Recovery |
|---------|-------|----------|
| Slop patterns keep recurring | No design system tokens | Call `css-styling` to install tokens first, then re-audit |
| Polish pass changes layout | Token swap had wrong mapping | Revert, route to `css-styling` to fix token, re-apply |
| Dark mode flashes white on load | Class applied post-hydration | Inline script in `<head>` (route to `css-styling`) |
| Focus ring invisible in dark mode | Token not flipped | Add `--focus-ring: var(--color-brand-400)` in `.dark` |
| Skeleton looks like nothing | Same color as bg | Use `bg-muted` for skeleton, `bg-muted/50` for shimmer |
| Animation janky | Animating `width`/`top` | Switch to `transform: translate/scale` |

## Self-Healing Loop

When a slop pattern is detected:
1. Identify the pattern (e.g. "no-loading-state" on `/dashboard`)
2. Apply the safe mechanical fix (insert `<Skeleton>` wrapping the async block)
3. Re-screenshot the route
4. Compare before/after — if visual output regressed, route to manual review
5. Max 3 self-heal attempts per pattern per route, then escalate
6. After all patterns resolved: run `accessibility-auditor` (state changes can break a11y)

## Quality Gates (enforced before "UI ready")

- [ ] Slop score 0 (all 12 patterns cleared)
- [ ] Every component has: default, hover, focus, active, disabled
- [ ] Every async component has: loading, empty, error, success
- [ ] Spacing on 8px grid (4px allowed for tight gaps)
- [ ] Focus rings visible in both light + dark mode
- [ ] All transitions 150-250ms ease-out (respect `prefers-reduced-motion`)
- [ ] No pure black/white (#0a0a0a / #fafafa instead)
- [ ] Buttons consolidated to one `<Button variant>` system
- [ ] Skeletons used for lists/grids (not spinners)
- [ ] Optimistic UI on mutations (delegates to `state-management`)

## Tools

- **shadcn/ui** — component primitives (Button, Skeleton, EmptyState, Toast) that match the design system
- **Radix UI** — accessible primitives underneath shadcn/ui (focus, keyboard, ARIA handled)
- **Tailwind CSS** — utility layer over the design tokens (delegates to `css-styling`)
- **Framer Motion** — complex animations (page transitions, drag, layout animations)
- **headlessui/react** — alternative to Radix for tabs/dialogs/transitions
- **Playwright** — screenshots before/after (delegates to `screenshot-capture`)

## Hard Rules

1. **Never ship AI-slop.** If the slop score ≥ 4, the merge is blocked. No "I'll polish later" — later never comes.
2. **Always have empty, loading, and error states.** A list view that shows nothing while loading or on error is broken. Each async surface needs all three.
3. **Always support keyboard.** Every interactive element must be reachable by Tab and operable by Enter/Space. Route hard cases to `accessibility-auditor`.
4. **Always use design tokens.** No hardcoded colors, spacing, or radii. If a token is missing, add one via `css-styling` — don't reach for `padding: 14px`.
5. **Always animate (subtly).** State changes should transition in 150-250ms ease-out. Jumps feel broken. Respect `prefers-reduced-motion: reduce` (drop to instant).
6. **Never use pure black or white.** `#0a0a0a` for text, `#fafafa` for background. Pure values cause eye strain and look harsh.
7. **Never use a spinner for a list or grid.** Use a skeleton that matches the final layout's shape — it sets expectations and reduces perceived load time.
8. **Always have a visible focus ring.** `:focus-visible` with 2px brand color outline, 2px offset. Never `outline: none` without a replacement.
9. **Never consolidate to one button style blindly.** Consolidate to a *system* (variants: primary, secondary, ghost, destructive) — variety is fine if it's intentional.
10. **Always pair with `accessibility-auditor` after polish.** Polish can break a11y (animation without `prefers-reduced-motion`, focus ring removed). Re-audit after every polish pass.
