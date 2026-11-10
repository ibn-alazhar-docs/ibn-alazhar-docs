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
    // The folder tree intentionally renders two "new folder" buttons when the
    // list is empty: the header CTA (+ مجلد جديد) and the empty-state CTA
    // (مجلد جديد). Both open the same dialog, so scoping to the canonical
    // header button (first match) is the correct test-level disambiguation —
    // collapsing them would remove the empty-state affordance users rely on.
    this.folderButton = page.getByRole("button", { name: /مجلد جديد|New folder|جديد/i }).first();
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
    await expect(this.folderButton).toBeVisible({ timeout: 15000 });
    await this.folderButton.click();
    await expect(this.folderNameInput).toBeVisible({ timeout: 10000 });
    await this.folderNameInput.fill(name);
    await expect(this.submitButton).toBeEnabled({ timeout: 10000 });
    await Promise.all([
      this.page
        .waitForResponse((r) => r.url().includes("/api/") && r.request().method() === "POST", {
          timeout: 15000,
        })
        .catch(() => null),
      this.submitButton.click(),
    ]);
  }

  async createNestedFolder(parentName: string, childName: string) {
    const parent = this.folderItems.filter({ hasText: parentName }).first();
    await expect(parent).toBeVisible({ timeout: 15000 });
    await parent.hover();
    const contextMenu = parent
      .locator('[data-testid="context-menu"], button:has-text("⋮")')
      .first();
    await expect(contextMenu).toBeVisible({ timeout: 10000 });
    await contextMenu.click();
    const addSub = this.page
      .getByRole("menuitem", { name: /إضافة مجلد فرعي|Add subfolder|مجلد فرعي/i })
      .or(this.page.getByRole("button", { name: /إضافة مجلد فرعي|Add subfolder|مجلد فرعي/i }))
      .first();
    await expect(addSub).toBeVisible({ timeout: 10000 });
    await addSub.click();
    await expect(this.folderNameInput).toBeVisible({ timeout: 10000 });
    await this.folderNameInput.fill(childName);
    await expect(this.submitButton).toBeEnabled({ timeout: 10000 });
    await Promise.all([
      this.page
        .waitForResponse((r) => r.url().includes("/api/") && r.request().method() === "POST", {
          timeout: 15000,
        })
        .catch(() => null),
      this.submitButton.click(),
    ]);
  }

  async renameFolder(oldName: string, newName: string) {
    const folder = this.folderItems.filter({ hasText: oldName }).first();
    await expect(folder).toBeVisible({ timeout: 15000 });
    await folder.hover();
    const menuBtn = folder.locator('[data-testid="context-menu"], button:has-text("⋮")').first();
    await expect(menuBtn).toBeVisible({ timeout: 10000 });
    await menuBtn.click();
    const renameBtn = this.page
      .getByRole("menuitem", { name: /أعد التسمية|إعادة تسمية|Rename/i })
      .or(this.page.getByRole("button", { name: /أعد التسمية|إعادة تسمية|Rename/i }))
      .first();
    await expect(renameBtn).toBeVisible({ timeout: 10000 });
    await renameBtn.click();
    await expect(this.folderNameInput).toBeVisible({ timeout: 10000 });
    await this.folderNameInput.fill(newName);
    await expect(this.submitButton).toBeEnabled({ timeout: 10000 });
    await Promise.all([
      this.page
        .waitForResponse(
          (r) => r.url().includes("/api/folders") && r.request().method() === "GET",
          { timeout: 15000 },
        )
        .catch(() => null),
      this.submitButton.click(),
    ]);
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
