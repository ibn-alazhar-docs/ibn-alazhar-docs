import { type Page, type Locator, expect } from "@playwright/test";

export class TagsPage {
  readonly page: Page;
  readonly tagList: Locator;
  readonly tagItems: Locator;
  readonly tagNameInput: Locator;
  readonly colorInput: Locator;
  readonly createButton: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.tagList = page.locator('[data-testid="tag-list"]');
    this.tagItems = page.locator('[data-testid="tag-item"]');
    this.tagNameInput = page.locator(
      'input[name="name"], input[placeholder*="الاسم"], input[placeholder*="Tag"]',
    );
    this.colorInput = page.locator('input[type="color"], input[name="color"]');
    this.createButton = page.getByRole("button", { name: /وسم جديد|New tag|إضافة|Add/i }).first();
    this.saveButton = page.locator('button[type="submit"]');
  }

  async goto(locale: string = "ar") {
    await this.page.goto(`/${locale}/tags`);
    await this.page.waitForLoadState("domcontentloaded");
  }

  async createTag(name: string, color: string = "#3B82F6") {
    await this.createButton.click();
    await this.page.waitForTimeout(500);
    await this.tagNameInput.fill(name);
    if (await this.colorInput.isVisible().catch(() => false)) {
      await this.colorInput.fill(color);
    }
    await this.saveButton.click();
    await this.page.waitForTimeout(1000);
  }

  async deleteTag(name: string) {
    const tag = this.tagItems.filter({ hasText: name });
    await tag.hover();
    const deleteBtn = tag.getByRole("button", { name: /حذف|Delete|Remove|إزالة/i }).first();
    if (await deleteBtn.isVisible().catch(() => false)) {
      await deleteBtn.click();
    }
    await this.page.waitForTimeout(500);
  }

  async applyTagToDocument(tagName: string) {
    const tagOption = this.page
      .locator(`[data-testid="tag-option"]`)
      .filter({ hasText: tagName })
      .first();
    if (await tagOption.isVisible().catch(() => false)) {
      await tagOption.click();
    }
  }

  async expectTagVisible(name: string, timeout: number = 10000) {
    await expect(this.tagItems.filter({ hasText: name }).first()).toBeVisible({ timeout });
  }

  async expectTagHidden(name: string, timeout: number = 5000) {
    await expect(this.tagItems.filter({ hasText: name }).first()).not.toBeVisible({ timeout });
  }

  async getTagCount(): Promise<number> {
    return this.tagItems.count();
  }

  async filterByTag(tagName: string) {
    const tagFilter = this.page
      .locator(`[data-testid="tag-filter"]`)
      .filter({ hasText: tagName })
      .first();
    if (await tagFilter.isVisible().catch(() => false)) {
      await tagFilter.click();
    }
  }
}
