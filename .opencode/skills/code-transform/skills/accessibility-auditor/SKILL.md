---
name: accessibility-auditor
description: "Run axe-core and Lighthouse accessibility audits in a real browser. Detects WCAG 2.2 AA violations (color contrast, ARIA, focus order, keyboard nav, alt text, semantics). Auto-fixes common issues and routes complex ones to frontend-bridge. Triggers in Phase 4 (a11y baseline), Phase 6 (a11y guard), Phase 9 (acceptance)."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: browser-acceptance
---

# Accessibility Auditor

> A page that's unusable by screen reader users is broken. This sub-skill proves the page works for everyone — keyboard, screen reader, voice control, low vision, motor impairments.

## When to Use

| Trigger | Example |
|---------|---------|
| Phase 4 — Audit baseline | "What's our a11y debt?" |
| Phase 6 — A11y Guard | "I added a new form" → re-audit affected routes |
| Phase 9 — Acceptance | Every AC that mentions "accessible" or "WCAG" |
| Phase 11 — Pre-deploy | Final a11y gate before production |
| Bug report | "User can't tab past the modal" → repro + fix |

**Do NOT use this for:** performance audits (use `lighthouse-scanner`), visual diffing (use `visual-diff`), layout validation (use `responsive-validator`). This sub-skill is specifically for **WCAG / WAI-ARIA compliance**.

## What It Does

1. Launches browser (delegates to `browser-launcher`)
2. Injects **axe-core** into the page (industry-standard a11y engine, used bydeque)
3. Runs the configured rule set (default: WCAG 2.2 AA + best practices)
4. Also runs Lighthouse a11y audit (for cross-validation — catches things axe misses)
5. Optionally performs manual-test simulations:
   - Keyboard-only navigation (Tab through entire page, check focus order)
   - Screen reader simulation (NVDA/VoiceOver semantics check via aria-query)
   - High contrast mode (force `forced-colors: active`)
   - 200% zoom (check layout doesn't break at 200%)
   - Reduced motion (`prefers-reduced-motion: reduce`)
6. Classifies violations by severity:
   - **Critical** — unusable by some users (e.g. modal not keyboard-trapped, button with no accessible name)
   - **Serious** — major friction (e.g. missing form labels, contrast < 4.5:1)
   - **Moderate** — minor friction (e.g. missing `lang` attribute, skip-link broken)
   - **Minor** — best practice (e.g. heading order skipped)
7. Auto-fixes what it can (see Auto-Fix Rules below)
8. Routes complex fixes to `frontend-bridge` with specific guidance

## Integration Contract

```
INPUT:
  - url: string (required)
  - routes: comma-separated list (default: just "/")
  - standard: wcag2a|wcag2aa|wcag21a|wcag21aa|wcag22aa|best-practice (default wcag22aa)
  - engines: axe|lighthouse|both (default both for Phase 9, axe-only for Phase 6)
  - keyboard-test: bool (default true) — full Tab sweep
  - screen-reader-sim: bool (default false) — slow, only for Phase 9
  - high-contrast-test: bool (default true)
  - zoom-test: bool (default true) — checks 200% zoom
  - auto-fix: bool (default true for Phase 6, false for Phase 9)
  - fail-on: critical|serious|moderate|minor (default serious)

OUTPUT (JSON to stdout):
  {
    "status": "pass|partial|failed",
    "summary": "3 critical, 7 serious, 12 moderate, 4 minor violations across 5 routes",
    "routes_audited": ["/", "/login", "/dashboard", "/checkout", "/profile"],
    "violations": [
      {
        "id": "color-contrast",
        "severity": "serious",
        "rule": "WCAG 2.2 AA 1.4.3",
        "route": "/login",
        "element": "button.submit-btn",
        "selector": "button.submit-btn",
        "html": "<button class=\"submit-btn\">Sign in</button>",
        "message": "Element has insufficient color contrast (3.2:1, requires 4.5:1)",
        "fix_suggestion": "Change text color from #888 to #555 or background from #eee to #fff",
        "auto_fixable": true,
        "screenshot": "/screenshots/a11y/login-color-contrast.png",
        "engine": "axe-core"
      }
    ],
    "keyboard_flow": {
      "passed": false,
      "issues": ["Focus trapped in modal on /dashboard", "Skip link not visible on focus"]
    },
    "report_path": "/screenshots/a11y/report-2026-06-29.html"
  }
```

## WCAG 2.2 AA Coverage

The auditor checks all WCAG 2.2 AA success criteria that can be programmatically tested:

| WCAG criterion | What's checked | Tool |
|----------------|----------------|------|
| 1.1.1 Non-text Content | All `<img>` have `alt` (or `role="presentation"`) | axe |
| 1.3.1 Info and Relationships | Form fields have labels, headings hierarchical | axe |
| 1.4.3 Contrast (Minimum) | Text contrast ≥ 4.5:1 (or 3:1 for large text) | axe + Lighthouse |
| 1.4.4 Resize Text | Page works at 200% zoom | Lighthouse + manual |
| 1.4.10 Reflow | No horizontal scroll at 320px width | axe + responsive-validator |
| 1.4.11 Non-text Contrast | UI components ≥ 3:1 contrast | axe |
| 2.1.1 Keyboard | All interactions work with keyboard | manual sim |
| 2.1.2 No Keyboard Trap | Focus can leave any component | manual sim |
| 2.4.1 Bypass Blocks | Skip link present and functional | axe |
| 2.4.3 Focus Order | Tab order matches visual order | manual sim |
| 2.4.4 Link Purpose | Links have discernible text | axe |
| 2.4.6 Headings and Labels | Headings descriptive, not empty | axe |
| 2.4.7 Focus Visible | Focus indicator visible | axe + manual sim |
| 3.3.2 Labels or Instructions | Form fields have instructions | axe |
| 4.1.2 Name, Role, Value | All UI elements have accessible name | axe |
| 4.1.3 Status Messages | Status updates announced via `role="status"` | axe |

Criteria that can't be tested programmatically (e.g. 3.1.5 Reading Level) are flagged as "manual review needed" in the report.

## Auto-Fix Rules

The auditor can auto-apply fixes for common, low-risk issues:

| Issue | Auto-Fix |
|-------|----------|
| `<img>` missing `alt` | Add `alt=""` (decorative) IF image is in a button with text; otherwise flag for manual review |
| `<button>` with icon only (no text) | Add `aria-label` derived from context (e.g. "Close" for `.close-button`) |
| `<input>` without `<label>` | Add `aria-label` derived from `placeholder` or surrounding text |
| Heading order skipped (h1 → h3) | Renumber to h1 → h2 → h3 |
| `lang` attribute missing on `<html>` | Add `lang="en"` (or detected locale) |
| Missing skip link | Add `<a href="#main" class="skip-link">Skip to main content</a>` at top of body |
| Color contrast too low (simple case) | Adjust text color to nearest passing color (preserve hue) |
| Form field without `autocomplete` | Add `autocomplete` based on field name (email, password, name, etc.) |

Auto-fixes are applied via `frontend-bridge`, committed with `fix(a11y):` prefix. Each auto-fix includes a before/after screenshot for review.

**Auto-fix is OFF by default in Phase 9** (acceptance) — that's the "prove it works" phase, not the "fix it" phase. Manual review required there.

## Manual Test Simulations

Beyond axe-core, the auditor simulates user interactions to catch issues automated rules miss:

### Keyboard-Only Navigation Test
1. Reload page
2. Press Tab repeatedly
3. For each focus change:
   - Is the focus indicator visible? (red outline if not)
   - Does the focus order match visual order? (skip links, modal traps, etc.)
   - Can you reach all interactive elements? (buttons, links, inputs)
   - Can you escape every component? (no keyboard traps)
4. Test Shift+Tab (reverse), Enter (activate), Space (toggle), Escape (close)
5. Record full focus path as a list of element selectors

### Screen Reader Semantics Check
Without running an actual screen reader (slow), the auditor checks:
- Every interactive element has an accessible name (via `aria-label`, `aria-labelledby`, or text content)
- Headings are properly nested (h1 → h2 → h3, no skips)
- Landmarks exist (`<main>`, `<nav>`, `<header>`, `<footer>`, `<aside>`)
- Lists are marked up correctly (`<ul>`/`<ol>` with `<li>` children)
- Tables have `<caption>` and `<th scope>` for data tables
- Images have `alt` text (or `role="presentation"` for decorative)
- Dynamic content updates use `aria-live` regions

### High Contrast Mode
Force `forced-colors: active` and re-screenshot. Elements that disappear in high contrast (e.g. borders-only buttons with no background) are flagged.

### 200% Zoom Test
Set browser zoom to 200% (or viewport to half-size + deviceScaleFactor 2). Check:
- No horizontal scrollbar appears
- Text remains readable
- No elements overlap
- All functionality preserved

## CLI

```bash
# Basic audit on home page (axe + Lighthouse)
python3 scripts/browser_agent.py a11y --url http://localhost:3000

# Audit multiple routes
python3 scripts/browser_agent.py a11y --url http://localhost:3000 --routes /,/login,/dashboard,/checkout

# Strict WCAG 2.2 AA (Phase 9 acceptance)
python3 scripts/browser_agent.py a11y --url http://localhost:3000 --standard wcag22aa --engines both --keyboard-test --screen-reader-sim

# Quick Phase 6 guard (axe only, no manual sim)
python3 scripts/browser_agent.py a11y --url http://localhost:3000 --engines axe --no-keyboard-test --auto-fix

# Generate HTML report
python3 scripts/browser_agent.py a11y --url http://localhost:3000 --report /screenshots/a11y/report.html
```

## Violation Severity & Action

| Severity | Examples | Action |
|----------|----------|--------|
| **Critical** | Modal not keyboard-trapped, button with no name, focus invisible | BLOCKS commit. Auto-fix if possible, else route to frontend-bridge. |
| **Serious** | Contrast < 4.5:1, missing form label, missing `lang` | Route to frontend-bridge. Auto-fix where safe. |
| **Moderate** | Heading skip, missing skip-link, no `aria-live` on status | Batch fix in Phase 6. |
| **Minor** | Best-practice issues (e.g. heading used for styling only) | Log, fix opportunistically. |

## Self-Healing Loop

When a Critical/Serious violation is found:
1. Check if auto-fixable (consult Auto-Fix Rules table)
2. If yes: apply fix via `frontend-bridge`, re-audit, confirm violation resolved
3. If no: capture detailed diagnostics (HTML, screenshot, selector) → route to `frontend-bridge` with specific guidance
4. After fix: re-audit the affected route only (faster)
5. Max 3 self-heal attempts per violation, then escalate

## Phase-Specific Behavior

| Phase | Engines | Manual sim | Auto-fix | Fail-on |
|-------|---------|------------|----------|---------|
| Phase 4 (baseline) | axe | keyboard only | off | none (record baseline) |
| Phase 6 (guard) | axe | none | on | critical |
| Phase 9 (acceptance) | axe + lighthouse | all | off | serious |
| Phase 11 (pre-deploy) | axe + lighthouse | all | off | critical |

## Reports

The HTML report (generated when `--report` is passed) includes:
- Summary card: pass/fail per route
- Per-violation: rule, severity, element, HTML snippet, screenshot, suggested fix
- Keyboard flow visualization (focus path through the page)
- Color contrast failures with extracted text and background colors
- Manual review checklist (criteria that can't be auto-tested)
- Trend chart (compares to previous audits on the same route)

## Failure Modes & Recovery

| Symptom | Cause | Recovery |
|---------|-------|----------|
| axe-core injection fails | CSP blocks inline scripts | Use Lighthouse only, flag CSP issue for Phase 4 audit |
| Lighthouse returns 0 score | Page didn't load | Check `live-preview` started the app |
| False positive on contrast | Background is gradient (axe uses average color) | Manually verify, add `// axe-disable` comment if needed |
| Keyboard test "stuck" on element | Real keyboard trap | Critical bug — route to `frontend-bridge` immediately |
| Auto-fix broke the page | Bad fix (e.g. added `aria-label` with wrong text) | Revert fix, route to manual review |

## Tools

- **axe-core** — primary a11y engine, injected into page
- **Lighthouse** — secondary, cross-validates axe findings
- **aria-query** — for screen reader semantics simulation
- **Playwright** — for keyboard simulation + browser control

## Hard Rules

1. **Zero critical violations is non-negotiable for production.** Ship blocker.
2. **Auto-fix only applies safe, reversible changes.** Color contrast adjustment yes; restructuring DOM no.
3. **Never silence a violation with `// axe-disable` without a comment explaining why.** Audited in Phase 13.
4. **Manual sim is mandatory for Phase 9.** axe alone misses keyboard traps and focus order issues.
5. **Every violation needs a screenshot.** "Color contrast fails" without the offending element highlighted is unactionable.
6. **WCAG 2.2 AA is the floor, not the ceiling.** Strive for AAA where feasible (e.g. contrast 7:1 for body text).
7. **Never auto-fix during Phase 9 acceptance.** That's the verification phase — fixes happen in Phase 6.
