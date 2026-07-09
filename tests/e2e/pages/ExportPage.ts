import { type Page, type Locator, expect } from "@playwright/test";

export type ExportFormat = "PDF" | "DOCX" | "TXT" | "Markdown" | "EPUB" | "JSON";

export class ExportPage {
  readonly page: Page;
  readonly exportButton: Locator;
  readonly advancedExportButton: Locator;
  readonly formatOptions: Locator;
  readonly downloadButton: Locator;
  readonly batchExportButton: Locator;
  readonly cancelButton: Locator;
  readonly dialog: Locator;

  constructor(page: Page) {
    this.page = page;
    this.exportButton = page.getByRole("button", { name: /تصدير|Export/i }).first();
    this.advancedExportButton = page
      .getByRole("button", { name: /تصدير متقدم|Advanced Export/i })
      .first();
    this.formatOptions = page.locator('[data-testid="export-format"]');
    this.downloadButton = page.getByRole("button", { name: /تنزيل|Download/i }).first();
    this.batchExportButton = page
      .getByRole("button", { name: /تصدير مجمّع|Batch export/i })
      .first();
    this.cancelButton = page.getByRole("button", { name: /إلغاء|Cancel/i }).first();
    this.dialog = page.locator('[role="dialog"]');
  }

  async openExportDialog() {
    await this.exportButton.click();
    await this.page.waitForTimeout(500);
  }

  async openAdvancedExport() {
    await this.advancedExportButton.click();
    await this.page.waitForTimeout(500);
  }

  async selectFormat(format: ExportFormat) {
    const formatLocator = this.page
      .locator(`[data-testid="export-format-${format.toLowerCase()}"], text="${format}"`)
      .first();
    await formatLocator.click();
    await this.page.waitForTimeout(300);
  }

  async startDownload() {
    await this.downloadButton.click();
    await this.page.waitForTimeout(2000);
  }

  async cancelExport() {
    await this.cancelButton.click();
    await this.page.waitForTimeout(500);
  }

  async expectDialogVisible() {
    await expect(this.dialog).toBeVisible();
  }

  async expectDialogHidden() {
    await expect(this.dialog).not.toBeVisible();
  }

  async expectFormatOptionVisible(format: ExportFormat) {
    const option = this.page.locator(`text="${format}"`);
    await expect(option.first()).toBeVisible();
  }
}
