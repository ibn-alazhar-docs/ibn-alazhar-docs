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

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
  { name: "wide", width: 1920, height: 1080 },
] as const;

const LOCALES = [
  { prefix: "ar", suffix: "ar" },
  { prefix: "en", suffix: "en" },
] as const;

type ViewportName = (typeof VIEWPORTS)[number]["name"];

function viewportSuffix(name: ViewportName): string {
  return name;
}

test.describe("Visual Pages — Unauthenticated Pages", () => {
  test.describe.configure({ timeout: 120_000 });

  for (const locale of LOCALES) {
    for (const vp of VIEWPORTS) {
      test(`Landing page — ${locale.suffix} @${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${BASE}/${locale.prefix}`);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(500);
        await expect(page).toHaveScreenshot(
          `landing-${locale.suffix}-${viewportSuffix(vp.name)}.png`,
          {
            fullPage: true,
            maxDiffPixelRatio: 0.02,
          },
        );
      });

      test(`Login page — ${locale.suffix} @${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${BASE}/${locale.prefix}/login`);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(500);
        await expect(page).toHaveScreenshot(
          `login-${locale.suffix}-${viewportSuffix(vp.name)}.png`,
          {
            fullPage: true,
            maxDiffPixelRatio: 0.02,
          },
        );
      });

      test(`Register page — ${locale.suffix} @${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${BASE}/${locale.prefix}/register`);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(500);
        await expect(page).toHaveScreenshot(
          `register-${locale.suffix}-${viewportSuffix(vp.name)}.png`,
          {
            fullPage: true,
            maxDiffPixelRatio: 0.02,
          },
        );
      });

      test(`Forgot password page — ${locale.suffix} @${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${BASE}/${locale.prefix}/forgot-password`);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(500);
        await expect(page).toHaveScreenshot(
          `forgot-password-${locale.suffix}-${viewportSuffix(vp.name)}.png`,
          {
            fullPage: true,
            maxDiffPixelRatio: 0.02,
          },
        );
      });

      test(`Not found page — ${locale.suffix} @${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${BASE}/${locale.prefix}/nonexistent-route-xyz`);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(500);
        await expect(page).toHaveScreenshot(
          `not-found-${locale.suffix}-${viewportSuffix(vp.name)}.png`,
          {
            fullPage: true,
            maxDiffPixelRatio: 0.02,
          },
        );
      });
    }
  }
});

test.describe("Visual Pages — Authenticated Pages", () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const vp of VIEWPORTS) {
    test(`Dashboard page — ar @${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}/ar/dashboard`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(`dashboard-ar-${viewportSuffix(vp.name)}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`Dashboard page — en @${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}/en/dashboard`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(`dashboard-en-${viewportSuffix(vp.name)}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`Files page (document list) — ar @${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}/ar/files`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(`files-ar-${viewportSuffix(vp.name)}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`Files page (document list) — en @${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}/en/files`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(`files-en-${viewportSuffix(vp.name)}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`Folders page — ar @${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}/ar/folders`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(`folders-ar-${viewportSuffix(vp.name)}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`Folders page — en @${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}/en/folders`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(`folders-en-${viewportSuffix(vp.name)}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`Tags page — ar @${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}/ar/tags`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(`tags-ar-${viewportSuffix(vp.name)}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`Tags page — en @${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}/en/tags`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(`tags-en-${viewportSuffix(vp.name)}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`Search page — ar @${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}/ar/search`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(`search-ar-${viewportSuffix(vp.name)}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`Search page — en @${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}/en/search`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(`search-en-${viewportSuffix(vp.name)}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`Settings (profile) page — ar @${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}/ar/settings`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(`settings-ar-${viewportSuffix(vp.name)}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`Settings (profile) page — en @${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}/en/settings`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(`settings-en-${viewportSuffix(vp.name)}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`Document preview page — ar @${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}/ar/preview/sample-doc-id`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(`preview-ar-${viewportSuffix(vp.name)}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`Document preview page — en @${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}/en/preview/sample-doc-id`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(`preview-en-${viewportSuffix(vp.name)}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`Analytics page — ar @${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}/ar/analytics`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(`analytics-ar-${viewportSuffix(vp.name)}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`Analytics page — en @${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}/en/analytics`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(`analytics-en-${viewportSuffix(vp.name)}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });
  }
});

test.describe("Visual Pages — Shared Document (Unauthenticated)", () => {
  test.describe.configure({ timeout: 120_000 });

  for (const locale of LOCALES) {
    for (const vp of VIEWPORTS) {
      test(`Shared document page — ${locale.suffix} @${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${BASE}/${locale.prefix}/share/sample-share-token`);
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(500);
        await expect(page).toHaveScreenshot(
          `share-${locale.suffix}-${viewportSuffix(vp.name)}.png`,
          {
            fullPage: true,
            maxDiffPixelRatio: 0.02,
          },
        );
      });
    }
  }
});
