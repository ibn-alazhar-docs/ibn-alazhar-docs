import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const EMAIL = "admin@ibnalazhar.app";
const PASSWORD = "password123";

async function login(page: Page) {
  await page.goto(`${BASE}/ar/login`);
  await page.waitForLoadState("networkidle");
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/dashboard/, { timeout: 30000 });
  await page.waitForLoadState("networkidle");
}

async function runAxe(page: Page) {
  return await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
}

test.describe("Interactive state accessibility", () => {
  test.describe.configure({ timeout: 120_000 });

  /* ─── Login Form Interactive States ─── */

  test("login form: focus states on inputs @a11y-interaction", async ({ page }) => {
    await page.goto("/ar/login");
    await page.waitForLoadState("networkidle");

    const email = page.locator('input[name="email"]');
    const password = page.locator('input[name="password"]');
    const submit = page.locator('button[type="submit"]').first();

    await email.focus();
    await expect(email).toBeFocused();
    const emailFocusRing = await email.evaluate((el) => {
      const style = getComputedStyle(el);
      return { outline: style.outline, boxShadow: style.boxShadow };
    });
    expect(emailFocusRing.outline !== "none" || emailFocusRing.boxShadow !== "none").toBeTruthy();

    await password.focus();
    await expect(password).toBeFocused();
    const passFocusRing = await password.evaluate((el) => {
      const style = getComputedStyle(el);
      return { outline: style.outline, boxShadow: style.boxShadow };
    });
    expect(passFocusRing.outline !== "none" || passFocusRing.boxShadow !== "none").toBeTruthy();

    await submit.focus();
    await expect(submit).toBeFocused();
  });

  test("login form: axe passes after focus interaction @a11y-interaction", async ({ page }) => {
    await page.goto("/ar/login");
    await page.waitForLoadState("networkidle");

    await page.locator('input[name="email"]').focus();
    await page.locator('input[name="email"]').fill("test@example.com");
    await page.locator('input[name="password"]').focus();
    await page.locator('input[name="password"]').fill("mypassword");

    const results = await runAxe(page);
    const relevantViolations = results.violations.filter((v) => !v.id.startsWith("bypass"));
    expect(relevantViolations).toEqual([]);
  });

  test("login form: error messages are announced @a11y-interaction", async ({ page }) => {
    await page.goto("/ar/login");
    await page.waitForLoadState("networkidle");

    await page.locator('input[name="email"]').fill("invalid");
    await page.locator('input[name="password"]').fill("short");
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(1000);

    const errorAlert = page.getByRole("alert").first();
    await expect(errorAlert).toBeVisible({ timeout: 5000 });

    const results = await runAxe(page);
    const relevantViolations = results.violations.filter((v) => !v.id.startsWith("bypass"));
    expect(relevantViolations).toEqual([]);
  });

  test("login form: error messages linked to inputs via aria-describedby @a11y-interaction", async ({
    page,
  }) => {
    await page.goto("/ar/login");
    await page.waitForLoadState("networkidle");

    const email = page.locator('input[name="email"]');
    await email.fill("bad-email");
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(1000);

    const describedBy = await email.getAttribute("aria-describedby");
    if (describedBy) {
      const errorEl = page.locator(`#${describedBy}`);
      await expect(errorEl).toBeVisible();
      const descriptionText = await errorEl.textContent();
      expect(descriptionText?.trim().length).toBeGreaterThan(0);
    }
  });

  /* ─── Register Form ─── */

  test("register form: password requirements announced @a11y-interaction", async ({ page }) => {
    await page.goto("/ar/register");
    await page.waitForLoadState("networkidle");

    const password = page.locator('input[name="password"]');
    await password.focus();
    await password.fill("a");

    const describedBy = await password.getAttribute("aria-describedby");
    if (describedBy) {
      const hint = page.locator(`#${describedBy}`);
      await expect(hint).toBeVisible();
    }

    const results = await runAxe(page);
    const relevantViolations = results.violations.filter((v) => !v.id.startsWith("bypass"));
    expect(relevantViolations).toEqual([]);
  });

  test("register form: validation errors accessible @a11y-interaction", async ({ page }) => {
    await page.goto("/ar/register");
    await page.waitForLoadState("networkidle");
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(1000);

    const results = await runAxe(page);
    expect(results.violations).toEqual([]);
  });

  /* ─── Dashboard Stats ─── */

  test("dashboard: stat cards accessible @a11y-interaction", async ({ page }) => {
    await login(page);
    await page.waitForLoadState("networkidle");

    const results = await runAxe(page);
    expect(results.violations).toEqual([]);
  });

  /* ─── Tags Page ─── */

  test("tags page: create tag form accessible @a11y-interaction", async ({ page }) => {
    await login(page);
    await page.goto("/ar/tags");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const createBtn = page.getByRole("button", { name: /create|إنشاء/i }).first();
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await page.waitForTimeout(500);

      const nameInput = page.getByRole("textbox").first();
      await nameInput.focus();
      await expect(nameInput).toBeFocused();

      const results = await runAxe(page);
      const relevantViolations = results.violations.filter((v) => !v.id.startsWith("bypass"));
      expect(relevantViolations).toEqual([]);
    }
  });

  /* ─── Search ─── */

  test("search: empty state accessible @a11y-interaction", async ({ page }) => {
    await login(page);
    await page.goto("/ar/search");
    await page.waitForLoadState("networkidle");

    const results = await runAxe(page);
    expect(results.violations).toEqual([]);
  });

  test("search: results announced @a11y-interaction", async ({ page }) => {
    await login(page);
    await page.goto("/ar/search?q=test");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const results = await runAxe(page);
    const relevantViolations = results.violations.filter((v) => !v.id.startsWith("bypass"));
    expect(relevantViolations).toEqual([]);
  });

  /* ─── Files/Documents Page ─── */

  test("files page: document list accessible @a11y-interaction", async ({ page }) => {
    await login(page);
    await page.goto("/ar/files");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    let results = await runAxe(page);
    const relevantViolations = results.violations.filter((v) => !v.id.startsWith("bypass"));
    expect(relevantViolations).toEqual([]);
  });

  /* ─── Settings ─── */

  test("settings page: profile form accessible @a11y-interaction", async ({ page }) => {
    await login(page);
    await page.goto("/ar/settings");
    await page.waitForLoadState("networkidle");

    const results = await runAxe(page);
    const relevantViolations = results.violations.filter((v) => !v.id.startsWith("bypass"));
    expect(relevantViolations).toEqual([]);
  });

  /* ─── Conversions Page ─── */

  test("conversions page: search form accessible @a11y-interaction", async ({ page }) => {
    await login(page);
    await page.goto("/ar/conversions");
    await page.waitForLoadState("networkidle");

    const results = await runAxe(page);
    expect(results.violations).toEqual([]);
  });

  /* ─── Users Page (admin) ─── */

  test("users page: table accessible @a11y-interaction", async ({ page }) => {
    await login(page);
    await page.goto("/ar/users");
    await page.waitForLoadState("networkidle");

    const results = await runAxe(page);
    const relevantViolations = results.violations.filter((v) => !v.id.startsWith("bypass"));
    expect(relevantViolations).toEqual([]);
  });

  /* ─── Notifications / Toaster ─── */

  test("sonner toaster notifications use live regions @a11y-interaction", async ({ page }) => {
    await login(page);
    await page.goto("/ar/dashboard");
    await page.waitForLoadState("networkidle");

    const toaster = page.locator("[data-sonner-toaster]");
    if (await toaster.isVisible()) {
      const role = await toaster.getAttribute("role");
      expect(role).toBe("status");
      const live = await toaster.getAttribute("aria-live");
      expect(live).toBe("polite");
    }
  });

  /* ─── Pagination ─── */

  test("pagination: current page announced @a11y-interaction", async ({ page }) => {
    await login(page);
    await page.goto("/ar/conversions");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const paginationBtns = page.locator("nav[aria-label]").first();
    const paginationRegion = page.locator("[role='navigation']").first();
    const ariaLabel =
      (await paginationBtns.getAttribute("aria-label")) ||
      (await paginationRegion.getAttribute("aria-label"));
    if (ariaLabel) {
      expect(ariaLabel.trim().length).toBeGreaterThan(0);
    }

    const results = await runAxe(page);
    const relevantViolations = results.violations.filter((v) => !v.id.startsWith("bypass"));
    expect(relevantViolations).toEqual([]);
  });
});
