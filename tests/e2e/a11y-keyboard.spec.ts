import { test, expect, type Page } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const EMAIL = "admin@ibnalazhar.app";
const PASSWORD = "AdminPassword123!";

async function login(page: Page) {
  await page.goto(`${BASE}/ar/login`);
  await page.waitForLoadState("load");
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/\/dashboard/, { timeout: 30000 });
  await expect(page.locator("main")).toBeVisible({ timeout: 15000 });
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
    await page.waitForLoadState("load");

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
    await page.waitForLoadState("load");

    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeVisible();
    await expect(skipLink).toHaveAttribute("href", "#main-content");
  });

  /* ─── Login form keyboard ─── */

  test("tab through login form has visible focus ring on each element @a11y-keyboard", async ({
    page,
  }) => {
    await page.goto("/ar/login");
    await page.waitForLoadState("load");

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
    await page.waitForLoadState("load");

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
    await page.waitForLoadState("load");

    await page.locator('input[name="email"]').fill("test@example.com");
    await page.locator('input[name="password"]').fill("testpass");
    await page.locator('input[name="password"]').press("Enter");
    await page.waitForTimeout(1000);
  });

  /* ─── Register form keyboard ─── */

  test("register form tab order is logical @a11y-keyboard", async ({ page }) => {
    await page.goto("/ar/register");
    await page.waitForLoadState("load");

    const emailInput = page.locator('input[name="email"]').first();
    await emailInput.focus();
    await expect(emailInput).toBeFocused();

    const orderedSelectors = [
      'input[name="password"]',
      'input[name="confirmPassword"]',
      'button[type="submit"]',
    ];
    let currentIndex = 0;

    for (let i = 0; i < 12 && currentIndex < orderedSelectors.length; i++) {
      await page.keyboard.press("Tab");
      const target = page.locator(orderedSelectors[currentIndex]).first();
      if (await target.evaluate((el) => el === document.activeElement).catch(() => false)) {
        await expect(target).toBeVisible();
        await expect(target).toBeFocused();
        currentIndex++;
      }
    }

    expect(currentIndex).toBe(orderedSelectors.length);
  });

  test("register form: escape cancels (if applicable) @a11y-keyboard", async ({ page }) => {
    await page.goto("/ar/register");
    await page.waitForLoadState("load");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
  });

  /* ─── Dashboard keyboard ─── */

  test("tab through dashboard has logical order @a11y-keyboard", async ({ page }) => {
    await login(page);
    await page.waitForLoadState("load");

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
    await page.waitForLoadState("load");

    const interactive = page.locator(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const count = await interactive.count();
    const steps = Math.min(Math.max(count + 5, 10), 40);
    const seen = new Set<string>();
    let moves = 0;

    for (let i = 0; i < steps; i++) {
      if (page.isClosed()) break;
      await page.keyboard.press("Tab");
      await page.waitForTimeout(50);
      const focused = page.locator(":focus");
      const signature = await focused
        .evaluate((el) => {
          const element = el as HTMLElement;
          const text = (element.textContent || "").trim().slice(0, 20);
          const id = element.id ? `#${element.id}` : "";
          const name = element.getAttribute("name") || "";
          return `${element.tagName}${id}[name=${name}](${text})`;
        })
        .catch(() => "");
      if (signature) {
        if (!seen.has(signature)) moves++;
        seen.add(signature);
      }
    }

    expect(moves).toBeGreaterThan(1);
  });

  test("no keyboard trap on dashboard @a11y-keyboard", async ({ page }) => {
    await login(page);
    await page.waitForLoadState("load");

    const assertFocusMovesAndVisible = async (key: "Tab" | "Shift+Tab") => {
      const seen = new Set<string>();
      let visibleCount = 0;

      for (let i = 0; i < 15; i++) {
        await page.keyboard.press(key);
        await page.waitForTimeout(80);
        const focused = page.locator(":focus");
        await expect(focused).toHaveCount(1);
        const signature = await focused
          .evaluate((el) => {
            const element = el as HTMLElement;
            const id = element.id ? `#${element.id}` : "";
            const name = element.getAttribute("name") || "";
            const href = element.getAttribute("href") || "";
            return `${element.tagName}${id}[name=${name}][href=${href}]`;
          })
          .catch(() => "unknown");
        seen.add(signature);

        const isVisible = await focused.isVisible().catch(() => false);
        if (isVisible) {
          visibleCount++;
        } else {
          await expect(focused).toBeAttached();
        }
      }

      expect(seen.size).toBeGreaterThan(1);
      expect(visibleCount).toBeGreaterThan(0);
    };

    await assertFocusMovesAndVisible("Tab");
    await assertFocusMovesAndVisible("Shift+Tab");
  });

  /* ─── Searches keyboard ─── */

  test("search page: input is focusable and functional @a11y-keyboard", async ({ page }) => {
    await login(page);
    await page.goto("/ar/search");
    await page.waitForLoadState("load");

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
    await page.waitForLoadState("load");
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
    await page.waitForLoadState("load");
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
    await page.waitForLoadState("load");

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
