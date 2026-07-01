---
name: flow-simulator
description: "Simulate complex multi-step user journeys (login, checkout, signup, onboarding wizard) in a real browser. Records each step with screenshots, asserts on success states, and produces a replayable trace. Triggers in Phase 9 (Browser-Based Acceptance) and after major UI changes in Phase 6."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: browser-acceptance
---

# Flow Simulator

> Turns acceptance criteria from `spec.md` into executable browser flows. If an AC says "user can log in with email + password and see their dashboard", this sub-skill walks that flow end-to-end and proves it works.

## When to Use

| Trigger                                         | Example                                                    |
| ----------------------------------------------- | ---------------------------------------------------------- |
| Phase 6 — UI change to auth/checkout/onboarding | "I refactored the LoginForm component"                     |
| Phase 9 — Acceptance testing                    | Every SP-N item that touches a user-facing flow            |
| Phase 11 — Pre-rollout smoke test               | "Did the deploy break checkout?"                           |
| Bug report reproduction                         | "User says checkout fails on mobile" — reproduce, then fix |

**Do NOT use this for:** single-page visual diffing (use `visual-diff`), single screenshots (use `screenshot-capture`), accessibility scans (use `accessibility-auditor`). This sub-skill is for **multi-step journeys**, not single-state captures.

## What It Does

1. Reads `spec.md` acceptance criteria tagged with `[FLOW]`:
   ```
   AC-42 [FLOW]: User with valid credentials clicks "Sign in" → sees /dashboard within 2s
   AC-43 [FLOW]: User adds item to cart → checkout → sees order confirmation
   ```
2. Compiles each `[FLOW]` AC into a Playwright script:
   - Selector strategy: `role` > `label` > `text` > `testid` > `css` (never fragile xpath)
   - Wait strategy: smart — `waitForSelector` for elements, `waitForURL` for navigations, `waitForResponse` for XHRs
3. Executes the flow in a real browser (delegates browser lifecycle to `browser-launcher`)
4. Captures one screenshot per step + one video of the entire flow
5. Asserts on the success state defined in the AC
6. Emits a structured trace: every click, every network request, every console log, every assertion
7. Saves the trace to `evals/traces/<flow-name>-<timestamp>.zip` for replay

## Integration Contract

```
INPUT:
  - url: string (required) — base URL of the app
  - flows: comma-separated list of flow names (required)
       predefined: login, logout, signup, checkout, onboarding, search, profile-update
       custom: path/to/flow.yaml (see Flow Definition Format below)
  - context-id: optional (reuse existing browser session)
  - record-video: bool (default true)
  - collect-trace: bool (default true)
  - fail-fast: bool (default false) — stop on first failed step

OUTPUT (JSON to stdout):
  {
    "status": "ok|partial|failed",
    "flows": [
      {
        "name": "login",
        "status": "ok",
        "duration_ms": 1842,
        "steps_total": 4,
        "steps_passed": 4,
        "steps_failed": 0,
        "screenshots": ["/screenshots/login-step-1.png", ...],
        "video": "/screenshots/login-video.webm",
        "trace": "/evals/traces/login-2026-06-29T00-12-33.zip",
        "assertions": [
          {"name": "url contains /dashboard", "passed": true},
          {"name": "user avatar visible", "passed": true}
        ]
      }
    ],
    "summary": "3/3 flows passed"
  }

DEPENDENCIES:
  - browser-launcher (mandatory)
  - optional: live-preview (if app not running yet)
```

## Flow Definition Format (YAML)

For custom flows not covered by the predefined set:

```yaml
# flows/checkout.yaml
name: checkout
description: Add item to cart, complete checkout, see confirmation
steps:
  - action: goto
    url: /products
    wait_for: text=Products

  - action: click
    selector: "button:has-text('Add to cart')"
    wait_for: text="Added to cart"

  - action: click
    selector: "[data-testid=cart-icon]"
    wait_for: url=/cart

  - action: click
    selector: "button:has-text('Checkout')"
    wait_for: url=/checkout

  - action: fill
    selector: "[name=email]"
    value: "test@example.com"

  - action: fill
    selector: "[name=card]"
    value: "4242424242424242" # Stripe test card

  - action: click
    selector: "button:has-text('Pay')"
    wait_for: url=/orders/confirmation
    timeout_ms: 15000

assertions:
  - type: url_contains
    value: /orders/confirmation
  - type: text_visible
    value: "Order confirmed"
  - type: element_visible
    selector: "[data-testid=order-number]"
```

## Selector Strategy (priority order)

1. **`role`** — `page.getByRole("button", { name: "Sign in" })` — most resilient
2. **`label`** — `page.getByLabel("Email")` — works for form fields
3. **`text`** — `page.getByText("Welcome back")` — works for headings/buttons
4. **`testid`** — `page.getByTestId("cart-icon")` — explicit, stable
5. **`css`** — `page.locator(".cart-icon")` — last resort, fragile
6. **`xpath`** — FORBIDDEN (too brittle, breaks on DOM restructure)

Hard rule: **Every flow step must use a selector from tier 1-4.** Tier 5 requires a comment explaining why tiers 1-4 don't work. Tier 6 is forbidden — if you can't avoid it, the UI needs a `data-testid` added first (route to `frontend-bridge`).

## Predefined Flows (built-in)

| Flow             | Steps                                                          | Assertions                                              |
| ---------------- | -------------------------------------------------------------- | ------------------------------------------------------- |
| `login`          | goto /login → fill email → fill password → click Sign in       | url contains /dashboard, avatar visible                 |
| `logout`         | click avatar menu → click Sign out                             | url contains /login, signed-out state                   |
| `signup`         | goto /signup → fill name/email/password → click Create account | url contains /welcome, welcome message visible          |
| `checkout`       | goto /products → add to cart → checkout → fill payment → pay   | url contains /orders/confirmation, order number visible |
| `onboarding`     | signup → complete 3-step wizard → submit                       | url contains /dashboard, onboarding-completed flag set  |
| `search`         | fill search box → press Enter → click first result             | url contains /search, results list visible              |
| `profile-update` | goto /settings → update name → save → reload                   | updated name visible after reload                       |

Each predefined flow has fixture data (test users, test cards) baked in. Override via `--fixtures fixtures/my-flows.yaml`.

## Smart Waits (built-in)

| Wait type                         | When applied                                                         |
| --------------------------------- | -------------------------------------------------------------------- |
| `waitForSelector`                 | After every `click` and `fill` — wait for the next expected element  |
| `waitForURL`                      | After clicks that trigger navigation                                 |
| `waitForResponse`                 | After form submits that fire XHR — wait for the API call to complete |
| `waitForLoadState("networkidle")` | After every navigation                                               |
| `waitForFunction`                 | For custom predicates (e.g. "wait until window.appReady === true")   |

Anti-pattern (forbidden): `page.waitForTimeout(2000)`. Fixed sleeps are flaky. If you need to wait, wait for a state change, not a duration.

## Recording & Trace

Every flow run produces:

- **Step screenshots** — one PNG per step, named `<flow>-step-<n>.png`
- **Video** — `.webm` of the entire flow (only when `--record-video`)
- **Trace** — Playwright trace ZIP, openable with `npx playwright show-trace <file>`
- **Console log** — JSONL of every `console.log`/`error`/`warning`
- **Network log** — JSONL of every request/response with timing

The trace is the single most valuable artifact when a flow fails. It lets you replay the exact execution and see what the browser saw.

## Failure Modes & Recovery

| Symptom                                                        | Cause                                        | Recovery                                                 |
| -------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------- |
| `TimeoutError: Timeout 30000ms exceeded waiting for selector`  | Element not in DOM, or selector wrong        | Capture DOM snapshot, route to `debug-entry`             |
| `Error: strict mode violation: locator resolved to 3 elements` | Selector too broad                           | Tighten selector (add `name=` or use role)               |
| `Error: net::ERR_ABORTED`                                      | Navigation interrupted (often auth redirect) | Check if flow needs to run after login                   |
| `expect(received).toContain(expected)` — assertion fail        | App state wrong                              | Capture screenshot + DOM, log to spec-sync for AC review |
| Flow passes locally, fails in CI                               | Timezone / locale / env vars differ          | Pin `--locale en-US --timezone UTC` in CI                |

## Self-Healing Loop

When a flow step fails:

1. Capture screenshot + DOM snapshot of the failure point
2. Run `debug-entry` to root-cause: is it a selector change? A real bug? An async race?
3. If selector drift: auto-update the flow definition's selector (record in `OMNIPROJECT_SELF_IMPROVEMENT.md`)
4. If real bug: route to `tdd` sub-skill (write failing test) → `frontend-bridge` (fix)
5. If async race: add explicit `waitForResponse` to the step, retry
6. Max 3 self-heal attempts per flow, then fail and escalate

## Quality Gates (before declaring "flow passed")

- [ ] Every step screenshot captured (no missing frames)
- [ ] All assertions passed (not just "no error" — explicit assertions on success state)
- [ ] No `pageerror` events in console log
- [ ] No `requestfailed` for same-origin XHRs
- [ ] Total duration < 30s (warn) / < 60s (fail) — flows should be fast
- [ ] Video file is non-empty (proves the flow actually ran)

## Spec-Sync

After a flow passes, write the trace URL back to the spec:

```
AC-42 [FLOW]: login — PASSED 2026-06-29
  Trace: evals/traces/login-2026-06-29T00-12-33.zip
  Duration: 1.8s
```

After a flow fails, mark the AC as `[FAILING]` in spec and route to Phase 6 EXECUTE for fixing.

## CLI

```bash
# Run predefined login flow
python3 scripts/browser_agent.py flows --url http://localhost:3000 --flows login

# Run multiple flows
python3 scripts/browser_agent.py flows --url http://localhost:3000 --flows login,checkout,signup

# Run custom flow from YAML
python3 scripts/browser_agent.py flows --url http://localhost:3000 --flows ./flows/my-flow.yaml

# Reuse existing browser session
python3 scripts/browser_agent.py flows --url http://localhost:3000 --flows login --context-id <uuid>

# Disable video (faster, less disk)
python3 scripts/browser_agent.py flows --url http://localhost:3000 --flows login --no-video
```

## Tools

- **Playwright Test runner** — for executing flows with rich assertion API
- **Playwright Trace Viewer** — for replaying and debugging failed flows
- **axe-core** — optional a11y check after each step (set `--a11y-each-step`)

## Hard Rules

1. **Every flow must end with an explicit assertion.** "No errors" is not an assertion — it's the absence of failure. Assert on URL, text, or element presence.
2. **Never use `waitForTimeout`.** Wait for state, never for time.
3. **Never store real credentials in flow definitions.** Use env vars: `${TEST_USER_EMAIL}`, `${TEST_USER_PASSWORD}`.
4. **Every custom flow must be checked into the repo** under `flows/<name>.yaml` — no ephemeral flow scripts.
5. **A passing flow today must pass tomorrow.** If a flow breaks due to legit UI change, update the flow YAML in the same commit as the UI change.
