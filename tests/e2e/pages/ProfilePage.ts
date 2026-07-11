import { type Page, type Locator, expect } from "@playwright/test";

export class ProfilePage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly saveButton: Locator;
  readonly languageSelector: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.locator('input[name="name"]');
    this.emailInput = page.locator('input[name="email"]');
    this.saveButton = page.locator('button[type="submit"]');
    this.languageSelector = page.locator('[data-testid="language-select"]');
    this.successMessage = page.locator('[role="status"]').or(page.getByRole("alert")).first();
  }

  async goto(locale: string = "ar") {
    await this.page.goto(`/${locale}/profile`);
    await this.page.waitForLoadState("domcontentloaded");
  }

  async updateName(name: string) {
    await this.nameInput.clear();
    await this.nameInput.fill(name);
    await this.saveButton.click();
    await this.page.waitForTimeout(1000);
  }

  async switchLanguage(lang: string) {
    if (await this.languageSelector.isVisible().catch(() => false)) {
      await this.languageSelector.selectOption(lang);
      await this.page.waitForTimeout(1000);
    } else {
      const langToggle = this.page
        .getByRole("button", { name: /English|العربية|Language/i })
        .first();
      if (await langToggle.isVisible().catch(() => false)) {
        await langToggle.click();
        await this.page.waitForTimeout(500);
      }
    }
  }

  async expectSuccessMessage(timeout: number = 5000) {
    await expect(this.successMessage).toBeVisible({ timeout });
  }
}
