import { type Page, type Locator, expect } from "@playwright/test";

export class AuthPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly htmlElement: Locator;
  readonly nameInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.submitButton = page.locator('button[type="submit"]').first();
    this.errorMessage = page.getByRole("alert").first();
    this.htmlElement = page.locator("html");
    this.nameInput = page.locator('input[name="name"]');
    this.confirmPasswordInput = page.locator('input[name="confirmPassword"]');
    this.logoutButton = page.getByRole("button", { name: /تسجيل الخروج|Log out|Sign out/ }).first();
  }

  async gotoLogin(locale: string = "ar") {
    await this.page.goto(`/${locale}/login`);
    await this.page.waitForLoadState("domcontentloaded");
  }

  async gotoRegister(locale: string = "ar") {
    await this.page.goto(`/${locale}/register`);
    await this.page.waitForLoadState("domcontentloaded");
  }

  async gotoForgotPassword(locale: string = "ar") {
    await this.page.goto(`/${locale}/forgot-password`);
    await this.page.waitForLoadState("domcontentloaded");
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async register(name: string, email: string, password: string) {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(password);
    await this.submitButton.click();
  }

  async logout() {
    await this.logoutButton.click();
    await this.page.waitForLoadState("domcontentloaded");
  }

  async expectRedirectToDashboard(timeout: number = 30000) {
    await this.page.waitForURL(/\/dashboard/, { timeout });
  }

  async expectRedirectToLogin(timeout: number = 30000) {
    await this.page.waitForURL(/\/login/, { timeout });
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

  async expectErrorToContain(text: string, timeout: number = 10000) {
    await expect(this.errorMessage).toContainText(text, { timeout });
  }
}
