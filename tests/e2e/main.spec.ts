import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { FilesPage } from "./pages/FilesPage";

const LOGIN_EMAIL = "admin@ibnalazhar.app";
const LOGIN_PASSWORD = "password123";

test.describe("Unauthenticated access", () => {
  test("redirects to login when accessing protected route", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await page.goto("/ar/files");
    await loginPage.expectRedirectToLogin();
    expect(page.url()).toContain("/ar/login");
  });

  test("redirects to login for settings", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await page.goto("/ar/settings");
    await loginPage.expectRedirectToLogin();
    expect(page.url()).toContain("/ar/login");
  });
});

test.describe("Login flow", () => {
  test("login page loads with RTL direction", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.expectRtlDirection();
  });

  test("shows error on invalid credentials", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login("wrong@email.com", "wrongpass");
    await loginPage.expectErrorVisible();
  });

  test("successful login redirects to dashboard", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(LOGIN_EMAIL, LOGIN_PASSWORD);
    await loginPage.expectRedirectToDashboard();
    expect(page.url()).toContain("/ar/dashboard");
  });

  test("logged-in user stays on dashboard on refresh", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(LOGIN_EMAIL, LOGIN_PASSWORD);
    await loginPage.expectRedirectToDashboard();
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    expect(page.url()).toContain("/ar/dashboard");
  });
});

test.describe("Dashboard", () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    await loginPage.goto();
    await loginPage.login(LOGIN_EMAIL, LOGIN_PASSWORD);
    await loginPage.expectRedirectToDashboard();
  });

  test("displays stat cards", async () => {
    await dashboardPage.expectStatCardsVisible();
  });
});

test.describe("Files page", () => {
  let filesPage: FilesPage;

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    filesPage = new FilesPage(page);
    await loginPage.goto();
    await loginPage.login(LOGIN_EMAIL, LOGIN_PASSWORD);
    await loginPage.expectRedirectToDashboard();
  });

  test("navigates to files page", async () => {
    await filesPage.goto();
    await filesPage.expectUrlContainsFiles();
  });

  test("upload section is visible", async () => {
    await filesPage.goto();
    await filesPage.expectHeadingVisible();
  });
});

test.describe("Sidebar navigation", () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    await loginPage.goto();
    await loginPage.login(LOGIN_EMAIL, LOGIN_PASSWORD);
    await loginPage.expectRedirectToDashboard();
  });

  test("sidebar nav links are visible", async () => {
    await dashboardPage.expectSidebarVisible();
    await dashboardPage.expectSidebarLinkCount();
  });

  test("clicking files nav goes to files page", async () => {
    await dashboardPage.clickSidebarLink("الملفات");
    await dashboardPage.expectUrlContains("/ar/files");
  });
});

test.describe("RTL direction", () => {
  test("arabic pages have dir=rtl", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.expectRtlDirection();
  });

  test("english pages have dir=ltr", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto("en");
    await loginPage.expectDirection("ltr", "en");
  });
});
