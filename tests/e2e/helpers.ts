import { type Page, expect } from "@playwright/test";

export const LOGIN_EMAIL = "admin@ibnalazhar.app";
export const LOGIN_PASSWORD = "password123";
export const TEST_PDF_PATH = "لا_أعلم_هويتي_حوار_بين_متشكك_ومتيقن_حسام_الدين_حامد.pdf";

export async function loginAsAdmin(page: Page, locale: string = "ar") {
  await page.goto(`/${locale}/login`);
  await page.waitForLoadState("domcontentloaded");
  await page.fill('input[name="email"]', LOGIN_EMAIL);
  await page.fill('input[name="password"]', LOGIN_PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/\/dashboard/, { timeout: 30000 });
}

export async function loginAsUser(
  page: Page,
  email: string,
  password: string,
  locale: string = "ar",
) {
  await page.goto(`/${locale}/login`);
  await page.waitForLoadState("domcontentloaded");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.locator('button[type="submit"]').first().click();
}

export async function registerUser(
  page: Page,
  name: string,
  email: string,
  password: string,
  locale: string = "ar",
) {
  await page.goto(`/${locale}/register`);
  await page.waitForLoadState("domcontentloaded");
  await page.fill('input[name="name"]', name);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.fill('input[name="confirmPassword"]', password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForLoadState("networkidle");
}

export async function expectPageDirection(page: Page, dir: string, lang: string) {
  const html = page.locator("html");
  await expect(html).toHaveAttribute("dir", dir);
  await expect(html).toHaveAttribute("lang", lang);
}
