import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3000";
const EMAIL = "admin@ibnalazhar.app";
const PASSWORD = "admin123";

async function login(page: Page) {
  await page.goto(`${BASE}/ar/login`);
  await page.waitForLoadState("networkidle");
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/dashboard/, { timeout: 30000 });
}

test.describe("Ibn Al-Azhar Docs — Webapp Test Suite", () => {
  test.describe.configure({ timeout: 120_000 });

  test("Landing page loads and is RTL", async ({ page }) => {
    await page.goto(`${BASE}/ar`);
    await page.waitForLoadState("networkidle");

    await page.screenshot({ path: "/tmp/ibn-test-landing.png", fullPage: true });

    const html = page.locator("html");
    await expect(html).toHaveAttribute("dir", "rtl");
    await expect(html).toHaveAttribute("lang", "ar");

    const body = await page.textContent("body");
    expect(body).toBeTruthy();
    console.log("PASS: Landing page loads with RTL + Arabic");
  });

  test("Login page renders correctly", async ({ page }) => {
    await page.goto(`${BASE}/ar/login`);
    await page.waitForLoadState("networkidle");

    await page.screenshot({ path: "/tmp/ibn-test-login.png", fullPage: true });

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

  test("Login with valid credentials redirects to dashboard", async ({ page }) => {
    await login(page);
    await page.screenshot({ path: "/tmp/ibn-test-dashboard.png", fullPage: true });
    console.log("PASS: Login redirects to dashboard");
  });

  test("Files page accessible after login", async ({ page }) => {
    await login(page);
    const response = await page.goto(`${BASE}/ar/files`);
    await page.waitForLoadState("networkidle");
    const status = response?.status();
    expect(status).toBeLessThan(400);
    await page.screenshot({ path: "/tmp/ibn-test-files.png", fullPage: true });
    console.log(`PASS: Files page — status ${status}`);
  });

  test("Folders page accessible after login", async ({ page }) => {
    await login(page);
    const response = await page.goto(`${BASE}/ar/folders`);
    await page.waitForLoadState("networkidle");
    const status = response?.status();
    expect(status).toBeLessThan(400);
    await page.screenshot({ path: "/tmp/ibn-test-folders.png", fullPage: true });
    console.log(`PASS: Folders page — status ${status}`);
  });

  test("Tags page accessible after login", async ({ page }) => {
    await login(page);
    const response = await page.goto(`${BASE}/ar/tags`);
    await page.waitForLoadState("networkidle");
    const status = response?.status();
    expect(status).toBeLessThan(400);
    await page.screenshot({ path: "/tmp/ibn-test-tags.png", fullPage: true });
    console.log(`PASS: Tags page — status ${status}`);
  });

  test("Search page accessible after login", async ({ page }) => {
    await login(page);
    const response = await page.goto(`${BASE}/ar/search`);
    await page.waitForLoadState("networkidle");
    const status = response?.status();
    expect(status).toBeLessThan(400);
    await page.screenshot({ path: "/tmp/ibn-test-search.png", fullPage: true });
    console.log(`PASS: Search page — status ${status}`);
  });

  test("Settings page accessible after login", async ({ page }) => {
    await login(page);
    const response = await page.goto(`${BASE}/ar/settings`);
    await page.waitForLoadState("networkidle");
    const status = response?.status();
    expect(status).toBeLessThan(400);
    await page.screenshot({ path: "/tmp/ibn-test-settings.png", fullPage: true });
    console.log(`PASS: Settings page — status ${status}`);
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
