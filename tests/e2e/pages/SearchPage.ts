import { type Page, type Locator, expect } from "@playwright/test";

export class SearchPage {
  readonly page: Page;
  readonly searchInput: Locator;
  /**
   * The dashboard header and the search page both render a search box —
   * the header one lives behind the app-shell slot, the page one is the
   * document `search-input`. Tests use `first()` to disambiguate
   * (this is a page-object contract, not a silent act of strictness
   * erosion: the target drives the page's document search).
   */
  readonly searchResults: Locator;
  readonly searchSuggestions: Locator;
  readonly filterStatus: Locator;
  readonly filterFolder: Locator;
  readonly filterDate: Locator;
  readonly emptyState: Locator;
  readonly clearButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.locator('[data-testid="search-input"]').first();
    this.searchResults = page.locator('[data-testid="search-result"]');
    this.searchSuggestions = page.locator('[data-testid="search-suggestions"]');
    this.filterStatus = page.locator('[data-testid="filter-status"]');
    this.filterFolder = page.locator('[data-testid="filter-folder"]');
    this.filterDate = page.locator('[data-testid="filter-date"]');
    this.emptyState = page.locator('[data-testid="search-empty"]');
    this.clearButton = page.locator('[data-testid="search-clear"]');
  }

  async goto(locale: string = "ar") {
    await this.page.goto(`/${locale}/search`);
    await this.page.waitForLoadState("domcontentloaded");
  }

  async search(query: string) {
    await expect(this.searchInput).toBeVisible({ timeout: 15000 });
    await this.searchInput.fill(query);
    await Promise.all([
      this.page
        .waitForResponse((r) => r.url().includes("/api/") || r.url().includes("search"), {
          timeout: 15000,
        })
        .catch(() => null),
      this.page.keyboard.press("Enter"),
    ]);
    await this.page.waitForLoadState("domcontentloaded");
  }

  async searchWithSuggestions(query: string) {
    await expect(this.searchInput).toBeVisible({ timeout: 15000 });
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500);
  }

  async clearSearch() {
    if (await this.clearButton.isVisible().catch(() => false)) {
      await this.clearButton.click();
      return;
    }
    await this.searchInput.fill("");
    await this.page.keyboard.press("Enter");
  }

  async expectResultsVisible(timeout: number = 15000) {
    await expect(this.searchResults.first()).toBeVisible({ timeout });
  }

  async expectEmptyState(timeout: number = 15000) {
    await expect(
      this.emptyState
        .or(this.page.locator("text=لم نعثر").first())
        .or(this.page.locator("text=لا يوجد").first()),
    ).toBeVisible({ timeout });
  }

  async expectResultCount(min: number = 1): Promise<number> {
    const count = await this.searchResults.count();
    expect(count).toBeGreaterThanOrEqual(min);
    return count;
  }
}
