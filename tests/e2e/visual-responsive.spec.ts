import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const EMAIL = "admin@ibnalazhar.app";
const PASSWORD = "password123";

async function login(page: import("@playwright/test").Page) {
  const csrfResponse = await page.request.get(`${BASE}/api/auth/csrf`);
  const csrfData = await csrfResponse.json();
  const csrfToken = csrfData.csrfToken;

  await page.request.post(`${BASE}/api/auth/callback/credentials`, {
    form: {
      csrfToken,
      email: EMAIL,
      password: PASSWORD,
      redirect: "false",
    },
  });
  await page.goto(`${BASE}/ar/dashboard`);
  await page.waitForLoadState("domcontentloaded");
}

const BREAKPOINTS = [
  { name: "320px", width: 320, height: 568 },
  { name: "375px", width: 375, height: 812 },
  { name: "480px", width: 480, height: 896 },
  { name: "768px", width: 768, height: 1024 },
  { name: "1024px", width: 1024, height: 768 },
  { name: "1280px", width: 1280, height: 800 },
  { name: "1440px", width: 1440, height: 900 },
] as const;

type BreakpointName = (typeof BREAKPOINTS)[number]["name"];

//
// Test helper: verify no horizontal overflow on the page
//
async function verifyNoOverflow(page: import("@playwright/test").Page) {
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  expect(hasOverflow).toBe(false);
}

//
// Test helper: verify correct direction
//
async function verifyDirection(page: import("@playwright/test").Page, expected: "rtl" | "ltr") {
  const dir = await page.locator("html").getAttribute("dir");
  expect(dir).toBe(expected);
}

test.describe("Responsive — Public Pages (Arabic RTL)", () => {
  test.describe.configure({ timeout: 180_000 });

  for (const bp of BREAKPOINTS) {
    test(`Landing page /ar @${bp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto(`${BASE}/ar`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      await verifyDirection(page, "rtl");
      await verifyNoOverflow(page);

      await expect(page).toHaveScreenshot(`responsive-landing-ar-${bp.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`Login page /ar @${bp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto(`${BASE}/ar/login`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      await verifyDirection(page, "rtl");
      await verifyNoOverflow(page);

      await expect(page).toHaveScreenshot(`responsive-login-ar-${bp.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`Register page /ar @${bp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto(`${BASE}/ar/register`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      await verifyDirection(page, "rtl");
      await verifyNoOverflow(page);

      await expect(page).toHaveScreenshot(`responsive-register-ar-${bp.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`Forgot password /ar @${bp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto(`${BASE}/ar/forgot-password`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      await verifyDirection(page, "rtl");
      await verifyNoOverflow(page);

      await expect(page).toHaveScreenshot(`responsive-forgot-password-ar-${bp.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`Not found /ar @${bp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto(`${BASE}/ar/nonexistent-route-xyz`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      await verifyDirection(page, "rtl");
      await verifyNoOverflow(page);

      await expect(page).toHaveScreenshot(`responsive-not-found-ar-${bp.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });
  }
});

test.describe("Responsive — Public Pages (English LTR)", () => {
  test.describe.configure({ timeout: 180_000 });

  for (const bp of BREAKPOINTS) {
    test(`Landing page /en @${bp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto(`${BASE}/en`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      await verifyDirection(page, "ltr");
      await verifyNoOverflow(page);

      await expect(page).toHaveScreenshot(`responsive-landing-en-${bp.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`Login page /en @${bp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto(`${BASE}/en/login`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      await verifyDirection(page, "ltr");
      await verifyNoOverflow(page);

      await expect(page).toHaveScreenshot(`responsive-login-en-${bp.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`Register page /en @${bp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto(`${BASE}/en/register`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      await verifyDirection(page, "ltr");
      await verifyNoOverflow(page);

      await expect(page).toHaveScreenshot(`responsive-register-en-${bp.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });
  }
});

test.describe("Responsive — Authenticated Pages (Arabic RTL)", () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const bp of BREAKPOINTS) {
    test(`Dashboard /ar @${bp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto(`${BASE}/ar/dashboard`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      await verifyDirection(page, "rtl");
      await verifyNoOverflow(page);

      await expect(page).toHaveScreenshot(`responsive-dashboard-ar-${bp.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`Files /ar @${bp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto(`${BASE}/ar/files`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      await verifyDirection(page, "rtl");
      await verifyNoOverflow(page);

      await expect(page).toHaveScreenshot(`responsive-files-ar-${bp.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`Folders /ar @${bp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto(`${BASE}/ar/folders`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      await verifyDirection(page, "rtl");
      await verifyNoOverflow(page);

      await expect(page).toHaveScreenshot(`responsive-folders-ar-${bp.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`Tags /ar @${bp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto(`${BASE}/ar/tags`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      await verifyDirection(page, "rtl");
      await verifyNoOverflow(page);

      await expect(page).toHaveScreenshot(`responsive-tags-ar-${bp.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`Search /ar @${bp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto(`${BASE}/ar/search`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      await verifyDirection(page, "rtl");
      await verifyNoOverflow(page);

      await expect(page).toHaveScreenshot(`responsive-search-ar-${bp.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`Settings /ar @${bp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto(`${BASE}/ar/settings`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      await verifyDirection(page, "rtl");
      await verifyNoOverflow(page);

      await expect(page).toHaveScreenshot(`responsive-settings-ar-${bp.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });
  }
});

test.describe("Responsive — Authenticated Pages (English LTR)", () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const bp of BREAKPOINTS) {
    test(`Dashboard /en @${bp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto(`${BASE}/en/dashboard`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      await verifyDirection(page, "ltr");
      await verifyNoOverflow(page);

      await expect(page).toHaveScreenshot(`responsive-dashboard-en-${bp.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`Files /en @${bp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto(`${BASE}/en/files`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      await verifyDirection(page, "ltr");
      await verifyNoOverflow(page);

      await expect(page).toHaveScreenshot(`responsive-files-en-${bp.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`Folders /en @${bp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto(`${BASE}/en/folders`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      await verifyDirection(page, "ltr");
      await verifyNoOverflow(page);

      await expect(page).toHaveScreenshot(`responsive-folders-en-${bp.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`Tags /en @${bp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto(`${BASE}/en/tags`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      await verifyDirection(page, "ltr");
      await verifyNoOverflow(page);

      await expect(page).toHaveScreenshot(`responsive-tags-en-${bp.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`Search /en @${bp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto(`${BASE}/en/search`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      await verifyDirection(page, "ltr");
      await verifyNoOverflow(page);

      await expect(page).toHaveScreenshot(`responsive-search-en-${bp.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`Settings /en @${bp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto(`${BASE}/en/settings`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      await verifyDirection(page, "ltr");
      await verifyNoOverflow(page);

      await expect(page).toHaveScreenshot(`responsive-settings-en-${bp.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });
  }
});
