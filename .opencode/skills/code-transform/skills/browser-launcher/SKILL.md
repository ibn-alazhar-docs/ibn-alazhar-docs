---
name: browser-launcher
description: "Launch and manage headless/headed browser instances via Playwright (chromium, firefox, webkit) or Puppeteer fallback. Used by all browser/visual sub-skills as the foundation layer. Triggers automatically in Phase 4 (visual baseline), Phase 6 (visual guard), and Phase 9 (browser acceptance)."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: browser-infrastructure
---

# Browser Launcher

> Foundation sub-skill for every browser-driven workflow. Owns the browser lifecycle so other sub-skills (flow-simulator, screenshot-capture, visual-diff, accessibility-auditor, responsive-validator) only worry about page interactions.

## When to Use

| Phase                              | Trigger                                                                   | Why                                    |
| ---------------------------------- | ------------------------------------------------------------------------- | -------------------------------------- |
| Phase 4 — AUDIT                    | Dimension 13 (Visual Consistency) + Dimension 14 (Accessibility Baseline) | Need a live page to snapshot and audit |
| Phase 6 — EXECUTE                  | Every UI/frontend commit (Visual Guard)                                   | Diff before/after the change           |
| Phase 9 — BROWSER-BASED ACCEPTANCE | Always                                                                    | Walk user flows in a real browser      |
| Phase 11 — ROLLOUT                 | Smoke test on staging URL                                                 | Verify deployed build matches local    |

**Do NOT use this sub-skill directly for:** taking screenshots (use `screenshot-capture`), comparing images (use `visual-diff`), running a11y scans (use `accessibility-auditor`), simulating clicks (use `flow-simulator`). Those sub-skills call `browser-launcher` internally — you call them, not this one.

## What It Does

1. Detects the best available browser driver on the host:
   - Python `playwright` package → preferred (chromium, firefox, webkit)
   - `npx playwright` → fallback (chromium only)
   - `puppeteer` (Node) → last resort (chromium only)
   - If none available: emit a clear error with install instructions, do NOT silently skip
2. Launches a browser context with the requested options:
   - `--headless` (default for CI) or `--headed` (for local debugging)
   - Viewport size (default 1280×720)
   - Locale, timezone, color-scheme, reduced-motion preferences
   - HTTP auth, cookies, localStorage seeding
   - Network conditioning (offline / 3G / 4G)
3. Navigates to a URL with a smart wait strategy (default: `networkidle`, configurable to `domcontentloaded` or `load`)
4. Captures console logs, page errors, and request failures into a structured log
5. Tears down cleanly (closes context + browser, frees port)

## Integration Contract

```
INPUT:
  - url: string (required)
  - viewport: "{width}x{height}" (default "1280x720")
  - browser: chromium|firefox|webkit (default chromium)
  - headless: bool (default true)
  - wait_until: load|domcontentloaded|networkidle (default networkidle)
  - timeout_ms: int (default 30000)
  - locale: string (default "en-US")
  - timezone: string (default host tz)
  - auth: optional {username, password}
  - storage_state: optional path to cookies/localStorage dump

OUTPUT (JSON to stdout):
  {
    "status": "ok|error",
    "browser": "playwright-python|playwright-npx|puppeteer",
    "context_id": "<uuid>",      # used by other sub-skills to reuse the session
    "url": "<final url after redirects>",
    "title": "<page title>",
    "viewport": {"w": 1280, "h": 720},
    "console_log": "/tmp/ct-<uuid>/console.jsonl",
    "page_errors": [...],
    "duration_ms": 1234
  }

SIDE EFFECTS:
  - Writes a context snapshot to /tmp/ct-<uuid>/ for reuse by downstream sub-skills
  - Holds the browser process open until `browser-launcher close <context_id>` is invoked
```

## CLI

```bash
# Launch + navigate (prints context_id, leaves browser open)
python3 scripts/browser_agent.py launch \
  --url http://localhost:3000 \
  --viewport 1280x720 \
  --browser chromium \
  --headless

# Reuse an existing context (other sub-skills use this)
python3 scripts/browser_agent.py session --context-id <uuid> --action navigate --url /dashboard

# Close a context
python3 scripts/browser_agent.py close --context-id <uuid>

# Close all open contexts (cleanup hook)
python3 scripts/browser_agent.py close-all
```

## Decision Tree (autonomous)

```
Q: Is Python playwright installed?
  YES → use it (richest API, all 3 browsers)
  NO  → Q: Is npx playwright available?
          YES → use it (chromium only, but works)
          NO  → Q: Is puppeteer (node) available?
                  YES → use it (chromium only, limited a11y)
                  NO  → emit error:
                          "Install one of:
                             pip install playwright && playwright install chromium
                             npm i playwright && npx playwright install chromium
                             npm i puppeteer"
                        → halt Phase 9, fall back to manual visual review
                          (do NOT silently skip — that's how blind deployments happen)
```

## Headless vs Headed

| Mode               | When                                                                                         |
| ------------------ | -------------------------------------------------------------------------------------------- |
| Headless (default) | CI, Docker, autonomous runs, production-grade verification                                   |
| Headed             | Local debugging only — when you need to _see_ what the agent sees to debug a flow that fails |

Rule: **Headless for verification, headed only for diagnosis.** Never ship a "it passed in headed mode" claim — headed runs are non-deterministic on focus and display.

## Viewport Defaults

| Target              | Viewport                                         |
| ------------------- | ------------------------------------------------ |
| Desktop default     | 1280×720                                         |
| Mobile (iPhone 12)  | 390×844                                          |
| Tablet (iPad)       | 768×1024                                         |
| Wide desktop        | 1440×900                                         |
| Reduced-motion test | same viewport + `prefers-reduced-motion: reduce` |

For multi-viewport sweeps, delegate to `responsive-validator` — it manages the loop.

## Wait Strategy Cheat Sheet

| Wait until         | When to use                                                                   |
| ------------------ | ----------------------------------------------------------------------------- |
| `domcontentloaded` | Static pages, no JS, or you control the page                                  |
| `load`             | Standard pages with images/fonts                                              |
| `networkidle`      | SPA, anything async — **default**                                             |
| Custom selector    | Page never goes idle (websockets, polling) — pass `--wait-for "text=Welcome"` |

## Quality Gates (enforced before declaring "page ready")

- [ ] HTTP status 200 (no 4xx/5xx)
- [ ] No unhandled `pageerror` events
- [ ] No `requestfailed` for same-origin requests (cross-origin failures are logged but don't block)
- [ ] Wait strategy satisfied within `timeout_ms`
- [ ] DOM has a `<body>` with non-empty text content (catches blank-page renders)

If any gate fails: status = `error`, do not proceed to downstream sub-skills. Emit the failure reason and the console log path so the orchestrator can route to `debug-entry`.

## Reuse Pattern (critical for performance)

A single user flow (e.g. `login → dashboard → checkout`) should reuse ONE browser context, not spawn a new browser per step. `browser-launcher` returns a `context_id` — every other sub-skill accepts `--context-id` to attach to the live session. The orchestrator is responsible for calling `close` at the end of the flow.

Anti-pattern (forbidden): launching 3 browsers for 3 screenshots. Costs ~2s per launch.

## Failure Modes & Recovery

| Symptom                                                       | Cause                          | Recovery                                                  |
| ------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------- |
| `playwright._impl._api_types.Error: Executable doesn't exist` | Browsers not installed         | Run `playwright install chromium` once, retry             |
| `net::ERR_CONNECTION_REFUSED`                                 | App not running                | Phase 9 should first call `live-preview` to start the app |
| `Timeout 30000ms exceeded`                                    | Slow app / wrong wait strategy | Bump timeout to 60000 OR switch to `--wait-for selector`  |
| `Navigation failed because page crashed!`                     | JS error during load           | Capture pageerror, route to `debug-entry`                 |
| `browser has disconnected`                                    | Process killed / OOM           | Reduce concurrency, switch to firefox (lower memory)      |

## Self-Improvement Hook

Every failed launch writes a structured record to `OMNIPROJECT_SELF_IMPROVEMENT.md`:

- The failing URL
- The error class
- The wait strategy that was used
- The recovery action that worked

`meta-auditor` reads this in Phase 13. If the same error class appears ≥3 times across projects, `self-patch-generator` creates a rule that auto-applies the recovered strategy.

## Tools

- **Playwright (primary)** — Python or Node. All 3 browser engines. Best a11y/coverage.
- **Puppeteer (fallback)** — Node only. Chromium only. Use when Playwright is unavailable.
- **axe-core** — Injected by `accessibility-auditor` after launch.
- **Lighthouse** — Triggered by `lighthouse-scanner` against the launched URL.

## Permissions

- Filesystem: write only to `/tmp/ct-*/` and the project's `screenshots/` directory
- Network: outbound HTTP/HTTPS only (no raw socket, no DNS rebinding)
- Processes: may spawn `chromium`/`firefox`/`node` children; must reap them on close

## Hard Rules

1. **Never silently skip.** If no browser is available, halt Phase 9 — do not pretend it passed.
2. **Always close what you open.** Every `launch` MUST be paired with a `close` in the same flow.
3. **Never reuse a context across projects.** Storage state leaks = security bug.
4. **Never disable sandbox flags in production.** `--no-sandbox` is a CI workaround, never a deployment default.
