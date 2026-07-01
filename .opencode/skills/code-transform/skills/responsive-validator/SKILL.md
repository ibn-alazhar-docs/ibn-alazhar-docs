---
name: responsive-validator
description: "Test responsive layouts across viewport widths (375px mobile, 768px tablet, 1024px desktop, 1440px wide) and across browsers (chromium, firefox, webkit). Detects layout breaks, overflow, element collisions, and breakpoint regressions. Triggers in Phase 4 (audit baseline), Phase 6 (visual guard on layout changes), and Phase 9 (acceptance)."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: browser-acceptance
---

# Responsive Validator

> A page that looks great at 1440px but breaks at 375px is a broken page. This sub-skill walks the same route at every viewport and proves the layout holds.

## When to Use

| Trigger                         | Example                                                   |
| ------------------------------- | --------------------------------------------------------- |
| Phase 4 — Visual baseline audit | "What does the app look like on mobile?"                  |
| Phase 6 — CSS/layout change     | "I changed the grid template" — re-validate all viewports |
| Phase 9 — Acceptance testing    | Every spec AC that mentions "mobile" or "responsive"      |
| Bug report                      | "User reports layout breaks on iPad" — repro + fix        |
| Pre-deploy smoke                | Quick 4-viewport sweep on staging URL                     |

**Do NOT use this for:** cross-browser functional testing (use `flow-simulator` with `--browser` flag), performance audits (use `lighthouse-scanner`), accessibility scans (use `accessibility-auditor`). This sub-skill is specifically for **layout integrity across viewports**.

## What It Does

1. Takes a URL (or a list of URLs) and a set of viewports
2. For each (URL, viewport) pair:
   - Launches browser at that viewport (delegates to `browser-launcher`)
   - Navigates to the URL
   - Waits for `networkidle`
   - Captures a full-page screenshot
   - Runs layout integrity checks (see below)
   - Captures console errors
3. Produces a comparison grid: rows = URLs, columns = viewports, each cell = screenshot
4. Flags any viewport where layout broke
5. Optionally: runs the same sweep across 3 browser engines (chromium, firefox, webkit) to catch engine-specific bugs

## Layout Integrity Checks (per viewport)

For each (URL, viewport), the validator checks:

| Check                               | What it tests                                                   | Severity                   |
| ----------------------------------- | --------------------------------------------------------------- | -------------------------- |
| **Horizontal overflow**             | `document.documentElement.scrollWidth > window.innerWidth`      | Critical — content cut off |
| **Vertical overflow > 3x viewport** | Page height > 3× viewport height (likely infinite scroll bug)   | High                       |
| **Element collision**               | Two visible elements overlap by > 10% area                      | Critical                   |
| **Text truncation**                 | Element has `text-overflow: ellipsis` AND title attribute empty | Medium — text inaccessible |
| **Tiny tap targets**                | Clickable element < 44×44 px (Apple HIG minimum)                | High (also a11y issue)     |
| **Fixed element off-screen**        | `position: fixed` element with bounding rect outside viewport   | Critical                   |
| **Image without aspect-ratio**      | `<img>` without `aspect-ratio` CSS causes layout shift          | Medium                     |
| **Font size < 12px**                | Body text smaller than 12px (unreadable on most displays)       | Medium                     |
| **Z-index > 9999**                  | Stacking context abuse                                          | Low (code smell)           |
| **Console errors**                  | Any `pageerror` event                                           | High                       |

## Integration Contract

```
INPUT:
  - url: string OR comma-separated list (required)
  - viewports: comma-separated list (default "375x812,768x1024,1280x720,1440x900")
       shorthand: "mobile,tablet,desktop,wide" → standard sizes
  - browsers: chromium|firefox|webkit (default chromium only; specify multiple for cross-browser)
  - routes: optional list of app routes to test (default: just "/")
  - capture-screenshots: bool (default true)
  - check-tap-targets: bool (default true)
  - fail-on: critical|high|medium|low (default high — fail on high+ severity issues)

OUTPUT (JSON to stdout):
  {
    "status": "ok|partial|failed",
    "summary": "12/16 viewport-URL pairs passed",
    "results": [
      {
        "url": "/dashboard",
        "viewport": {"w": 375, "h": 812, "label": "mobile"},
        "browser": "chromium",
        "status": "fail",
        "issues": [
          {
            "check": "horizontal_overflow",
            "severity": "critical",
            "detail": "scrollWidth=412 > innerWidth=375",
            "screenshot": "/screenshots/dashboard-375x812-overflow.png"
          }
        ],
        "screenshot": "/screenshots/dashboard-375x812.png",
        "duration_ms": 1820
      }
    ],
    "comparison_grid": "/screenshots/responsive-grid-<timestamp>.png"
  }
```

## Standard Viewport Presets

| Label              | Size      | Device reference        |
| ------------------ | --------- | ----------------------- |
| `mobile-small`     | 360×640   | Old Android (Galaxy S5) |
| `mobile`           | 375×812   | iPhone 12/13/14         |
| `mobile-large`     | 414×896   | iPhone 11 Pro Max       |
| `tablet`           | 768×1024  | iPad portrait           |
| `tablet-landscape` | 1024×768  | iPad landscape          |
| `desktop`          | 1280×720  | Standard laptop         |
| `desktop-large`    | 1440×900  | MacBook Pro 14"         |
| `wide`             | 1920×1080 | Desktop monitor         |

Default sweep: `mobile,tablet,desktop,wide` (4 viewports, fast).

For full coverage: `mobile-small,mobile,mobile-large,tablet,tablet-landscape,desktop,desktop-large,wide` (8 viewports, slower).

## Cross-Browser Mode

```bash
# Test on 3 browser engines
python3 scripts/browser_agent.py responsive --url http://localhost:3000 --browsers chromium,firefox,webkit
```

Cross-browser catches:

- `-webkit-` prefix missing (Safari/webkit)
- Firefox-specific flexbox bugs
- Chromium-only CSS features (`backdrop-filter` on old Firefox)
- Date input format differences
- Font rendering differences (especially CJK)

**Trade-off**: 3× slower. Default to chromium-only for Phase 6 visual guard; use cross-browser for Phase 9 acceptance and pre-deploy smoke.

## Comparison Grid (the killer output)

The most useful artifact is the **comparison grid** — a single PNG showing all (URL, viewport) pairs side-by-side:

```
┌────────────┬───────────┬───────────┬───────────┬───────────┐
│            │  375px    │  768px    │  1280px   │  1440px   │
│            │  mobile   │  tablet   │  desktop  │  wide     │
├────────────┼───────────┼───────────┼───────────┼───────────┤
│  /         │  [img]    │  [img]    │  [img]    │  [img]    │
│  home      │   ✅      │   ✅      │   ✅      │   ✅      │
├────────────┼───────────┼───────────┼───────────┼───────────┤
│  /dashboard│  [img]    │  [img]    │  [img]    │  [img]    │
│            │   ❌      │   ✅      │   ✅      │   ✅      │
│            │ overflow  │           │           │           │
├────────────┼───────────┼───────────┼───────────┼───────────┤
│  /checkout │  [img]    │  [img]    │  [img]    │  [img]    │
│            │   ✅      │   ✅      │   ✅      │   ✅      │
└────────────┴───────────┴───────────┴───────────┴───────────┘
```

Built with Pillow (Python imaging). Saved to `/screenshots/responsive-grid-<timestamp>.png`. This is what gets attached to the Phase 12 visual proof album.

## CLI

```bash
# Standard 4-viewport sweep on home page
python3 scripts/browser_agent.py responsive --url http://localhost:3000

# Sweep multiple routes
python3 scripts/browser_agent.py responsive --url http://localhost:3000 --routes /,/dashboard,/checkout,/profile

# Custom viewport set
python3 scripts/browser_agent.py responsive --url http://localhost:3000 --viewports 360x640,414x896,768x1024

# Cross-browser
python3 scripts/browser_agent.py responsive --url http://localhost:3000 --browsers chromium,firefox,webkit

# Fail only on critical issues (faster CI)
python3 scripts/browser_agent.py responsive --url http://localhost:3000 --fail-on critical

# Skip tap-target check (for non-interactive pages)
python3 scripts/browser_agent.py responsive --url http://localhost:3000 --no-tap-targets
```

## Failure Modes & Recovery

| Symptom                                          | Cause                                           | Recovery                                                                                     |
| ------------------------------------------------ | ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Horizontal overflow at mobile                    | Element with fixed width (e.g. `width: 1024px`) | Find element via `document.elementsFromPoint(innerWidth-1, 10)`, report to `frontend-bridge` |
| Layout looks fine in Chromium, breaks in Firefox | `-webkit-` prefix or Chromium-only CSS          | Add standard property, fall back to `frontend-bridge`                                        |
| Layout shifts after fonts load                   | No `font-display: swap` or `size-adjust`        | Route to `frontend-bridge` (add `font-display: optional`)                                    |
| Tap target too small on mobile                   | Icon button < 44×44                             | Route to `frontend-bridge` (add padding or hit-area)                                         |
| Text truncates with no tooltip                   | `text-overflow: ellipsis` without `title` attr  | Route to `frontend-bridge` (add `title` or expand-on-click)                                  |
| Page height > 3x viewport                        | Infinite scroll loop or stuck loader            | Capture DOM, route to `debug-entry`                                                          |

## Self-Healing Loop

When a layout check fails:

1. Capture full DOM snapshot of the failing viewport
2. Identify the offending element (e.g. the one causing overflow)
3. Suggest a CSS fix (e.g. `max-width: 100%` on the offending element)
4. Auto-apply the fix via `frontend-bridge` if confidence > 80%
5. Re-run the responsive sweep on just the failing viewport
6. Max 3 self-heal attempts per viewport, then escalate to user

## Quality Gates

- [ ] All (URL, viewport) pairs swept (no missing cells in grid)
- [ ] No critical issues at mobile (375px) — mobile-first rule
- [ ] No critical issues at desktop (1280px) — most common device
- [ ] Comparison grid PNG generated and saved
- [ ] Cross-browser run completed if `--browsers` specified

## Phase 4 vs Phase 6 vs Phase 9 Behavior

| Phase                    | Viewports                         | Browsers                | Behavior                                                  |
| ------------------------ | --------------------------------- | ----------------------- | --------------------------------------------------------- |
| Phase 4 (audit baseline) | 4 (mobile, tablet, desktop, wide) | chromium                | Record baseline; no fail-fast                             |
| Phase 6 (visual guard)   | 4 (same as Phase 4)               | chromium                | Compare against Phase 4 baseline; fail-fast on regression |
| Phase 9 (acceptance)     | 8 (full sweep)                    | chromium+firefox+webkit | Full coverage; fail-fast on any critical                  |

## Tools

- **Playwright** — for browser control + screenshots
- **Pillow** — for grid image generation
- **axe-core** — optional a11y check at each viewport (set `--a11y-per-viewport`)
- **Custom JS injected per page** — for layout integrity checks (runs in page context)

## Hard Rules

1. **Mobile-first.** If only one viewport can be tested, test 375px. Most users are on mobile.
2. **Never skip wide viewports.** A layout that breaks at 1920px (e.g. max-width container missing) is a real bug, not a niche case.
3. **Never trust CSS media queries alone.** Always verify with actual rendered screenshots — `@media (max-width: 768px)` doesn't help if a parent has `min-width: 800px`.
4. **Cross-browser is not optional for production.** Chromium-only testing ships Safari bugs to users.
5. **Every failing viewport gets a screenshot.** "Layout broke at 375px" without a screenshot is unactionable.
