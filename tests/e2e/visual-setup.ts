import type { Page } from "@playwright/test";

/**
 * Shared helper for every visual-* spec: wait until web fonts have loaded
 * before any toHaveScreenshot, so baselines cannot flake on a mid-swap
 * typeface. Call AFTER page.goto (e.g. in place of a fixed waitForTimeout):
 * a beforeEach here would run on about:blank before navigation, where
 * document.fonts.ready resolves immediately and gates nothing.
 */
export async function waitForFontsLoaded(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
}
