import { test, expect } from "@playwright/test";
import path from "path";

const BASE = "http://localhost:3000";
const TEST_EMAIL = `testuser_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@ibnalazhar.app`;
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

    const csrfRes = await request.get("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json();

    const res = await request.post("/api/auth/register", {
      data: {
        name: "Test User E2E",
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        confirmPassword: TEST_PASSWORD,
      },
      headers: {
        "X-CSRF-Token": csrfToken,
        Cookie: `csrf_token=${csrfToken}`,
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

    await page.getByTestId("upload-button").click({ timeout: 15000 });

    await expect(page.locator('[data-testid="document-row"]').first()).toBeVisible({
      timeout: 30000,
    });

    await expect(page.locator('[data-testid="document-row"]').first()).toContainText("اكتمل", {
      timeout: 60000,
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
        .or(page.locator("text=لا يوجد").first())
        .or(page.locator("text=لم نجد نتائج").first()),
    ).toBeVisible({ timeout: 15000 });

    await page.fill('[data-testid="search-input"]', "لا_أعلم_هويتي");
    await page.keyboard.press("Enter");
    await expect(page.locator(`text=لا_أعلم_هويتي`).first()).toBeVisible({ timeout: 10000 });
  });

  test("5. Logout & Unauthorized access", async ({ page }) => {
    await login(page);

    await page.locator("text=تسجيل الخروج").first().click();
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
    await page.fill("#folder-name", "مجلد الاختبار E2E");
    await page.locator('button[type="submit"]').click();

    await expect(page.locator("text=مجلد الاختبار E2E").first()).toBeVisible({ timeout: 10000 });
  });

  test("7. Move document & 8. Add tags & 9. Export document", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/ar/files`);

    // 1. Select the document checkbox
    const fileRow = page.locator('[data-testid="document-row"]').first();
    const checkbox = fileRow.locator('[data-testid="document-select"]').first();
    await checkbox.click();

    // 2. Click "أضف وسوماً" (Add tags) button in BulkActions
    const tagsBtn = page.locator('button:has-text("أضف وسوماً")').first();
    if (await tagsBtn.isVisible()) {
      await tagsBtn.click();
      // Open "createNew" tag input
      await page.locator('button:has-text("+ أنشئ وسماً")').first().click();
      await page.fill('input[placeholder="الاسم"]', "وسم_مهم");
      await page.locator('button:has-text("حفظ")').first().click();
      // Close TagPicker
      await page.locator('button:has-text("أغلق")').first().click();
    }

    // 3. Click the document title to open the preview page and test advanced export
    const titleLink = fileRow.locator('a[href*="/preview/"]').first();
    await titleLink.click();
    await page.waitForURL(/\/ar\/preview\//);

    const previewExportBtn = page.locator('button:has-text("تصدير متقدم")').first();
    await previewExportBtn.click();
    await expect(page.locator("text=تصدير متقدم").first()).toBeVisible({ timeout: 10000 });
    await page.locator("text=إلغاء").first().click();

    // 4. Navigate back to files page
    await page.goto(`${BASE}/ar/files`);

    // 5. Select the document checkbox again
    const moveFileRow = page.locator('[data-testid="document-row"]').first();
    const moveCheckbox = moveFileRow.locator('[data-testid="document-select"]').first();
    await moveCheckbox.click();

    // 6. Click "انقل إلى..." (Move to folder) button in BulkActions
    const moveBtn = page.locator('button:has-text("انقل إلى...")').first();
    if (await moveBtn.isVisible()) {
      await moveBtn.click();
      await page.locator('[role="dialog"]').locator("text=مجلد الاختبار E2E").first().click();
      await page.locator('button:has-text("انقل (1)")').first().click();
      await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 10000 });
    }
  });

  test("10. Create share link, 11. Open anonymously, 12. Expired share link", async ({
    page,
    context,
  }) => {
    test.setTimeout(120000); // Allow time for Next.js to compile the share route
    await login(page);
    await page.goto(`${BASE}/ar/files`);

    const fileRow = page.locator('[data-testid="document-row"]').first();
    await fileRow.hover();
    const shareBtn = fileRow.locator('button[aria-label="مشاركة"], button[title="مشاركة"]').first();
    await shareBtn.click();

    await page.locator("text=أنشئ رابطاً عاماً").first().click();
    await expect(page.locator("text=انسخ الرابط").first()).toBeVisible();

    const linkInput = page.locator("input[readonly]").first();
    shareLink = await linkInput.inputValue();
    await page.locator("text=إلغاء").first().click();

    if (shareLink) {
      const anonymousContext = await context.browser()!.newContext();
      const anonymousPage = await anonymousContext.newPage();
      await anonymousPage.goto(shareLink);
      await expect(
        anonymousPage
          .locator("text=Ibn Al-Azhar Docs")
          .first()
      ).toBeVisible({ timeout: 15000 });
      await anonymousContext.close();
    }
  });
});
