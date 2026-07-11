import { type Page, type Locator, expect } from "@playwright/test";

export class FilesPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly uploadZone: Locator;
  readonly fileList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: /الملفات|Files/ });
    this.uploadZone = page.locator("[data-testid='upload-zone'], .upload-zone");
    this.fileList = page.locator("[data-testid='file-list'], .file-list");
  }

  async goto(locale: string = "ar") {
    await this.page.goto(`/${locale}/files`);
    await this.page.waitForLoadState("domcontentloaded");
  }

  async expectHeadingVisible() {
    await expect(this.heading.first()).toBeVisible();
  }

  async expectUploadZoneVisible() {
    await expect(this.uploadZone).toBeVisible();
  }

  async expectFileListVisible() {
    await expect(this.fileList).toBeVisible();
  }

  async expectUrlContainsFiles(timeout: number = 10000) {
    await this.page.waitForURL(/\/ar\/files/, { timeout });
    expect(this.page.url()).toContain("/ar/files");
  }
}
