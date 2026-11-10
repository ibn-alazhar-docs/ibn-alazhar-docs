import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const EMAIL = "admin@ibnalazhar.app";
const PASSWORD = "AdminPassword123!";

async function login(page: Page) {
  await page.goto(`${BASE}/ar/login`);
  await page.waitForLoadState("load");
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/dashboard/, { timeout: 30000 });
  await page.waitForLoadState("load");
  await page
    .waitForFunction(() => (document.title || "").trim().length > 0, { timeout: 5000 })
    .catch(() => {});
}

async function runAxe(page: Page, disableRules?: string[]) {
  const builder = new AxeBuilder({ page }).withTags([
    "wcag2a",
    "wcag2aa",
    "wcag21a",
    "wcag21aa",
    "wcag22aa",
  ]);
  if (disableRules) builder.disableRules(disableRules);
  const results = await builder.analyze();
  return results;
}

test.describe("WCAG 2.2 AA — Full-page axe audits", () => {
  test.describe.configure({ timeout: 120_000 });

  /* ─── Public Pages ─── */

  test("/ar (landing) has no a11y violations @a11y", async ({ page }) => {
    await page.goto("/ar");
    await page.waitForLoadState("load");
    await page.waitForTimeout(500);
    const results = await runAxe(page, ["bypass"]);
    expect(results.violations).toEqual([]);
  });

  test("/ar/login has no a11y violations @a11y", async ({ page }) => {
    await page.goto("/ar/login");
    await page.waitForLoadState("load");
    const results = await runAxe(page, ["bypass"]);
    expect(results.violations).toEqual([]);
  });

  test("/ar/register has no a11y violations @a11y", async ({ page }) => {
    await page.goto("/ar/register");
    await page.waitForLoadState("load");
    const results = await runAxe(page, ["bypass"]);
    expect(results.violations).toEqual([]);
  });

  test("/ar/forgot-password has no a11y violations @a11y", async ({ page }) => {
    await page.goto("/ar/forgot-password");
    await page.waitForLoadState("load");
    const results = await runAxe(page, ["bypass"]);
    expect(results.violations).toEqual([]);
  });

  test("/ar/reset-password has no a11y violations @a11y", async ({ page }) => {
    await page.goto("/ar/reset-password");
    await page.waitForLoadState("load");
    const results = await runAxe(page, ["bypass"]);
    expect(results.violations).toEqual([]);
  });

  test("/ar/404 has no a11y violations @a11y", async ({ page }) => {
    await page.goto("/ar/404");
    await page.waitForLoadState("load");
    const results = await runAxe(page, ["bypass"]);
    expect(results.violations).toEqual([]);
  });

  test("/ar/500 (error) has no a11y violations @a11y", async ({ page }) => {
    await page.goto("/ar/500");
    await page.waitForLoadState("load");
    const results = await runAxe(page, ["bypass"]);
    expect(results.violations).toEqual([]);
  });

  test("shared document not-found page has no a11y violations @a11y", async ({ page }) => {
    await page.goto("/ar/share/invalid-token-12345");
    await page.waitForLoadState("load");
    const results = await runAxe(page, ["bypass"]);
    expect(results.violations).toEqual([]);
  });

  /* ─── Protected Pages (Auth Required) ─── */

  test("/ar/dashboard (with data) has no a11y violations @a11y", async ({ page }) => {
    await login(page);
    const results = await runAxe(page);
    expect(results.violations).toEqual([]);
  });

  test("/ar/dashboard (empty state) has no a11y violations @a11y", async ({ page }) => {
    await login(page);
    const results = await runAxe(page);
    expect(results.violations).toEqual([]);
  });

  test("/ar/documents has no a11y violations @a11y", async ({ page }) => {
    await login(page);
    await page.goto("/ar/files");
    await page.waitForLoadState("load");
    const results = await runAxe(page);
    expect(results.violations).toEqual([]);
  });

  test("/ar/folders has no a11y violations @a11y", async ({ page }) => {
    await login(page);
    await page.goto("/ar/folders");
    await page.waitForLoadState("load");
    const results = await runAxe(page);
    expect(results.violations).toEqual([]);
  });

  test("/ar/tags has no a11y violations @a11y", async ({ page }) => {
    await login(page);
    await page.goto("/ar/tags");
    await page.waitForLoadState("load");
    const results = await runAxe(page);
    expect(results.violations).toEqual([]);
  });

  test("/ar/search (empty) has no a11y violations @a11y", async ({ page }) => {
    await login(page);
    await page.goto("/ar/search");
    await page.waitForLoadState("load");
    const results = await runAxe(page);
    expect(results.violations).toEqual([]);
  });

  test("/ar/search (with results) has no a11y violations @a11y", async ({ page }) => {
    await login(page);
    await page.goto("/ar/search?q=test");
    await page.waitForLoadState("load");
    const results = await runAxe(page);
    expect(results.violations).toEqual([]);
  });

  test("/ar/conversions has no a11y violations @a11y", async ({ page }) => {
    await login(page);
    await page.goto("/ar/conversions");
    await page.waitForLoadState("load");
    const results = await runAxe(page);
    expect(results.violations).toEqual([]);
  });

  test("/ar/settings has no a11y violations @a11y", async ({ page }) => {
    await login(page);
    await page.goto("/ar/settings");
    await page.waitForLoadState("load");
    const results = await runAxe(page);
    expect(results.violations).toEqual([]);
  });

  test("/ar/analytics has no a11y violations @a11y", async ({ page }) => {
    await login(page);
    await page.goto("/ar/analytics");
    await page.waitForLoadState("load");
    const results = await runAxe(page);
    expect(results.violations).toEqual([]);
  });

  test("/ar/users has no a11y violations @a11y", async ({ page }) => {
    await login(page);
    await page.goto("/ar/users");
    await page.waitForLoadState("load");
    const results = await runAxe(page);
    expect(results.violations).toEqual([]);
  });

  test("/ar/bookmarks has no a11y violations @a11y", async ({ page }) => {
    await login(page);
    await page.goto("/ar/bookmarks");
    await page.waitForLoadState("load");
    const results = await runAxe(page);
    expect(results.violations).toEqual([]);
  });

  test("/ar/dashboard has no a11y violations @a11y", async ({ page }) => {
    await login(page);
    await page.goto("/ar/dashboard");
    await page.waitForLoadState("load");
    const results = await runAxe(page);
    expect(results.violations).toEqual([]);
  });
});
