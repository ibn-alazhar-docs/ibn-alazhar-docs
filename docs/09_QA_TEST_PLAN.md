# Ibn Al-Azhar Docs — ابن الأزهر دوكس — خطة اختبار الجودة | QA Test Plan

> **التصنيف:** داخلي — فريق الضمان والاختبار  
> **الإصدار:** 1.0.0  
> **آخر تحديث:** 2025-03-05  
> **المرجع الأمني:** أنظر `08_SECURITY_PRIVACY.md` لسياسات الأمان، `05_TECHNICAL_DESIGN.md` للمعمارية

---

## جدول المحتويات

1. [استراتيجية الاختبار](#1-استراتيجية-الاختبار)
2. [مستويات الاختبار](#2-مستويات-الاختبار)
3. [اختبارات الوحدة (Unit Tests)](#3-اختبارات-الوحدة-unit-tests)
4. [اختبارات التكامل (Integration Tests)](#4-اختبارات-التكامل-integration-tests)
5. [اختبارات شاملة (E2E Tests)](#5-اختبارات-شاملة-e2e-tests)
6. [اختبارات الأمان (Security Tests)](#6-اختبارات-الأمان-security-tests)
7. [اختبارات الوصول (Accessibility Tests)](#7-اختبارات-الوصول-accessibility-tests)
8. [اختبارات PWA](#8-اختبارات-pwa)
9. [اختبارات الأداء (Performance Tests)](#9-اختبارات-الأداء-performance-tests)
10. [اختبارات OCR](#10-اختبارات-ocr)
11. [اختبارات العربية و RTL](#11-اختبارات-العربية-و-rtl)
12. [مصفوفة المتصفحات والأجهزة](#12-مصفوفة-المتصفحات-والأجهزة)
13. [بيانات الاختبار (Test Data)](#13-بيانات-الاختبار-test-data)
14. [تعريف الإنجاز (Definition of Done)](#14-تعريف-الإنجاز-definition-of-done)
15. [معايير الإصدار (Release Criteria)](#15-معايير-الإصدار-release-criteria)
16. [حالات الاختبار (Test Cases)](#16-حالات-الاختبار-test-cases)

---

## 1. استراتيجية الاختبار

### 1.1 النهج العام

تتبنى منصة **Ibn Al-Azhar Docs — ابن الأزهر دوكس** استراتيجية اختبار هرمية (Testing Pyramid) مع التركيز على:

- **التحول يساراً (Shift-Left):** اختبار مبكر في دورة التطوير
- **أتمتة شاملة (Automation-First):** أكثر من 80% من الاختبارات مؤتمتة
- **الاختبار المستمر (Continuous Testing):** تشغيل في كل PR وعلى كل deployment
- **اختبار مُحور بالخطر (Risk-Based Testing):** أولوية للمناطق عالية الخطورة (الأمان، المدفوعات مستقبلاً، OCR)

### 1.2 المبادئ التوجيهية

| المبدأ | التطبيق |
|--------|---------|
| اختبار مبكر | كتابة الاختبارات مع الكود (TDD حيث أمكن) |
| تغطية شاملة | 80%+ code coverage كحد أدنى |
| استقلالية الاختبارات | كل اختبار يعمل بشكل مستقل بدون ترتيب |
| قابلية التكرار | نفس النتيجة في كل تشغيل |
| سرعة التنفيذ | Unit < 5 دقائق، Integration < 15 دقيقة، E2E < 30 دقيقة |
| صيانة مستمرة | مراجعة الاختبارات المتعطلة خلال 24 ساعة |

### 1.3 معايير الدخول (Entry Criteria)

- اكتمال متطلبات الميزة وموافقة المنتج
- اكتمال التصميم التقني
- بيئة اختبار جاهزة (Docker Compose)
- بيانات اختبار متوفرة (seed data)
- فرع الميزة مدمج في فرع التطوير

### 1.4 معايير الخروج (Exit Criteria)

- جميع الاختبارات الحرجة والعالية تنجح (100%)
- اختبارات المتوسطة: نجاح 95% كحد أدنى
- لا توجد ثغرات أمنية حرجة أو عالية غير مُعالجة
- تغطية الكود ≥ 80%
- اجتياز اختبارات الأداء بالمعايير المحددة
- اجتياز مراجعة الكود (Code Review)

---

## 2. مستويات الاختبار

### 2.1 هرم الاختبار

```
          ╱╲
         ╱  ╲          E2E (Playwright)
        ╱ 5% ╲         ~15 test case
       ╱──────╲
      ╱        ╲       Integration (Vitest+Supertest)
     ╱   15%    ╲      ~50 test case
    ╱────────────╲
   ╱              ╲     Component (Vitest+RTL)
  ╱     25%        ╲    ~80 test case
 ╱──────────────────╲
╱                    ╲   Unit (Vitest)
╱       55%           ╲  ~200 test case
╱──────────────────────╲
```

### 2.2 جدول المستويات

| المستوى | الأداة | النطاق | التكرار | المسؤول |
|---------|--------|--------|---------|---------|
| **Unit** | Vitest | الدوال والمنطق المعزول | كل commit | المطور |
| **Component** | Vitest + React Testing Library | مكونات UI | كل commit | المطور |
| **Integration** | Vitest + Supertest | API routes + DB + MinIO | كل PR | المطور + QA |
| **E2E** | Playwright | تدفقات المستخدم الكاملة | كل merge إلى main | QA |
| **Visual** | Playwright screenshots | التناسق البصري | كل merge إلى main | QA |
| **Performance** | k6 / Artillery | الحمل والأداء | أسبوعياً + قبل الإصدار | DevOps + QA |
| **Security** | OWASP ZAP + يدوي | الثغرات الأمنية | قبل كل إصدار | Security Lead |
| **Accessibility** | axe-core + Lighthouse | معايير WCAG 2.1 AA | كل PR | المطور + QA |
| **i18n** | next-intl checks + يدوي | دعم العربية و RTL | كل PR | المطور + QA |
| **PWA** | Lighthouse PWA audit | معايير PWA | أسبوعياً | QA |

---

## 3. اختبارات الوحدة (Unit Tests)

### 3.1 النطاق

- **دوال المنطق التجاري (Business Logic):** تحويل الملفات، حساب الصلاحيات، توليد روابط المشاركة
- **دوال التحقق (Validation):** Zod schemas، file type validation، input sanitization
- **دوال المساعدة (Utility Functions):** تنسيق التواريخ بالعربية، حساب حجم الملفات، إنشاء أسماء آمنة
- **Middleware:** rate limiting logic، CSP header generation، auth checks
- **Prisma Queries:** بمعزل عن قاعدة البيانات باستخدام Prisma mock

### 3.2 الأدوات والإعداد

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/**/*.test.{ts,tsx}', 'src/migrations/**'],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
    setupFiles: ['src/test/setup.ts'],
  },
});
```

### 3.3 أمثلة على اختبارات الوحدة

```typescript
// src/lib/security/__tests__/rate-limit.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rateLimit } from '../rate-limit';

describe('rateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow request under limit', async () => {
    const result = await rateLimit({
      key: 'test:127.0.0.1',
      limit: 5,
      windowMs: 60000,
    });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThanOrEqual(0);
  });

  it('should block request over limit', async () => {
    // تنفيذ 6 طلبات (الحد = 5)
    for (let i = 0; i < 5; i++) {
      await rateLimit({ key: 'test:block', limit: 5, windowMs: 60000 });
    }
    const result = await rateLimit({ key: 'test:block', limit: 5, windowMs: 60000 });
    expect(result.allowed).toBe(false);
  });
});

// src/lib/validation/__tests__/file-upload.test.ts
import { describe, it, expect } from 'vitest';
import { validateFileUpload } from '../file-upload';

describe('validateFileUpload', () => {
  it('should accept valid PDF file', () => {
    const result = validateFileUpload({
      name: 'document.pdf',
      size: 1024 * 1024, // 1 MB
      mimeType: 'application/pdf',
    });
    expect(result.valid).toBe(true);
  });

  it('should reject oversized file', () => {
    const result = validateFileUpload({
      name: 'large.pdf',
      size: 99 * 1024 * 1024, // 99 MB
      mimeType: 'application/pdf',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('حجم');
  });

  it('should reject disallowed file type', () => {
    const result = validateFileUpload({
      name: 'malware.exe',
      size: 1024,
      mimeType: 'application/x-msdownload',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('نوع');
  });

  it('should reject file with mismatched MIME and extension', () => {
    const result = validateFileUpload({
      name: 'fake.pdf',       // امتداد PDF
      size: 1024,
      mimeType: 'image/jpeg', // لكن MIME نوع صورة
    });
    expect(result.valid).toBe(false);
  });
});
```

### 3.4 تغطية الكود المطلوبة

| الوحدة | الحد الأدنى للتغطية | الأولوية |
|--------|-------------------|---------|
| `src/lib/security/*` | 90% | حرجة |
| `src/lib/validation/*` | 90% | حرجة |
| `src/lib/auth/*` | 90% | حرجة |
| `src/lib/ocr/*` | 85% | عالية |
| `src/app/api/*` (handlers) | 80% | عالية |
| `src/lib/storage/*` | 80% | عالية |
| `src/lib/queue/*` | 80% | عالية |
| `src/components/*` | 70% | متوسطة |
| المجموع الكلي | 80% | — |

---

## 4. اختبارات التكامل (Integration Tests)

### 4.1 النطاق

- **API Routes:** كل endpoint مع قاعدة بيانات حقيقية (PostgreSQL test instance)
- **MinIO Integration:** رفع، تحميل، حذف الملفات
- **Redis Integration:** rate limiting، session management، BullMQ
- **Auth Flow:** تسجيل، دخول، تجديد جلسة، خروج — مع NextAuth.js v5
- **BullMQ Flow:** إضافة job، معالجة، تحديث الحالة، إعادة المحاولة

### 4.2 الإعداد

```typescript
// src/test/integration-setup.ts
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { Client as MinioClient } from 'minio';
import Redis from 'ioredis';

let prisma: PrismaClient;
let minio: MinioClient;
let redis: Redis;

beforeAll(async () => {
  // إعداد قاعدة بيانات اختبار
  prisma = new PrismaClient({
    datasourceUrl: process.env.TEST_DATABASE_URL,
  });
  await prisma.$connect();

  // إعادة تعيين قاعدة البيانات
  execSync('npx prisma migrate reset --force', {
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
  });

  // إعداد MinIO
  minio = new MinioClient({
    endPoint: process.env.MINIO_ENDPOINT!,
    port: parseInt(process.env.MINIO_PORT!),
    accessKey: process.env.MINIO_ACCESS_KEY!,
    secretKey: process.env.MINIO_SECRET_KEY!,
    useSSL: false,
  });

  // إعداد Redis
  redis = new Redis(process.env.TEST_REDIS_URL);
  await redis.flushdb();
});

afterAll(async () => {
  await prisma.$disconnect();
  await redis.quit();
});
```

### 4.3 السيناريوهات الرئيسية

| # | السيناريو | التحقق |
|---|-----------|--------|
| I01 | تسجيل مستخدم جديد → دخول → تجديد جلسة → خروج | تدفق المصادقة الكامل |
| I02 | رفع ملف PDF → تخزين في MinIO → سجل في قاعدة البيانات | تكامل التخزين |
| I03 | رفع ملف → إضافة تحويل job → معالجة → تحديث الحالة | تدفق BullMQ |
| I04 | إنشاء رابط مشاركة → وصول مجهول → تحميل عبر presigned URL | تكامل المشاركة |
| I05 | تجاوز rate limit → رفض الطلب → تسجيل في audit log | تكامل الأمان |
| I06 | رفع ملف خبيث (متنكر) → رفض → تسجيل | أمان رفع الملفات |
| I07 | تسجيل دخول فاشل 6 مرات → قفل → محاولة بعد القفل | حماية brute force |
| I08 | مستخدم يصل لملف مستخدم آخر → رفض | عزل البيانات |
| I09 | إنشاء رابط مشاركة → انتهاء الصلاحية → رفض الوصول | أمان المشاركة |
| I10 | SSE endpoint → رفع ملف → تلقي أحداث التقدم | تدفق SSE |

### 4.4 مثال على اختبار تكاملي

```typescript
// src/test/integration/auth-flow.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createServer } from 'http';
import { app } from '@/app';
import { PrismaClient } from '@prisma/client';

describe('Authentication Flow Integration', () => {
  const prisma = new PrismaClient({
    datasourceUrl: process.env.TEST_DATABASE_URL,
  });
  const server = createServer(app);

  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { email: 'test@example.com' } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: 'test@example.com' } });
    await prisma.$disconnect();
  });

  it('should complete full auth flow', async () => {
    // 1. تسجيل حساب جديد
    const registerRes = await request(server)
      .post('/api/auth/register')
      .send({
        name: 'مستخدم اختبار',
        email: 'test@example.com',
        password: 'Str0ngP@ss!',
      });
    expect(registerRes.status).toBe(201);

    // 2. تسجيل الدخول
    const loginRes = await request(server)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Str0ngP@ss!',
      });
    expect(loginRes.status).toBe(200);
    expect(loginRes.headers['set-cookie']).toBeDefined();

    const cookies = loginRes.headers['set-cookie'];

    // 3. الوصول لمحمي
    const profileRes = await request(server)
      .get('/api/user/profile')
      .set('Cookie', cookies);
    expect(profileRes.status).toBe(200);
    expect(profileRes.body.email).toBe('test@example.com');

    // 4. تجديد الجلسة (NextAuth built-in)
    const sessionRes = await request(server)
      .get('/api/auth/session')
      .set('Cookie', cookies);
    expect(sessionRes.status).toBe(200);

    // 5. تسجيل الخروج
    const logoutRes = await request(server)
      .post('/api/auth/logout')
      .set('Cookie', cookies);
    expect(logoutRes.status).toBe(200);

    // 6. التحقق من انتهاء الجلسة
    const afterLogoutRes = await request(server)
      .get('/api/user/profile')
      .set('Cookie', cookies);
    expect(afterLogoutRes.status).toBe(401);
  });
});
```

---

## 5. اختبارات شاملة (E2E Tests)

### 5.1 النطاق

- **التدفقات الحرجة:** التحويل الكامل، المصادقة، المشاركة
- **التدفقات عبر المتصفح:** Chrome, Firefox, Safari, Edge
- **الاستجابة:** أجهزة مخصصة (desktop, tablet, mobile)
- **PWA:** التثبيت، العمل بدون اتصال، Service Worker

### 5.2 الإعداد

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  timeout: 60000,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'ar',
    timezoneId: 'Asia/Riyadh',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14'] },
    },
  ],
  webServer: {
    command: 'docker compose up -d',
    url: 'http://localhost:3000/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

### 5.3 التدفقات الرئيسية

#### E2E-01: تدفق التحويل الكامل

```typescript
// e2e/conversion-flow.spec.ts
import { test, expect } from '@playwright/test';

test('E2E-01: Full conversion flow — PDF to DOCX with RTL', async ({ page }) => {
  // 1. تسجيل الدخول
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', 'test@example.com');
  await page.fill('[data-testid="password-input"]', 'Str0ngP@ss!');
  await page.click('[data-testid="login-button"]');
  await expect(page).toHaveURL('/dashboard');

  // 2. رفع ملف PDF
  await page.click('[data-testid="upload-button"]');
  const fileInput = page.locator('[data-testid="file-input"]');
  await fileInput.setInputFiles('test-fixtures/arabic-document.pdf');

  // 3. انتظار الرفع
  await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 30000 });

  // 4. بدء التحويل
  await page.click('[data-testid="convert-to-docx"]');

  // 5. انتظار اكتمال التحويل (SSE progress)
  await expect(page.locator('[data-testid="conversion-progress"]')).toBeVisible();
  await expect(page.locator('[data-testid="conversion-complete"]')).toBeVisible({ timeout: 120000 });

  // 6. تحميل الملف المحول
  const downloadPromise = page.waitForEvent('download');
  await page.click('[data-testid="download-converted"]');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.docx$/);

  // 7. التحقق من أن الملف ليس فارغاً
  const path = await download.path();
  const fs = require('fs');
  const stats = fs.statSync(path);
  expect(stats.size).toBeGreaterThan(0);
});
```

#### E2E-02: تدفق المصادقة الكامل

```typescript
// e2e/auth-flow.spec.ts
import { test, expect } from '@playwright/test';

test('E2E-02: Auth flow — register, login, session check, logout', async ({ page }) => {
  // 1. تسجيل حساب جديد
  await page.goto('/register');
  await page.fill('[data-testid="name-input"]', 'مستخدم جديد');
  await page.fill('[data-testid="email-input"]', `test-${Date.now()}@example.com`);
  await page.fill('[data-testid="password-input"]', 'Str0ngP@ss!');
  await page.fill('[data-testid="confirm-password-input"]', 'Str0ngP@ss!');
  await page.click('[data-testid="register-button"]');

  // 2. التحقق من التوجيه إلى dashboard
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('[data-testid="user-name"]')).toContainText('مستخدم جديد');

  // 3. تسجيل الخروج
  await page.click('[data-testid="user-menu"]');
  await page.click('[data-testid="logout-button"]');
  await expect(page).toHaveURL('/login');

  // 4. تسجيل الدخول مرة أخرى
  await page.fill('[data-testid="email-input"]', 'test@example.com');
  await page.fill('[data-testid="password-input"]', 'Str0ngP@ss!');
  await page.click('[data-testid="login-button"]');
  await expect(page).toHaveURL('/dashboard');

  // 5. التحقق من وجود cookies أمنية
  const cookies = await page.context().cookies();
  const sessionToken = cookies.find(c => c.name === 'next-auth.session-token');
  expect(sessionToken?.httpOnly).toBe(true);
  expect(sessionToken?.secure).toBe(true);
  expect(sessionToken?.sameSite).toBe('Strict');
});
```

### 5.4 تدفقات E2E المطلوبة

| # | التدفق | المتصفحات | الأولوية |
|---|--------|----------|---------|
| E2E-01 | تحويل PDF → DOCX كامل | Chrome, Firefox, Safari | حرجة |
| E2E-02 | المصادقة الكاملة (register/login/logout) | Chrome, Firefox, Safari | حرجة |
| E2E-03 | رفع ملف كبير (100+ صفحة PDF) | Chrome | عالية |
| E2E-04 | مشاركة ملف → وصول مجهول → تحميل | Chrome, Safari | عالية |
| E2E-05 | PWA: تثبيت + عمل بدون اتصال | Chrome (Android) | عالية |
| E2E-06 | استجابة: 320px + 768px + 1280px | Chrome | عالية |
| E2E-07 | RTL: كل الصفحات بالعربية | Chrome, Safari | عالية |
| E2E-08 | إعدادات الحساب + حذف الحساب | Chrome | متوسطة |
| E2E-09 | إشعارات التقدم (SSE) | Chrome | متوسطة |
| E2E-10 | لوحة الإدارة (Admin) | Chrome | متوسطة |

---

## 6. اختبارات الأمان (Security Tests)

### 6.1 OWASP Top 10 — تغطية الاختبار

| # | الفئة | الاختبار | الأداة | التكرار |
|---|-------|---------|--------|---------|
| S01 | A01 — Broken Access Control | محاولة وصول لملفات مستخدم آخر | يدوي + ZAP | كل إصدار |
| S02 | A01 — Broken Access Control | مصادقة معطلة + طلب API محمي | ZAP | كل إصدار |
| S03 | A02 — Cryptographic Failures | التحقق من HTTPS إلزامي | ZAP + يدوي | كل إصدار |
| S04 | A02 — Cryptographic Failures | التحقق من MinIO encryption at rest | يدوي | كل إصدار |
| S05 | A03 — Injection | SQL injection على جميع مدخلات API | ZAP + يدوي | كل إصدار |
| S06 | A03 — Injection | XSS في أسماء الملفات والمدخلات | يدوي + ZAP | كل إصدار |
| S07 | A04 — Insecure Design | تجاوز rate limiting | يدوي + k6 | كل إصدار |
| S08 | A04 — Insecure Design | تخمين روابط المشاركة | يدوي | كل إصدار |
| S09 | A05 — Security Misconfiguration | فحص CSP headers | ZAP + يدوي | كل إصدار |
| S10 | A05 — Security Misconfiguration | فحص security headers كاملة | ZAP + securityheaders.com | كل إصدار |
| S11 | A06 — Vulnerable Components | npm audit | CI (كل PR) | مستمر |
| S12 | A06 — Vulnerable Components | Trivy image scan | CI (كل build) | مستمر |
| S13 | A07 — Auth Failures | Brute force على تسجيل الدخول | يدوي + k6 | كل إصدار |
| S14 | A07 — Auth Failures | Credential stuffing simulation | يدوي | كل إصدار |
| S15 | A08 — Data Integrity | تعديل JWT payload | يدوي | كل إصدار |
| S16 | A08 — Data Integrity | File upload MIME spoofing | يدوي | كل إصدار |
| S17 | A09 — Logging | التحقق من تسجيل الأحداث الأمنية | يدوي | كل إصدار |
| S18 | A10 — SSRF | SSRF عبر مدخلات المستخدم | ZAP + يدوي | كل إصدار |

### 6.2 إعداد OWASP ZAP

```bash
#!/bin/bash
# security-scan.sh
ZAP_PORT=8080
TARGET_URL="http://localhost:3000"

# تشغيل ZAP في Docker
docker run -u zap -p ${ZAP_PORT}:${ZAP_PORT} -d --name zap owasp/zap2docker-stable

# انتظار بدء ZAP
sleep 30

# فحص نشط (Active Scan)
docker exec zap zap-cli active-scan -r ${TARGET_URL}

# فحص سلبي (Passive Scan)
docker exec zap zap-cli spider ${TARGET_URL}

# إنشاء التقرير
docker exec zap zap-cli report -o security-report.html -f html

# إيقاف ZAP
docker stop zap && docker rm zap
```

### 6.3 اختبارات أمان يدوية

| الاختبار | الخطوات | النتيجة المتوقعة |
|---------|--------|-----------------|
| XSS في اسم الملف | رفع ملف باسم `<script>alert('xss')</script>.pdf` | الاسم يظهر مشفراً (escaped) بدون تنفيذ script |
| SQLi في البحث | البحث عن `' OR 1=1 --` | لا نتائج أو خطأ عام، لا تسريب بيانات |
| CSRF عبر نموذج خارجي | إرسال طلب POST من موقع خارجي | رفض (403) بسبب CSRF token |
| تجاوز صلاحيات | مستخدم عادي يصل لـ `/api/admin/*` | رفض (403 Forbidden) |
| سرقة cookie | محاولة قراءة `document.cookie` في console | لا رموز مصادقة ظاهرة (HttpOnly) |
| MITM simulation | طلب HTTP بدون S | إعادة توجيه إلى HTTPS أو رفض |

---

## 7. اختبارات الوصول (Accessibility Tests)

### 7.1 المعايير المستهدفة

| المعيار | المستوى |
|---------|---------|
| WCAG 2.1 | AA (كحد أدنى) |
| WCAG 2.1 | AAA (للألوان والتباين حيث أمكن) |
| ARIA | 1.2 |
| RTL | دعم كامل للعربية |

### 7.2 أدوات الاختبار

| الأداة | الاستخدام | التكامل |
|--------|----------|---------|
| **axe-core** | فحص آلي لكل صفحة | Vitest + Playwright |
| **Lighthouse** | تقييم شامل للوصول | CI pipeline |
| **screen reader** | اختبار يدوي مع NVDA/VoiceOver | يدوي |
| **keyboard navigation** | اختبار تنقل بلوحة المفاتيح | يدوي + Playwright |

### 7.3 فحوصات axe-core الآلية

```typescript
// e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  const pages = [
    { name: 'الصفحة الرئيسية', path: '/' },
    { name: 'تسجيل الدخول', path: '/login' },
    { name: 'إنشاء حساب', path: '/register' },
    { name: 'لوحة التحكم', path: '/dashboard' },
    { name: 'المستندات', path: '/documents' },
    { name: 'الإعدادات', path: '/settings' },
  ];

  for (const page of pages) {
    test(`${page.name} — لا توجد انتهاكات WCAG`, async ({ page: browserPage }) => {
      await browserPage.goto(page.path);

      const results = await new AxeBuilder({ page: browserPage })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }
});
```

### 7.4 قائمة فحص الوصول اليدوية

| # | الفحص | المعيار | الأولوية |
|---|-------|---------|---------|
| A01 | التباين (Contrast Ratio) ≥ 4.5:1 للنص العادي | WCAG 1.4.3 | حرجة |
| A02 | التباين ≥ 3:1 للنص الكبير | WCAG 1.4.3 | حرجة |
| A03 | كل الصور لها `alt` text بالعربية | WCAG 1.1.1 | حرجة |
| A04 | كل النماذج لها `label` مرتبط | WCAG 1.3.1 | حرجة |
| A05 | التنقل بلوحة المفاتيح فقط ممكن | WCAG 2.1.1 | حرجة |
| A06 | ترتيب التركيز (Focus Order) منطقي في RTL | WCAG 2.4.3 | حرجة |
| A07 | مؤشر التركيز (Focus Indicator) مرئي | WCAG 2.4.7 | عالية |
| A08 | ARIA labels بالعربية لكل عنصر تفاعلي | WCAG 4.1.2 | عالية |
| A09 | رسائل الخطأ مرتبطة بالحقول عبر `aria-describedby` | WCAG 3.3.1 | عالية |
| A10 | Skip navigation link متوفر | WCAG 2.4.1 | متوسطة |
| A11 | تقليل الحركة (Reduced Motion) محترم | WCAG 2.3.3 | متوسطة |
| A12 | Screen reader يقرأ المحتوى بالترتيب الصحيح (RTL) | WCAG 1.3.2 | عالية |

---

## 8. اختبارات PWA

### 8.1 Lighthouse PWA Audit

| المعيار | الهدف | الأداة |
|---------|-------|--------|
| PWA Score | ≥ 90 | Lighthouse |
| Installable | ✅ | Lighthouse + يدوي |
| Service Worker | مسجل ويعمل | Lighthouse + DevTools |
| Manifest | صالح وكامل | Lighthouse |
| Offline | Shell يعمل بدون اتصال | يدوي |
| HTTPS | إلزامي | Lighthouse |

### 8.2 اختبارات Service Worker

```typescript
// e2e/pwa.spec.ts
import { test, expect } from '@playwright/test';

test('PWA: Service Worker مسجل ويعمل', async ({ page }) => {
  await page.goto('/');

  // التحقق من تسجيل Service Worker
  const swRegistered = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return !!registration;
  });
  expect(swRegistered).toBe(true);
});

test('PWA: App Shell يعمل بدون اتصال', async ({ page, context }) => {
  await page.goto('/');

  // الانتظار حتى اكتمال التحميل والتخزين المؤقت
  await page.waitForTimeout(3000);

  // قطع الاتصال
  await context.setOffline(true);

  // إعادة تحميل الصفحة
  await page.reload();

  // التحقق من أن App Shell يظهر (وليس خطأ شبكة)
  await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();
});

test('PWA: manifest صالح', async ({ page }) => {
  await page.goto('/');

  const manifest = await page.evaluate(async () => {
    const link = document.querySelector('link[rel="manifest"]');
    if (!link) return null;
    const response = await fetch(link.getAttribute('href')!);
    return response.json();
  });

  expect(manifest).not.toBeNull();
  expect(manifest.name).toContain('ابن الأزهر دوكس');
  expect(manifest.dir).toBe('rtl');
  expect(manifest.lang).toBe('ar');
  expect(manifest.icons.length).toBeGreaterThan(0);
});
```

### 8.3 قائمة فحص PWA

| # | الفحص | النتيجة المتوقعة |
|---|-------|-----------------|
| P01 | Install prompt يظهر على Chrome Android | A2HS prompt |
| P02 | التطبيق يعمل بعد التثبيت | يفتح كتطبيق مستقل |
| P03 | App Shell يظهر بدون اتصال | الصفحة الرئيسية بدون بيانات ديناميكية |
| P04 | Cache يُحدّث عند نشر نسخة جديدة | SW يحدّث الموارد الثابتة |
| P05 | لا بيانات حساسة في Cache | فحص DevTools → Application → Cache Storage |
| P06 | Push notifications (Post-MVP) | صلاحية مطلوبة + إشعار |
| P07 | Background sync (Post-MVP) | مزامنة عند عودة الاتصال |

---

## 9. اختبارات الأداء (Performance Tests)

### 9.1 الأهداف (Targets)

| المقياس | الهدف | الأداة |
|---------|-------|--------|
| **First Contentful Paint (FCP)** | < 1.5 ثانية | Lighthouse |
| **Largest Contentful Paint (LCP)** | < 2.5 ثانية | Lighthouse |
| **Time to Interactive (TTI)** | < 3.5 ثانية | Lighthouse |
| **Cumulative Layout Shift (CLS)** | < 0.1 | Lighthouse |
| **Total Blocking Time (TBT)** | < 200ms | Lighthouse |
| **Lighthouse Performance Score** | ≥ 85 | Lighthouse |
| **API Response Time (p50)** | < 200ms | k6 |
| **API Response Time (p95)** | < 1s | k6 |
| **API Response Time (p99)** | < 3s | k6 |
| **Concurrent Users** | 100 | k6 |
| **File Upload Throughput** | 10 uploads/min | k6 |

### 9.2 اختبار الحمل باستخدام k6

```javascript
// k6/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const apiDuration = new Trend('api_duration');
const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 20 },   // Ramp-up إلى 20 مستخدم
    { duration: '5m', target: 50 },   // زيادة إلى 50
    { duration: '5m', target: 100 },  // زيادة إلى 100
    { duration: '2m', target: 0 },    // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<3000'],
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // 1. الصفحة الرئيسية
  const homeRes = http.get(`${BASE_URL}/`);
  check(homeRes, { 'home status 200': (r) => r.status === 200 });
  apiDuration.add(homeRes.timings.duration);

  // 2. صفحة تسجيل الدخول
  const loginPageRes = http.get(`${BASE_URL}/login`);
  check(loginPageRes, { 'login page 200': (r) => r.status === 200 });

  // 3. API health check
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    'health 200': (r) => r.status === 200,
    'health response < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);
}
```

### 9.3 سيناريوهات اختبار الأداء

| السيناريو | المستخدمون | المدة | الهدف |
|-----------|-----------|-------|-------|
| حمولة عادية | 20 متزامن | 10 دقائق | p95 < 500ms |
| حمولة متوسطة | 50 متزامن | 10 دقائق | p95 < 1s |
| حمولة عالية | 100 متزامن | 10 دقائق | p99 < 3s |
| Spike test | 0 → 200 → 0 | 5 دقائق | لا أخطاء حرجة |
| تحميل ملفات | 10 uploads/min | 15 دقيقة | نجاح 100% |
| تحويل ملفات | 5 conversions/min | 15 دقيقة | نجاح 100% |

---

## 10. اختبارات OCR

### 10.1 التحقق من جودة OCR

| نوع المستند | اللغة | الهدف (الدقة) | ملاحظات |
|------------|-------|-------------|---------|
| PDF نصي عربي | العربية | ≥ 98% | حالات بسيطة |
| PDF ممسوح ضوئياً | العربية | ≥ 90% | جودة مسح جيدة |
| صورة نص عربي | العربية | ≥ 85% | خطوط واضحة |
| PDF مختلط (عربي + إنجليزي) | مختلط | ≥ 85% | تحدي ثنائي اللغة |
| PDF بأرقام هندية | العربية | ≥ 90% | ٠١٢٣٤٥٦٧٨٩ |
| PDF بخطوط مزخرفة | العربية | ≥ 70% | خطوط Diwani, Thuluth |

### 10.2 حالات حافة OCR (Edge Cases)

| الحالة | الاختبار | النتيجة المتوقعة |
|--------|---------|-----------------|
| ملف فارغ (0 صفحات) | رفع PDF فارغ | رسالة خطأ واضحة |
| ملف محمي بكلمة مرور | رفع PDF مشفر | رسالة خطأ + اقتراح إزالة الحماية |
| ملف تالف | رفع PDF تالف جزئياً | استخراج ما أمكن + تنبيه |
| صورة بدون نص | رفع صورة طبيعية | إرجاع نص فارغ + إشعار |
| ملف كبير (100+ صفحة) | رفع PDF كبير | معالجة عبر BullMQ + تقدم SSE |
| نص رأسي (vertical text) | رفع مستند بنص عمودي | أفضل جهد ممكن |
| جداول ورسوم بيانية | رفع PDF يحتوي جداول | استخراج النص + تحذير عن الجداول |

### 10.3 اختبار خصوصية OCR

| الاختبار | الخطوات | النتيجة المتوقعة |
|---------|--------|-----------------|
| موافقة المستخدم | محاولة تحويل بدون موافقة سابقة | عرض إشعار الموافقة |
| حذف من Google | إرسال ملف → انتظار → فحص Google Drive | الملف محذوف خلال 5 دقائق |
| سحب الموافقة | سحب موافقة OCR → محاولة تحويل | تعطيل OCR مع رسالة واضحة |
| سجل الموافقات | التحقق من ActivityLog | تسجيل الموافقة مع IP ونسخة النص |

---

## 11. اختبارات العربية و RTL

### 11.1 قائمة فحص شاملة

| # | العنصر | الفحص | الأولوية |
|---|--------|-------|---------|
| RTL-01 | اتجاه الصفحة | `<html lang="ar" dir="rtl">` على كل صفحة | حرجة |
| RTL-02 | اتجاه النص | النص العربي محاذاة لليمين بشكل صحيح | حرجة |
| RTL-03 | ترتيب العناصر المرنة | Flex/Grid يعكس الاتجاه (row-reverse أو logical properties) | حرجة |
| RTL-04 | أيقونات اتجاهية | الأسهم والأيقونات الاتجاهية معكوسة | عالية |
| RTL-05 | أرقام الصفحات | أرقام هندية (٠١٢٣) أو عربية حسب الإعدادات | عالية |
| RTL-06 | التواريخ | تنسيق التواريخ بالعربية (مارس ٢٠٢٥) | عالية |
| RTL-07 | المدخلات النصية | `<input dir="auto">` للحقول ثنائية اللغة | عالية |
| RTL-08 | أشرطة التمرير | أشرطة التمرير على الجانب الأيسر في RTL | متوسطة |
| RTL-09 | القوائم المنسدلة | فتح القائمة بالاتجاه الصحيح | متوسطة |
| RTL-10 | التنقل بلوحة المفاتيح | Tab يتنقل من اليمين لليسار | حرجة |
| RTL-11 | رسائل الخطأ | رسائل خطأ بالعربية وواضحة | عالية |
| RTL-12 | العناوين النائبة (Placeholders) | نصوص placeholder بالعربية | عالية |
| RTL-13 | أزرار الإجراءات | زر الإجراء الأساسي على اليسار (في RTL) | متوسطة |
| RTL-14 | التبديل بين LTR/RTL | إذا وُجد محتوى إنجليزي، يعرض بـ LTR | متوسطة |
| RTL-15 | الوجهات الرقمية | عملة، أحجام ملفات بالتنسيق العربي | متوسطة |

### 11.2 اختبار آلي لـ RTL

```typescript
// e2e/rtl-check.spec.ts
import { test, expect } from '@playwright/test';

test.describe('RTL/Arabic Tests', () => {
  const pages = [
    { name: 'الرئيسية', path: '/' },
    { name: 'تسجيل الدخول', path: '/login' },
    { name: 'إنشاء حساب', path: '/register' },
    { name: 'لوحة التحكم', path: '/dashboard' },
    { name: 'المستندات', path: '/documents' },
    { name: 'الإعدادات', path: '/settings' },
  ];

  for (const pageInfo of pages) {
    test(`RTL-01: ${pageInfo.name} — اتجاه RTL صحيح`, async ({ page }) => {
      await page.goto(pageInfo.path);
      const dir = await page.getAttribute('html', 'dir');
      const lang = await page.getAttribute('html', 'lang');
      expect(dir).toBe('rtl');
      expect(lang).toBe('ar');
    });

    test(`RTL-02: ${pageInfo.name} — لا يوجد نص أفقي مقطوع`, async ({ page }) => {
      await page.goto(pageInfo.path);
      const overflowElements = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        const overflowing = [];
        elements.forEach(el => {
          if (el.scrollWidth > el.clientWidth + 2) {
            overflowing.push({
              tag: el.tagName,
              text: el.textContent?.substring(0, 50),
            });
          }
        });
        return overflowing;
      });
      expect(overflowElements.length).toBe(0);
    });
  }
});
```

---

## 12. مصفوفة المتصفحات والأجهزة

### 12.1 المصفوفة الكاملة

| المتصفح | الإصدار | نظام التشغيل | الجهاز | الأولوية | الاختبار |
|---------|---------|-------------|--------|---------|---------|
| Chrome | 120+ | Windows 11 | Desktop | حرجة | E2E + Visual |
| Chrome | 120+ | macOS 14 | Desktop | حرجة | E2E + Visual |
| Chrome | 120+ | Android 14 | Pixel 7 | حرجة | E2E + Manual |
| Firefox | 120+ | Windows 11 | Desktop | عالية | E2E |
| Firefox | 120+ | Android 14 | Pixel 7 | متوسطة | Manual |
| Safari | 17+ | macOS 14 | Desktop | عالية | E2E |
| Safari | 17+ | iOS 17 | iPhone 14 | عالية | Manual |
| Edge | 120+ | Windows 11 | Desktop | متوسطة | E2E |

### 12.2 اختبارات خاصة بالمتصفح

| المتصفح | المشاكل المعروفة | اختبار مطلوب |
|---------|-----------------|-------------|
| Safari iOS | Service Worker cache behavior مختلف | فحص offline mode يدوي |
| Safari iOS | PWA install flow مختلف | A2HS من زر المشاركة |
| Firefox | بعض خصائص CSS Grid في RTL | فحص layout |
| Chrome Android | Notification permission flow | فحص الإشعارات |
| Safari | Intl.DateTimeFormat بالعربية | فحص التواريخ |

---

## 13. بيانات الاختبار (Test Data)

### 13.1 ملفات اختبار (Fixtures)

| الملف | النوع | الحجم | الغرض |
|------|------|-------|-------|
| `arabic-simple.pdf` | PDF نصي | 50 KB | تحويل أساسي |
| `arabic-scanned.pdf` | PDF ممسوح | 2 MB | OCR |
| `arabic-large.pdf` | PDF 100+ صفحة | 15 MB | أداء و queue |
| `english-simple.pdf` | PDF نصي | 30 KB | LTR content |
| `mixed-ar-en.pdf` | PDF مختلط | 200 KB | ثنائي اللغة |
| `malicious.exe.pdf` | PDF (متنكر) | 10 KB | اختبار أمان |
| `oversized.pdf` | PDF | 99 MB | اختبار حد الحجم |
| `encrypted.pdf` | PDF مشفر | 100 KB | حافة OCR |
| `corrupted.pdf` | PDF تالف | 20 KB | معالجة الأخطاء |
| `arabic-image.jpg` | صورة | 500 KB | OCR من صورة |
| `table-data.pdf` | PDF جداول | 300 KB | OCR جداول |

### 13.2 بيانات قاعدة البيانات (Seed Data)

```sql
-- بيانات اختبار أساسية
INSERT INTO users (id, name, email, password, role) VALUES
  ('test-student', 'طالب اختبار', 'student@test.com', '$2b$12$...', 'student'),
  ('test-teacher', 'معلم اختبار', 'teacher@test.com', '$2b$12$...', 'teacher'),
  ('test-admin', 'مسؤول اختبار', 'admin@test.com', '$2b$12$...', 'admin');

INSERT INTO documents (id, user_id, title, file_type, storage_key, file_size) VALUES
  ('doc-1', 'test-student', 'مستند اختبار عربي', 'pdf', 'users/test-student/uploads/test-arabic.pdf', 51200),
  ('doc-2', 'test-teacher', 'مستند اختبار إنجليزي', 'pdf', 'users/test-teacher/uploads/test-english.pdf', 30720);

INSERT INTO share_links (id, document_id, token, expires_at, is_active, permission) VALUES
  ('share-1', 'doc-1', 'abc123...', '2099-12-31', true, 'view'),
  ('share-expired', 'doc-1', 'xyz789...', '2020-01-01', true, 'view');
```

### 13.3 استراتيجية Mock لـ Google Drive API

```typescript
// src/test/mocks/google-drive.ts
import { vi } from 'vitest';

export const mockGoogleDrive = {
  files: {
    create: vi.fn().mockResolvedValue({
      data: { id: 'mock-file-id', name: 'temp-ocr-file' },
    }),
    get: vi.fn().mockResolvedValue({
      data: { id: 'mock-file-id', name: 'temp-ocr-file' },
    }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
};

// Mock لاستخراج النص من OCR
export const mockOCRResult = {
  text: 'هذا نص اختبار للتحقق من جودة التعرف الضوئي على الحروف العربية.',
  confidence: 0.95,
  language: 'ar',
};
```

---

## 14. تعريف الإنجاز (Definition of Done)

### 14.1 لميزة (Feature DoD)

| المعيار | الوصف |
|---------|-------|
| الكود مكتمل | جميع متطلبات الميزة مُنفذة |
| اختبارات الوحدة | تغطية ≥ 80% للكود الجديد |
| اختبارات التكامل | جميع سيناريوهات API مغطاة |
| اختبارات E2E | التدفقات الحرجة مكتوبة وتنجح |
| مراجعة الكود | موافقة مراجع واحد على الأقل |
| الأمان | لا توجد ثغرات في الكود الجديد |
| الوصول | اجتياز فحص axe-core |
| RTL/العربية | النصوص والاتجاه صحيحان |
| التوثيق | تحديث المستندات التقنية إن لزم |
| لا تحذيرات | لا تحذيرات lint أو type check |

### 14.2 لسباق تطوير (Phase DoD)

| المعيار | الوصف |
|---------|-------|
| جميع ميزات السباق | تنجح معايير Feature DoD |
| اختبارات التراجع | جميع الاختبارات الحالية تنجح |
| الأداء | لا تراجع في مقاييس Lighthouse |
| الأمان | اجتياز فحص ZAP الأساسي |
| البناء | Docker image يُبنى بنجاح |
| Staging | نشر على staging واختبار يدوي |

### 14.3 للإصدار (Release DoD)

| المعيار | الوصف |
|---------|-------|
| جميع Feature DoD + Phase DoD | ✅ |
| اختبارات الأمان الشاملة | اجتياز OWASP Top 10 |
| اختبارات الأداء | اجتياز أهداف k6 |
| اختبارات التوافق | اجتياز مصفوفة المتصفحات |
| تحديث المستندات | جميع المستندات محدثة |
| changelog | مكتوب ومراجع |
| rollback plan | مُعد ومُختبر |

---

## 15. معايير الإصدار (Release Criteria)

### 15.1 معايير كمية (Quantitative)

| المقياس | القيمة المطلوبة | طريقة القياس |
|---------|----------------|-------------|
| Code Coverage | ≥ 80% | Vitest coverage report |
| اختبارات ناجحة | 100% حرجة + عالية | CI pipeline |
| Lighthouse Performance | ≥ 85 | Lighthouse CI |
| Lighthouse Accessibility | ≥ 90 | Lighthouse CI |
| Lighthouse PWA | ≥ 90 | Lighthouse CI |
| API p95 Response Time | < 1s | k6 |
| Zero-day vulnerabilities | 0 | npm audit + Trivy |
| Critical/High Security Bugs | 0 | ZAP + مراجعة يدوية |
| Open Blocker Bugs | 0 | Issue tracker |

### 15.2 معايير نوعية (Qualitative)

| المقياس | الوصف | المسؤول |
|---------|-------|---------|
| تجربة المستخدم | سلسة على جميع الأجهزة | Product Owner |
| جودة RTL | لا مشاكل اتجاه أو قص | QA Lead |
| جودة OCR | نتائج مقبولة للعربية | QA + Product |
| استقرار النظام | لا crashes أو memory leaks | DevOps |
| توثيق كامل | مستندات محدثة | Engineering Lead |
| مراجعة أمنية | موافقة Security Lead | Security Lead |

---

## 16. حالات الاختبار (Test Cases)

### 16.1 جدول حالات الاختبار

| ID | السيناريو | المتطلبات المسبقة | الخطوات | النتيجة المتوقعة | الأولوية | مستوى الأتمتة |
|----|-----------|-------------------|---------|-----------------|---------|---------------|
| TC-001 | تسجيل حساب جديد بنجاح | صفحة التسجيل مفتوحة | 1. إدخال اسم صالح 2. إدخال بريد غير مسجل 3. إدخال كلمة مرور قوية 4. تأكيد كلمة المرور 5. نقر "إنشاء حساب" | إنشاء الحساب، توجيه إلى dashboard، عرض رسالة ترحيب | حرجة | آلي (E2E) |
| TC-002 | تسجيل حساب ببريد مسجل | حساب موجود مسبقاً | 1. إدخال بريد مسجل 2. إدخال كلمة مرور 3. نقر "إنشاء حساب" | رسالة خطأ: "البريد الإلكتروني مسجل بالفعل" | عالية | آلي (Unit) |
| TC-003 | تسجيل حساب بكلمة مرور ضعيفة | صفحة التسجيل مفتوحة | 1. إدخال بيانات صحيحة 2. إدخال كلمة مرور "123" 3. نقر "إنشاء حساب" | رسالة خطأ: "كلمة المرور لا تلبي المتطلبات" | عالية | آلي (Unit) |
| TC-004 | تسجيل دخول ناجح | حساب موجود | 1. إدخال البريد 2. إدخال كلمة المرور 3. نقر "تسجيل الدخول" | توجيه لـ dashboard، وجود HttpOnly cookies | حرجة | آلي (E2E) |
| TC-005 | تسجيل دخول بكلمة مرور خاطئة | حساب موجود | 1. إدخال البريد الصحيح 2. إدخال كلمة مرور خاطئة 3. نقر "تسجيل الدخول" | رسالة خطأ، عدم إنشاء session | حرجة | آلي (Integration) |
| TC-006 | قفل الحساب بعد 5 محاولات فاشلة | حساب موجود | 1. إدخال كلمة مرور خاطئة 5 مرات متتالية | رسالة: "تم قفل الحساب لمدة 30 دقيقة" | عالية | آلي (Integration) |
| TC-007 | تجديد جلسة NextAuth JWT | مستخدم مسجل الدخول | 1. انتظار انتهاء JWT session (24 ساعة) أو تسجيل الدخول من جهاز آخر 2. تنفيذ طلب API | جلسة مستمرة طالما JWT صالح، تجديد عبر GET /api/auth/session | عالية | آلي (Integration) |
| TC-008 | تسجيل الخروج | مستخدم مسجل الدخول | 1. نقر "تسجيل الخروج" | مسح cookies، إبطال tokens، توجيه لصفحة الدخول | حرجة | آلي (E2E) |
| TC-009 | رفع ملف PDF صالح | مستخدم مسجل الدخول | 1. نقر "رفع ملف" 2. اختيار ملف PDF (2 MB) 3. نقر "رفع" | ظهور الملف في القائمة، تخزين في MinIO | حرجة | آلي (E2E) |
| TC-010 | رفع ملف بحجم كبير جداً | مستخدم مسجل الدخول | 1. محاولة رفع ملف 99 MB | رسالة خطأ: "حجم الملف يتجاوز الحد المسموح" | عالية | آلي (Unit) |
| TC-011 | رفع ملف بنوع غير مسموح | مستخدم مسجل الدخول | 1. محاولة رفع ملف .exe | رسالة خطأ: "نوع الملف غير مسموح" | عالية | آلي (Unit) |
| TC-012 | رفع ملف MIME spoofed | مستخدم مسجل الدخول | 1. رفع ملف .exe باسم .pdf | رفض الملف بسبب عدم تطابق file signature | عالية | آلي (Integration) |
| TC-013 | تحويل PDF إلى DOCX | مستند PDF مرفوع | 1. اختيار المستند 2. نقر "تحويل إلى DOCX" 3. انتظار الاكتمال | ملف DOCX متاح للتحميل، يحافظ على RTL | حرجة | آلي (E2E) |
| TC-014 | تقدم التحويل عبر SSE | تحويل قيد التنفيذ | 1. بدء تحويل 2. مراقبة شريط التقدم | تحديثات تقدم حقيقية عبر SSE | عالية | آلي (E2E) |
| TC-015 | تحويل ملف كبير (100+ صفحة) | ملف PDF كبير مرفوع | 1. بدء تحويل 2. انتظار اكتمال BullMQ job | اكتمال التحويل، إشعار بالنجاح | عالية | شبه آلي |
| TC-016 | OCR على ملف ممسوح ضوئياً | ملف PDF ممسوح + موافقة OCR | 1. اختيار المستند 2. نقر "استخراج النص" 3. الموافقة على الإشعار | استخراج نص عربي بدقة ≥ 90% | عالية | يدوي |
| TC-017 | OCR بدون موافقة المستخدم | مستخدم بدون موافقة OCR سابقة | 1. محاولة تحويل تتطلب OCR 2. عدم الموافقة | عدم إرسال الملف لـ Google، عرض خيارات بديلة | حرجة | آلي (Integration) |
| TC-018 | حذف ملف Google بعد OCR | ملف قيد معالجة OCR | 1. مراقبة Google Drive API 2. التحقق من الحذف | ملف محذوف خلال 5 دقائق من Google | حرجة | شبه آلي |
| TC-019 | إنشاء رابط مشاركة | مستند مملوك للمستخدم | 1. اختيار المستند 2. نقر "مشاركة" 3. تحديد الصلاحيات والمدة | إنشاء رابط صالح، ظهوره في قائمة المشاركات | عالية | آلي (E2E) |
| TC-020 | وصول مجهول عبر رابط مشاركة | رابط مشاركة صالح | 1. فتح رابط المشاركة في نافذة خاصة | عرض المستند، إمكانية التحميل | عالية | آلي (E2E) |
| TC-021 | رابط مشاركة منتهي الصلاحية | رابط مشاركة منتهي | 1. فتح رابط مشاركة منتهي | رسالة: "انتهت صلاحية الرابط" | عالية | آلي (Integration) |
| TC-022 | تعديل صلاحيات مستخدم (Admin) | مسؤول مسجل الدخول | 1. فتح لوحة الإدارة 2. تغيير دور المستخدم | تحديث الدور، تسجيل في audit log | عالية | آلي (E2E) |
| TC-023 | مستخدم عادي يصل لوحة الإدارة | مستخدم بدور طالب | 1. الانتقال لـ /admin | رفض الوصول (403) | حرجة | آلي (Integration) |
| TC-024 | مستخدم يصل لملف مستخدم آخر | مستخدم A وملف مستخدم B | 1. طلب API لملف مستخدم آخر | رفض الوصول (403 أو 404) | حرجة | آلي (Integration) |
| TC-025 | Rate limiting على تسجيل الدخول | حساب موجود | 1. إرسال 6 طلبات تسجيل دخول في 15 دقيقة | رفض الطلب السادس (429) | عالية | آلي (Integration) |
| TC-026 | XSS في اسم الملف | مستخدم مسجل الدخول | 1. رفع ملف باسم `<script>alert('x')</script>.pdf` | الاسم مشفر (escaped)، لا تنفيذ script | حرجة | آلي (Integration) |
| TC-027 | SQL Injection في البحث | مستخدم مسجل الدخول | 1. إدخال `' OR 1=1 --` في حقل البحث | لا تسريب بيانات، رسالة عامة | حرجة | آلي (Integration) |
| TC-028 | CSRF عبر طلب خارجي | جلسة نشطة | 1. إرسال طلب POST من نطاق خارجي | رفض الطلب (403) بسبب CSRF token | حرجة | آلي (Integration) |
| TC-029 | CSP headers صحيحة | التطبيق يعمل | 1. فحص response headers | وجود CSP كامل بدون انتهاكات | عالية | آلي (Unit) |
| TC-030 | PWA offline shell | التطبيق مثبت | 1. قطع الاتصال 2. إعادة تحميل الصفحة | ظهور App Shell بدون بيانات ديناميكية | عالية | آلي (E2E) |
| TC-031 | حذف مستند (soft then hard) | مستند مملوك للمستخدم | 1. حذف المستند 2. انتظار 7 أيام | اختفاء فوري، حذف نهائي من MinIO بعد 7 أيام | عالية | شبه آلي |
| TC-032 | حذف حساب المستخدم | مستخدم مسجل الدخول | 1. طلب حذف الحساب 2. تأكيد عبر البريد 3. انتظار 14 يوماً | حذف كامل لجميع البيانات | عالية | يدوي |
| TC-033 | تصدير بيانات المستخدم | مستخدم مسجل الدخول | 1. طلب تصدير البيانات 2. تحميل ملف ZIP | ملف ZIP يحتوي جميع المستندات والبيانات | متوسطة | شبه آلي |
| TC-034 | استجابة على 320px (جوال) | التطبيق يعمل | 1. تصغير النافذة إلى 320px | جميع العناصر مرئية وقابلة للاستخدام | عالية | آلي (E2E) |
| TC-035 | استجابة على 1280px (سطح مكتب) | التطبيق يعمل | 1. عرض على 1280px | Layout مثالي مع استخدام المساحة الكاملة | عالية | آلي (E2E) |
| TC-036 | اتجاه RTL على كل الصفحات | التطبيق يعمل | 1. فحص كل صفحة | `dir="rtl"` و `lang="ar"` على كل صفحة | حرجة | آلي (E2E) |
| TC-037 | تاريخ بالتنسيق العربي | مستخدم مسجل الدخول | 1. عرض صفحة المستندات | التواريخ بالعربية (مثال: ٥ مارس ٢٠٢٥) | متوسطة | آلي (Visual) |
| TC-038 | BullMQ retry عند فشل التحويل | تحويل فاشل | 1. محاكاة فشل التحويل 2. مراقبة السلوك | إعادة المحاولة (3 مرات) ثم إشعار فشل | عالية | آلي (Integration) |
| TC-039 | Presigned URL تنتهي صلاحيتها | ملف في MinIO | 1. الحصول على presigned URL 2. انتظار 6 دقائق 3. محاولة التحميل | رفض التحميل بعد 5 دقائق | متوسطة | آلي (Integration) |
| TC-040 | Security headers كاملة | التطبيق يعمل | 1. فحص جميع response headers | وجود: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc. | عالية | آلي (Unit) |

### 16.2 ملخص الأولويات

| الأولوية | العدد | النسبة |
|---------|-------|--------|
| حرجة | 13 | 32.5% |
| عالية | 21 | 52.5% |
| متوسطة | 6 | 15% |
| **المجموع** | **40** | **100%** |

### 16.3 ملخص مستويات الأتمتة

| المستوى | العدد | النسبة |
|---------|-------|--------|
| آلي (E2E) | 13 | 32.5% |
| آلي (Integration) | 13 | 32.5% |
| آلي (Unit) | 5 | 12.5% |
| آلي (Visual) | 1 | 2.5% |
| شبه آلي | 4 | 10% |
| يدوي | 4 | 10% |
| **المجموع** | **40** | **100%** |

---

> **المراجع المتقاطعة:**
> - سياسات الأمان: `08_SECURITY_PRIVACY.md`
> - معمارية النظام: `05_TECHNICAL_DESIGN.md`
> - مواصفات API: `06_API_SPEC.md`
> - مخطط قاعدة البيانات: `07_DATABASE_SCHEMA.md`
> - إدارة البنية التحتية: `10_DEVOPS_DEPLOYMENT.md`
