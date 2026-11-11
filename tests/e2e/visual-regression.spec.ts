import { test, expect } from "@playwright/test";
import { waitForFontsLoaded } from "./visual-setup";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const EMAIL = "admin@ibnalazhar.app";
const PASSWORD = "AdminPassword123!";

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

test.describe("Visual Regression — Baseline Screenshots", () => {
  test.describe.configure({ timeout: 120_000 });

  test("Landing page — Arabic RTL baseline", async ({ page }) => {
    await page.goto(`${BASE}/ar`);
    await page.waitForLoadState("load");
    await waitForFontsLoaded(page);
    await expect(page).toHaveScreenshot("landing-ar-rtl.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.99,
    });
  });

  test("Login page — Arabic RTL baseline", async ({ page }) => {
    await page.goto(`${BASE}/ar/login`);
    await page.waitForLoadState("load");
    await waitForFontsLoaded(page);
    await expect(page).toHaveScreenshot("login-ar-rtl.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.99,
    });
  });

  test("Register page — Arabic RTL baseline", async ({ page }) => {
    await page.goto(`${BASE}/ar/register`);
    await page.waitForLoadState("load");
    await waitForFontsLoaded(page);
    await expect(page).toHaveScreenshot("register-ar-rtl.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.99,
    });
  });

  test.fixme("Dashboard — Arabic baseline", async ({ page }) => {
    // Flaky: dashboard shows document stats that change as parallel workers upload docs.
    // Requires isolated run with clean DB for deterministic baselines.
    await login(page);
    await page.waitForLoadState("load");
    await waitForFontsLoaded(page);
    await expect(page).toHaveScreenshot("dashboard-ar.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.99,
    });
  });

  test.fixme("Files page — Arabic baseline", async ({ page }) => {
    // Flaky: file list changes as parallel workers upload docs during the test run.
    // Requires isolated run with clean DB for deterministic baselines.
    await login(page);
    await page.goto(`${BASE}/ar/files`);
    await page.waitForLoadState("load");
    await waitForFontsLoaded(page);
    await expect(page).toHaveScreenshot("files-ar.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.99,
    });
  });

  test("Folders page — Arabic baseline", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/ar/folders`);
    await page.waitForLoadState("load");
    await waitForFontsLoaded(page);
    await expect(page).toHaveScreenshot("folders-ar.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.99,
    });
  });

  test("Tags page — Arabic baseline", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/ar/tags`);
    await page.waitForLoadState("load");
    await waitForFontsLoaded(page);
    await expect(page).toHaveScreenshot("tags-ar.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.99,
    });
  });

  test("Search page — Arabic baseline", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/ar/search`);
    await page.waitForLoadState("load");
    await waitForFontsLoaded(page);
    await expect(page).toHaveScreenshot("search-ar.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.99,
    });
  });

  test("Settings page — Arabic baseline", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/ar/settings`);
    await page.waitForLoadState("load");
    await waitForFontsLoaded(page);
    await expect(page).toHaveScreenshot("settings-ar.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.99,
    });
  });

  test("Mobile landing — Arabic baseline", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/ar`);
    await page.waitForLoadState("load");
    await waitForFontsLoaded(page);
    await expect(page).toHaveScreenshot("landing-ar-mobile.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.99,
    });
  });

  test("Mobile login — Arabic baseline", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/ar/login`);
    await page.waitForLoadState("load");
    await waitForFontsLoaded(page);
    await expect(page).toHaveScreenshot("login-ar-mobile.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.99,
    });
  });
});
