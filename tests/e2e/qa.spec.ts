import { test } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";

test("Files and Folders QA", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto("ar");
  await loginPage.login("admin@ibnalazhar.app", "AdminPassword123!");
  await page.waitForURL(/\/ar\/dashboard/, { timeout: 30000 });

  console.log("=== Task 3: Submitting new folder with long text and invalid characters ===");
  await page.goto("/ar/folders");
  await page.waitForLoadState("domcontentloaded");
  const newFolderBtn = page
    .getByRole("button", { name: /\+\s*مجلد\s*جديد|\+\s*New folder|مجلد جديد/i })
    .first();
  await newFolderBtn.click();
  const dialogTitle = page.getByText(/أنشئ مجلداً|Create folder/i).first();
  await dialogTitle.isVisible({ timeout: 5000 }).catch(() => {});

  const folderInput = page.getByRole("textbox", { name: /اسم المجلد|Folder name/i }).first();
  await folderInput.waitFor({ state: "visible", timeout: 10000 });
  const longText = "A".repeat(500) + '< > / \\ : * ? " |';
  await folderInput.fill(longText);
  const submitBtn = page.getByRole("button", { name: /إنشاء|أنشئ|Create|مجلد جديد/i }).last();
  if (await submitBtn.isVisible().catch(() => false)) {
    await submitBtn.click().catch(() => {});
  }
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  if (!page.isClosed()) {
    const errorMsg = await page
      .locator('.text-danger-500, .text-destructive, [class*="text-[var(--danger)]"]')
      .first()
      .textContent({ timeout: 2000 })
      .catch(() => null);
    console.log("Folder Creation Error (Long Text):", errorMsg);
    await page
      .screenshot({ path: "test-results/qa-long-folder.png", fullPage: true })
      .catch(() => {});
  }

  console.log("=== Task 1: Double-clicking delete buttons ===");
  if (!page.isClosed()) {
    await page.goto("/ar/folders");
    await page.waitForLoadState("domcontentloaded");
    const menuBtn = page.getByText("⋮").first();
    if ((await menuBtn.count()) > 0 && (await menuBtn.isVisible().catch(() => false))) {
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
      }
    } else {
      console.log("No delete button found on folders");
    }
  }

  console.log("=== Task 2: Rapidly selecting and deselecting multiple files ===");
  if (!page.isClosed()) {
    await page.goto("/ar/files");
    await page.waitForLoadState("domcontentloaded");
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    console.log(`Found ${count} checkboxes`);
    if (count > 1) {
      for (let i = 0; i < 20; i++) {
        const cb = checkboxes.nth(1);
        if (!(await cb.isVisible().catch(() => false))) break;
        await cb.check({ timeout: 2000 }).catch(() => {});
        await cb.uncheck({ timeout: 2000 }).catch(() => {});
      }
      console.log("Rapid selection done without crashing");
    } else if (count === 1) {
      for (let i = 0; i < 20; i++) {
        const cb = checkboxes.first();
        await cb.check({ timeout: 2000 }).catch(() => {});
        await cb.uncheck({ timeout: 2000 }).catch(() => {});
      }
      console.log("Rapid selection done without crashing");
    } else {
      console.log("No checkboxes found in files");
    }
  }
});
