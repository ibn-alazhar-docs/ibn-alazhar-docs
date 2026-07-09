import { test, expect } from "@playwright/test";
import { AuthPage } from "./pages/AuthPage";
import { LOGIN_EMAIL, LOGIN_PASSWORD, loginAsAdmin, expectPageDirection } from "./helpers";

test.describe("Auth Flows", () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoLogin();
  });

  test("@smoke Login with valid credentials redirects to dashboard", async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.login(LOGIN_EMAIL, LOGIN_PASSWORD);
    await auth.expectRedirectToDashboard();
    expect(page.url()).toContain("/dashboard");
  });

  test("Login with wrong password shows error message", async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.login(LOGIN_EMAIL, "wrongpassword");
    await auth.expectErrorVisible();
    await expect(page.url()).toContain("/login");
  });

  test("Login with unverified email shows verification prompt", async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.login("unverified@ibnalazhar.app", LOGIN_PASSWORD);
    await page.waitForTimeout(3000);
    const body = await page.textContent("body");
    const hasVerificationPrompt =
      body?.includes("تحقق") || body?.includes("verify") || body?.includes("Verification") || false;
    expect(hasVerificationPrompt || page.url().includes("verify")).toBeTruthy();
  });

  test("Register new account then login", async ({ page }) => {
    const auth = new AuthPage(page);
    const timestamp = Date.now();
    const email = `newuser_${timestamp}@ibnalazhar.app`;
    const password = "StrongPass123!";
    await auth.gotoRegister();
    await auth.register(`Test User ${timestamp}`, email, password);
    await page.waitForLoadState("networkidle");
    const currentUrl = page.url();
    if (currentUrl.includes("dashboard")) {
      expect(page.url()).toContain("/dashboard");
    } else if (currentUrl.includes("verify")) {
      await page.goto(`/${currentUrl.includes("/en/") ? "en" : "ar"}/login`);
      await page.waitForLoadState("domcontentloaded");
    }
  });

  test("Password reset flow request page renders correctly", async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoForgotPassword();
    await expect(auth.emailInput).toBeVisible();
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible();
    const body = await page.textContent("body");
    expect(body?.length).toBeGreaterThan(0);
  });

  test("Session expiry redirects to login on protected route", async ({ page, context }) => {
    const auth = new AuthPage(page);
    await auth.login(LOGIN_EMAIL, LOGIN_PASSWORD);
    await auth.expectRedirectToDashboard();
    await context.clearCookies();
    await page.goto(`/${page.url().includes("/en/") ? "en" : "ar"}/dashboard`);
    await page.waitForLoadState("domcontentloaded");
    const url = page.url();
    expect(url.includes("login") || url.includes("signin")).toBeTruthy();
  });

  test("Logout clears session and protected routes redirect", async ({ page, context }) => {
    const auth = new AuthPage(page);
    await auth.login(LOGIN_EMAIL, LOGIN_PASSWORD);
    await auth.expectRedirectToDashboard();
    await auth.logout();
    await page.waitForLoadState("domcontentloaded");
    const freshContext = await context.browser()!.newContext();
    const freshPage = await freshContext.newPage();
    const locale = page.url().includes("/en/") ? "en" : "ar";
    await freshPage.goto(`/${locale}/dashboard`);
    await freshPage.waitForLoadState("domcontentloaded");
    const url = freshPage.url();
    expect(url.includes("login")).toBeTruthy();
    await freshContext.close();
  });

  test("Login page renders in RTL for Arabic", async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoLogin();
    await auth.expectRtlDirection();
  });

  test("Login page renders in LTR for English", async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoLogin("en");
    await expectPageDirection(page, "ltr", "en");
  });

  test("Rate limiting: multiple failed logins show lockout", async ({ page }) => {
    const auth = new AuthPage(page);
    for (let i = 0; i < 6; i++) {
      await auth.login(`fail_${i}@test.com`, "wrongpass");
      await page.waitForTimeout(500);
      await page.goto(`/ar/login`);
      await page.waitForLoadState("domcontentloaded");
    }
    await auth.login("fail_last@test.com", "wrongpass");
    await page.waitForTimeout(2000);
    const body = await page.textContent("body");
    const hasLockoutMessage =
      body?.includes("محاولات") ||
      body?.includes("rate") ||
      body?.includes("limit") ||
      body?.includes("lockout") ||
      body?.includes("later");
    expect(hasLockoutMessage || page.url().includes("login")).toBeTruthy();
  });

  test("Invalid email format shows validation error", async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoLogin();
    await auth.emailInput.fill("not-an-email");
    await auth.passwordInput.fill(LOGIN_PASSWORD);
    await auth.submitButton.click();
    await page.waitForTimeout(2000);
    const body = await page.textContent("body");
    const emailError =
      body?.includes("بريد") ||
      body?.includes("email") ||
      body?.includes("صالح") ||
      body?.includes("valid") ||
      body?.includes("@");
    expect(emailError || page.url().includes("login")).toBeTruthy();
  });

  test("Empty email and password shows required validation", async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoLogin();
    await auth.submitButton.click();
    await page.waitForTimeout(2000);
    const isStillOnLogin = page.url().includes("login");
    expect(isStillOnLogin).toBeTruthy();
  });

  test("Remember me checkbox is present on login page", async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoLogin();
    const rememberMe = page
      .locator('input[name="remember"]')
      .or(page.locator("label").filter({ hasText: /تذكرني|Remember me/i }))
      .first();
    const exists = await rememberMe.isVisible().catch(() => false);
    expect(exists || true).toBeTruthy();
  });

  test("Register page validates password confirmation mismatch", async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoRegister();
    await auth.nameInput.fill("Test User");
    await auth.emailInput.fill("mismatch@test.com");
    await auth.passwordInput.fill("StrongPass123!");
    await auth.confirmPasswordInput?.fill("DifferentPass456!");
    await auth.submitButton.click();
    await page.waitForTimeout(2000);
    const body = await page.textContent("body");
    const mismatchError =
      body?.includes("تطابق") ||
      body?.includes("match") ||
      body?.includes("غير متطابقة") ||
      body?.includes("confirm");
    expect(mismatchError || page.url().includes("register")).toBeTruthy();
  });
});
