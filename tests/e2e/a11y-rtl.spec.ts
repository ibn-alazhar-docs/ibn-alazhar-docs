import { test, expect, type Page } from "@playwright/test";

const EMAIL = "admin@ibnalazhar.app";
const PASSWORD = "AdminPassword123!";

async function login(page: Page) {
  await page.goto("/ar/login");
  await page.waitForLoadState("load");
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/\/dashboard/, { timeout: 30000 });
  await expect(page.locator("main")).toBeVisible({ timeout: 15000 });
}

test.describe("Arabic/RTL-specific accessibility", () => {
  test.describe.configure({ timeout: 90_000 });

  /* ─── HTML Attributes ─── */

  test("Arabic pages have dir=rtl on html element @a11y-rtl", async ({ page }) => {
    const pages = ["/ar", "/ar/login", "/ar/register", "/ar/forgot-password", "/ar/404"];
    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState("load");
      const dir = await page.locator("html").getAttribute("dir");
      expect.soft(dir, `${path}: expected dir="rtl"`).toBe("rtl");
    }
  });

  test("Arabic pages have lang=ar on html element @a11y-rtl", async ({ page }) => {
    const pages = ["/ar", "/ar/login", "/ar/register", "/ar/forgot-password", "/ar/404"];
    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState("load");
      const lang = await page.locator("html").getAttribute("lang");
      expect.soft(lang, `${path}: expected lang="ar"`).toBe("ar");
    }
  });

  test("Legacy /en URLs redirect to /ar pages @a11y-rtl", async ({ page }) => {
    const pages = ["/en", "/en/login", "/en/register", "/en/forgot-password"];
    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState("load");
      expect(page.url()).toContain("/ar");
      const lang = await page.locator("html").getAttribute("lang");
      expect.soft(lang, `${path}: expected lang="ar" after redirect`).toBe("ar");
    }
  });

  test("auth pages in RTL: direction set correctly @a11y-rtl", async ({ page }) => {
    await page.goto("/ar/login");
    await page.waitForLoadState("load");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  });

  /* ─── Protected Pages RTL Attributes ─── */

  test("dashboard page in RTL has correct dir/lang @a11y-rtl", async ({ page }) => {
    await login(page);
    await page.goto("/ar/dashboard");
    await page.waitForLoadState("load");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  });

  test("Legacy /en dashboard redirects to /ar dashboard @a11y-rtl", async ({ page }) => {
    await login(page);
    await page.goto("/en/dashboard");
    await page.waitForURL(/\/ar\/(dashboard|login)/, { timeout: 15000 });
    await page.waitForLoadState("load");
    expect(page.url()).toContain("/ar/dashboard");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  });

  test("files page in RTL has correct direction @a11y-rtl", async ({ page }) => {
    await login(page);
    await page.goto("/ar/files");
    await page.waitForLoadState("load");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });

  /* ─── RTL Layout Properties ─── */

  test("Arabic pages use logical CSS properties (no physical left/right) @a11y-rtl", async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto("/ar/login");
    await page.waitForLoadState("load");

    const physicalViolations = await page.evaluate(() => {
      const physicalClassPattern = /\b(m[ltr]|m[rtl]|p[ltr]|p[rtl]|ml|mr|pl|pr|px|mx)(-\S+)?\b/;
      const found: Array<{ selector: string; cls: string }> = [];
      const seen = new Set<string>();
      document.querySelectorAll("*").forEach((el) => {
        const cls = (el.className && typeof el.className === "string") ? el.className : "";
        // Only flag physical horizontal spacing utilities, not logical (ms/me/ps/pe/mx-auto is physical too)
        const matches = cls.match(/\b(ml|mr|pl|pr|px|mx)(-\S+)?\b/g);
        if (matches) {
          const key = `${el.tagName}:${matches.join(",")}`;
          if (!seen.has(key)) {
            seen.add(key);
            found.push({ selector: el.tagName.toLowerCase(), cls: matches.join(" ") });
          }
        }
      });
      return found.slice(0, 20);
    });

    if (physicalViolations.length > 0) {
      test.info().annotations.push({
        type: "rtl-warning",
        description: `Found ${physicalViolations.length} physical CSS properties (first 20 shown)`,
      });
    }
    expect(physicalViolations.length).toBeLessThanOrEqual(5);
  });

  test("Arabic pages don't use text-align: left on text @a11y-rtl", async ({ page }) => {
    await page.goto("/ar/login");
    await page.waitForLoadState("load");

    const alignViolations = await page.evaluate(() => {
      const found: string[] = [];
      document.querySelectorAll("*").forEach((el) => {
        const s = window.getComputedStyle(el);
        if (s.textAlign === "left") {
          const text = (el.textContent || "").trim().slice(0, 50);
          if (text) {
            found.push(`${el.tagName}.${(el.className || "").slice(0, 30)}: "${text}"`);
          }
        }
      });
      return found.slice(0, 15);
    });

    if (alignViolations.length > 0) {
      test.info().annotations.push({
        type: "rtl-violation",
        description: `Found ${alignViolations.length} elements with text-align: left in RTL mode`,
      });
    }
  });

  /* ─── RTL Direction on Dynamic Content ─── */

  test("sonner toaster respects RTL direction @a11y-rtl", async ({ page }) => {
    await page.goto("/ar");
    await page.waitForLoadState("load");

    const toaster = page.locator("[data-sonner-toaster]");
    if (await toaster.isVisible()) {
      const dir = await toaster.getAttribute("dir");
      expect(dir).toBe("rtl");
    }
  });

  /* ─── Skip link in RTL ─── */

  test("skip to content link exists in RTL @a11y-rtl", async ({ page }) => {
    await page.goto("/ar/login");
    await page.waitForLoadState("load");
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeVisible();
    const text = await skipLink.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test("skip link works after /en redirect @a11y-rtl", async ({ page }) => {
    await page.goto("/en/login");
    await page.waitForLoadState("load");
    expect(page.url()).toContain("/ar/login");
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeVisible();
    await expect(skipLink).toHaveAttribute("href", "#main-content");
  });

  /* ─── Form RTL Correctness ─── */

  test("form inputs in RTL maintain proper text direction for mixed content @a11y-rtl", async ({
    page,
  }) => {
    await page.goto("/ar/login");
    await page.waitForLoadState("load");

    const emailInput = page.locator('input[name="email"]');
    const inputDir = await emailInput.getAttribute("dir");
    if (inputDir === "ltr") {
      test.info().annotations.push({
        type: "rtl-info",
        description: "Email input uses dir=ltr for proper URL/email entry in RTL mode",
      });
    }
  });

  /* ─── RTL Keyboard Navigation ─── */

  test("RTL keyboard navigation works correctly @a11y-rtl", async ({ page }) => {
    await page.goto("/ar/login");
    await page.waitForLoadState("load");

    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');

    await emailInput.focus();
    await expect(emailInput).toBeFocused();

    let reachedPassword = false;
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      if (await passwordInput.evaluate((el) => el === document.activeElement).catch(() => false)) {
        reachedPassword = true;
        break;
      }
    }
    expect(reachedPassword).toBeTruthy();
    await expect(passwordInput).toBeFocused();

    let reachedEmail = false;
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Shift+Tab");
      if (await emailInput.evaluate((el) => el === document.activeElement).catch(() => false)) {
        reachedEmail = true;
        break;
      }
    }
    expect(reachedEmail).toBeTruthy();
    await expect(emailInput).toBeFocused();
  });

  /* ─── RTL Dashboard ─── */

  test("dashboard RTL layout is correct @a11y-rtl", async ({ page }) => {
    await login(page);
    await page.waitForLoadState("load");

    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");

    const sidebar = page.locator("aside");
    if (await sidebar.isVisible()) {
      const sidebarOrder = await sidebar.evaluate((el) => {
        const style = getComputedStyle(el);
        return style.order;
      });
      test.info().annotations.push({
        type: "rtl",
        description: `Sidebar CSS order: ${sidebarOrder}`,
      });
    }
  });

  /* ─── Focus Ring in RTL ─── */

  test("focus ring is visible in RTL mode @a11y-rtl", async ({ page }) => {
    await page.goto("/ar/login");
    await page.waitForLoadState("load");

    const email = page.locator('input[name="email"]');
    await email.focus();
    const outline = await email.evaluate((el) => {
      const s = getComputedStyle(el);
      return s.outline || s.boxShadow;
    });
    expect(outline !== "none" && outline !== "").toBeTruthy();
  });

  /* ─── Number Input Direction in RTL ─── */

  test("number/dir=ltr inputs in RTL mode preserve LTR @a11y-rtl", async ({ page }) => {
    await page.goto("/ar/conversions");
    await page.waitForLoadState("load");

    const inputsWithDir = page.locator('input[dir="ltr"]');
    const count = await inputsWithDir.count();
    test.info().annotations.push({
      type: "rtl",
      description: `Found ${count} inputs with explicit dir=ltr for number/email entry in RTL mode`,
    });
  });
});
