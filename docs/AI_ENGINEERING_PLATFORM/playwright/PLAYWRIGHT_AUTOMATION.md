# Playwright Automation

> **Purpose:** Define browser automation architecture for visual, RTL, interaction, accessibility, and responsive checks.
> **Scope:** Test suite design, screenshot pipelines, validation checks, integration with verification engine.

---

## 1. Playwright Automation Overview

Playwright provides browser-based UI verification for the AI Engineering Platform. It validates that implemented UI changes render correctly across browsers, viewports, and language directions.

```
┌─────────────────────────────────────────────────────┐
│              PLAYWRIGHT AUTOMATION                   │
│                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐│
│  │ Visual   │ │ RTL      │ │ Inter-   │ │ Access- ││
│  │ Validation│ │Validation│ │action    │ │ibility  ││
│  └──────────┘ └──────────┘ └──────────┘ └─────────┘│
│                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│  │Responsive│ │Screenshot│ │ Per-     │             │
│  │ Checks   │ │ Pipeline │ │ formance │             │
│  └──────────┘ └──────────┘ └──────────┘             │
└─────────────────────────────────────────────────────┘
```

---

## 2. Test Suite Architecture

### 2.1 Test Organization

```
e2e/
├── fixtures/
│   ├── auth.ts              # Authentication fixture
│   └── db.ts                # Database seed fixture
├── pages/
│   ├── login.page.ts        # Login page object
│   ├── dashboard.page.ts    # Dashboard page object
│   └── files.page.ts        # Files page object
├── specs/
│   ├── visual/
│   │   ├── landing.spec.ts
│   │   ├── dashboard.spec.ts
│   │   └── auth.spec.ts
│   ├── rtl/
│   │   ├── layout.spec.ts
│   │   ├── typography.spec.ts
│   │   └── navigation.spec.ts
│   ├── interaction/
│   │   ├── forms.spec.ts
│   │   ├── navigation.spec.ts
│   │   └── file-upload.spec.ts
│   ├── accessibility/
│   │   ├── wcag.spec.ts
│   │   └── screen-reader.spec.ts
│   └── responsive/
│       ├── mobile.spec.ts
│       ├── tablet.spec.ts
│       └── desktop.spec.ts
├── snapshots/               # Baseline screenshots
│   ├── ar/                  # Arabic (RTL) snapshots
│   └── en/                  # English (LTR) snapshots
└── utils/
    ├── screenshot.ts        # Screenshot utilities
    └── comparison.ts        # Image comparison utilities
```

### 2.2 Test Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [['html', { outputFolder: 'playwright-report' }], ['json']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-rtl',
      use: { ...devices['Desktop Chrome'], locale: 'ar-SA', viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'chromium-ltr',
      use: { ...devices['Desktop Chrome'], locale: 'en-US', viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'mobile-rtl',
      use: { ...devices['Pixel 5'], locale: 'ar-SA' },
    },
    {
      name: 'mobile-ltr',
      use: { ...devices['iPhone 12'], locale: 'en-US' },
    },
  ],
});
```

---

## 3. Visual Validation

### 3.1 Screenshot Comparison

Visual validation compares rendered pages against baseline screenshots:

```typescript
test('dashboard renders correctly (Arabic RTL)', async ({ page }) => {
  await page.goto('/ar/dashboard');
  await expect(page).toHaveScreenshot('dashboard-ar.png', {
    maxDiffPixels: 100,
    threshold: 0.1,
  });
});
```

### 3.2 Baseline Management

| Action | When | Process |
|---|---|---|
| Create baseline | New page/feature | Run with `--update-snapshots` |
| Update baseline | Intentional UI change | Review diff, then `--update-snapshots` |
| Compare baseline | Every verification run | Automated comparison |

### 3.3 Screenshot Pipeline

```
Test Execution
  │
  ▼
1. Navigate to page
  │
  ▼
2. Wait for page to be stable (network idle)
  │
  ▼
3. Take screenshot
  │
  ▼
4. Compare with baseline
  │
  ├── Match ──► Test passed
  │
  └── Diff exceeds threshold ──► Test failed
                                  │
                                  ▼
                             Save diff image
                                  │
                                  ▼
                             Emit PLAYWRIGHT_TEST_FAILED
```

### 3.4 Screenshot Configuration

```typescript
interface ScreenshotConfig {
  maxDiffPixels: number;      // Maximum allowed pixel differences
  threshold: number;          // Per-pixel difference threshold (0-1)
  fullPage: boolean;          // Full page or viewport only
  animations: 'disabled';     // Disable animations for consistency
  caret: 'hide';              // Hide cursor for consistency
  scale: 'device';            // Use device pixel ratio
}
```

---

## 4. RTL Validation

### 4.1 RTL Check Categories

| Category | Checks |
|---|---|
| Layout direction | `dir="rtl"` on root, flex/grid logical properties |
| Text alignment | Right-aligned Arabic text, left-aligned numbers |
| Icon flipping | Chevrons, arrows, directional icons flip correctly |
| Scroll direction | Horizontal scroll starts from right |
| Margin/padding | Logical properties (`margin-inline-start`) |
| Font rendering | Cairo font loaded for Arabic text |

### 4.2 RTL Test Examples

```typescript
test('page direction is RTL for Arabic locale', async ({ page }) => {
  await page.goto('/ar/dashboard');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('dir', 'rtl');
  await expect(html).toHaveAttribute('lang', 'ar');
});

test('sidebar navigation aligns right in RTL', async ({ page }) => {
  await page.goto('/ar/dashboard');
  const sidebar = page.locator('[data-testid="sidebar"]');
  const box = await sidebar.boundingBox();
  // In RTL, sidebar should be on the right side
  expect(box?.x).toBeGreaterThan(0);
});

test('chevron icons flip in RTL', async ({ page }) => {
  await page.goto('/ar/dashboard');
  const chevron = page.locator('[data-testid="chevron-right"]');
  const transform = await chevron.evaluate(el => getComputedStyle(el).transform);
  // Chevron should be flipped (scaleX(-1) or rotate(180deg))
  expect(transform).toMatch(/scaleX\(-1\)|rotate\(180deg\)/);
});
```

### 4.3 RTL Screenshot Comparison

RTL screenshots are stored separately from LTR:

```
snapshots/
├── ar/                    # Arabic RTL baselines
│   ├── dashboard.spec.ts-snapshots/
│   │   └── dashboard-ar.png
│   └── login.spec.ts-snapshots/
│       └── login-ar.png
└── en/                    # English LTR baselines
    ├── dashboard.spec.ts-snapshots/
    │   └── dashboard-en.png
    └── login.spec.ts-snapshots/
        └── login-en.png
```

---

## 5. Interaction Testing

### 5.1 Interaction Categories

| Category | Tests |
|---|---|
| Forms | Input, validation, submission, error display |
| Navigation | Link clicks, route changes, active states |
| File upload | Drag-drop, file selection, progress, completion |
| Modals | Open, close, backdrop click, escape key |
| Dropdowns | Open, select, close, keyboard navigation |
| Tables | Sort, filter, paginate, select rows |

### 5.2 Interaction Test Example

```typescript
test('login form submits and redirects', async ({ page }) => {
  await page.goto('/ar/login');

  // Fill form
  await page.fill('[name="email"]', 'admin@ibn-al-azhar.app');
  await page.fill('[name="password"]', 'password123');

  // Submit
  await page.click('button[type="submit"]');

  // Wait for redirect
  await page.waitForURL('/ar/dashboard');

  // Verify logged in
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
});
```

---

## 6. Accessibility Checks

### 6.1 Accessibility Categories

| Category | Checks |
|---|---|
| Semantic HTML | Proper heading hierarchy, landmarks, lists |
| ARIA attributes | Roles, labels, states, properties |
| Keyboard navigation | Tab order, focus management, skip links |
| Color contrast | WCAG AA minimum (4.5:1 text, 3:1 large text) |
| Screen reader | Alternative text, form labels, live regions |
| Focus indicators | Visible focus ring on all interactive elements |

### 6.2 Accessibility Test Example

```typescript
import { injectAxe, checkA11y } from 'axe-playwright';

test('dashboard meets WCAG AA standards', async ({ page }) => {
  await page.goto('/ar/dashboard');
  await injectAxe(page);
  const violations = await checkA11y(page, null, {
    detailedReport: true,
    detailedReportOptions: { html: true },
  });
  expect(violations).toHaveLength(0);
});
```

### 6.3 Brand-Specific Accessibility

| Check | Brand Rule |
|---|---|
| Primary green contrast | `#16A34A` on white = 3.3:1 (fails AA for normal text) — use for large text/UI only |
| Heritage gold contrast | `#CA8A04` on white = 3.1:1 (fails AA for normal text) — use for decorative only |
| Dark text gray contrast | `#1F2937` on white = 13.5:1 (passes AAA) — use for body text |
| Cairo font | Verify font loads for Arabic text rendering |

---

## 7. Responsive Checks

### 7.1 Viewport Matrix

| Device | Viewport | Pixel Ratio | Locale |
|---|---|---|---|
| Desktop | 1280x720 | 1 | ar-SA, en-US |
| Tablet | 768x1024 | 2 | ar-SA, en-US |
| Mobile (Android) | 393x851 | 2.75 | ar-SA |
| Mobile (iOS) | 390x844 | 3 | en-US |

### 7.2 Responsive Test Example

```typescript
test('dashboard is responsive on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 851 });
  await page.goto('/ar/dashboard');

  // Sidebar should be collapsed on mobile
  const sidebar = page.locator('[data-testid="sidebar"]');
  await expect(sidebar).toHaveClass(/collapsed/);

  // Hamburger menu should be visible
  await expect(page.locator('[data-testid="hamburger"]')).toBeVisible();

  // Content should be full width
  const content = page.locator('[data-testid="main-content"]');
  const box = await content.boundingBox();
  expect(box?.width).toBeCloseTo(393, -1);
});
```

---

## 8. Screenshot Pipeline Integration

### 8.1 Screenshot Capture Flow

```
Verification Engine: Playwright stage
  │
  ▼
1. Start application (docker compose or local)
  │
  ▼
2. Run Playwright test suite
  │
  ├── Visual tests (screenshot comparison)
  ├── RTL tests (layout, direction, icons)
  ├── Interaction tests (forms, navigation)
  ├── Accessibility tests (axe-core)
  └── Responsive tests (multiple viewports)
  │
  ▼
3. Collect results
  │
  ├── Passed tests
  ├── Failed tests (with screenshots, diffs, videos)
  └── Skipped tests
  │
  ▼
4. Generate report
  │
  ├── HTML report (playwright-report/)
  ├── JSON report (for structured output)
  └── Screenshot artifacts
  │
  ▼
5. Emit PLAYWRIGHT_PASSED or PLAYWRIGHT_FAILED
```

### 8.2 Screenshot Artifacts

| Artifact | When | Storage |
|---|---|---|
| Baseline screenshot | On `--update-snapshots` | `e2e/snapshots/` |
| Actual screenshot | On test failure | `test-results/` |
| Diff image | On visual mismatch | `test-results/` |
| Video | On test failure (CI) | `test-results/` |
| Trace | On first retry | `test-results/` |

---

## 9. Playwright Events

| Event | Payload | Emitted When |
|---|---|---|
| `PLAYWRIGHT_STARTED` | `{testSuite, projectCount}` | Test suite started |
| `PLAYWRIGHT_PASSED` | `{results, duration}` | All tests passed |
| `PLAYWRIGHT_FAILED` | `{failures, duration}` | One or more tests failed |
| `PLAYWRIGHT_TEST_PASSED` | `{testName, project, duration}` | Individual test passed |
| `PLAYWRIGHT_TEST_FAILED` | `{testName, project, error, screenshotPath}` | Individual test failed |
| `PLAYWRIGHT_SCREENSHOT_CAPTURED` | `{testName, screenshotPath, type}` | Screenshot captured |
| `PLAYWRIGHT_DIFF_GENERATED` | `{testName, diffPath, diffPixels}` | Visual diff generated |
| `PLAYWRIGHT_TRACE_CAPTURED` | `{testName, tracePath}` | Trace captured |
| `PLAYWRIGHT_INTERACTION_REPLAYED` | `{testName, steps, result}` | Interaction replayed |

---

## 10. Playwright Configuration

```yaml
playwright:
  test_dir: "e2e/specs"
  projects:
    - name: chromium-rtl
      locale: ar-SA
      viewport: { width: 1280, height: 720 }
    - name: chromium-ltr
      locale: en-US
      viewport: { width: 1280, height: 720 }
    - name: mobile-rtl
      device: Pixel 5
      locale: ar-SA
    - name: mobile-ltr
      device: iPhone 12
      locale: en-US

  visual:
    max_diff_pixels: 100
    threshold: 0.1
    update_on: "manual"

  accessibility:
    standard: "WCAG2AA"
    rules:
      - color-contrast
      - label
      - landmark
      - heading-order

  timeout:
    test: 30000
    navigation: 10000
    action: 5000

  artifacts:
    screenshot: "only-on-failure"
    video: "retain-on-failure"
    trace: "on-first-retry"
    report: "html"
```

---

## 11. Trace Capture

### 11.1 Trace Configuration

Playwright traces capture detailed execution information for debugging and replay:

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    trace: 'on-first-retry',  // Capture trace on retry
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
```

### 11.2 Trace Content

Each trace includes:
- DOM snapshots at each action
- Network requests and responses
- Console logs
- Page errors
- Action parameters and results
- Timing information

### 11.3 Trace Storage

```
test-results/
├── {test-name}/
│   ├── trace.zip              # Playwright trace
│   ├── video.webm             # Video recording
│   ├── screenshot-failure.png # Failure screenshot
│   └── diff.png               # Visual diff (if applicable)
```

### 11.4 Trace Analysis

Traces are used for:
- Debugging test failures
- Understanding UI state at failure point
- Replay analysis during repair loops
- Performance profiling

---

## 12. Interaction Replay

### 12.1 Replay Use Cases

| Use Case | Description |
|---|---|
| Repair loop | Replay failed interaction to understand failure |
| Debugging | Step through interaction to find root cause |
| Visual validation | Compare interaction states across runs |
| Accessibility | Replay interaction with accessibility tools |

### 12.2 Replay Flow

```
Test Failure
  │
  ▼
1. Load trace file
  │
  ▼
2. Replay interaction step by step:
  ├── Navigate to page
  ├── Execute each action
  ├── Compare state with original
  └── Identify divergence point
  │
  ▼
3. Analyze divergence:
  ├── DOM state difference
  ├── Network response difference
  └── Timing difference
  │
  ▼
4. Emit PLAYWRIGHT_INTERACTION_REPLAYED event
```

---

## 14. Playwright Anti-Patterns

| Anti-Pattern | Problem | Prevention |
|---|---|---|
| Flaky tests | Unreliable verification | Retry, wait for stable state |
| No baseline updates | Stale baselines cause false failures | Regular baseline review |
| Too strict diff threshold | False positives on minor changes | Reasonable maxDiffPixels |
| No accessibility tests | Accessibility regressions | Include axe-core checks |
| RTL tests only in LTR | RTL issues undetected | Separate RTL/LTR projects |
| No mobile tests | Responsive regressions | Mobile viewport projects |
| Screenshot-only tests | Misses interaction bugs | Include interaction tests |
| Slow tests | Long verification time | Parallel execution, selective tests |
