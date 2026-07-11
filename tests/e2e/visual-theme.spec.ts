import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";

const PAGES = [
  { name: "landing", path: "" },
  { name: "login", path: "login" },
  { name: "register", path: "register" },
  { name: "forgot-password", path: "forgot-password" },
  { name: "not-found", path: "nonexistent-route-xyz" },
] as const;

test.describe("Visual Theme — Light Mode", () => {
  test.describe.configure({ timeout: 120_000 });

  test.use({ colorScheme: "light" });

  for (const pageInfo of PAGES) {
    test(`Light mode — /ar/${pageInfo.name}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}/ar/${pageInfo.path}`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot(`light-ar-${pageInfo.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`Light mode — /en/${pageInfo.name}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}/en/${pageInfo.path}`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot(`light-en-${pageInfo.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });
  }
});

test.describe("Visual Theme — Dark Mode", () => {
  test.describe.configure({ timeout: 120_000 });

  test.use({ colorScheme: "dark" });

  for (const pageInfo of PAGES) {
    test(`Dark mode — /ar/${pageInfo.name}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}/ar/${pageInfo.path}`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot(`dark-ar-${pageInfo.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`Dark mode — /en/${pageInfo.name}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}/en/${pageInfo.path}`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot(`dark-en-${pageInfo.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });
  }
});

test.describe("Visual Theme — RTL Layout (Light Mode)", () => {
  test.describe.configure({ timeout: 120_000 });

  test.use({ colorScheme: "light" });

  for (const pageInfo of PAGES) {
    test(`RTL + Light — /ar/${pageInfo.name} — dir check`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}/ar/${pageInfo.path}`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      const dir = await page.locator("html").getAttribute("dir");
      expect(dir).toBe("rtl");

      await expect(page).toHaveScreenshot(`rtl-light-ar-${pageInfo.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`LTR + Light — /en/${pageInfo.name} — dir check`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}/en/${pageInfo.path}`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      const dir = await page.locator("html").getAttribute("dir");
      expect(dir).toBe("ltr");

      await expect(page).toHaveScreenshot(`ltr-light-en-${pageInfo.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });
  }
});

test.describe("Visual Theme — RTL Layout (Dark Mode)", () => {
  test.describe.configure({ timeout: 120_000 });

  test.use({ colorScheme: "dark" });

  for (const pageInfo of PAGES) {
    test(`RTL + Dark — /ar/${pageInfo.name} — dir check`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}/ar/${pageInfo.path}`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      const dir = await page.locator("html").getAttribute("dir");
      expect(dir).toBe("rtl");

      await expect(page).toHaveScreenshot(`rtl-dark-ar-${pageInfo.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`LTR + Dark — /en/${pageInfo.name} — dir check`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}/en/${pageInfo.path}`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      const dir = await page.locator("html").getAttribute("dir");
      expect(dir).toBe("ltr");

      await expect(page).toHaveScreenshot(`ltr-dark-en-${pageInfo.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });
  }
});
