import { type Page, type Locator, expect } from "@playwright/test";

export class FoldersPage {
  readonly page: Page;
  readonly createButton: Locator;
  readonly folderNameInput: Locator;
  readonly submitButton: Locator;
  readonly folderList: Locator;
  readonly folderItems: Locator;
  readonly breadcrumb: Locator;
  readonly sidebar: Locator;

  constructor(page: Page) {
    this.page = page;
    this.folderList = page.locator('[data-testid="folder-list"]');
    this.folderItems = page.locator('[data-testid="folder-item"]');
    this.folderNameInput = page.locator('input[name="name"], #folder-name, [placeholder*="اسم"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.breadcrumb = page.locator('[data-testid="breadcrumb"]');
    this.sidebar = page.locator("aside");
    this.folderButton = page.getByRole("button", { name: /مجلد جديد|New folder|جديد/i });
  }

  readonly folderButton: Locator;

  async goto(locale: string = "ar") {
    await this.page.goto(`/${locale}/folders`);
    await this.page.waitForLoadState("domcontentloaded");
  }

  async gotoFolder(id: string, locale: string = "ar") {
    await this.page.goto(`/${locale}/folders/${id}`);
    await this.page.waitForLoadState("domcontentloaded");
  }

  async createFolder(name: string) {
    await this.folderButton.click();
    await this.page.waitForTimeout(500);
    await this.folderNameInput.fill(name);
    await this.submitButton.click();
    await this.page.waitForTimeout(1000);
  }

  async createNestedFolder(parentName: string, childName: string) {
    const parent = this.folderItems.filter({ hasText: parentName });
    await parent.hover();
    const contextMenu = parent
      .locator('[data-testid="context-menu"], button:has-text("⋮")')
      .first();
    if (await contextMenu.isVisible().catch(() => false)) {
      await contextMenu.click();
      await this.page
        .getByRole("button", { name: /إضافة مجلد فرعي|Add subfolder|子文件夹/i })
        .first()
        .click();
    } else {
      await this.folderButton.click();
    }
    await this.page.waitForTimeout(300);
    await this.folderNameInput.fill(childName);
    await this.submitButton.click();
    await this.page.waitForTimeout(1000);
  }

  async renameFolder(oldName: string, newName: string) {
    const folder = this.folderItems.filter({ hasText: oldName });
    await folder.hover();
    const menuBtn = folder.locator('[data-testid="context-menu"], button:has-text("⋮")').first();
    await menuBtn.click();
    await this.page
      .getByRole("button", { name: /إعادة تسمية|Rename/i })
      .first()
      .click();
    await this.folderNameInput.clear();
    await this.folderNameInput.fill(newName);
    await this.submitButton.click();
    await this.page.waitForTimeout(1000);
  }

  async deleteFolder(name: string) {
    const folder = this.folderItems.filter({ hasText: name });
    await folder.hover();
    const menuBtn = folder.locator('[data-testid="context-menu"], button:has-text("⋮")').first();
    await menuBtn.click();
    await this.page
      .getByRole("button", { name: /حذف|Delete/i })
      .first()
      .click();
    const confirmBtn = this.page
      .locator('[role="dialog"]')
      .getByRole("button", { name: /حذف|Delete|Confirm|تأكيد/i })
      .first();
    if (await confirmBtn.isVisible().catch(() => false)) {
      await confirmBtn.click();
    }
    await this.page.waitForTimeout(1000);
  }

  async expectFolderVisible(name: string, timeout: number = 10000) {
    await expect(this.folderItems.filter({ hasText: name }).first()).toBeVisible({ timeout });
  }

  async expectFolderHidden(name: string, timeout: number = 5000) {
    await expect(this.folderItems.filter({ hasText: name }).first()).toBeHidden({ timeout });
  }

  async expectBreadcrumbVisible() {
    await expect(this.folderList.or(this.breadcrumb).first()).toBeVisible();
  }

  async getFolderCount(): Promise<number> {
    return this.folderItems.count();
  }
}
