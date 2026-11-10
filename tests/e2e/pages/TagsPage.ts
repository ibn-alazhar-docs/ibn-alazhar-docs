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
    this.tagItems = page.locator('[data-testid="tag-item"], [data-tag-name], .tag-item');
    this.tagNameInput = page.locator(
      'input[name="name"], input[placeholder*="الاسم"], input[placeholder*="Tag"], input[placeholder*="وسم"]',
    );
    this.colorInput = page.locator('input[type="color"], input[name="color"]');
    this.createButton = page
      .getByRole("button", { name: /وسم جديد|New tag|إضافة وسماً|إضافة وسم|Add tag|إنشاء/i })
      .or(page.getByRole("button", { name: /\+\s*وسم/i }))
      .first();
    this.saveButton = page
      .locator('button[type="submit"], form button:has-text("حفظ"), form button:has-text("إنشاء")')
      .first();
  }

  async goto(locale: string = "ar") {
    await this.page.goto(`/${locale}/tags`);
    await this.page.waitForLoadState("domcontentloaded");
  }

  async createTag(name: string, color: string = "#3B82F6") {
    await expect(this.createButton).toBeVisible({ timeout: 15000 });
    await this.createButton.click();
    await expect(this.tagNameInput).toBeVisible({ timeout: 10000 });
    await this.tagNameInput.fill(name);
    if (await this.colorInput.isVisible().catch(() => false)) {
      await this.colorInput.fill(color).catch(() => {});
    }
    await expect(this.saveButton).toBeEnabled({ timeout: 10000 });
    await Promise.all([
      this.page
        .waitForResponse((r) => r.url().includes("/api/") && r.request().method() === "POST", {
          timeout: 15000,
        })
        .catch(() => null),
      this.saveButton.click(),
    ]);
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

  async expectTagVisible(name: string, timeout: number = 15000) {
    await expect(
      this.tagItems
        .filter({ hasText: name })
        .first()
        .or(this.page.getByText(name, { exact: true }).first()),
    ).toBeVisible({ timeout });
  }

  async expectTagHidden(name: string, timeout: number = 10000) {
    await expect(
      this.tagItems
        .filter({ hasText: name })
        .first()
        .or(this.page.getByText(name, { exact: true }).first()),
    ).toBeHidden({ timeout });
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
