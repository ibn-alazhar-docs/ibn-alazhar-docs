---
name: webapp-testing
description: "Web app testing strategy — Playwright E2E, Vitest/Jest unit, Testing Library integration, MSW API mocking, visual regression via screenshots. Enforces the pyramid (70/20/10), behavior-over-implementation testing, role/label selectors, and CI timing budgets. Triggers in Phase 4 (test audit), Phase 6 (test guard), Phase 9 (acceptance)."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: frontend
---

# Webapp Testing

> Test behavior, not implementation. 70% unit, 20% integration, 10% E2E. Mock external APIs with MSW. Use role/label selectors, not `data-testid` (last resort). Never `setTimeout` in tests — use `findBy*`.

## When to Use

| Phase | Trigger | Why |
|-------|---------|-----|
| Phase 4 — AUDIT | Dimension 11 (Test Coverage) | Map existing tests against pyramid |
| Phase 6 — EXECUTE | Any commit (Test Guard) | Run affected slice, gate on regressions |
| Phase 9 — ACCEPTANCE | Critical user flows | Playwright E2E proves the flow works |
| Phase 11 — ROLLOUT | Pre-deploy smoke | Run smoke E2E against staging |

**Do NOT use this sub-skill for:** performance/load testing (use `performance-profiling`), accessibility audits (use `accessibility-auditor`), or visual diffing infrastructure (use `visual-diff`). This sub-skill owns the *test strategy and tooling*.

## What It Does

1. Inventories existing tests: unit (Vitest/Jest), integration (Testing Library + jsdom), E2E (Playwright/Cypress), visual (Playwright screenshots)
2. Classifies each test against the pyramid: 70/20/10 ratio. Flags inverted pyramids (mostly E2E, no unit) as expensive-to-maintain
3. Detects anti-patterns: `setTimeout` in tests, `data-testid` overuse, implementation-detail assertions (`expect(state.mock.calls).toBe(2)`), missing MSW handlers
4. Generates missing tests: unit for pure functions, integration for components, E2E for critical paths
5. Sets up MSW for API mocking (handlers per route, fixture data via faker)
6. Configures CI: unit on every PR (< 60s), integration on every PR (< 3min), E2E on deploy + nightly (< 15min)
7. Sets up Playwright visual regression: screenshot baseline per route, diff on change, route to `visual-diff` for review
8. Wires coverage gate: 80% lines / 70% branches minimum (configurable)

## Integration Contract

```
INPUT:
  - project_root: string (required)
  - target: file|directory (required)
  - action: audit|generate-unit|generate-integration|generate-e2e|run|ci-config (default audit)
  - framework: vitest|jest (optional, auto-detected)
  - e2e_framework: playwright|cypress (optional, auto-detected)
  - coverage_min: number (default 80)

OUTPUT (JSON to stdout):
  {
    "status": "ok|error",
    "pyramid": {"unit": 142, "integration": 38, "e2e": 12, "ratio": "79/21/7"},
    "coverage": {"lines": 84, "branches": 71, "functions": 78, "statements": 84},
    "violations": [
      {"rule": "no-settimeout-in-tests", "file": "login.test.tsx", "line": 24, "fix": "use findByRole('button') instead"},
      {"rule": "testid-overuse", "file": "Header.tsx", "count": 8, "fix": "use getByRole('navigation') + getByText"},
      {"rule": "missing-msw-handler", "route": "/api/user", "fix": "add http.get handler"}
    ],
    "generated": {"unit": 4, "integration": 2, "e2e": 1},
    "report_path": "/tmp/ct-<uuid>/test-audit.html"
  }

SIDE EFFECTS:
  - May install @playwright/test, @testing-library/react, msw, @faker-js/faker
  - Writes test files, MSW handlers, Playwright config
  - Updates CI workflow (.github/workflows/test.yml)
```

## CLI

```bash
# Audit current test pyramid + coverage
python3 scripts/quality_agent.py tests --action audit --target ./src

# Generate unit tests for a module
python3 scripts/quality_agent.py tests --action generate-unit --target ./src/lib/format.ts

# Generate integration tests for a component
python3 scripts/quality_agent.py tests --action generate-integration --target ./src/components/Checkout.tsx

# Generate E2E for a critical flow
python3 scripts/quality_agent.py tests --action generate-e2e --flow "login → dashboard → logout"

# Run affected tests (changed files + their dependents)
python3 scripts/quality_agent.py tests --action run --changed-since main

# Configure CI (writes .github/workflows/test.yml)
python3 scripts/quality_agent.py tests --action ci-config --coverage-min 80
```

## Decision Tree (autonomous)

```
Q: What's being tested?
  PURE FUNCTION (no DOM, no async)
    → Vitest (or Jest if already in use). No DOM needed. Fast (<100ms each).
  COMPONENT (renders, user interacts)
    → Testing Library + Vitest in jsdom environment.
      Use getByRole / getByLabelText / getByText — never getByTestId unless no alternative.
      Mock API with MSW (request interceptors), not axios.mock.
  PAGE / FLOW (multi-step, real browser)
    → Playwright E2E. Use page.getByRole, page.getByLabel.
      Mock external APIs with MSW (or route.fetch interception).
      Only test critical paths — E2E is slow.
  VISUAL (does this look right?)
    → Playwright screenshot + visual-diff. Don't test pixel-perfect (flaky); test layout regions.
  API ROUTE (server-side)
    → Vitest + in-memory DB (or testcontainers). Don't mock the DB; use a real one.

Q: Is this test testing behavior or implementation?
  BEHAVIOR ("user clicks X, sees Y") → keep
  IMPLEMENTATION ("state.setLoading was called twice") → rewrite as behavior, or delete

Q: Is the test flaky?
  YES → caused by: setTimeout, real timers, network, animation, random data
        Fix: use findBy* (waits), fake timers, MSW, prefers-reduced-motion, faker seed
```

## Patterns

### Test behavior, not implementation
```tsx
// ❌ implementation detail
expect(setLoadingMock).toHaveBeenCalledTimes(2);
expect(state.isLoading).toBe(true);

// ✅ behavior
const button = screen.getByRole('button', { name: /save/i });
await user.click(button);
expect(await screen.findByText(/saved/i)).toBeInTheDocument();
```

### Role/label selectors (accessibility-aligned)
```tsx
// ❌ fragile
screen.getByTestId('submit-btn');
screen.getByClassName('btn-primary');

// ✅ accessible + stable
screen.getByRole('button', { name: /submit/i });
screen.getByLabelText(/email address/i);
screen.getByText(/welcome back/i);
```
Bonus: if you can't select by role/label, your component isn't accessible — fix the component.

### MSW for API mocking
```ts
// handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/user', () => HttpResponse.json({ id: 1, name: 'Ada' })),
  http.post('/api/login', async ({ request }) => {
    const { email } = await request.json();
    if (email === 'taken@example.com') return HttpResponse.json({ error: 'exists' }, { status: 409 });
    return HttpResponse.json({ ok: true });
  }),
];
```

### Wait strategies (no setTimeout)
```tsx
// ❌ flaky
setTimeout(() => expect(screen.getByText('saved')).toBeInTheDocument(), 500);

// ✅ waits up to 1000ms (default)
expect(await screen.findByText('saved')).toBeInTheDocument();

// ✅ explicit wait for non-DOM conditions
await waitFor(() => expect(mockFn).toHaveBeenCalledWith('arg'));
```

### E2E critical flow
```ts
test('user can checkout', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /shop/i }).click();
  await page.getByRole('button', { name: /add to cart/i }).first().click();
  await page.getByRole('link', { name: /cart/i }).click();
  await page.getByRole('button', { name: /checkout/i }).click();
  await expect(page).toHaveURL(/checkout/);
  await expect(page.getByText(/order confirmed/i)).toBeVisible({ timeout: 10_000 });
});
```

## Pyramid & CI Strategy

| Layer | % of tests | Tool | Runs on | Budget |
|-------|-----------|------|---------|--------|
| Unit | 70% | Vitest | every PR | < 60s total |
| Integration | 20% | Testing Library + jsdom | every PR | < 3min total |
| E2E | 10% | Playwright | deploy + nightly | < 15min total |
| Visual | as needed | Playwright screenshots | PR (changed routes) | < 5min added |

Inverted pyramid (mostly E2E, no unit) = slow CI, flaky tests, expensive to maintain. Flag and rebalance.

## Failure Modes & Recovery

| Symptom | Cause | Recovery |
|---------|-------|----------|
| Test flaky in CI only | Real timers / network / animation | Use `vi.useFakeTimers`, MSW, `prefers-reduced-motion` |
| `getByRole` throws "multiple elements" | Ambiguous selector | Pass `{ name: /specific text/i }` to disambiguate |
| E2E times out on slow CI | 30s default too low | Bump to 60s, or use `waitFor` with shorter timeout |
| Coverage gate fails | New code untested | Generate unit tests via `--action generate-unit` |
| MSW handler missing | New API route added | Run `--action audit`, add handler to `handlers.ts` |
| Visual regression false positive | Anti-aliased fonts / timestamps | Set Playwright `threshold: 0.2`, mask dynamic regions |
| Test passes locally, fails in CI | Environment drift | Run in same Docker image; pin Node version |

## Self-Healing Loop

When a test violation is found:
1. Identify the rule (`no-settimeout`, `testid-overuse`, `missing-msw-handler`, `implementation-detail`)
2. Apply the mechanical fix (swap `setTimeout` for `findBy`, replace `getByTestId` with `getByRole`)
3. Re-run the test, confirm pass
4. If the fix would require component refactor (no role/label available) → route to `frontend-bridge` + `accessibility` to fix the component first
5. Max 3 self-heal attempts per test, then escalate

## Quality Gates (enforced before "tests pass")

- [ ] Pyramid ratio 70/20/10 ±10% (no inverted pyramid)
- [ ] Coverage ≥ 80% lines, ≥ 70% branches (configurable)
- [ ] Zero `setTimeout` in tests (use `findBy*` / `waitFor`)
- [ ] Zero `data-testid` unless commented justification (last resort)
- [ ] All API calls mocked via MSW (no real network in unit/integration)
- [ ] All E2E uses role/label selectors (accessibility-aligned)
- [ ] E2E suite < 15 min total (parallelized across workers)
- [ ] Visual regression baselines committed (not gitignored)
- [ ] Faker seed set (deterministic test data) via `faker.seed(12345)`
- [ ] Critical paths have E2E: login, checkout, core action, logout

## Tools

- **Vitest** — default test runner for Vite projects. Fast, ESM-native, Jest-compatible API.
- **Jest** — legacy runner; use only if already installed.
- **@testing-library/react** — component tests, role-based queries, `userEvent`.
- **@testing-library/user-event** — realistic user interactions (better than `fireEvent`).
- **@playwright/test** — E2E, visual regression, multi-browser, parallel.
- **Cypress** — alternative E2E; use only if already installed (Playwright preferred).
- **MSW (Mock Service Worker)** — API mocking for unit/integration/E2E. Intercepts at service worker level.
- **@faker-js/faker** — realistic test data. Always `faker.seed(...)` for determinism.
- **@vitest/coverage-v8** — coverage via V8 (faster than Istanbul).
- **Storybook + interaction tests** — component tests in isolation, visual documentation.

## Hard Rules

1. **Never test implementation details.** `expect(mock.calls.length).toBe(2)` is brittle — refactor breaks it. Test behavior: `expect(await screen.findByText('saved')).toBeInTheDocument()`.
2. **Never use `setTimeout` in tests.** Use `findBy*` (auto-waits up to 1000ms) or `waitFor`. `setTimeout` is flaky and slow.
3. **Never skip E2E for critical paths.** Login, checkout, core action, logout — every PR or pre-deploy. "It's slow" is not an excuse; parallelize.
4. **Always mock external APIs with MSW.** Real network calls in tests = flaky + slow. MSW intercepts at the edge; your app code doesn't know it's mocked.
5. **Never use `data-testid` as the first choice.** Use `getByRole`, `getByLabelText`, `getByText`. If you can't, the component is inaccessible — fix the component, then the test selector gets easier.
6. **Always set `faker.seed(...)`.** Random test data = flaky tests. Seeded faker = reproducible failures.
7. **Never run E2E on every PR for slow suites.** Run smoke (3-5 flows) on PR, full suite nightly + on deploy. Budget: PR < 5min, full < 15min.
8. **Always parallelize E2E across workers.** Playwright `--workers=N`. Serial E2E = CI bottleneck.
9. **Never commit broken tests "to fix later".** Either fix now, delete the test, or mark `.skip` with a linked issue. Main must always be green.
10. **Always write the test before claiming the feature works.** Phase 9 acceptance requires a passing E2E for the AC. "It works on my machine" without a test is not acceptance.
