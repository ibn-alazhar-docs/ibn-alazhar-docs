import { type Page, type Locator, expect } from "@playwright/test";

export class SharePage {
  readonly page: Page;
  readonly createLinkButton: Locator;
  readonly copyLinkInput: Locator;
  readonly shareLinkInput: Locator;
  readonly expirySelector: Locator;
  readonly regenerateButton: Locator;
  readonly documentViewer: Locator;
  readonly exportButton: Locator;
  readonly formatOptions: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createLinkButton = this.page.getByRole("button", {
      name: /أنشئ رابطاً عاماً|Create public link|إنشاء رابط/i,
    });
    this.copyLinkInput = this.page.locator("input[readonly]");
    this.shareLinkInput = this.page.locator("input[readonly]");
    this.expirySelector = this.page.locator('[data-testid="share-expiry"]');
    this.regenerateButton = this.page
      .getByRole("button", { name: /تغيير الرابط|Regenerate|تحديث/i })
      .first();
    this.documentViewer = this.page.locator('[data-testid="document-viewer"]');
    this.exportButton = this.page.getByRole("button", { name: /تصدير|Export/i }).first();
    this.formatOptions = this.page.locator('[data-testid="export-format"]');
  }

  async gotoShare(token: string, locale: string = "ar") {
    await this.page.goto(`/${locale}/share/${token}`);
    await this.page.waitForLoadState("domcontentloaded");
  }

  async createShareLink() {
    await this.createLinkButton.click();
    await this.page.waitForTimeout(1000);
  }

  async getShareLink(): Promise<string> {
    return this.shareLinkInput.inputValue();
  }

  async setExpiry(days: number) {
    if (await this.expirySelector.isVisible().catch(() => false)) {
      await this.expirySelector.selectOption(String(days));
      await this.page.waitForTimeout(500);
    }
  }

  async regenerateLink() {
    await this.regenerateButton.click();
    await this.page.waitForTimeout(1000);
  }

  async expectDocumentViewerVisible(timeout: number = 15000) {
    await expect(
      this.documentViewer.or(this.page.locator("text=Ibn Al-Azhar Docs").first()),
    ).toBeVisible({ timeout });
  }

  async expectShareLinkCreated(timeout: number = 10000) {
    await expect(this.shareLinkInput).toBeVisible({ timeout });
    const value = await this.shareLinkInput.inputValue();
    expect(value.length).toBeGreaterThan(0);
    return value;
  }
}
