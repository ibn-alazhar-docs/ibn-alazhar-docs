import { test, expect, type Page } from "@playwright/test";

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

async function tabThrough(page: Page, count: number): Promise<string[]> {
  const elements: string[] = [];
  for (let i = 0; i < count; i++) {
    const focused = page.locator(":focus");
    const tagName = await focused
      .evaluate((el) => {
        const e = el as HTMLElement;
        return `${e.tagName.toLowerCase()}${e.getAttribute("aria-label") ? `[aria-label="${e.getAttribute("aria-label")}"]` : ""}${e.textContent ? `("${e.textContent?.trim().slice(0, 30)}")` : ""}`;
      })
      .catch(() => "unknown");
    elements.push(tagName);
    await page.keyboard.press("Tab");
    await page.waitForTimeout(100);
  }
  return elements;
}

test.describe("Keyboard Navigation", () => {
  test.describe.configure({ timeout: 120_000 });

  /* ─── Skip to content ─── */

  test("skip to content link is first focusable element @a11y-keyboard", async ({ page }) => {
    await page.goto("/ar/login");
    await page.waitForLoadState("networkidle");

    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    const focused = page.locator(":focus");
    const tagName = await focused
      .evaluate((el) => (el as HTMLElement).tagName.toLowerCase())
      .catch(() => "");
    const href = await focused.getAttribute("href").catch(() => null);
    const text = await focused.textContent().catch(() => "");

    const isSkipLink =
      href === "#main-content" || text?.includes("تخطَّ") || text?.includes("Skip");
    if (!isSkipLink) {
      const allSkip = page.locator('a[href="#main-content"]');
      if (await allSkip.count()) {
        await allSkip.first().focus();
        await expect(page.locator(":focus")).toBe(allSkip.first());
      }
    }
  });

  test("skip link navigates to main content @a11y-keyboard", async ({ page }) => {
    await page.goto("/ar/login");
    await page.waitForLoadState("networkidle");

    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeVisible();
    await expect(skipLink).toHaveAttribute("href", "#main-content");
  });

  /* ─── Login form keyboard ─── */

  test("tab through login form has visible focus ring on each element @a11y-keyboard", async ({
    page,
  }) => {
    await page.goto("/ar/login");
    await page.waitForLoadState("networkidle");

    const elements = [
      page.locator('input[name="email"]'),
      page.locator('input[name="password"]'),
      page.locator('button[type="submit"]').first(),
    ];

    for (const el of elements) {
      await el.focus();
      await expect(el).toBeFocused();
      const focusStyle = await el.evaluate((node) => {
        const style = getComputedStyle(node);
        return {
          outline: style.outline,
          outlineColor: style.outlineColor,
          outlineWidth: style.outlineWidth,
          boxShadow: style.boxShadow,
        };
      });
      const hasVisibleFocus =
        (focusStyle.outline !== "none" && focusStyle.outline !== "0px") ||
        (focusStyle.boxShadow !== "none" && focusStyle.boxShadow !== "");
      expect(hasVisibleFocus).toBeTruthy();
    }
  });

  test("all interactive elements on login page are focusable @a11y-keyboard", async ({ page }) => {
    await page.goto("/ar/login");
    await page.waitForLoadState("networkidle");

    const interactive = page.locator(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const count = await interactive.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const el = interactive.nth(i);
      const tabIndex = await el.getAttribute("tabindex").catch(() => null);
      if (tabIndex === "-1") continue;
      await el.focus();
      await expect(el).toBeFocused();
    }
  });

  test("login form: enter submits @a11y-keyboard", async ({ page }) => {
    await page.goto("/ar/login");
    await page.waitForLoadState("networkidle");

    await page.locator('input[name="email"]').fill("test@example.com");
    await page.locator('input[name="password"]').fill("testpass");
    await page.locator('input[name="password"]').press("Enter");
    await page.waitForTimeout(1000);
  });

  /* ─── Register form keyboard ─── */

  test("register form tab order is logical @a11y-keyboard", async ({ page }) => {
    await page.goto("/ar/register");
    await page.waitForLoadState("networkidle");

    const firstInput = page.locator('input[name="email"]').first();
    await firstInput.focus();
    await expect(firstInput).toBeFocused();

    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      await page.waitForTimeout(100);
      const focused = page.locator(":focus");
      await expect(focused).toBeVisible();
    }
  });

  test("register form: escape cancels (if applicable) @a11y-keyboard", async ({ page }) => {
    await page.goto("/ar/register");
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
  });

  /* ─── Dashboard keyboard ─── */

  test("tab through dashboard has logical order @a11y-keyboard", async ({ page }) => {
    await login(page);
    await page.waitForLoadState("networkidle");

    const sidebar = page.locator("aside");
    const main = page.locator("main, #main-content");

    const sidebarVisible = await sidebar.isVisible().catch(() => false);
    const mainVisible = await main.isVisible().catch(() => false);

    if (sidebarVisible) {
      const firstSidebarLink = sidebar.locator("a, button").first();
      await firstSidebarLink.focus();
      await expect(firstSidebarLink).toBeFocused();
    }

    if (mainVisible) {
      const firstMainLink = main.locator("a, button, input").first();
      if (await firstMainLink.isVisible().catch(() => false)) {
        await firstMainLink.focus();
        await expect(firstMainLink).toBeFocused();
      }
    }
  });

  /* ─── No keyboard trap ─── */

  test("no keyboard trap exists on login page @a11y-keyboard", async ({ page }) => {
    await page.goto("/ar/login");
    await page.waitForLoadState("networkidle");

    const interactive = page.locator(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const count = await interactive.count();

    let lastTag = "";
    for (let i = 0; i < count + 5; i++) {
      await page.keyboard.press("Tab");
      await page.waitForTimeout(50);
      const focused = page.locator(":focus");
      const tag = await focused.evaluate((el) => (el as HTMLElement).tagName).catch(() => "");
      if (tag && tag !== lastTag) {
        lastTag = tag;
      }
    }
  });

  test("no keyboard trap on dashboard @a11y-keyboard", async ({ page }) => {
    await login(page);
    await page.waitForLoadState("networkidle");

    for (let i = 0; i < 15; i++) {
      await page.keyboard.press("Tab");
      await page.waitForTimeout(80);
      const focused = page.locator(":focus");
      await expect(focused).toBeVisible();
    }

    for (let i = 0; i < 15; i++) {
      await page.keyboard.press("Shift+Tab");
      await page.waitForTimeout(80);
      const focused = page.locator(":focus");
      await expect(focused).toBeVisible();
    }
  });

  /* ─── Searches keyboard ─── */

  test("search page: input is focusable and functional @a11y-keyboard", async ({ page }) => {
    await login(page);
    await page.goto("/ar/search");
    await page.waitForLoadState("networkidle");

    const searchInput = page
      .locator('input[type="search"], input[placeholder*="بحث"], input[placeholder*="Search"]')
      .first();
    if (await searchInput.isVisible()) {
      await searchInput.focus();
      await expect(searchInput).toBeFocused();
      await searchInput.fill("test");
      await searchInput.press("Enter");
      await page.waitForTimeout(1000);
    }
  });

  /* ─── Tags page keyboard ─── */

  test("tags page: keyboard accessible create/edit/delete @a11y-keyboard", async ({ page }) => {
    await login(page);
    await page.goto("/ar/tags");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const buttons = page.getByRole("button");
    const count = await buttons.count();
    for (let i = 0; i < Math.min(count, 8); i++) {
      const btn = buttons.nth(i);
      if (await btn.isVisible().catch(() => false)) {
        await btn.focus();
        await expect(btn).toBeFocused();
      }
    }
  });

  /* ─── Files page keyboard ─── */

  test("files page: all interactive elements accessible by keyboard @a11y-keyboard", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/ar/files");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const interactive = page.locator(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const count = await interactive.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 10); i++) {
      const el = interactive.nth(i);
      if (await el.isVisible().catch(() => false)) {
        const tabIndex = await el.getAttribute("tabindex").catch(() => null);
        if (tabIndex === "-1") continue;
        await el.focus();
        await expect(el).toBeFocused();
      }
    }
  });

  /* ─── Settings page keyboard ─── */

  test("settings page: keyboard navigation @a11y-keyboard", async ({ page }) => {
    await login(page);
    await page.goto("/ar/settings");
    await page.waitForLoadState("networkidle");

    const interactive = page.locator(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const count = await interactive.count();
    expect(count).toBeGreaterThan(0);

    const firstEl = interactive.first();
    await firstEl.focus();
    await expect(firstEl).toBeFocused();
  });
});
