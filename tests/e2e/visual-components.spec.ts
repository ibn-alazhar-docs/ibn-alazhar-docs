import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";

test.describe("Visual Components", () => {
  test.describe.configure({ timeout: 120_000 });

  //
  // Buttons — all variants, states, and sizes
  //
  test.describe("Button Component", () => {
    test("all button variants on desktop", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}/ar/login`);
      await page.waitForLoadState("networkidle");

      const button = page.locator('button[type="submit"]').first();
      await button.scrollIntoViewIfNeeded();
      await expect(button).toBeVisible();
      await expect(page).toHaveScreenshot("button-submit-default.png", {
        maxDiffPixelRatio: 0.02,
      });
    });

    test("button hover state", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}/ar/login`);
      await page.waitForLoadState("networkidle");

      const button = page.locator('button[type="submit"]').first();
      await button.hover();
      await page.waitForTimeout(200);
      await expect(button).toBeVisible();
      await expect(page).toHaveScreenshot("button-submit-hover.png", {
        maxDiffPixelRatio: 0.02,
      });
    });

    test("button disabled state", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}/ar/login`);
      await page.waitForLoadState("networkidle");

      const button = page.locator('button[type="submit"]').first();
      await button.evaluate((el: HTMLButtonElement) => el.setAttribute("disabled", ""));
      await expect(page).toHaveScreenshot("button-submit-disabled.png", {
        maxDiffPixelRatio: 0.02,
      });
    });

    test("button focus-visible state", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}/ar/login`);
      await page.waitForLoadState("networkidle");

      const button = page.locator('button[type="submit"]').first();
      await button.focus();
      await page.waitForTimeout(200);
      await expect(page).toHaveScreenshot("button-submit-focus.png", {
        maxDiffPixelRatio: 0.02,
      });
    });

    test("outline and ghost buttons", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}/ar/register`);
      await page.waitForLoadState("networkidle");

      const links = page.locator("a").filter({ hasText: /دخول|تسجيل|sign/i });
      if ((await links.count()) > 0) {
        await links.first().scrollIntoViewIfNeeded();
      }
      await expect(page).toHaveScreenshot("buttons-variants.png", {
        maxDiffPixelRatio: 0.02,
      });
    });
  });

  //
  // Input Fields
  //
  test.describe("Input Fields", () => {
    test("input default state", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}/ar/login`);
      await page.waitForLoadState("networkidle");

      const inputs = page.locator("input");
      await expect(inputs.first()).toBeVisible();
      await expect(page).toHaveScreenshot("input-default.png", {
        maxDiffPixelRatio: 0.02,
      });
    });

    test("input focused state", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}/ar/login`);
      await page.waitForLoadState("networkidle");

      const input = page.locator('input[type="email"]').first();
      await input.focus();
      await page.waitForTimeout(200);
      await expect(page).toHaveScreenshot("input-focused.png", {
        maxDiffPixelRatio: 0.02,
      });
    });

    test("input with value", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}/ar/login`);
      await page.waitForLoadState("networkidle");

      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();

      if (await emailInput.isVisible()) {
        await emailInput.fill("user@example.com");
      }
      if (await passwordInput.isVisible()) {
        await passwordInput.fill("mypassword");
      }
      await expect(page).toHaveScreenshot("input-filled.png", {
        maxDiffPixelRatio: 0.02,
      });
    });

    test("input error state", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}/ar/login`);
      await page.waitForLoadState("networkidle");

      const submitBtn = page.locator('button[type="submit"]').first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(500);
      }
      await expect(page).toHaveScreenshot("input-error.png", {
        maxDiffPixelRatio: 0.02,
      });
    });

    test("input disabled state", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}/ar/login`);
      await page.waitForLoadState("networkidle");

      const inputs = page.locator("input");
      const count = await inputs.count();
      for (let i = 0; i < count; i++) {
        await inputs.nth(i).evaluate((el: HTMLInputElement) => el.setAttribute("disabled", ""));
      }
      await expect(page).toHaveScreenshot("input-disabled.png", {
        maxDiffPixelRatio: 0.02,
      });
    });

    test("input with Arabic placeholder text", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}/ar/register`);
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveScreenshot("input-arabic-placeholder.png", {
        maxDiffPixelRatio: 0.02,
      });
    });
  });

  //
  // Loading States — Skeletons
  //
  test.describe("Loading States", () => {
    test("skeleton loading state", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}/ar/files`);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(300);
      await expect(page).toHaveScreenshot("skeleton-loading.png", {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });
  });

  //
  // Badge Variants
  //
  test.describe("Tag & Badge Components", () => {
    test("badge variants on tags page", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}/ar/tags`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot("badge-variants.png", {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });
  });

  //
  // Card Components
  //
  test.describe("Card Components", () => {
    test("card on login page", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}/ar/login`);
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveScreenshot("card-login.png", {
        maxDiffPixelRatio: 0.02,
      });
    });

    test("card on dashboard", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}/ar`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot("card-landing.png", {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });
  });

  //
  // Folders
  //
  test.describe("Folder Tree", () => {
    test("folder tree sidebar on files page", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}/ar/files`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      const sidebar = page.locator(".w-64").first();
      if (await sidebar.isVisible()) {
        await expect(sidebar).toHaveScreenshot("folder-tree.png", {
          maxDiffPixelRatio: 0.02,
        });
      }
    });
  });

  //
  // Pagination (simulated via document table)
  //
  test.describe("Pagination", () => {
    test("document table layout", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}/ar/files`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot("document-table.png", {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });
  });

  //
  // Dialog / Modal
  //
  test.describe("Dialog Components", () => {
    test("confirm dialog renders", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}/ar/files`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      const deleteBtn = page.locator('[data-testid="confirm-dialog"]').first();
      if (await deleteBtn.isVisible()) {
        await expect(page).toHaveScreenshot("dialog-confirm.png", {
          maxDiffPixelRatio: 0.02,
        });
      }
    });
  });

  //
  // Locale Toggle
  //
  test.describe("Locale Toggle", () => {
    test("locale toggle button", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}/ar/login`);
      await page.waitForLoadState("networkidle");

      const toggle = page
        .locator("button")
        .filter({ hasText: /^EN$|^AR$/ })
        .first();
      if (await toggle.isVisible()) {
        await expect(toggle).toHaveScreenshot("locale-toggle.png", {
          maxDiffPixelRatio: 0.02,
        });
      }
    });
  });

  //
  // Page Header / Navigation
  //
  test.describe("Navigation", () => {
    test("public header on login page", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}/ar/login`);
      await page.waitForLoadState("networkidle");

      const header = page.locator("header, nav").first();
      if (await header.isVisible()) {
        await expect(header).toHaveScreenshot("public-header-ar.png", {
          maxDiffPixelRatio: 0.02,
        });
      }
    });

    test("public header english", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}/en/login`);
      await page.waitForLoadState("networkidle");

      const header = page.locator("header, nav").first();
      if (await header.isVisible()) {
        await expect(header).toHaveScreenshot("public-header-en.png", {
          maxDiffPixelRatio: 0.02,
        });
      }
    });
  });

  //
  // Footer
  //
  test.describe("Footer", () => {
    test("footer on landing page", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}/ar`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      const footer = page.locator("footer").first();
      if (await footer.isVisible()) {
        await footer.scrollIntoViewIfNeeded();
        await expect(footer).toHaveScreenshot("footer-ar.png", {
          maxDiffPixelRatio: 0.02,
        });
      }
    });
  });

  //
  // RTL Layout — direction attribute
  //
  test.describe("RTL Direction", () => {
    test("login page has correct RTL direction", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}/ar/login`);
      await page.waitForLoadState("networkidle");

      const dir = await page.locator("html").getAttribute("dir");
      expect(dir).toBe("rtl");
    });

    test("login page english has correct LTR direction", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE}/en/login`);
      await page.waitForLoadState("networkidle");

      const dir = await page.locator("html").getAttribute("dir");
      expect(dir).toBe("ltr");
    });
  });
});
