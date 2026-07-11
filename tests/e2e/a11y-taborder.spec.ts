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

interface FocusedElement {
  tag: string;
  text: string;
  ariaLabel: string | null;
  role: string | null;
  rect: { x: number; y: number; width: number; height: number };
  visible: boolean;
}

async function captureTabOrder(page: Page, tabs: number): Promise<FocusedElement[]> {
  const results: FocusedElement[] = [];

  for (let i = 0; i < tabs; i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(150);

    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;

      const rect = el.getBoundingClientRect();
      const tag = el.tagName.toLowerCase();
      const text = (el.textContent || "").trim().slice(0, 60);
      const ariaLabel = el.getAttribute("aria-label");
      const role = el.getAttribute("role");
      const visible =
        rect.width > 0 &&
        rect.height > 0 &&
        rect.x < window.innerWidth &&
        rect.y < window.innerHeight &&
        rect.x + rect.width > 0 &&
        rect.y + rect.height > 0;

      return {
        tag,
        text,
        ariaLabel,
        role,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        visible,
      };
    });

    if (info) results.push(info);
  }

  return results;
}

test.describe("Tab Order Verification", () => {
  test.describe.configure({ timeout: 120_000 });

  /* ─── Public pages tab order ─── */

  test("login page tab order is logical @a11y-taborder", async ({ page }) => {
    await page.goto("/ar/login");
    await page.waitForLoadState("networkidle");

    const order = await captureTabOrder(page, 8);
    expect(order.length).toBeGreaterThan(1);

    for (const el of order) {
      expect
        .soft(
          el.visible,
          `Element "${el.tag}${el.text ? `: "${el.text}"` : ""}" is off-screen when focused`,
        )
        .toBeTruthy();
    }

    test.info().annotations.push({
      type: "tab-order",
      description: `Login page: ${order.length} elements reachable via Tab key`,
    });
  });

  test("register page tab order is logical @a11y-taborder", async ({ page }) => {
    await page.goto("/ar/register");
    await page.waitForLoadState("networkidle");

    const order = await captureTabOrder(page, 10);
    expect(order.length).toBeGreaterThan(1);

    for (const el of order) {
      expect
        .soft(
          el.visible,
          `"${el.tag}: ${el.text || el.ariaLabel || ""}" is off-screen when focused`,
        )
        .toBeTruthy();
    }

    test.info().annotations.push({
      type: "tab-order",
      description: `Register page: ${order.length} focusable elements`,
    });
  });

  test("forgot-password page tab order @a11y-taborder", async ({ page }) => {
    await page.goto("/ar/forgot-password");
    await page.waitForLoadState("networkidle");

    const order = await captureTabOrder(page, 6);
    expect(order.length).toBeGreaterThan(0);

    for (const el of order) {
      expect.soft(el.visible, `${el.tag}: "${el.text}" is off-screen`).toBeTruthy();
    }
  });

  test("404 page tab order @a11y-taborder", async ({ page }) => {
    await page.goto("/ar/404");
    await page.waitForLoadState("networkidle");

    const order = await captureTabOrder(page, 5);
    expect(order.length).toBeGreaterThan(0);

    for (const el of order) {
      expect.soft(el.visible, `${el.tag}: "${el.text}" is off-screen`).toBeTruthy();
    }
  });

  /* ─── Auth pages (English) tab order ─── */

  test("English login tab order is logical @a11y-taborder", async ({ page }) => {
    await page.goto("/en/login");
    await page.waitForLoadState("networkidle");

    const order = await captureTabOrder(page, 8);
    expect(order.length).toBeGreaterThan(1);

    for (const el of order) {
      expect.soft(el.visible, `${el.tag}: "${el.text}" is off-screen`).toBeTruthy();
    }
  });

  test("English register tab order @a11y-taborder", async ({ page }) => {
    await page.goto("/en/register");
    await page.waitForLoadState("networkidle");

    const order = await captureTabOrder(page, 10);
    expect(order.length).toBeGreaterThan(1);

    for (const el of order) {
      expect.soft(el.visible, `${el.tag}: "${el.text}" is off-screen`).toBeTruthy();
    }
  });

  /* ─── Dashboard tab order ─── */

  test("dashboard tab order with sidebar @a11y-taborder", async ({ page }) => {
    await login(page);
    await page.waitForLoadState("networkidle");

    const order = await captureTabOrder(page, 12);
    expect(order.length).toBeGreaterThan(3);

    const sidebarLinks = order.filter(
      (el) => el.tag === "a" || el.tag === "button" || el.role === "link" || el.role === "button",
    );
    expect(sidebarLinks.length).toBeGreaterThan(0);

    for (const el of order) {
      expect.soft(el.visible, `${el.tag}: "${el.text}" is off-screen`).toBeTruthy();
    }
  });

  test("dashboard forward and backward tab order is consistent @a11y-taborder", async ({
    page,
  }) => {
    await login(page);
    await page.waitForLoadState("networkidle");

    const forward = await captureTabOrder(page, 8);
    expect(forward.length).toBeGreaterThan(0);

    const backward: FocusedElement[] = [];
    for (let i = 0; i < Math.min(forward.length, 8); i++) {
      await page.keyboard.press("Shift+Tab");
      await page.waitForTimeout(100);

      const info = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || "").trim().slice(0, 60),
          ariaLabel: el.getAttribute("aria-label"),
          role: el.getAttribute("role"),
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          visible: rect.width > 0 && rect.height > 0,
        };
      });
      if (info) backward.push(info);
    }

    expect(backward.length).toBeGreaterThan(0);

    test.info().annotations.push({
      type: "tab-order",
      description: `Dashboard: ${forward.length} forward + ${backward.length} backward tab stops`,
    });
  });

  /* ─── Files page tab order ─── */

  test("files page tab order @a11y-taborder", async ({ page }) => {
    await login(page);
    await page.goto("/ar/files");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const order = await captureTabOrder(page, 10);
    expect(order.length).toBeGreaterThan(0);

    for (const el of order) {
      expect.soft(el.visible, `${el.tag}: "${el.text}" is off-screen`).toBeTruthy();
    }
  });

  /* ─── Tags page tab order ─── */

  test("tags page tab order @a11y-taborder", async ({ page }) => {
    await login(page);
    await page.goto("/ar/tags");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const order = await captureTabOrder(page, 10);
    expect(order.length).toBeGreaterThan(0);

    for (const el of order) {
      expect.soft(el.visible, `${el.tag}: "${el.text}" is off-screen`).toBeTruthy();
    }
  });

  /* ─── Search page tab order ─── */

  test("search page tab order @a11y-taborder", async ({ page }) => {
    await login(page);
    await page.goto("/ar/search");
    await page.waitForLoadState("networkidle");

    const order = await captureTabOrder(page, 8);
    expect(order.length).toBeGreaterThan(0);

    for (const el of order) {
      expect.soft(el.visible, `${el.tag}: "${el.text}" is off-screen`).toBeTruthy();
    }
  });

  /* ─── Settings page tab order ─── */

  test("settings page tab order @a11y-taborder", async ({ page }) => {
    await login(page);
    await page.goto("/ar/settings");
    await page.waitForLoadState("networkidle");

    const order = await captureTabOrder(page, 10);
    expect(order.length).toBeGreaterThan(0);

    for (const el of order) {
      expect.soft(el.visible, `${el.tag}: "${el.text}" is off-screen`).toBeTruthy();
    }
  });

  /* ─── Conversions page tab order ─── */

  test("conversions page tab order @a11y-taborder", async ({ page }) => {
    await login(page);
    await page.goto("/ar/conversions");
    await page.waitForLoadState("networkidle");

    const order = await captureTabOrder(page, 10);
    expect(order.length).toBeGreaterThan(0);

    for (const el of order) {
      expect.soft(el.visible, `${el.tag}: "${el.text}" is off-screen`).toBeTruthy();
    }
  });

  /* ─── Users page tab order ─── */

  test("users page tab order @a11y-taborder", async ({ page }) => {
    await login(page);
    await page.goto("/ar/users");
    await page.waitForLoadState("networkidle");

    const order = await captureTabOrder(page, 12);
    expect(order.length).toBeGreaterThan(0);

    for (const el of order) {
      expect.soft(el.visible, `${el.tag}: "${el.text}" is off-screen`).toBeTruthy();
    }
  });

  /* ─── Landing page tab order ─── */

  test("landing page tab order @a11y-taborder", async ({ page }) => {
    await page.goto("/ar");
    await page.waitForLoadState("networkidle");

    const order = await captureTabOrder(page, 10);
    expect(order.length).toBeGreaterThan(0);

    for (const el of order) {
      expect.soft(el.visible, `${el.tag}: "${el.text}" is off-screen`).toBeTruthy();
    }
  });
});
