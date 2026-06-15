# QA Phase 1 — إستراتيجية الاختبارات الأولية

> **تاريخ الإنشاء:** 2026-05-24
> **الحالة:** Draft
> **المرجع:** ADR-023 (إستراتيجية الاختبارات)

## 1. المكدس (Stack)

| المستوى             | الأداة                        | التغطية المستهدفة |
| ------------------- | ----------------------------- | ----------------- |
| وحدة (Unit)         | Vitest + Testing Library      | ≥70%              |
| تكامل (Integration) | Vitest + Supertest            | ≥80%              |
| E2E                 | Playwright                    | التدفقات الحرجة   |
| بصري (Visual)       | Playwright `toHaveScreenshot` | المكونات الرئيسية |
| أداء (Performance)  | Lighthouse CI                 | budgets.json      |

## 2. أولويات الاختبار (Phase 1)

### P1 — إلزامي (يجب أن ينجح قبل الإطلاق)

- [ ] اختبار رفع ملف PDF → 200 OK
- [ ] اختبار رفع ملف تالف → 422 خطأ مناسب
- [ ] اختبار تحويل المستند → status completed
- [ ] اختبار البحث عن نص في وثيقة → نتائج صحيحة
- [ ] اختبار تصدير Markdown → ملف صحيح التنسيق
- [ ] اختبار تسجيل مستخدم جديد → إنشاء حساب
- [ ] اختبار جلسة مستخدم → إعادة التوجيه للوحة التحكم

### P2 — مهم (خلال Phase 1)

- [ ] اختبار تفعيل PWA → service worker + manifest
- [ ] اختبار RTL للواجهة → اتجاه صحيح
- [ ] اختبار حدود حجم الملف → رفض الملفات الكبيرة
- [ ] اختبار تحويل متزامن (مستندان في وقت واحد)
- [ ] اختبار SSL/TLS → اتصال آمن

### P3 — ثانوي (ما بعد MVP)

- [ ] اختبار تحمّل 50 مستخدماً متزامناً
- [ ] اختبار استرداد DB بعد فشل
- [ ] اختبار أمني (XSS, CSRF, SQL injection)
- [ ] اختبار SVG للشعار في كل السياقات

## 3. هيكل الملفات

```
testing/
├── unit/
│   ├── utils/
│   │   └── format.test.ts
│   ├── components/
│   │   ├── Button.test.tsx
│   │   └── FileUpload.test.tsx
│   └── hooks/
│       └── useConversion.test.ts
├── integration/
│   ├── api/
│   │   ├── documents.test.ts
│   │   └── auth.test.ts
│   └── db/
│       └── document.test.ts
├── e2e/
│   ├── specs/
│   │   ├── upload.spec.ts
│   │   ├── conversion.spec.ts
│   │   └── search.spec.ts
│   ├── fixtures/
│   │   └── sample.pdf
│   └── pages/
│       ├── LoginPage.ts
│       └── DashboardPage.ts
├── visual/
│   └── specs/
│       └── brand.spec.ts
└── performance/
    └── budgets.json
```

## 4. سير العمل في CI/CD

```
push/PR →
  ├── pnpm lint          ← ESLint (5s)
  ├── pnpm typecheck     ← TypeScript (10s)
  ├── pnpm test:unit     ← Vitest unit (30s)
  ├── pnpm test:int      ← Vitest integration + DB (60s)
  ├── pnpm test:e2e      ← Playwright + sharding (3min)
  └── pnpm test:visual   ← Playwright screenshots (2min)
```

## 5. Playwright E2E — السيناريوهات الحرجة

| السيناريو        | Given              | When                 | Then              |
| ---------------- | ------------------ | -------------------- | ----------------- |
| رفع وتحويل PDF   | مستخدم مسجل الدخول | يرفع PDF ويضغط تحويل | يرى النص المستخرج |
| فشل الملف التالف | مستخدم مسجل الدخول | يرفف ملف غير PDF     | يرى رسالة خطأ     |
| بحث              | وثيقة بنص مخرّج    | يبحث عن كلمة         | يرى نتائج مطابقة  |
| تصدير            | وثيقة مكتملة       | يضغط تصدير Markdown  | يتم تنزيل الملف   |

## 6. Vitest — إعدادات

```typescript
// vitest.config.ts (موجود — يحتاج تحديث)
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom", // للمكونات
    setupFiles: ["./testing/setup.ts"],
    coverage: {
      provider: "istanbul",
      reporter: ["text", "json", "html"],
      thresholds: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70,
      },
    },
  },
});
```
