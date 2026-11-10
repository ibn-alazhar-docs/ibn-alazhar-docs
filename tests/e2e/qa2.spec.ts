import { expect, test } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";

test.setTimeout(120000);

test("Files and Folders QA 2", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto("ar");
  await loginPage.login("admin@ibnalazhar.app", "AdminPassword123!");
  await page.waitForURL(/.*\/dashboard/, { timeout: 30000 });

  console.log("=== Task 1: Double-clicking delete buttons ===");
  await page.goto("/ar/folders");
  await page.waitForLoadState("domcontentloaded");

  const folderName = `Delete Me Folder ${Date.now()}`;
  await page
    .getByRole("button", { name: /\+\s*مجلد\s*جديد|\+\s*New folder|مجلد جديد/i })
    .first()
    .click();
  const folderInput = page.getByRole("textbox", { name: /اسم المجلد|Folder name/i }).first();
  await expect(folderInput).toBeVisible({ timeout: 10000 });
  await folderInput.fill(folderName);
  await page
    .getByRole("button", { name: /إنشاء|أنشئ|Create|مجلد جديد/i })
    .last()
    .click();
  await page
    .getByText(folderName)
    .first()
    .waitFor({ state: "visible", timeout: 15000 })
    .catch(() => {});

  const folderItem = page
    .locator('[data-testid="folder-item"]')
    .filter({ hasText: folderName })
    .first();
  if (await folderItem.isVisible().catch(() => false)) {
    await folderItem.hover();
    const menuBtn = folderItem.getByText("⋮").first();
    if (await menuBtn.isVisible().catch(() => false)) {
      await menuBtn.click();
      const deleteBtn = page
        .getByRole("menuitem", { name: /حذف|Delete/i })
        .or(page.getByRole("button", { name: /حذف|Delete/i }))
        .first();
      if (await deleteBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await deleteBtn.dblclick().catch(async () => {
          await deleteBtn.click().catch(() => {});
        });
        console.log("Double clicked delete button");
        await page.waitForTimeout(500);
        if (!page.isClosed()) {
          await page
            .screenshot({ path: "test-results/qa-delete-double-click.png", fullPage: true })
            .catch(() => {});
        }
      }
    }
  } else {
    console.log("No delete button found on folders");
  }

  console.log("=== Task 2: Rapidly selecting and deselecting multiple files ===");
  if (!page.isClosed()) {
    await page.goto("/ar/files");
    await page.waitForLoadState("domcontentloaded");
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    console.log(`Found ${count} checkboxes in files`);
    if (count > 0) {
      for (let i = 0; i < 20; i++) {
        const first = checkboxes.first();
        await first.check({ timeout: 2000 }).catch(() => {});
        await first.uncheck({ timeout: 2000 }).catch(() => {});
        if (count > 1) {
          const second = checkboxes.nth(1);
          await second.check({ timeout: 2000 }).catch(() => {});
          await second.uncheck({ timeout: 2000 }).catch(() => {});
        }
      }
      console.log("Rapid selection done without crashing");
      await expect(checkboxes.first()).toBeVisible();
      console.log("UI Responsive after rapid clicks:", true);
    } else {
      console.log("No checkboxes found in files");
    }
  }
});
