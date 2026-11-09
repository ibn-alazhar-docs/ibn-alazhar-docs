import { test, type Page } from "@playwright/test";

/**
 * Shared setup for every visual-* spec: wait until web fonts have loaded
 * before any toHaveScreenshot, so baselines cannot flake on a mid-swap
 * typeface. Import this module from the spec file; the beforeEach hook is
 * registered as soon as the module is evaluated.
 */
export async function waitForFontsLoaded(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
}

test.beforeEach(async ({ page }) => {
  await waitForFontsLoaded(page);
});
