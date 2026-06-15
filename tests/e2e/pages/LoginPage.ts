import { type Page, type Locator, expect } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly htmlElement: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel(/البريد|Email/);
    this.passwordInput = page.getByLabel(/كلمة المرور|Password/);
    this.submitButton = page.getByRole("button", { name: /تسجيل الدخول|Sign in/ });
    this.errorMessage = page.getByRole("alert").first();
    this.htmlElement = page.locator("html");
  }

  async goto(locale: string = "ar") {
    await this.page.goto(`/${locale}/login`);
    await this.page.waitForLoadState("domcontentloaded");
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectRedirectToDashboard(timeout: number = 20000) {
    await this.page.waitForURL(/\/ar\/dashboard/, { timeout });
  }

  async expectRedirectToLogin(timeout: number = 10000) {
    await this.page.waitForURL(/\/ar\/login/, { timeout });
  }

  async expectRtlDirection() {
    await expect(this.htmlElement).toHaveAttribute("dir", "rtl");
    await expect(this.htmlElement).toHaveAttribute("lang", "ar");
  }

  async expectDirection(dir: string, lang: string) {
    await expect(this.htmlElement).toHaveAttribute("dir", dir);
    await expect(this.htmlElement).toHaveAttribute("lang", lang);
  }

  async expectErrorVisible(timeout: number = 15000) {
    await expect(this.errorMessage).toBeVisible({ timeout });
  }
}
