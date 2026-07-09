import { type Page, type Locator, expect } from "@playwright/test";

export class AdminPage {
  readonly page: Page;
  readonly userList: Locator;
  readonly userRows: Locator;
  readonly adminNavLink: Locator;
  readonly healthPanel: Locator;
  readonly rateLimitPanel: Locator;
  readonly deleteUserButton: Locator;
  readonly changeRoleButton: Locator;
  readonly confirmButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.userList = page.locator('[data-testid="user-list"]');
    this.userRows = page.locator('[data-testid="user-row"]');
    this.adminNavLink = page.getByRole("link", { name: /المشرف|Admin|لوحة التحكم|Dashboard/i });
    this.healthPanel = page.locator('[data-testid="health-panel"]');
    this.rateLimitPanel = page.locator('[data-testid="rate-limit-panel"]');
    this.deleteUserButton = page.getByRole("button", { name: /حذف المستخدم|Delete user/i }).first();
    this.changeRoleButton = page.getByRole("button", { name: /تغيير الدور|Change role/i }).first();
    this.confirmButton = page
      .locator('[role="dialog"] button')
      .filter({ hasText: /تأكيد|Confirm|حذف|Delete/i })
      .first();
  }

  async goto(locale: string = "ar") {
    await this.page.goto(`/${locale}/admin`);
    await this.page.waitForLoadState("domcontentloaded");
  }

  async gotoUsers(locale: string = "ar") {
    await this.page.goto(`/${locale}/admin/users`);
    await this.page.waitForLoadState("domcontentloaded");
  }

  async gotoHealth(locale: string = "ar") {
    await this.page.goto(`/${locale}/admin/health`);
    await this.page.waitForLoadState("domcontentloaded");
  }

  async gotoRateLimits(locale: string = "ar") {
    await this.page.goto(`/${locale}/admin/rate-limits`);
    await this.page.waitForLoadState("domcontentloaded");
  }

  async expectUserListVisible() {
    await expect(this.userList.or(this.userRows.first())).toBeVisible();
  }

  async expectHealthPanelVisible() {
    await expect(this.healthPanel).toBeVisible();
  }

  async expectRateLimitPanelVisible() {
    await expect(this.rateLimitPanel).toBeVisible();
  }

  async expectAdminAccessDenied() {
    await expect(
      this.page
        .locator("text=403")
        .or(this.page.locator("text=Unauthorized").or(this.page.locator("text=غير مصرح")))
        .first(),
    ).toBeVisible();
  }

  async getUserCount(): Promise<number> {
    return this.userRows.count();
  }

  async deleteUser(email: string) {
    const row = this.userRows.filter({ hasText: email });
    await row.hover();
    await this.deleteUserButton.click();
    if (await this.confirmButton.isVisible().catch(() => false)) {
      await this.confirmButton.click();
    }
    await this.page.waitForTimeout(1000);
  }
}
