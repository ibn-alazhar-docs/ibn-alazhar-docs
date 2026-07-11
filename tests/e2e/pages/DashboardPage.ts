import { type Page, type Locator, expect } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;
  readonly statCards: Locator;
  readonly sidebar: Locator;
  readonly sidebarLinks: Locator;

  constructor(page: Page) {
    this.page = page;
    this.statCards = page.locator("a.stat-card-premium");
    this.sidebar = page.locator("aside");
    this.sidebarLinks = this.sidebar.locator("a");
  }

  async goto(locale: string = "ar") {
    await this.page.goto(`/${locale}/dashboard`);
    await this.page.waitForLoadState("domcontentloaded");
  }

  async expectStatCardsVisible(minCards: number = 4) {
    await expect(this.statCards.first()).toBeVisible();
    const count = await this.statCards.count();
    expect(count).toBeGreaterThanOrEqual(minCards);
  }

  async expectSidebarVisible() {
    await expect(this.sidebar).toBeVisible();
  }

  async expectSidebarLinkCount(minLinks: number = 5) {
    const count = await this.sidebarLinks.count();
    expect(count).toBeGreaterThanOrEqual(minLinks);
  }

  async clickSidebarLink(name: string) {
    const link = this.sidebarLinks.filter({ hasText: name });
    await expect(link.first()).toBeVisible();
    await link.first().click();
  }

  async expectUrlContains(path: string, timeout: number = 10000) {
    await this.page.waitForURL(`**${path}`, { timeout });
    expect(this.page.url()).toContain(path);
  }
}
