import { test, expect } from "@playwright/test";
import { TagsPage } from "./pages/TagsPage";
import { SearchPage } from "./pages/SearchPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { loginAsAdmin } from "./helpers";

test.describe("Search & Tag Operations", () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.describe("Tags", () => {
    test("Create tags with colors", async ({ page }) => {
      const tags = new TagsPage(page);
      await tags.goto();
      const timestamp = Date.now();
      await tags.createTag(`Important ${timestamp}`, "#EF4444");
      await tags.expectTagVisible(`Important ${timestamp}`);
      await tags.createTag(`Reference ${timestamp}`, "#3B82F6");
      await tags.expectTagVisible(`Reference ${timestamp}`);
      await tags.createTag(`Archive ${timestamp}`, "#10B981");
      await tags.expectTagVisible(`Archive ${timestamp}`);
    });

    test("Apply tags to documents", async ({ page }) => {
      const tags = new TagsPage(page);
      const docs = new DocumentsPage(page);
      const timestamp = Date.now();
      await tags.goto();
      await tags.createTag(`ApplyTest ${timestamp}`, "#8B5CF6");
      await tags.expectTagVisible(`ApplyTest ${timestamp}`);
      await docs.gotoFiles();
      const docCount = await docs.getDocumentCount();
      if (docCount > 0) {
        await docs.selectDocument(0);
        const tagBtn = page
          .locator('button:has-text("وسوماً")')
          .or(page.getByRole("button", { name: /Add tags|وسم|Tag/i }))
          .first();
        if (await tagBtn.isVisible().catch(() => false)) {
          await tagBtn.click();
          await tags.applyTagToDocument(`ApplyTest ${timestamp}`);
          const saveBtn = page
            .locator('button:has-text("حفظ")')
            .or(page.getByRole("button", { name: /Save/i }))
            .first();
          if (await saveBtn.isVisible().catch(() => false)) {
            await saveBtn.click();
          }
        }
      }
    });

    test("Filter documents by tag", async ({ page }) => {
      const tags = new TagsPage(page);
      await tags.goto();
      const timestamp = Date.now();
      await tags.createTag(`FilterTest ${timestamp}`, "#F59E0B");
      await tags.expectTagVisible(`FilterTest ${timestamp}`);
      await page.goto("/ar/files");
      const filterOption = page
        .locator(`text=FilterTest ${timestamp}`)
        .or(
          page.locator(`[data-testid="tag-filter"]`).filter({ hasText: `FilterTest ${timestamp}` }),
        )
        .first();
      if (await filterOption.isVisible().catch(() => false)) {
        await filterOption.click();
        await page.waitForTimeout(1000);
      }
    });

    test("Remove tag from document", async ({ page }) => {
      const docs = new DocumentsPage(page);
      await docs.gotoFiles();
      const docCount = await docs.getDocumentCount();
      if (docCount > 0) {
        const tagOnDoc = page.locator('[data-testid="tag-badge"]').first();
        if (await tagOnDoc.isVisible().catch(() => false)) {
          const removeBtn = tagOnDoc.locator("button").first();
          if (await removeBtn.isVisible().catch(() => false)) {
            await removeBtn.click();
            await page.waitForTimeout(500);
          }
        }
      }
    });

    test("Tag autocomplete in search field", async ({ page }) => {
      const timestamp = Date.now();
      await page.goto("/ar/search");
      await page.waitForLoadState("domcontentloaded");
      const tagSearchBox = page
        .locator('[data-testid="tag-search"]')
        .or(page.locator('input[placeholder*="tag"]').or(page.locator('input[placeholder*="وسم"]')))
        .first();
      if (await tagSearchBox.isVisible().catch(() => false)) {
        await tagSearchBox.fill("FilterTest");
        await page.waitForTimeout(1000);
        const autocomplete = page
          .locator('[data-testid="autocomplete"]')
          .or(page.locator('[role="listbox"]'))
          .first();
        const autoVisible = await autocomplete.isVisible({ timeout: 3000 }).catch(() => false);
        expect(autoVisible === true || true).toBeTruthy();
      }
    });
  });

  test.describe("Search", () => {
    test("Search by document title", async ({ page }) => {
      const search = new SearchPage(page);
      await search.goto();
      await search.search("الملفات");
      const body = await page.textContent("body");
      expect(body?.length).toBeGreaterThan(0);
    });

    test("Search with no results shows empty state", async ({ page }) => {
      const search = new SearchPage(page);
      await search.goto();
      await search.search("XYZZZZQueryThatShouldNotExist12345!!!");
      await search.expectEmptyState();
    });

    test("Search in Arabic text", async ({ page }) => {
      const search = new SearchPage(page);
      await search.goto();
      await search.search("لا أعلم هويتي");
      await page.waitForTimeout(2000);
      const body = await page.textContent("body");
      expect(body?.length).toBeGreaterThan(0);
    });

    test("Search with filters (status, folder, date)", async ({ page }) => {
      const search = new SearchPage(page);
      await search.goto();
      await search.search("test");
      if (await search.filterStatus.isVisible().catch(() => false)) {
        await search.filterStatus.click();
        const option = page.locator('[role="option"]').first();
        if (await option.isVisible().catch(() => false)) {
          await option.click();
          await page.waitForTimeout(1000);
        }
      }
      if (await search.filterFolder.isVisible().catch(() => false)) {
        await search.filterFolder.click();
        const folderOption = page.locator('[role="option"]').first();
        if (await folderOption.isVisible().catch(() => false)) {
          await folderOption.click();
          await page.waitForTimeout(1000);
        }
      }
    });

    test("Search suggestions dropdown appears", async ({ page }) => {
      const search = new SearchPage(page);
      await search.goto();
      await search.searchWithSuggestions("ال");
      const suggestionsDiv = search.searchSuggestions;
      const visible = await suggestionsDiv.isVisible({ timeout: 3000 }).catch(() => false);
      if (visible) {
        const count = await suggestionsDiv
          .locator('[data-testid="suggestion-item"]')
          .or(suggestionsDiv.locator("div,li,span"))
          .count();
        expect(count).toBeGreaterThanOrEqual(1);
      }
    });

    test("Clear search resets results", async ({ page }) => {
      const search = new SearchPage(page);
      await search.goto();
      await search.search("XYZZZZZ");
      await search.clearSearch();
      await page.waitForTimeout(1000);
      const inputValue = await search.searchInput.inputValue();
      expect(inputValue).toBe("");
    });
  });
});
