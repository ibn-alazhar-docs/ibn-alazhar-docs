---
name: screenshot-capture
description: "Capture full-page, viewport-only, or element-level screenshots from a running browser. Saves to structured directory with metadata (URL, viewport, timestamp, route). Triggers in Phase 4 (baseline), Phase 6 (visual guard before/after), Phase 9 (acceptance evidence), and Phase 12 (visual proof album)."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: browser-infrastructure
---

# Screenshot Capture

> The first half of every visual workflow: get the pixels. `visual-diff` compares them, `responsive-validator` sweeps them across viewports, `flow-simulator` captures them per step. This sub-skill is the foundation.

## When to Use

| Trigger | Example |
|---------|---------|
| Phase 4 — Visual baseline | Capture every route at every viewport as the "before" reference |
| Phase 6 — Visual Guard (before) | Snapshot the page before applying a UI change |
| Phase 6 — Visual Guard (after) | Snapshot the page after applying the change |
| Phase 9 — Acceptance evidence | Attach screenshots to each AC in the spec |
| Phase 12 — Visual proof album | Compile gallery of all pages × states for delivery |
| Bug report | "Capture what the user is seeing right now" |

**Do NOT use this for:** diffing two screenshots (use `visual-diff`), comparing across viewports (use `responsive-validator`), running user flows (use `flow-simulator`). This sub-skill **captures pixels**, nothing more.

## What It Does

1. Launches or attaches to a browser session (delegates to `browser-launcher`)
2. Navigates to the target URL
3. Waits for the requested state (`load`, `domcontentloaded`, `networkidle`, or custom selector)
4. Optionally performs pre-capture actions:
   - Set viewport size
   - Set color scheme (light/dark)
   - Set reduced motion
   - Set locale
   - Inject CSS (e.g. disable animations for stable screenshots)
   - Dismiss modals/cookies banners (via `--dismiss-modal` selector)
5. Captures the screenshot in one of three modes:
   - **Full-page** — entire scrollable page (default for acceptance evidence)
   - **Viewport-only** — only what's visible (default for visual-diff baselines)
   - **Element-level** — only a specific element (for component-level evidence)
6. Saves to a structured path with metadata sidecar

## Capture Modes

| Mode | What it captures | When to use |
|------|------------------|-------------|
| `full-page` | Entire scrollable height, stitched | Acceptance evidence, proof album |
| `viewport` | Only what's visible in the window (default 1280×720) | Visual-diff baselines, regression testing |
| `element` | Bounding box of a single element | Component-level evidence, isolated bug reports |
| `sticky-header` | Full-page but with `position: sticky` elements fixed in place (avoids them appearing multiple times in the stitch) | Long pages with sticky nav |

## Integration Contract

```
INPUT:
  - url: string (required)
  - mode: full-page|viewport|element|sticky-header (default viewport)
  - viewport: "{w}x{h}" (default "1280x720")
  - element-selector: string (required if mode=element)
  - wait-until: load|domcontentloaded|networkidle|selector (default networkidle)
  - wait-for: optional selector to wait for (e.g. "text=Welcome")
  - dismiss-modal: optional selector to click before capture (e.g. ".cookie-banner button")
  - color-scheme: light|dark (default host default)
  - reduced-motion: bool (default false)
  - locale: string (default "en-US")
  - inject-css: optional CSS string to inject before capture (e.g. "* { animation: none !important; }")
  - output-dir: where to save (default /screenshots/)
  - output-name: filename (default auto-generated: <route>-<viewport>-<timestamp>.png)

OUTPUT (JSON to stdout):
  {
    "status": "ok|error",
    "path": "/screenshots/login-1280x720-2026-06-29T001234.png",
    "metadata_path": "/screenshots/login-1280x720-2026-06-29T001234.json",
    "url": "http://localhost:3000/login",
    "final_url": "http://localhost:3000/login?redirect=/dashboard",
    "viewport": {"w": 1280, "h": 720},
    "mode": "viewport",
    "duration_ms": 1820,
    "page_title": "Sign in - MyApp",
    "console_errors": 0,
    "image_size": {"w": 1280, "h": 720, "bytes": 245832}
  }

SIDE EFFECTS:
  - Writes PNG to output-dir
  - Writes JSON sidecar with full metadata (for traceability)
  - If output-dir is /screenshots/baselines/, also updates baselines.json index
```

## CLI

```bash
# Basic viewport screenshot
python3 scripts/browser_agent.py screenshot --url http://localhost:3000/login

# Full-page screenshot (for acceptance evidence)
python3 scripts/browser_agent.py screenshot --url http://localhost:3000/dashboard --mode full-page

# Element-level screenshot (for component evidence)
python3 scripts/browser_agent.py screenshot --url http://localhost:3000/login --mode element --element-selector "[data-testid=login-form]"

# Mobile viewport
python3 scripts/browser_agent.py screenshot --url http://localhost:3000 --viewport 375x812

# Dark mode
python3 scripts/browser_agent.py screenshot --url http://localhost:3000 --color-scheme dark

# Dismiss cookie banner first
python3 scripts/browser_agent.py screenshot --url http://localhost:3000 --dismiss-modal ".cookie-banner button:has-text('Accept')"

# Disable animations for stable screenshots
python3 scripts/browser_agent.py screenshot --url http://localhost:3000 \
  --inject-css "* { animation: none !important; transition: none !important; }"

# Capture as baseline (saves to baselines/ dir, updates index)
python3 scripts/browser_agent.py screenshot --url http://localhost:3000/login --baseline --route /login --viewport 1280x720

# Batch capture (multiple routes at multiple viewports)
python3 scripts/browser_agent.py screenshot --url http://localhost:3000 \
  --routes /,/login,/dashboard,/checkout \
  --viewports 375x812,1280x720,1440x900
```

## Metadata Sidecar (every screenshot gets one)

```json
// /screenshots/login-1280x720-2026-06-29T001234.json
{
  "captured_at": "2026-06-29T00:12:34Z",
  "url": "http://localhost:3000/login",
  "final_url": "http://localhost:3000/login",
  "route": "/login",
  "viewport": {"w": 1280, "h": 720},
  "mode": "viewport",
  "color_scheme": "light",
  "reduced_motion": false,
  "locale": "en-US",
  "page_title": "Sign in - MyApp",
  "page_metrics": {
    "dom_nodes": 412,
    "load_time_ms": 820,
    "first_paint_ms": 220,
    "largest_contentful_paint_ms": 940
  },
  "console_log_summary": {
    "errors": 0,
    "warnings": 1,
    "logs": 12
  },
  "purpose": "phase6_visual_guard_after",
  "commit": "abc1234",
  "spec_ac": "AC-42"
}
```

The sidecar is critical for traceability — `meta-auditor` uses it in Phase 13 to answer "which ACs have visual evidence?". Always set `--purpose` and `--spec-ac` when relevant.

## Batch Capture Mode

For Phase 4 (baseline) and Phase 12 (proof album), capture multiple routes at multiple viewports in one command:

```bash
python3 scripts/browser_agent.py screenshot --url http://localhost:3000 \
  --routes /,/login,/signup,/dashboard,/profile,/checkout,/orders,/settings \
  --viewports mobile,tablet,desktop,wide \
  --mode full-page \
  --output-dir /screenshots/proof-album/
```

This produces a grid of screenshots: 8 routes × 4 viewports = 32 PNGs + 32 JSON sidecars. The proof album generator (Phase 12) reads these and builds the HTML gallery.

## Pre-Capture Stabilization

Screenshots are flaky if the page is still animating. Built-in stabilization:

1. **Disable animations** (default for full-page): inject `* { animation: none !important; transition: none !important; }`
2. **Wait for fonts**: `await document.fonts.ready`
3. **Wait for images**: `await Promise.all([...document.images].map(img => img.decode()))` — catches lazy-loaded images
4. **Wait for no pending network**: `networkidle` wait strategy
5. **Scroll through page** (for full-page only): triggers lazy-loaded content before stitch

Override stabilization with `--no-stabilize` (faster but flakier — for debug only).

## File Naming Convention

```
<screenshots-dir>/
  <route-slug>-<viewport>-<timestamp>.png
  <route-slug>-<viewport>-<timestamp>.json
```

Examples:
- `login-1280x720-2026-06-29T001234.png`
- `dashboard-375x812-2026-06-29T001245.png`
- `checkout-1440x900-2026-06-29T001301.png`

For baselines (special case): no timestamp, just `<route-slug>-<viewport>.png` (overwrites previous baseline).

Route slugging: `/` → `home`, `/users/:id` → `users-detail`, `/dashboard/analytics` → `dashboard-analytics`.

## Quality Gates

- [ ] PNG file exists and is non-empty (>1KB)
- [ ] PNG dimensions match requested viewport (for `viewport` mode)
- [ ] PNG dimensions match full page height (for `full-page` mode — must be > viewport height for long pages)
- [ ] JSON sidecar written
- [ ] No `pageerror` events during capture
- [ ] Capture duration < 10s (warn) / < 30s (fail)

If any gate fails: status = `error`, do not use the screenshot for diffing or evidence.

## Failure Modes & Recovery

| Symptom | Cause | Recovery |
|---------|-------|----------|
| Blank white screenshot | Page didn't render in time | Increase wait timeout, or use `--wait-for "selector"` |
| Screenshot shows loading spinner | Async content not loaded | Use `--wait-for "text=Welcome"` instead of `networkidle` |
| Full-page screenshot is cut off | Lazy-loaded sections not triggered | Enable scroll-stabilization (default in v1.0+) |
| Different screenshot every run | Animations or carousels | `--inject-css "* { animation: none !important; }"` |
| Element screenshot is empty | Selector matched nothing | Verify selector in DOM, route to `debug-entry` |
| File too large (>5MB) | High-DPI display, uncompressed | Use `--compression-level 6` (default 6, max 9) |

## Self-Healing Loop

When capture fails:
1. Re-try with longer timeout (bump from 30s → 60s)
2. If still failing: capture DOM snapshot for diagnosis
3. If blank screenshot: check if URL returned 200 (maybe auth redirect)
4. If element not found: dump all selectors with similar text, suggest alternative
5. Max 3 self-heal attempts, then escalate

## Integration with Other Sub-Skills

| Consumer | How it uses screenshot-capture |
|----------|-------------------------------|
| `visual-diff` | Calls with `--mode viewport` for baseline + current; compares results |
| `responsive-validator` | Calls in a loop, once per viewport; builds comparison grid from results |
| `flow-simulator` | Calls with `--mode viewport` after each step; attaches to flow trace |
| `accessibility-auditor` | Calls after a11y scan, to attach visual evidence to violations |
| Phase 12 proof album | Calls in batch mode for all routes × viewports |

## Phase-Specific Defaults

| Phase | Default mode | Default viewport | Default output |
|-------|--------------|------------------|----------------|
| Phase 4 (baseline) | viewport | 4 viewports (mobile/tablet/desktop/wide) | /screenshots/baselines/ |
| Phase 6 (visual guard before) | viewport | matching the change scope | /screenshots/before/ |
| Phase 6 (visual guard after) | viewport | matching the change scope | /screenshots/after/ |
| Phase 9 (acceptance) | full-page | desktop (1280×720) | /screenshots/acceptance/ |
| Phase 12 (proof album) | full-page | 4 viewports | /screenshots/proof-album/ |
| Bug report | full-page + viewport | desktop | /screenshots/bugs/<bug-id>/ |

## Tools

- **Playwright** — for browser control + screenshot capture
- **Pillow** — for any image post-processing (resize, compression, stitch)
- **JSON** — for metadata sidecar (no external dep)

## Hard Rules

1. **Always write a JSON sidecar.** A screenshot without metadata is untraceable.
2. **Never overwrite a baseline without a `design:` commit.** Use `--baseline` flag explicitly.
3. **Never capture a screenshot of a page with console errors silently.** Report errors in the JSON sidecar; flag in Phase 4 audit.
4. **Always stabilize before capture.** Animations and lazy-load are the enemy of reproducible screenshots.
5. **Never use `--no-stabilize` in production.** Debug-only flag; shipping flaky screenshots is worse than shipping no screenshots.
6. **Filename must be deterministic for baselines, timestamped for evidence.** Mixing the two breaks `visual-diff` baseline discovery.
