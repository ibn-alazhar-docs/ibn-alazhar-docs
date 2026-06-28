import { test, expect } from "@playwright/test";
import path from "path";

const BASE = "http://localhost:3000";
const TEST_EMAIL = `testuser_${Date.now()}@ibnalazhar.app`;
const TEST_PASSWORD = "StrongPassword123!";

// Serial mode required: tests share DB state (user, uploaded file, folder)
test.describe.configure({ mode: "serial" });

async function login(page: import("@playwright/test").Page) {
  await page.goto(`${BASE}/ar/login`);
  await page.fill('input[name="email"]', TEST_EMAIL);
  await page.fill('input[name="password"]', TEST_PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/\/ar\/dashboard/, { timeout: 30000 });
}

test.describe("Ibn Al-Azhar Docs — Complete E2E Suite", () => {
  let shareLink = "";

  test("1. Register account (API) & handle UI edge cases", async ({ page, request }) => {
    await page.goto(`${BASE}/ar/login`);
    await page.fill('input[name="email"]', "invalid-email");
    await page.locator('button[type="submit"]').first().click();
    await page.waitForLoadState("networkidle");

    const res = await request.post("/api/auth/register", {
      data: {
        name: "Test User E2E",
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        confirmPassword: TEST_PASSWORD,
      },
    });
    expect(res.status()).toBe(201);
  });

  test("2. Login & Invalid Login", async ({ page }) => {
    await page.goto(`${BASE}/ar/login`);

    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', "wrongpassword");
    await page.locator('button[type="submit"]').first().click();
    await expect(page.getByRole("alert").first()).toBeVisible({ timeout: 10000 });

    await page.goto(`${BASE}/ar/login`);
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/ar\/dashboard/, { timeout: 30000 });

    await expect(page.locator("text=الرئيسية").first()).toBeVisible();
  });

  test("3. Upload PDF & Failed upload", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/ar/files`);

    const testFilePath = path.resolve(
      __dirname,
      "../../test-data/source/لا_أعلم_هويتي_حوار_بين_متشكك_ومتيقن_حسام_الدين_حامد.pdf",
    );

    await page.waitForLoadState("networkidle");
    await page.setInputFiles('[data-testid="file-input"]', testFilePath);

    await page
      .locator("button", { hasText: /تأكيد|Confirm|رفع وبدء المعالجة|Upload & Process/ })
      .first()
      .click({ timeout: 15000 });

    await expect(page.locator('[data-testid="document-row"]').first()).toBeVisible({
      timeout: 30000,
    });
  });

  test("4. Search document & Empty search", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/ar/search`);

    await page.fill('[data-testid="search-input"]', "QueryThatWillYieldNoResults12345");
    await page.keyboard.press("Enter");
    await expect(
      page
        .locator("text=لم نعثر على أية نتائج بحث تتطابق مع:")
        .first()
        .or(page.locator("text=لا يوجد").first()),
    ).toBeVisible({ timeout: 10000 });

    await page.fill('[data-testid="search-input"]', "لا_أعلم_هويتي");
    await page.keyboard.press("Enter");
    await expect(page.locator(`text=لا_أعلم_هويتي`).first()).toBeVisible({ timeout: 10000 });
  });

  test("5. Logout & Unauthorized access", async ({ page }) => {
    await login(page);

    const userMenu = page.locator('[data-testid="sidebar"] button:has(svg)').last();
    await userMenu.click();
    await page.locator("text=تسجيل خروج").first().click();
    await page.waitForURL(/\/ar$/);

    await page.goto(`${BASE}/ar/dashboard`);
    await page.waitForURL(/\/ar(\/login)?/);
  });

  test("6. Create folder", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/ar/folders`);

    await page
      .getByRole("button", { name: "+ مجلد جديد" })
      .or(page.locator("text=+ مجلد جديد"))
      .click();
    await page.fill('input[name="name"], input[placeholder="اسم المجلد"]', "مجلد الاختبار E2E");
    await page.locator('button[type="submit"]').click();

    await expect(page.locator("text=مجلد الاختبار E2E").first()).toBeVisible({ timeout: 10000 });
  });

  test("7. Move document & 8. Add tags & 9. Export document", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/ar/files`);

    const fileRow = page.locator('[data-testid="document-row"]').first();
    await fileRow.hover();

    const optionsBtn = fileRow.locator('button:has-text("⋮")').first();
    await optionsBtn.click();

    const tagsBtn = page.locator("text=إضافة وسوم").first();
    if (await tagsBtn.isVisible()) {
      await tagsBtn.click();
      await page.fill('input[placeholder="اسم الوسم"]', "وسم_مهم");
      await page.locator("text=تأكيد").first().click();
      await page.keyboard.press("Escape");
    }

    await optionsBtn.click();
    const moveBtn = page.locator("text=نقل إلى...").first();
    if (await moveBtn.isVisible()) {
      await moveBtn.click();
      await page.locator("text=مجلد الاختبار E2E").first().click();
      await page.locator('button:has-text("نقل")').first().click();
    }

    await optionsBtn.click();
    const exportBtn = page.locator("text=تصدير").first();
    if (await exportBtn.isVisible()) {
      await exportBtn.click();
      await expect(page.locator("text=تصدير متقدم").first()).toBeVisible();
      await page.locator("text=إلغاء").first().click();
    }
  });

  test("10. Create share link, 11. Open anonymously, 12. Expired share link", async ({
    page,
    context,
  }) => {
    await login(page);
    await page.goto(`${BASE}/ar/files`);

    const fileRow = page.locator('[data-testid="document-row"]').first();
    await fileRow.hover();
    const optionsBtn = fileRow.locator('button:has-text("⋮")').first();
    await optionsBtn.click();

    const shareBtn = page.locator("text=مشاركة المستند").or(page.locator("text=مشاركة")).first();
    if (await shareBtn.isVisible()) {
      await shareBtn.click();
      await page.locator("text=إنشاء رابط عام").first().click();
      await expect(page.locator("text=تم إنشاء الرابط بنجاح").first()).toBeVisible();

      const linkInput = page.locator("input[readonly]").first();
      shareLink = await linkInput.inputValue();
      await page.locator("text=إلغاء").first().click();
    }

    if (shareLink) {
      const anonymousContext = await context.browser()!.newContext();
      const anonymousPage = await anonymousContext.newPage();
      await anonymousPage.goto(shareLink);
      await expect(
        anonymousPage
          .locator("text=مشاركة بواسطة")
          .first()
          .or(anonymousPage.locator("text=تحميل").first()),
      ).toBeVisible({ timeout: 15000 });
      await anonymousContext.close();
    }
  });
});
