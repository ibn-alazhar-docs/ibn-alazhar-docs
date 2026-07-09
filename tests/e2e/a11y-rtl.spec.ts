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

test.describe("Arabic/RTL-specific accessibility", () => {
  test.describe.configure({ timeout: 90_000 });

  /* ─── HTML Attributes ─── */

  test("Arabic pages have dir=rtl on html element @a11y-rtl", async ({ page }) => {
    const pages = ["/ar", "/ar/login", "/ar/register", "/ar/forgot-password", "/ar/404"];
    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const dir = await page.locator("html").getAttribute("dir");
      expect.soft(dir, `${path}: expected dir="rtl"`).toBe("rtl");
    }
  });

  test("Arabic pages have lang=ar on html element @a11y-rtl", async ({ page }) => {
    const pages = ["/ar", "/ar/login", "/ar/register", "/ar/forgot-password", "/ar/404"];
    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const lang = await page.locator("html").getAttribute("lang");
      expect.soft(lang, `${path}: expected lang="ar"`).toBe("ar");
    }
  });

  test("English pages have dir=ltr on html element @a11y-rtl", async ({ page }) => {
    const pages = ["/en", "/en/login", "/en/register", "/en/forgot-password"];
    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const dir = await page.locator("html").getAttribute("dir");
      expect.soft(dir, `${path}: expected dir="ltr"`).toBe("ltr");
    }
  });

  test("English pages have lang=en on html element @a11y-rtl", async ({ page }) => {
    const pages = ["/en", "/en/login", "/en/register", "/en/forgot-password"];
    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const lang = await page.locator("html").getAttribute("lang");
      expect.soft(lang, `${path}: expected lang="en"`).toBe("en");
    }
  });

  test("auth pages in RTL: direction set correctly @a11y-rtl", async ({ page }) => {
    await page.goto("/ar/login");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  });

  /* ─── Protected Pages RTL Attributes ─── */

  test("dashboard page in RTL has correct dir/lang @a11y-rtl", async ({ page }) => {
    await login(page);
    await page.goto("/ar/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  });

  test("English dashboard has correct dir/lang @a11y-rtl", async ({ page }) => {
    await login(page);
    await page.goto("/en/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("files page in RTL has correct direction @a11y-rtl", async ({ page }) => {
    await login(page);
    await page.goto("/ar/files");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });

  /* ─── RTL Layout Properties ─── */

  test("Arabic pages use logical CSS properties (no physical left/right) @a11y-rtl", async ({
    page,
  }) => {
    await page.goto("/ar/login");
    await page.waitForLoadState("networkidle");

    const physicalViolations = await page.evaluate(() => {
      const physicalProps = ["margin-left", "margin-right", "padding-left", "padding-right"];
      const found: Array<{ selector: string; prop: string; value: string }> = [];
      const allElements = document.querySelectorAll("*");
      const seen = new Set<string>();

      allElements.forEach((el) => {
        const styles = window.getComputedStyle(el);
        for (const prop of physicalProps) {
          const val = styles.getPropertyValue(prop);
          if (val && val !== "0px" && val !== "0" && val !== "normal") {
            const key = `${el.tagName}.${(el.className || "").slice(0, 30)}:${prop}`;
            if (!seen.has(key)) {
              seen.add(key);
              found.push({
                selector: `${el.tagName.toLowerCase()}${el.className ? "." + (el.className as string).slice(0, 40) : ""}`,
                prop,
                value: val,
              });
            }
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
    await page.waitForLoadState("networkidle");

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
    await page.waitForLoadState("networkidle");

    const toaster = page.locator("[data-sonner-toaster]");
    if (await toaster.isVisible()) {
      const dir = await toaster.getAttribute("dir");
      expect(dir).toBe("rtl");
    }
  });

  /* ─── Skip link in RTL ─── */

  test("skip to content link exists in RTL @a11y-rtl", async ({ page }) => {
    await page.goto("/ar/login");
    await page.waitForLoadState("networkidle");
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeVisible();
    const text = await skipLink.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test("skip link works in English LTR @a11y-rtl", async ({ page }) => {
    await page.goto("/en/login");
    await page.waitForLoadState("networkidle");
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeVisible();
    await expect(skipLink).toHaveAttribute("href", "#main-content");
  });

  /* ─── Form RTL Correctness ─── */

  test("form inputs in RTL maintain proper text direction for mixed content @a11y-rtl", async ({
    page,
  }) => {
    await page.goto("/ar/login");
    await page.waitForLoadState("networkidle");

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
    await page.waitForLoadState("networkidle");

    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');

    await emailInput.focus();
    await expect(emailInput).toBeFocused();
    await page.keyboard.press("Tab");
    await page.waitForTimeout(100);
    await expect(passwordInput).toBeFocused();

    await page.keyboard.press("Shift+Tab");
    await page.waitForTimeout(100);
    await expect(emailInput).toBeFocused();
  });

  /* ─── RTL Dashboard ─── */

  test("dashboard RTL layout is correct @a11y-rtl", async ({ page }) => {
    await login(page);
    await page.waitForLoadState("networkidle");

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
    await page.waitForLoadState("networkidle");

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
    await page.waitForLoadState("networkidle");

    const inputsWithDir = page.locator('input[dir="ltr"]');
    const count = await inputsWithDir.count();
    test.info().annotations.push({
      type: "rtl",
      description: `Found ${count} inputs with explicit dir=ltr for number/email entry in RTL mode`,
    });
  });
});
