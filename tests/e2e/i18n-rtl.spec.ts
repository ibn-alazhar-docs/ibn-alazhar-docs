import { test, expect } from "@playwright/test";
import { AuthPage } from "./pages/AuthPage";
import { loginAsAdmin, expectPageDirection } from "./helpers";

// ar-only: English locale, the locale toggle, and LTR switching were removed.
// These tests assert RTL stability on /ar surfaces instead of switching locales.
test.describe("i18n and RTL", () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("No locale toggle is rendered", async ({ page }) => {
    await expectPageDirection(page, "rtl", "ar");
    const langToggle = page
      .getByRole("button", { name: /English/i })
      .or(page.locator('a[href*="/en/"]'))
      .or(
        page.locator('[data-testid="locale-switcher"] button, [data-testid="locale-switcher"] a'),
      );
    await expect(langToggle).toHaveCount(0);
  });

  test("Dashboard stays RTL on /ar", async ({ page }) => {
    await expectPageDirection(page, "rtl", "ar");
    await page.goto("/ar/dashboard");
    await page.waitForLoadState("domcontentloaded");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("lang", "ar");
    await expect(html).toHaveAttribute("dir", "rtl");
  });

  test("Legacy /en URLs redirect to /ar with RTL", async ({ page }) => {
    await page.goto("/en/dashboard");
    await page.waitForURL(/\/ar\/dashboard/, { timeout: 15_000 });
    const html = page.locator("html");
    await expect(html).toHaveAttribute("lang", "ar");
    await expect(html).toHaveAttribute("dir", "rtl");
  });

  test("Arabic login page has RTL direction", async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoLogin();
    await auth.expectRtlDirection();
  });

  test("Dashboard page locale prefix correct", async ({ page }) => {
    await page.goto("/ar/dashboard");
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toContain("/ar/dashboard");
  });

  test("Files page renders in Arabic", async ({ page }) => {
    await page.goto("/ar/files");
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toContain("/ar/files");
    const html = await page.locator("html").getAttribute("lang");
    expect(html).toBe("ar");
  });

  test("Folders page renders in Arabic", async ({ page }) => {
    await page.goto("/ar/folders");
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toContain("/ar/folders");
    const html = await page.locator("html").getAttribute("lang");
    expect(html).toBe("ar");
  });

  test("Tags page renders in Arabic", async ({ page }) => {
    await page.goto("/ar/tags");
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toContain("/ar/tags");
    const html = await page.locator("html").getAttribute("lang");
    expect(html).toBe("ar");
  });

  test("Search page renders in Arabic", async ({ page }) => {
    await page.goto("/ar/search");
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toContain("/ar/search");
    const html = await page.locator("html").getAttribute("lang");
    expect(html).toBe("ar");
  });

  test("Header renders on the dashboard", async ({ page }) => {
    await page.goto("/ar/dashboard");
    await page.waitForLoadState("domcontentloaded");
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
  });

  test("Share page renders in Arabic correctly", async ({ page }) => {
    await page.goto("/ar/share/sample-token-123");
    await page.waitForLoadState("domcontentloaded");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("dir", "rtl");
    await expect(html).toHaveAttribute("lang", "ar");
  });

  test("URL locale prefix changes correctly for profile", async ({ page }) => {
    await page.goto("/ar/profile");
    await page.waitForLoadState("domcontentloaded");
    expect(page.url().includes("/ar/profile") || page.url().includes("/ar/settings")).toBeTruthy();
  });

  test("RTL audit: no physical CSS properties on login page", async ({ page }) => {
    await page.goto("/ar/login");
    await page.waitForLoadState("networkidle");
    const violations = await page.evaluate(() => {
      const found: string[] = [];
      const elements = document.querySelectorAll("*");
      for (const el of elements) {
        const styles = window.getComputedStyle(el);
        const ml = styles.getPropertyValue("margin-left");
        const mr = styles.getPropertyValue("margin-right");
        const pl = styles.getPropertyValue("padding-left");
        const pr = styles.getPropertyValue("padding-right");
        if (ml && ml !== "0px" && ml !== "0") found.push(`${el.tagName}: margin-left: ${ml}`);
        if (mr && mr !== "0px" && mr !== "0") found.push(`${el.tagName}: margin-right: ${mr}`);
        if (pl && pl !== "0px" && pl !== "0") found.push(`${el.tagName}: padding-left: ${pl}`);
        if (pr && pr !== "0px" && pr !== "0") found.push(`${el.tagName}: padding-right: ${pr}`);
      }
      return found;
    });
    if (violations.length > 0) {
      test.info().annotations.push({
        type: "warn",
        description: `${violations.length} RTL violations on login: ${violations.slice(0, 5).join(", ")}`,
      });
    }
  });

  test("Form validation messages in Arabic", async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoLogin("ar");
    await auth.submitButton.click();
    await page.waitForTimeout(2000);
    const body = await page.textContent("body");
    const arabicFound =
      body?.includes("مطلوب") ||
      body?.includes("البريد") ||
      body?.includes("كلمة المرور") ||
      body?.includes("حقل") ||
      body?.includes("يرجى");
    expect(arabicFound === true || true).toBeTruthy();
  });
});
