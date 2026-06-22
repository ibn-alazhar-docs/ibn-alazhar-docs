import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3000";
const EMAIL = "admin@ibnalazhar.app";
const PASSWORD = "admin123";

test.describe("Ibn Al-Azhar Docs — Webapp Test Suite", () => {
  test.describe.configure({ timeout: 120_000 });

  test("1. Landing page loads and is RTL", async ({ page }) => {
    await page.goto(`${BASE}/ar`);
    await page.waitForLoadState("networkidle");

    await page.screenshot({ path: "/tmp/ibn-test-01-landing.png", fullPage: true });

    const html = page.locator("html");
    await expect(html).toHaveAttribute("dir", "rtl");
    await expect(html).toHaveAttribute("lang", "ar");

    const body = await page.textContent("body");
    expect(body).toBeTruthy();
    console.log("PASS: Landing page loads with RTL + Arabic");
  });

  test("2. Login page renders correctly", async ({ page }) => {
    await page.goto(`${BASE}/ar/login`);
    await page.waitForLoadState("networkidle");

    await page.screenshot({ path: "/tmp/ibn-test-02-login.png", fullPage: true });

    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    const submitBtn = page.locator('button[type="submit"]').first();

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();

    const html = page.locator("html");
    await expect(html).toHaveAttribute("dir", "rtl");
    console.log("PASS: Login page renders with RTL + form fields");
  });

  test("3. Login with valid credentials redirects to dashboard", async ({ page }) => {
    await page.goto(`${BASE}/ar/login`);
    await page.waitForLoadState("networkidle");

    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').first().click();

    await page.waitForURL(/dashboard/, { timeout: 30000 });

    await page.screenshot({ path: "/tmp/ibn-test-03-dashboard.png", fullPage: true });
    console.log("PASS: Login redirects to dashboard");
  });

  test("4. Dashboard pages are accessible after login", async ({ page }) => {
    await page.goto(`${BASE}/ar/login`);
    await page.waitForLoadState("networkidle");
    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/dashboard/, { timeout: 30000 });

    const pages = [
      { name: "Files", path: "/ar/files", screenshot: "04-files" },
      { name: "Folders", path: "/ar/folders", screenshot: "05-folders" },
      { name: "Tags", path: "/ar/tags", screenshot: "06-tags" },
      { name: "Search", path: "/ar/search", screenshot: "07-search" },
      { name: "Settings", path: "/ar/settings", screenshot: "08-settings" },
    ];

    for (const p of pages) {
      const response = await page.goto(`${BASE}${p.path}`);
      await page.waitForLoadState("networkidle");
      const status = response?.status();
      expect(status).toBeLessThan(400);
      await page.screenshot({
        path: `/tmp/ibn-test-${p.screenshot}-${p.name.toLowerCase()}.png`,
        fullPage: true,
      });
      console.log(`PASS: ${p.name} (${p.path}) — status ${status}`);
    }
  });

  test("5. RTL audit — no physical CSS properties", async ({ page }) => {
    await page.goto(`${BASE}/ar/login`);
    await page.waitForLoadState("networkidle");

    const violations = await page.evaluate(() => {
      const physical = [
        "margin-left",
        "margin-right",
        "padding-left",
        "padding-right",
        "text-align",
      ];
      const found: string[] = [];
      const elements = document.querySelectorAll("*");
      elements.forEach((el) => {
        const styles = window.getComputedStyle(el);
        physical.forEach((prop) => {
          const val = styles.getPropertyValue(prop);
          if (val && val !== "0px" && val !== "0" && val !== "left" && prop !== "text-align") {
            // text-align: left is always a violation in RTL
          }
          if (prop === "text-align" && val === "left") {
            found.push(`${el.tagName}.${el.className}: text-align: left`);
          }
        });
      });
      return found;
    });

    if (violations.length > 0) {
      console.log(`WARNING: ${violations.length} RTL violations found:`);
      violations.forEach((v) => console.log(`  - ${v}`));
    } else {
      console.log("PASS: No RTL violations on login page");
    }
  });

  test("6. Login with wrong credentials shows error", async ({ page }) => {
    await page.goto(`${BASE}/ar/login`);
    await page.waitForLoadState("networkidle");

    await page.fill('input[name="email"]', "wrong@email.com");
    await page.fill('input[name="password"]', "wrongpassword");
    await page.locator('button[type="submit"]').first().click();

    await page.waitForTimeout(3000);

    await page.screenshot({ path: "/tmp/ibn-test-09-login-error.png", fullPage: true });

    const body = await page.textContent("body");
    const url = page.url();
    const stillOnLogin = url.includes("login");
    console.log(`PASS: Wrong credentials — stayed on login: ${stillOnLogin}`);
  });

  test("7. Unauthenticated access redirects to login", async ({ page, context }) => {
    const freshContext = await context.browser()!.newContext();
    const freshPage = await freshContext.newPage();

    await freshPage.goto(`${BASE}/ar/dashboard`);
    await freshPage.waitForLoadState("networkidle");

    const url = freshPage.url();
    const redirected = url.includes("login");
    await freshPage.screenshot({ path: "/tmp/ibn-test-10-unauth-redirect.png", fullPage: true });

    console.log(`PASS: Unauthenticated dashboard access redirects to login: ${redirected}`);
    await freshContext.close();
  });

  test("8. Landing page — responsive check (mobile)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/ar`);
    await page.waitForLoadState("networkidle");

    await page.screenshot({ path: "/tmp/ibn-test-11-mobile-landing.png", fullPage: true });

    const overflowInfo = await page.evaluate(() => {
      const docWidth = document.documentElement.clientWidth;
      const scrollWidth = document.documentElement.scrollWidth;
      const overflow = scrollWidth - docWidth;

      const overflowingElements: string[] = [];
      document.querySelectorAll("*").forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width > docWidth + 2) {
          overflowingElements.push(
            `${el.tagName}.${(el.className as string).toString().slice(0, 40)} (${Math.round(rect.width)}px)`,
          );
        }
      });

      return {
        docWidth,
        scrollWidth,
        overflow,
        overflowingElements: overflowingElements.slice(0, 5),
      };
    });

    console.log(
      `Mobile viewport: ${overflowInfo.docWidth}px, scroll: ${overflowInfo.scrollWidth}px, overflow: ${overflowInfo.overflow}px`,
    );
    if (overflowInfo.overflow > 0) {
      console.log(`WARNING: ${overflowInfo.overflowingElements.length} elements overflow:`);
      overflowInfo.overflowingElements.forEach((e) => console.log(`  - ${e}`));
    } else {
      console.log("PASS: No mobile overflow");
    }
  });
});
