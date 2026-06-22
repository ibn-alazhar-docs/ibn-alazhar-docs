import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";

test("Files and Folders QA", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto("en");
  await loginPage.login("admin@ibnalazhar.app", "password123");
  await page.waitForURL(/\/en\/dashboard/);

  console.log("=== Task 3: Submitting new folder with long text and invalid characters ===");
  await page.goto("/en/folders");
  await page.getByRole("button", { name: "+ New folder" }).click();
  await page.waitForSelector('text="Create folder"');

  const longText = "A".repeat(500) + '< > / \\ : * ? " |';
  await page.getByRole("textbox", { name: "Folder name" }).fill(longText);
  // The modal has a "New folder" button at the bottom right.
  await page.getByRole("button", { name: "New folder" }).last().click();

  await page.waitForTimeout(2000);
  const errorMsg = await page
    .locator('.text-danger-500, .text-destructive, [class*="text-[var(--danger)]"]')
    .first()
    .textContent()
    .catch(() => null);
  console.log("Folder Creation Error (Long Text):", errorMsg);
  await page.screenshot({ path: "test-results/qa-long-folder.png", fullPage: true });

  console.log("=== Task 1: Double-clicking delete buttons ===");
  await page.goto("/en/folders");
  await page.waitForTimeout(1000);
  // Find the options menu on the first folder item
  const menuBtn = page.getByText("⋮").first();
  if ((await menuBtn.count()) > 0) {
    await menuBtn.click();
    await page.waitForTimeout(500);
    const deleteBtn = page.getByRole("button", { name: "Delete" }).first();
    await deleteBtn.dblclick();
    console.log("Double clicked delete button");
    await page.waitForTimeout(1000);
    const deleteModalText = await page.locator('text="Delete"').allTextContents();
    console.log("Delete Modal Text:", deleteModalText);
  } else {
    console.log("No delete button found on folders");
  }

  console.log("=== Task 2: Rapidly selecting and deselecting multiple files ===");
  await page.goto("/en/files");
  await page.waitForTimeout(1000);
  const checkboxes = page.locator('input[type="checkbox"]');
  const count = await checkboxes.count();
  console.log(`Found ${count} checkboxes`);
  if (count > 0) {
    for (let i = 0; i < 20; i++) {
      await checkboxes.nth(1).check();
      await checkboxes.nth(1).uncheck();
    }
    console.log("Rapid selection done without crashing");
  } else {
    console.log("No checkboxes found in files");
  }
});
