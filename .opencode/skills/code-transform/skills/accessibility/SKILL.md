---
name: accessibility
description: "Code-level accessibility guide — WCAG 2.2 AA compliance, semantic HTML first, ARIA only when needed, keyboard navigation, screen reader support, color contrast. The code-review counterpart to accessibility-auditor (which runs in a browser). Triggers in Phase 4 (a11y review) and Phase 6 (a11y fixes)."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: cross-cutting
---

# Accessibility

> Semantic HTML first. ARIA only when needed. Keyboard always works. Visible focus. Sufficient contrast. The browser is the best assistive technology — use its built-in semantics, don't reinvent them with `<div>`.

## When to Use

| Phase                | Trigger                                  | Why                                                                     |
| -------------------- | ---------------------------------------- | ----------------------------------------------------------------------- |
| Phase 4 — AUDIT      | Dimension 14 (Accessibility Baseline)    | Code-level a11y review before browser audit                             |
| Phase 6 — EXECUTE    | Any UI commit                            | Catch `<div onClick>`, missing `alt`, broken heading order before merge |
| Phase 6 — EXECUTE    | Bug report "can't tab past modal"        | Find the keyboard trap in code                                          |
| Phase 9 — ACCEPTANCE | Cross-check with `accessibility-auditor` | Code review + browser audit together                                    |

**Do NOT use this sub-skill for:** running axe-core or Lighthouse (use `accessibility-auditor`), keyboard-flow simulation (use `accessibility-auditor` manual sim), or visual contrast screenshots (use `accessibility-auditor`). This sub-skill is the _code-review guide_ — it reads source, not the DOM. The two are complementary: this one catches patterns at write time; `accessibility-auditor` catches runtime issues at audit time.

## What It Does

1. Scans source files for a11y code-level violations (jsx-a11y, eslint-plugin-jsx-a11y)
2. Detects semantic HTML issues: `<div onClick>` instead of `<button>`, missing `<label>`, broken heading hierarchy
3. Detects ARIA misuse: `aria-label` on element with visible text, `role="button"` on `<button>` (redundant), `aria-live` on wrong element
4. Detects keyboard issues: `onClick` without `onKeyDown`/`onKeyUp`, no `Escape` handler on modals, no focus trap
5. Detects contrast issues in code: hardcoded colors that fail WCAG AA (4.5:1 body, 3:1 large, 3:1 UI)
6. Detects missing `alt` text, missing `<html lang>`, missing skip link
7. Auto-fixes common issues (add `lang="en"`, add `aria-label` to icon button, swap `<div onClick>` for `<button>`)
8. Routes complex issues to `frontend-bridge` (component refactor) or `accessibility-auditor` (runtime verification)

## Integration Contract

```
INPUT:
  - project_root: string (required)
  - target: file|directory (required)
  - action: audit|auto-fix|lint (default audit)
  - standard: wcag2aa|wcag21aa|wcag22aa (default wcag22aa)
  - auto_fix: bool (default false for Phase 9, true for Phase 6)

OUTPUT (JSON to stdout):
  {
    "status": "pass|partial|failed",
    "violations": [
      {
        "rule": "jsx-a11y/click-events-have-key-events",
        "severity": "critical",
        "file": "Card.tsx",
        "line": 14,
        "html": "<div onClick={handleClick}>",
        "fix": "use <button> or add onKeyDown + tabIndex + role",
        "auto_fixable": true
      },
      {
        "rule": "heading-order",
        "severity": "moderate",
        "file": "Page.tsx",
        "line": 32,
        "message": "h3 follows h1 (skipped h2)",
        "fix": "use h2"
      }
    ],
    "summary": {"critical": 2, "serious": 4, "moderate": 7, "minor": 3},
    "report_path": "/tmp/ct-<uuid>/a11y-code-audit.html"
  }

SIDE EFFECTS:
  - May modify source files (auto-fix: swap <div> for <button>, add lang, add alt)
  - Configures eslint-plugin-jsx-a11y in .eslintrc
  - Routes runtime checks to accessibility-auditor
```

## CLI

```bash
# Audit source for a11y violations
python3 scripts/quality_agent.py a11y-code --action audit --target ./src

# Auto-fix what's safe (Phase 6 only — never in Phase 9)
python3 scripts/quality_agent.py a11y-code --action auto-fix --target ./src

# Lint (CI mode — fails on critical/serious)
python3 scripts/quality_agent.py a11y-code --action lint --target ./src --fail-on serious
```

## Principles

| Principle                     | What it means                                                                                                     |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Semantic HTML first**       | Use `<button>`, `<a>`, `<nav>`, `<main>`, `<label>`. Don't rebuild them with `<div>` + ARIA.                      |
| **ARIA only when needed**     | ARIA doesn't add behavior — it adds semantics. If HTML has the element, use it. No `role="button"` on `<button>`. |
| **Keyboard always works**     | Every interaction reachable by Tab, operable by Enter/Space/Escape/arrows. No mouse-only.                         |
| **Visible focus**             | `:focus-visible` ring on every interactive element. Never `outline: none` without replacement.                    |
| **Sufficient contrast**       | 4.5:1 body text, 3:1 large text (≥24px or ≥18.66px bold), 3:1 UI components (borders, icons).                     |
| **Don't rely on color alone** | Error messages have an icon + text, not just red border. Colorblind users see the error.                          |

## Semantic HTML Cheatsheet

| Don't                       | Do                                                                                          | Why                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `<div onClick>`             | `<button onClick>`                                                                          | Button gets keyboard, focus, role for free                  |
| `<div class="link">`        | `<a href>`                                                                                  | Anchor gets Enter key + URL semantics                       |
| `<span class="heading">`    | `<h1>`/`<h2>`/`<h3>`                                                                        | Headings are navigation landmarks for screen readers        |
| `<div role="navigation">`   | `<nav>`                                                                                     | Native, well-supported, no ARIA needed                      |
| `<div role="main">`         | `<main>`                                                                                    | Same                                                        |
| `<div role="article">`      | `<article>`                                                                                 | Same                                                        |
| `<div role="banner">`       | `<header>`                                                                                  | Same                                                        |
| `<div role="contentinfo">`  | `<footer>`                                                                                  | Same                                                        |
| `<div role="form">`         | `<form>`                                                                                    | Same                                                        |
| `<input><span>Email</span>` | `<label><input/>Email</label>` or `<label htmlFor="email">Email</label><input id="email"/>` | Clicking label focuses input; screen reader announces label |
| `<img src="x.png">`         | `<img src="x.png" alt="Chart showing Q3 revenue up 12%">`                                   | Decorative: `alt=""`. Meaningful: descriptive alt.          |
| `<table>` no headers        | `<th scope="col">` for column headers                                                       | Screen readers navigate by headers                          |

## ARIA Use Cases (when HTML isn't enough)

| Pattern            | ARIA                                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------------------- |
| Icon-only button   | `<button aria-label="Close"><XIcon/></button>` (label not visible)                                             |
| Field with hint    | `<input aria-describedby="email-hint"/>` + `<p id="email-hint">We'll never share</p>`                          |
| Field with error   | `<input aria-invalid="true" aria-describedby="email-error"/>` + `<p id="email-error" role="alert">Invalid</p>` |
| Dynamic status     | `<div role="status">3 items saved</div>` (polite, announces when changed)                                      |
| Alert (immediate)  | `<div role="alert">Connection lost</div>` (assertive, announces immediately)                                   |
| Loading            | `<button aria-busy="true" disabled>Saving...</button>`                                                         |
| Live region        | `<div aria-live="polite">` for non-critical updates (e.g. "showing 5 of 10")                                   |
| Expanded/collapsed | `<button aria-expanded="false" aria-controls="panel">Toggle</button>`                                          |
| Current page       | `<a href="/" aria-current="page">Home</a>`                                                                     |
| Modal open         | `<div role="dialog" aria-modal="true" aria-labelledby="title">`                                                |

## Keyboard Navigation Rules

| Element                 | Keys                                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| Button / Link           | Tab to focus, Enter/Space to activate                                                           |
| Modal                   | Tab cycles within modal (focus trap), Escape closes, focus returns to trigger                   |
| Dropdown menu           | Arrow keys to navigate, Enter to select, Escape to close                                        |
| Tabs                    | Tab to enter, Arrow Left/Right between tabs, Tab again to leave                                 |
| Combobox / Autocomplete | Arrow Down to open, type to filter, Arrow Up/Down to navigate, Enter to select, Escape to close |
| Tooltip                 | Focus (Tab) shows tooltip, blur hides it (not just hover)                                       |
| Slider                  | Arrow Left/Right (or Up/Down) to change value, Home/End for min/max                             |
| Dialog                  | First focusable element gets focus on open; focus returns to trigger on close                   |

Hard rules:

- Tab order matches visual order (use DOM order, not `tabindex` tricks)
- `tabindex="0"` only for non-interactive elements made interactive (rare); `tabindex="-1"` to skip or programmatically focus
- Never `tabindex > 0` — it breaks DOM-order navigation
- Escape closes modals, dropdowns, popovers
- Enter/Space activates buttons (native `<button>` does this for free)

## Contrast (WCAG AA)

| Element                                            | Ratio  | Notes                               |
| -------------------------------------------------- | ------ | ----------------------------------- |
| Body text < 24px (or < 18.66px bold)               | 4.5:1  | Most text                           |
| Large text ≥ 24px (or ≥ 18.66px bold)              | 3:1    | Headings                            |
| UI components (button borders, focus rings, icons) | 3:1    | WCAG 2.1 1.4.11                     |
| Disabled elements                                  | exempt | But should still be distinguishable |
| Decorative                                         | exempt | Pure decoration                     |

Test with: `accessibility-auditor` (axe-core) for automated; manual check with high-contrast mode for edge cases.

## Failure Modes & Recovery

| Symptom                                 | Cause                                      | Recovery                                                                              |
| --------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------- |
| `<div onClick>` not keyboard accessible | Wrong element                              | Swap for `<button>` (preferred) or add `role="button"` + `tabIndex={0}` + `onKeyDown` |
| Modal traps focus forever               | No focus trap escape                       | Add Escape handler + focus-return-to-trigger; use Radix Dialog                        |
| Screen reader skips content             | Heading hierarchy broken (h1 → h3)         | Renumber to h1 → h2 → h3                                                              |
| Tab order jumps around                  | `tabindex > 0` set manually                | Remove tabindex, reorder DOM                                                          |
| Click label doesn't focus input         | `<label>` not wrapping/`htmlFor` the input | Use `<label htmlFor="id">` or wrap input in label                                     |
| Focus ring invisible                    | `outline: none` with no replacement        | Add `:focus-visible { outline: 2px solid var(--brand-500); outline-offset: 2px; }`    |
| Icon button has no name                 | `<button><Icon/></button>`                 | Add `aria-label="Close"` (or visible text + `aria-hidden` on icon)                    |

## Self-Healing Loop

When an a11y violation is found in code:

1. Identify the rule (jsx-a11y/\*, heading-order, contrast, focus-ring)
2. Apply the mechanical fix (swap `<div>` for `<button>`, add `aria-label`, add `:focus-visible`)
3. Re-lint the file
4. If the fix needs design judgment (e.g. focus ring color) → route to `css-styling` + `frontend-bridge`
5. After all code-level fixes: route to `accessibility-auditor` for runtime verification (axe + keyboard sim)
6. Max 3 self-heal attempts per violation, then escalate

## Quality Gates (enforced before "a11y code-clean")

- [ ] Zero `<div onClick>` without keyboard handler + role + tabIndex (or swap to `<button>`)
- [ ] Every `<input>` has a `<label>` (or `aria-label` if visible label impossible)
- [ ] Every `<img>` has `alt` (descriptive if meaningful, `""` if decorative)
- [ ] Heading hierarchy: exactly one `<h1>`, no skips (h1 → h2 → h3)
- [ ] `<html lang>` set
- [ ] Skip link present (`<a href="#main" class="skip">Skip to main</a>`)
- [ ] `:focus-visible` ring on every interactive element, visible in light + dark
- [ ] Color contrast ≥ 4.5:1 body, 3:1 large, 3:1 UI (route contrast check to `accessibility-auditor`)
- [ ] Modals have: focus trap, Escape to close, focus return to trigger
- [ ] No `tabindex > 0` anywhere
- [ ] All dynamic messages use `role="status"` (polite) or `role="alert"` (assertive)
- [ ] Icon-only buttons have `aria-label`

## Tools

- **eslint-plugin-jsx-a11y** — static analysis for React JSX (catches `<div onClick>`, missing `alt`, etc.)
- **axe-core** — runtime a11y engine (delegates to `accessibility-auditor`)
- **@axe-core/playwright** — axe in Playwright tests
- **Lighthouse a11y audit** — runtime (delegates to `accessibility-auditor`)
- **Radix UI** — accessible primitives (focus trap, ARIA, keyboard — all handled)
- **@headlessui/react** — alternative accessible primitives
- **NVDA (Windows)** / **VoiceOver (macOS/iOS)** / **TalkBack (Android)** — manual screen reader testing
- **WAVE** (browser extension) — visual a11y overlay for quick checks
- **color-contrast-checker** (Chrome DevTools) — verify ratios

## Hard Rules

1. **Never use `<div>` for interactive elements.** Use `<button>` (actions) or `<a>` (navigation). They get keyboard, focus, and ARIA for free. If you must use `<div>`, add `role`, `tabIndex={0}`, and `onKeyDown` — but you almost never must.
2. **Never remove focus indicators without a replacement.** `outline: none` without a `:focus-visible` ring is a hard fail. Keyboard users literally cannot see where they are.
3. **Always use semantic HTML first.** `<nav>`, `<main>`, `<header>`, `<footer>`, `<article>`, `<section>`, `<form>`, `<label>` — they have built-in semantics and keyboard behavior. ARIA is a patch, not a replacement.
4. **Always test with keyboard only.** Unplug the mouse. Can you reach every interactive element? Can you operate every control? Can you escape every modal? If not, it's broken.
5. **Always provide alt text.** Descriptive for meaningful images (`alt="Chart showing Q3 revenue up 12%"`), empty for decorative (`alt=""`). Never omit the attribute — screen readers announce the filename.
6. **Always maintain heading hierarchy.** Exactly one `<h1>` per page, no skips (h1 → h2 → h3). Screen reader users navigate by headings; skips are disorienting.
7. **Always label inputs.** `<label htmlFor>` or wrap the input. Placeholder is not a label — it disappears on focus and fails screen reader announcement.
8. **Never rely on color alone.** Error states need an icon + text, not just red. Status indicators need a shape/label. Colorblind users (1 in 12 men) miss color-only signals.
9. **Always set `<html lang>`.** Screen readers use it for pronunciation. A page in Arabic with `lang="en"` is read with English pronunciation — unintelligible.
10. **Always pair code-level lint with runtime audit.** This sub-skill catches patterns at write time; `accessibility-auditor` catches runtime issues. Both run in Phase 6 and Phase 9.
