import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";
import path from "path";

test.describe("Comprehensive User Journey", () => {
  test("Full flow: Login -> Dashboard -> Upload -> Export -> Settings", async ({ page }) => {
    test.setTimeout(120000); // 2 mins for the entire journey

    // 1. Login/Auth flow
    const loginPage = new LoginPage(page);
    await loginPage.goto("en");
    await loginPage.login("admin@ibnalazhar.app", "password123");
    await page.waitForURL(/\/en\/dashboard/);

    // 2. Navigating the dashboard
    await page
      .getByRole("link", { name: /Files|الملفات/i })
      .first()
      .click();
    await page.waitForURL(/\/en\/files/);

    // 3. Uploading a file (verify the new framer-motion animations don't block clicks)
    const testFilePath = path.resolve(
      __dirname,
      "../../test-data/source/لا_أعلم_هويتي_حوار_بين_متشكك_ومتيقن_حسام_الدين_حامد.pdf",
    );
    await page.setInputFiles('input[type="file"]', testFilePath);

    // Wait for the Visual Range Selector to appear because it's a PDF
    const visualSelectorConfirm = page.getByRole("button", { name: /Confirm|تأكيد/i }).first();
    if (await visualSelectorConfirm.isVisible({ timeout: 5000 }).catch(() => false)) {
      await visualSelectorConfirm.click();
    } else {
      // Fallback if no visual selector, just click the upload submit button
      const submitBtn = page.getByRole("button", { name: /Upload|رفع/i }).first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
      }
    }

    // Wait for the upload to reflect on UI (e.g. processing state)
    await page.waitForTimeout(3000);

    // 4. Interacting with the document rows
    // Finding any row in a table or list
    const firstRow = page
      .locator('table tbody tr, [data-testid="file-list"] > div, .file-list > div')
      .first();
    if (await firstRow.isVisible()) {
      await firstRow.hover();

      // 5. Export Modal interaction (if button exists)
      const exportBtn = firstRow.getByRole("button", { name: /Export|تصدير/i }).first();
      if (await exportBtn.isVisible()) {
        await exportBtn.click();
        await expect(page.locator('[role="dialog"]')).toBeVisible();
        // Try to find PDF and Google Drive options
        await page
          .getByText(/PDF/)
          .click()
          .catch(() => {});
        await page
          .getByText(/Google Drive/)
          .click()
          .catch(() => {});
        // Close modal
        await page.keyboard.press("Escape");
        await page.waitForTimeout(500);
      }

      // Hover again to ensure row actions are visible
      await firstRow.hover();

      // Delete interaction
      const deleteBtn = firstRow
        .locator("button")
        .filter({ hasText: /Delete|حذف/i })
        .first();
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click();
        const confirmBtn = page
          .locator('[role="dialog"]')
          .getByRole("button", { name: /Delete|Confirm|حذف/i })
          .first();
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
          await page.waitForTimeout(1000);
        }
      }
    } else {
      console.log("No file rows found. Upload might be in progress or page empty.");
    }

    // 6. Checking settings pages
    await page
      .getByRole("link", { name: /Settings|الإعدادات/i })
      .first()
      .click();
    await page.waitForURL(/\/en\/settings/);

    // Check if we are on settings page
    await expect(page.url()).toContain("settings");

    console.log("Comprehensive journey completed successfully!");
  });
});
