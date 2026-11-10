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
    this.exportButton = page
      .getByTestId("export-button")
      .or(page.getByRole("button", { name: /تصدير|Export|صدّر/i }))
      .first();
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
    await expect(this.exportButton).toBeVisible({ timeout: 15000 });
    await expect(this.exportButton).toBeEnabled({ timeout: 15000 });
    await this.exportButton.click();
    await this.expectDialogVisible();
  }

  async openAdvancedExport() {
    await expect(this.advancedExportButton).toBeVisible({ timeout: 15000 });
    await expect(this.advancedExportButton).toBeEnabled({ timeout: 15000 });
    await this.advancedExportButton.click();
    await this.expectDialogVisible();
  }

  async selectFormat(format: ExportFormat) {
    const formatLocator = this.page
      .locator(`[data-testid="export-format-${format.toLowerCase()}"]`)
      .or(this.page.getByText(format, { exact: true }))
      .first();
    await expect(formatLocator).toBeVisible({ timeout: 10000 });
    await formatLocator.click();
  }

  async startDownload() {
    await expect(this.downloadButton).toBeVisible({ timeout: 10000 });
    await expect(this.downloadButton).toBeEnabled({ timeout: 10000 });
    await this.downloadButton.click();
  }

  async cancelExport() {
    await expect(this.cancelButton).toBeVisible({ timeout: 10000 });
    await this.cancelButton.click();
  }

  async expectDialogVisible() {
    await expect(this.dialog).toBeVisible({ timeout: 15000 });
  }

  async expectDialogHidden() {
    await expect(this.dialog).not.toBeVisible();
  }

  async expectFormatOptionVisible(format: ExportFormat) {
    const option = this.page.locator(`text="${format}"`);
    await expect(option.first()).toBeVisible();
  }
}
