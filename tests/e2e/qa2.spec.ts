import { test } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";

test.setTimeout(120000); // 120 seconds

test("Files and Folders QA 2", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto("ar");
  await loginPage.login("admin@ibnalazhar.app", "AdminPassword123!");
  await page.waitForURL(/.*\/dashboard/);

  console.log("=== Task 1: Double-clicking delete buttons ===");
  await page.goto("/ar/folders");
  await page.waitForTimeout(1000);

  // Create a folder first so we have something to delete.
  // Arabic page: button labels are Arabic (+ مجلد جديد / أنشئ مجلداً).
  await page
    .getByRole("button", { name: /\+\s*مجلد\s*جديد|\+\s*New folder/i })
    .first()
    .click();
  await page.waitForSelector('text="أنشئ مجلداً", text="Create folder"').catch(() => {});
  await page.getByRole("textbox", { name: /اسم المجلد|Folder name/i }).fill("Delete Me Folder");
  await page
    .getByRole("button", { name: /مجلد جديد|New folder/i })
    .last()
    .click();
  await page.waitForTimeout(2000);

  // Find the options menu on the first folder item
  const menuBtn = page.getByText("⋮").first();
  if ((await menuBtn.count()) > 0) {
    await menuBtn.click();
    await page.waitForTimeout(500);
    const deleteBtn = page.getByRole("button", { name: /حذف|Delete/i }).first();
    if ((await deleteBtn.count()) > 0) {
      await deleteBtn.dblclick();
      console.log("Double clicked delete button");
      await page.waitForTimeout(1000);
      const deleteModalText = await page.locator('text="حذف", text="Delete"').allTextContents();
      console.log("Delete Modal Text:", deleteModalText);
      await page.screenshot({ path: "test-results/qa-delete-double-click.png", fullPage: true });
    }
  } else {
    console.log("No delete button found on folders");
  }

  console.log("=== Task 2: Rapidly selecting and deselecting multiple files ===");
  await page.goto("/ar/files");
  await page.waitForTimeout(1000);
  const checkboxes = page.locator('input[type="checkbox"]');
  const count = await checkboxes.count();
  console.log(`Found ${count} checkboxes in files`);
  if (count > 0) {
    // Rapid check/uncheck
    for (let i = 0; i < 20; i++) {
      await checkboxes.first().check();
      await checkboxes.first().uncheck();
      // Try another checkbox if available
      if (count > 1) {
        await checkboxes.nth(1).check();
        await checkboxes.nth(1).uncheck();
      }
    }
    console.log("Rapid selection done without crashing");
    await page.waitForTimeout(1000);
    // Get console logs or check if UI is responsive
    const isVisible = await checkboxes.first().isVisible();
    console.log("UI Responsive after rapid clicks:", isVisible);
  } else {
    console.log("No checkboxes found in files");
  }
});
