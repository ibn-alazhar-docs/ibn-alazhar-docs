import { type Page, type Locator, expect } from "@playwright/test";
import path from "path";
import fs from "node:fs";

export class DocumentsPage {
  readonly page: Page;
  readonly fileInput: Locator;
  readonly uploadButton: Locator;
  readonly documentRows: Locator;
  readonly documentSelect: Locator;
  readonly searchInput: Locator;
  readonly heading: Locator;
  readonly uploadZone: Locator;
  readonly bulkActionBar: Locator;

  constructor(page: Page) {
    this.page = page;
    this.fileInput = page.locator('[data-testid="file-input"], input[type="file"]');
    this.uploadButton = page
      .getByTestId("upload-button")
      .or(page.getByRole("button", { name: /رفع|Upload|تحميل/i }).first());
    this.documentRows = page.locator('[data-testid="document-row"]');
    this.documentSelect = page.locator('[data-testid="document-select"]');
    this.searchInput = page.locator('[data-testid="search-input"]');
    this.heading = page.getByRole("heading", { name: /الملفات|Files|المستندات|Documents/i });
    this.uploadZone = page.locator('[data-testid="upload-zone"]');
    this.bulkActionBar = page.locator('[data-testid="bulk-actions"]');
  }

  async goto(locale: string = "ar") {
    await this.page.goto(`/${locale}/documents`);
    await this.page.waitForLoadState("domcontentloaded");
  }

  async gotoFiles(locale: string = "ar") {
    await this.page.goto(`/${locale}/files`);
    await this.page.waitForLoadState("domcontentloaded");
  }

  async gotoUpload(locale: string = "ar") {
    await this.page.goto(`/${locale}/upload`);
    await this.page.waitForLoadState("domcontentloaded");
  }

  async gotoDocument(id: string, locale: string = "ar") {
    await this.page.goto(`/${locale}/documents/${id}`);
    await this.page.waitForLoadState("domcontentloaded");
  }

  private resolveFixture(fileName: string): string {
    const sourceDir = path.resolve(__dirname, "../../test-data/source");
    const primary = path.join(sourceDir, fileName);
    if (fs.existsSync(primary)) return primary;
    const fallback = path.join(sourceDir, "sample.pdf");
    if (fs.existsSync(fallback)) return fallback;
    // No fixture on disk: return primary path so Playwright fails with a
    // clear ENOENT naming the directory, rather than a confusing empty list.
    return primary;
  }

  async uploadFile(fileName: string) {
    const testFilePath = this.resolveFixture(fileName);
    await this.fileInput.setInputFiles(testFilePath);
    if (await this.uploadButton.isVisible().catch(() => false)) {
      await this.uploadButton.click();
    }
  }

  async uploadMultipleFiles(fileNames: string[]) {
    const testFilePaths = fileNames.map((f) => this.resolveFixture(f));
    await this.fileInput.setInputFiles(testFilePaths);
    if (await this.uploadButton.isVisible().catch(() => false)) {
      await this.uploadButton.click();
    }
  }

  async expectHeadingVisible() {
    await expect(this.heading.first()).toBeVisible();
  }

  async expectDocumentRowVisible(timeout: number = 30000) {
    await expect(this.documentRows.first()).toBeVisible({ timeout });
  }

  async expectUploadComplete(timeout: number = 60000) {
    await expect(this.documentRows.first()).toContainText(/اكتمل|Completed|Complete|جاهز|Ready/i, {
      timeout,
    });
  }

  async selectDocument(index: number = 0) {
    await this.documentSelect.nth(index).click();
  }

  async selectAllDocuments() {
    const count = await this.documentSelect.count();
    for (let i = 0; i < count; i++) {
      await this.documentSelect.nth(i).check();
    }
  }

  async clickFirstDocumentTitle() {
    const titleLink = this.documentRows.first().locator("a").first();
    await titleLink.click();
  }

  async getDocumentCount(): Promise<number> {
    return this.documentRows.count();
  }
}
