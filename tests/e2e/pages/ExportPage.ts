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
    this.exportButton = page.getByTestId("export-button");
    this.advancedExportButton = page
      .getByRole("button", { name: /تصدير متقدم|Advanced Export/i })
      .first();
    this.formatOptions = page.locator('[data-testid="export-format"]');
    this.downloadButton = page.getByRole("button", { name: /تنزيل|Download|صدّر/i }).last();
    this.batchExportButton = page
      .getByRole("button", { name: /تصدير مجمّع|Batch export/i })
      .first();
    this.cancelButton = page.getByRole("button", { name: /إلغاء|Cancel/i }).first();
    this.dialog = page.locator('[role="dialog"]');
  }

  async openExportDialog() {
    await this.page.waitForLoadState("networkidle").catch(() => {});
    await expect(this.exportButton).toBeVisible({ timeout: 30000 });
    await expect(this.exportButton).toBeEnabled({ timeout: 30000 });
    await this.exportButton.click();
    await this.expectDialogVisible();
  }

  async openAdvancedExport() {
    await this.page.waitForLoadState("networkidle").catch(() => {});
    await expect(this.exportButton).toBeVisible({ timeout: 30000 });
    await expect(this.exportButton).toBeEnabled({ timeout: 30000 });
    await this.exportButton.click();
    await this.expectDialogVisible();
  }

  async selectFormat(format: ExportFormat) {
    const formatMap: Record<ExportFormat, string> = {
      PDF: "pdf",
      DOCX: "docx",
      TXT: "txt",
      Markdown: "md",
      EPUB: "epub",
      JSON: "json",
    };
    const value = formatMap[format] ?? format.toLowerCase();
    const select = this.page.locator("select").first();
    await select.selectOption(value);
    // Verify the selection stuck
    await expect(select).toHaveValue(value, { timeout: 5000 });
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
