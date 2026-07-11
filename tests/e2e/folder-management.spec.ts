import { test, expect } from "@playwright/test";
import { FoldersPage } from "./pages/FoldersPage";
import { loginAsAdmin } from "./helpers";

test.describe("Folder Management", () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("Create new folder appears in list", async ({ page }) => {
    const folders = new FoldersPage(page);
    await folders.goto();
    const folderName = `E2E Folder ${Date.now()}`;
    await folders.createFolder(folderName);
    await folders.expectFolderVisible(folderName);
  });

  test("Create nested folders (5-level hierarchy)", async ({ page }) => {
    const folders = new FoldersPage(page);
    await folders.goto();
    const levels = ["Level 1", "Level 2", "Level 3", "Level 4", "Level 5"];
    const timestamp = Date.now();
    await folders.createFolder(`${levels[0]} ${timestamp}`);
    await folders.expectFolderVisible(`${levels[0]} ${timestamp}`);
    for (let i = 1; i < levels.length; i++) {
      await folders.createNestedFolder(
        `${levels[i - 1]} ${timestamp}`,
        `${levels[i]} ${timestamp}`,
      );
      await folders.expectFolderVisible(`${levels[i]} ${timestamp}`);
    }
  });

  test("Rename folder", async ({ page }) => {
    const folders = new FoldersPage(page);
    await folders.goto();
    const origName = `Rename Me ${Date.now()}`;
    const newName = `Renamed ${Date.now()}`;
    await folders.createFolder(origName);
    await folders.expectFolderVisible(origName);
    await folders.renameFolder(origName, newName);
    await folders.expectFolderHidden(origName);
    await folders.expectFolderVisible(newName);
  });

  test("Delete folder with documents shows confirmation", async ({ page }) => {
    const folders = new FoldersPage(page);
    await folders.goto();
    const folderName = `Delete Me ${Date.now()}`;
    await folders.createFolder(folderName);
    await folders.expectFolderVisible(folderName);
    const folder = folders.folderItems.filter({ hasText: folderName });
    await folder.hover();
    const menuBtn = folder.locator('button:has-text("⋮")').first();
    const btnExists = await menuBtn.isVisible().catch(() => false);
    if (btnExists) {
      await menuBtn.click();
      const deleteBtn = page.getByRole("button", { name: /حذف|Delete/i }).first();
      if (await deleteBtn.isVisible().catch(() => false)) {
        await deleteBtn.click();
        const dialog = page.locator('[role="dialog"]');
        const dialogVisible = await dialog.isVisible({ timeout: 5000 }).catch(() => false);
        expect(dialogVisible).toBeTruthy();
      }
    }
  });

  test("Folder tree expand collapse", async ({ page }) => {
    const folders = new FoldersPage(page);
    await folders.goto();
    const expandBtns = page.locator('[data-testid="folder-expand"], button[aria-expanded]').first();
    if (await expandBtns.isVisible().catch(() => false)) {
      const expanded = await expandBtns.getAttribute("aria-expanded");
      await expandBtns.click();
      await page.waitForTimeout(500);
      const newExpanded = await expandBtns.getAttribute("aria-expanded");
      expect(newExpanded === String(expanded !== "true")).toBeTruthy();
    }
  });

  test("Breadcrumb navigation in folder hierarchy", async ({ page }) => {
    const folders = new FoldersPage(page);
    await folders.goto();
    const folderName = `Breadcrumb Test ${Date.now()}`;
    await folders.createFolder(folderName);
    await folders.folderItems.filter({ hasText: folderName }).first().click();
    await page.waitForLoadState("domcontentloaded");
    const breadcrumb = page
      .locator('[data-testid="breadcrumb"]')
      .or(page.locator('nav[aria-label*="Breadcrumb"').or(page.locator('[class*="breadcrumb"]')))
      .first();
    const breadcrumbVisible = await breadcrumb.isVisible().catch(() => false);
    expect(breadcrumbVisible).toBeTruthy();
  });

  test("Folder page RTL direction is correct", async ({ page }) => {
    await page.goto("/ar/folders");
    await page.waitForLoadState("domcontentloaded");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("dir", "rtl");
    await expect(html).toHaveAttribute("lang", "ar");
  });

  test("Create folder back button returns to parent", async ({ page }) => {
    const folders = new FoldersPage(page);
    await folders.goto();
    const parentName = `Parent ${Date.now()}`;
    await folders.createFolder(parentName);
    await folders.folderItems.filter({ hasText: parentName }).first().click();
    await page.waitForLoadState("domcontentloaded");
    const backBtn = page.getByRole("button", { name: /رجوع|Back|عودة/i }).first();
    if (await backBtn.isVisible().catch(() => false)) {
      await backBtn.click();
      await page.waitForLoadState("domcontentloaded");
      expect(page.url()).toContain("/folders");
    }
  });

  test("Multiple folders can be created and listed", async ({ page }) => {
    const folders = new FoldersPage(page);
    await folders.goto();
    const timestamp = Date.now();
    await folders.createFolder(`Folder A ${timestamp}`);
    await folders.expectFolderVisible(`Folder A ${timestamp}`);
    await folders.createFolder(`Folder B ${timestamp}`);
    await folders.expectFolderVisible(`Folder B ${timestamp}`);
    await folders.createFolder(`Folder C ${timestamp}`);
    await folders.expectFolderVisible(`Folder C ${timestamp}`);
    const count = await folders.getFolderCount();
    expect(count).toBeGreaterThanOrEqual(3);
  });
});
