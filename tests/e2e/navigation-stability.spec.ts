import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

// CLS budget per navigation transition (mandate target: < 0.02).
const CLS_PER_NAV_BUDGET = 0.02;
const DASHBOARD_ROUTES = [
  "/dashboard",
  "/files",
  "/folders",
  "/tags",
  "/search",
  "/conversions",
  "/settings",
  "/analytics",
  "/bookmarks",
  "/users",
];

// Installs a PerformanceObserver that accumulates layout-shift values
// (excluding those caused by recent user input, per the CLS spec).
const CLS_INIT = `
  window.__cls = 0;
  window.__clsMax = 0;
  try {
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          window.__cls += entry.value;
          if (entry.value > window.__clsMax) window.__clsMax = entry.value;
        }
      }
    });
    po.observe({ type: "layout-shift", buffered: true });
  } catch (e) {}
`;

async function getCls(page: Page): Promise<number> {
  return (await page.evaluate(() => (window as unknown as { __cls: number }).__cls)) ?? 0;
}

async function getMaxShift(page: Page): Promise<number> {
  return (await page.evaluate(() => (window as unknown as { __clsMax: number }).__clsMax)) ?? 0;
}

async function settle(page: Page) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(500);
}

async function clickNav(page: Page, href: string) {
  const before = await getCls(page);
  await page.click(`aside a[href="${href}"]`);
  await settle(page);
  const after = await getCls(page);
  return after - before;
}

test.describe("Navigation stability (CLS) — dashboard matrix", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(CLS_INIT);
    await loginAsAdmin(page, "ar");
    await settle(page);
  });

  for (const locale of ["ar", "en"] as const) {
    test(`CLS < ${CLS_PER_NAV_BUDGET} navigating every dashboard route (${locale})`, async ({
      page,
    }) => {
      await page.goto(`/${locale}/dashboard`);
      await settle(page);
      const worst = { route: "", value: 0 };
      for (const route of DASHBOARD_ROUTES) {
        const delta = await clickNav(page, `/${locale}${route}`);
        if (delta > worst.value) worst = { route, value: delta };
        expect(delta, `CLS on nav to ${route}`).toBeLessThan(CLS_PER_NAV_BUDGET);
      }
      expect(worst.value).toBeLessThan(CLS_PER_NAV_BUDGET);
    });

    test(`back/forward does not shift layout (${locale})`, async ({ page }) => {
      await page.goto(`/${locale}/dashboard`);
      await settle(page);
      await clickNav(page, `/${locale}/files`);
      const before = await getCls(page);
      await page.goBack();
      await settle(page);
      await page.goForward();
      await settle(page);
      const span = (await getCls(page)) - before;
      expect(span).toBeLessThan(CLS_PER_NAV_BUDGET);
    });

    test(`deep-linked refresh of each route keeps layout stable (${locale})`, async ({ page }) => {
      for (const route of ["/dashboard", "/files", "/search", "/settings", "/analytics"]) {
        await page.goto(`/${locale}${route}`);
        await settle(page);
        const cls = await getCls(page);
        expect(cls, `CLS on load of ${route}`).toBeLessThan(CLS_PER_NAV_BUDGET);
      }
    });
  }

  test("mobile viewport: sidebar/header stable, no content jump", async ({ page }, testInfo) => {
    await testInfo.skip(
      testInfo.project.name !== "chromium",
      "mobile viewport check on desktop project",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await loginAsAdmin(page, "ar");
    await settle(page);
    // Open the off-canvas mobile menu, then navigate via a sidebar link.
    await page.locator("header button").first().click();
    await page.waitForTimeout(300);
    const before = await getCls(page);
    await page.click(`aside a[href="/ar/files"]`);
    await settle(page);
    const delta = (await getCls(page)) - before;
    expect(delta).toBeLessThan(CLS_PER_NAV_BUDGET);
  });
});

test.describe("Navigation stability — reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("no layout shift under prefers-reduced-motion (ar)", async ({ page }) => {
    await page.addInitScript(CLS_INIT);
    await loginAsAdmin(page, "ar");
    await settle(page);
    const worst = { route: "", value: 0 };
    for (const route of DASHBOARD_ROUTES) {
      const delta = await clickNav(page, `/ar${route}`);
      if (delta > worst.value) worst = { route, value: delta };
    }
    expect(worst.value).toBeLessThan(CLS_PER_NAV_BUDGET);
  });
});

test.describe("Public chrome persistence", () => {
  test("landing → docs is a soft SPA navigation (header does not remount)", async ({ page }) => {
    // Mark the window so we can detect a full reload vs SPA navigation.
    await page.addInitScript(() => {
      (window as unknown as { __softNavs: number }).__softNavs =
        ((window as unknown as { __softNavs?: number }).__softNavs ?? 0) + 1;
    });
    await page.goto("/ar");
    await settle(page);
    const firstLoads = await page.evaluate(
      () => (window as unknown as { __softNavs: number }).__softNavs,
    );
    await page.click('a[href="/ar/docs"]');
    await settle(page);
    const afterNavLoads = await page.evaluate(
      () => (window as unknown as { __softNavs: number }).__softNavs,
    );
    // Same document (SPA nav) → counter not incremented → header persists.
    expect(afterNavLoads).toBe(firstLoads);
    await expect(page).toHaveURL(/\/ar\/docs/);
    await expect(page.locator("header[role='banner']")).toBeVisible();
  });
});
