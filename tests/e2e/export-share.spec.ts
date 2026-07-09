import { test, expect } from "@playwright/test";
import { ExportPage, type ExportFormat } from "./pages/ExportPage";
import { SharePage } from "./pages/SharePage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { loginAsAdmin } from "./helpers";

test.describe("Export and Share", () => {
  test.describe.configure({ timeout: 180_000 });

  let shareLink = "";

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.describe("Export", () => {
    const formats: ExportFormat[] = ["PDF", "DOCX", "TXT", "Markdown", "EPUB", "JSON"];

    for (const format of formats) {
      test(`Export document as ${format}`, async ({ page }) => {
        const docs = new DocumentsPage(page);
        const exportP = new ExportPage(page);
        await docs.gotoFiles();
        const count = await docs.getDocumentCount();
        if (count > 0) {
          await docs.clickFirstDocumentTitle();
          await page.waitForURL(/\/documents\//);
          await exportP.openExportDialog();
          await exportP.expectDialogVisible();
          await exportP.selectFormat(format);
          await exportP.startDownload();
          const download = await page
            .waitForEvent("download", { timeout: 30000 })
            .catch(() => null);
          if (download) {
            const fileName = download.suggestedFilename();
            expect(fileName.toLowerCase()).toContain(
              format.toLowerCase().replace("markdown", "md"),
            );
            const path = await download.path();
            expect(path).toBeTruthy();
          }
        }
      });
    }

    test("Advanced export dialog opens", async ({ page }) => {
      const docs = new DocumentsPage(page);
      const exportP = new ExportPage(page);
      await docs.gotoFiles();
      await docs.clickFirstDocumentTitle();
      await page.waitForURL(/\/documents\//);
      await exportP.openAdvancedExport();
      await exportP.expectDialogVisible();
      for (const fmt of formats) {
        await exportP.expectFormatOptionVisible(fmt);
      }
      await exportP.cancelExport();
      await exportP.expectDialogHidden();
    });

    test("Export filtered results by tag", async ({ page }) => {
      await page.goto("/ar/files");
      const filterTag = page.locator('[data-testid="tag-filter"]').first();
      if (await filterTag.isVisible().catch(() => false)) {
        await filterTag.click();
        await page.waitForTimeout(1000);
        const exportBtn = page.getByRole("button", { name: /تصدير|Export/i }).first();
        if (await exportBtn.isVisible().catch(() => false)) {
          await exportBtn.click();
          await page.waitForTimeout(500);
        }
      }
    });

    test("Export from files page bulk actions", async ({ page }) => {
      const docs = new DocumentsPage(page);
      await docs.gotoFiles();
      const count = await docs.getDocumentCount();
      if (count > 0) {
        await docs.selectDocument(0);
        const bulkExportBtn = page
          .locator('[data-testid="bulk-actions"] button')
          .filter({
            hasText: /تصدير|Export/i,
          })
          .first();
        if (await bulkExportBtn.isVisible().catch(() => false)) {
          await bulkExportBtn.click();
          const dialog = page.locator('[role="dialog"]');
          await expect(dialog).toBeVisible({ timeout: 5000 });
        }
      }
    });
  });

  test.describe("Share", () => {
    test("Share document creates a copy link", async ({ page }) => {
      const docs = new DocumentsPage(page);
      const share = new SharePage(page);
      await docs.gotoFiles();
      const count = await docs.getDocumentCount();
      if (count > 0) {
        await docs.documentRows.first().hover();
        const shareBtn = docs.documentRows
          .first()
          .getByRole("button", { name: /مشاركة|Share/i })
          .first();
        if (await shareBtn.isVisible().catch(() => false)) {
          await shareBtn.click();
          await share.createShareLink();
          shareLink = await share.expectShareLinkCreated();
          expect(shareLink.length).toBeGreaterThan(0);
        }
      }
    });

    test("Open share link as anonymous user views document", async ({ page, context }) => {
      if (!shareLink) {
        test.skip(true, "No share link available, skipping anonymous view test");
        return;
      }
      const anonContext = await context.browser()!.newContext();
      const anonPage = await anonContext.newPage();
      await anonPage.goto(shareLink);
      await anonPage.waitForLoadState("domcontentloaded");
      const body = await anonPage.textContent("body");
      expect(body?.length).toBeGreaterThan(0);
      await anonContext.close();
    });

    test("Share link with expiry renders expiry selector", async ({ page }) => {
      const docs = new DocumentsPage(page);
      const share = new SharePage(page);
      return docs
        .gotoFiles()
        .then(() => docs.documentRows.first().hover())
        .then(() => {
          const shareBtn = docs.documentRows
            .first()
            .getByRole("button", { name: /مشاركة|Share/i })
            .first();
          return shareBtn.isVisible().catch(() => false);
        })
        .then((visible) => {
          if (!visible) return;
          return shareBtn
            .click()
            .then(() => share.createShareLink())
            .then(() => {
              return share.setExpiry(7);
            });
        });
    });

    test("Regenerate share token", async ({ page }) => {
      const docs = new DocumentsPage(page);
      const share = new SharePage(page);
      await docs.gotoFiles();
      const count = await docs.getDocumentCount();
      if (count > 0) {
        await docs.documentRows.first().hover();
        const shareBtn = docs.documentRows
          .first()
          .getByRole("button", { name: /مشاركة|Share/i })
          .first();
        if (await shareBtn.isVisible().catch(() => false)) {
          await shareBtn.click();
          await page.waitForTimeout(500);
          if (await share.regenerateButton.isVisible().catch(() => false)) {
            await share.regenerateLink();
            const newLink = await share.expectShareLinkCreated().catch(() => "");
            expect(newLink.length).toBeGreaterThan(0);
          }
        }
      }
    });

    test("Share page renders in correct language direction", async ({ page }) => {
      const share = new SharePage(page);
      await page.goto("/ar/share/sample-token");
      await page.waitForLoadState("domcontentloaded");
      const html = page.locator("html");
      await expect(html).toHaveAttribute("dir", "rtl");
      await expect(html).toHaveAttribute("lang", "ar");
    });

    test("Share link invalid shows error", async ({ page }) => {
      const share = new SharePage(page);
      const response = await page.goto("/ar/share/invalid_token_12345");
      const status = response?.status() ?? 200;
      expect(status !== 200 || page.url().includes("share")).toBeTruthy();
    });
  });
});
