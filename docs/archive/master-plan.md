# خطة التنفيذ الشاملة — Ibn Al-Azhar Docs

**التاريخ**: 2026-07-04  
**المدة المتوقعة**: 30-45 يوم عمل  
**الأولوية**: حسب طبقات L7-L9

---

## ملخص خطة التنفيذ

| الطبقات | الوصف                                                                             | المدة     | الأولوية |
| ------- | --------------------------------------------------------------------------------- | --------- | -------- |
| L1-L6   | مكتملة (Security → Observability → Testing → Analysis → Infra → Test Enhancement) | ✅ مكتمل  | —        |
| L7      | الميزات المفقودة (Email, Server State, Charts)                                    | 10-15 يوم | P0       |
| L8      | تحسينات الأداء (Bundle, Lighthouse CI)                                            | 5-7 يوم   | P1       |
| L9      | النشر والتفعيل (Cloudflare, Production)                                           | 10-15 يوم | P0       |

---

## المرحلة 7: الميزات المفقودة (P0 — عاجل)

### 7.1 إدارة حالة الخادم (Server State)

**المدة**: 3-5 أيام  
**الأداة**: React Query (TanStack Query v5)

**الأوامر**:

```bash
# التثبيت
pnpm --filter=ibnalazhar-web add @tanstack/react-query @tanstack/react-query-devtools

# أو
pnpm add -D -w @tanstack/react-query @tanstack/react-query-devtools
```

**ملفات التعديل**:

1. `apps/web/src/app/layout.tsx` — إضافة `QueryClientProvider`
2. `apps/web/src/app/dashboard/page.tsx` — استخدام `useQuery` بدلاً من `useEffect + fetch`
3. `apps/web/src/app/dashboard/files/page.tsx` — استخدام `useQuery`
4. `apps/web/src/app/dashboard/analytics/page.tsx` — استخدام `useQuery`

**التحقق**:

```bash
pnpm --filter=ibnalazhar-web typecheck
pnpm --filter=ibnalazhar-web test
```

---

### 7.2 إرسال الإيميل (Email Service)

**المدة**: 3-5 أيام  
**الأداة**: Resend + React Email

**الأوامر**:

```bash
# التثبيت
pnpm add -w resend @react-email/components @react-email/render
```

**ملفات الإنشاء**:

1. `apps/web/src/lib/email/client.ts` — إعداد Resend client
2. `apps/web/src/lib/email/templates/verification.tsx` — قالب التحقق
3. `apps/web/src/lib/email/templates/reset-password.tsx` — قالب إعادة تعيين كلمة المرور
4. `apps/web/src/lib/email/templates/welcome.tsx` — قالب الترحيب
5. `apps/web/src/lib/email/send.ts` — دوال الإرسال

**ملفات التعديل**:

1. `apps/web/src/lib/auth/next-auth.ts` — إضافة `sendVerificationEmail`
2. `apps/web/src/app/api/auth/forgot-password/route.ts` — إرسال إيميل إعادة التعيين
3. `.env` — إضافة `RESEND_API_KEY=re_...`

**التحقق**:

```bash
pnpm --filter=ibnalazhar-web typecheck
pnpm --filter=ibnalazhar-web test
```

---

### 7.3 الرسوم البيانية (Charts)

**المدة**: 2-3 أيام  
**الأداة**: Recharts (مجاني بالكامل)

**الأوامر**:

```bash
# التثبيت
pnpm add -w recharts
```

**ملفات التعديل**:

1. `apps/web/src/app/dashboard/analytics/page.tsx` — إضافة رسوم بيانية
2. `apps/web/src/app/dashboard/analytics/page.tsx` — إضافة LineChart للمستخدمين
3. `apps/web/src/app/dashboard/analytics/page.tsx` — إضافة PieChart للوثائق

**التحقق**:

```bash
pnpm --filter=ibnalazhar-web typecheck
pnpm --filter=ibnalazhar-web test
```

---

## المرحلة 8: تحسينات الأداء (P1 — مهم)

### 8.1 تحسين Bundle Size

**المدة**: 3-4 أيام

**التحسينات**:

```typescript
// 1. Dynamic imports للمكتبات الثقيلة
// apps/web/src/app/dashboard/page.tsx
const DashboardPage = dynamic(() => import('./DashboardContent'), { loading: () => <Skeleton /> })

// 2. Code splitting
// apps/web/src/app/dashboard/analytics/page.tsx
const AnalyticsContent = dynamic(() => import('./AnalyticsContent'), { ssr: false })

// 3. Tree shaking — تحقق من next.config.ts
// transpilePackages: ['@ibn-al-azhar-docs/database']
```

**التحقق**:

```bash
# قياس Bundle
ANALYZE=true pnpm --filter=ibnalazhar-web build --webpack

# مقارنة قبل/بعد
ls -lh .next/static/chunks/
```

---

### 8.2 إعداد Lighthouse CI

**المدة**: 2-3 أيام

**ملفات الإنشاء**:

1. `.lighthouserc.json` — إعدادات Lighthouse
2. `.github/workflows/lighthouse.yml` — CI workflow

**التحقق**:

```bash
# تشغيل Lighthouse يدوياً
npx lighthouse http://localhost:3000 --output=json --output-path=./reports/lighthouse.json

# تشغيل عبر CI
npx @lhci/cli autorun
```

---

## المرحلة 9: النشر والتفعيل (P0 — عاجل)

### 9.1 نشر Cloudflare Workers

**المدة**: 5-7 أيام

**الأوامر**:

```bash
# تثبيت CLI
pnpm add -w wrangler

# إعداد Cloudflare
npx wrangler login
npx wrangler pages project create ibn-al-azhar-docs

# بناء
pnpm --filter=ibnalazhar-web build

# نشر
npx wrangler pages deploy .vercel/output/static --project-name=ibn-al-azhar-docs
```

**ملفات التعديل**:

1. `open-next.config.ts` — التأكد من الإعدادات الصحيحة
2. `wrangler.toml` — إعدادات Cloudflare
3. `.env.production` — متغيرات البيئة

---

### 9.2 إعداد PostgreSQL منفصل (للإنتاج)

**المدة**: 2-3 أيام

**الخيارات**:

| الخيار       | التكلفة       | المميزات                 |
| ------------ | ------------- | ------------------------ |
| **Neon**     | مجاني (512MB) | Serverless, auto-scaling |
| **Supabase** | مجاني (500MB) | + Auth + Storage         |
| **Railway**  | $5/شهر        | PostgreSQL + Redis       |

**الأوامر** (Neon):

```bash
# إنشاء مشروع على neon.tech
# نسخ DATABASE_URL
# تحديث .env.production
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require"
```

---

### 9.3 إعداد Redis منفصل (للإنتاج)

**المدة**: 1-2 أيام

**الخيارات**:

| الخيار          | التكلفة              | المميزات                |
| --------------- | -------------------- | ----------------------- |
| **Upstash**     | مجاني (10K cmds/يوم) | Serverless, pay-per-use |
| **Redis Cloud** | مجاني (30MB)         | Managed                 |

**الأوامر** (Upstash):

```bash
# إنشاء مشروع على upstash.com
# نسخ REDIS_URL
# تحديث .env.production
REDIS_URL="redis://default:xxx@redis-xxx.upstash.io:6379"
```

---

### 9.4 إعداد التخزين (R2)

**المدة**: 1-2 أيام

**الأوامر**:

```bash
# إنشاء bucket على R2
npx wrangler r2 bucket create ibn-al-azhar-docs-storage

# إنشاء API token
# تحديث .env.production
S3_ENDPOINT="https://xxx.r2.cloudflarestorage.com"
S3_BUCKET="ibn-al-azhar-docs-storage"
AWS_ACCESS_KEY_ID="xxx"
AWS_SECRET_ACCESS_KEY="xxx"
```

---

## جدول التنفيذ التفصيلي

### الأسبوع 1-2: الميزات المفقودة

| اليوم | المهمة                                | المخرجات                 |
| ----- | ------------------------------------- | ------------------------ |
| 1-2   | React Query setup + Provider          | QueryClientProvider نشط  |
| 3-4   | تحويل Dashboard إلى React Query       | useQuery في جميع الصفحات |
| 5-6   | Resend + Email templates              | 3 قوالب جاهزة            |
| 7-8   | Auth integration (email verification) | التحقق من الإيميل نشط    |
| 9-10  | Recharts setup + Dashboard charts     | رسوم بيانية تفاعلية      |

### الأسبوع 3-4: تحسينات الأداء

| اليوم | المهمة                           | المخرجات                    |
| ----- | -------------------------------- | --------------------------- |
| 11-12 | Dynamic imports + Code splitting | Bundle < 200KB              |
| 13-14 | Lighthouse CI setup              | CI يتحقق من Core Web Vitals |
| 15-16 | Performance optimization         | Lighthouse > 90             |

### الأسبوع 5-6: النشر والتفعيل

| اليوم | المهمة                      | المخرجات                |
| ----- | --------------------------- | ----------------------- |
| 17-18 | Cloudflare Workers setup    | النشر على Cloudflare    |
| 19-20 | Neon PostgreSQL setup       | قاعدة بيانات منفصلة     |
| 21-22 | Upstash Redis setup         | Redis منفصل             |
| 23-24 | R2 Storage setup            | تخزين سحابي             |
| 25-26 | Integration testing on prod | اختبارات الإنتاج        |
| 27-28 | DNS + SSL + Final testing   | الموقع نشط على الإنترنت |

---

## أوامر التنفيذ الجاهزة

### 1. تثبيت المكتبات

```bash
# إدارة حالة الخادم
pnpm add -D -w @tanstack/react-query @tanstack/react-query-devtools

# إرسال الإيميل
pnpm add -w resend @react-email/components @react-email/render

# الرسوم البيانية
pnpm add -w recharts

# Cloudflare
pnpm add -w wrangler

# Lighthouse CI
pnpm add -D -w @lhci/cli
```

### 2. التحقق من الكود

```bash
# TypeScript
pnpm --filter=ibnalazhar-web typecheck

# ESLint
pnpm lint

# اختبارات الوحدة
pnpm test

# اختبارات API
pnpm --filter=ibnalazhar-web test:api

# اختبارات E2E
npx playwright test
```

### 3. البناء والنشر

```bash
# بناء التطبيقات
pnpm --filter=ibnalazhar-web build

# بناء العمال
pnpm --filter=@ibn-al-azhar-docs/ocr-worker build
pnpm --filter=@ibn-al-azhar-docs/export-worker build

# بناء Docker
docker compose -f docker-compose.yml build

# نشر على Cloudflare
npx wrangler pages deploy .vercel/output/static --project-name=ibn-al-azhar-docs
```

### 4. مراقبة الإنتاج

```bash
# تشغيل Lighthouse
npx lighthouse http://localhost:3000 --output=json --output-path=./reports/lighthouse-prod.json

# مراقبة الأداء
curl http://localhost:3000/api/actuator/metrics | jq .

# فحص الحالة الصحية
curl http://localhost:3000/api/health | jq .
```

---

## معايير النجاح

| المعيار              | الهدف              | طريقة القياس                  |
| -------------------- | ------------------ | ----------------------------- |
| **الميزات المفقودة** | 0 ثغرات حرجة       | L7 مكتمل                      |
| **Bundle size**      | < 200KB            | `ls -lh .next/static/chunks/` |
| **Lighthouse**       | > 90               | `npx lighthouse`              |
| **الاختبارات**       | > 99% pass         | `pnpm test`                   |
| **الأمان**           | 0 ثغرات            | `pnpm test:security`          |
| **النشر**            | نشط على Cloudflare | `curl https://ibnalazhar.app` |
| **الأداء**           | TTFB < 200ms       | Lighthouse                    |

---

## المخاطر والتحجج

| المخاطرة                 | الاحتمال | التأثير        | التخفيف         |
| ------------------------ | -------- | -------------- | --------------- |
| Cloudflare Worker limits | متوسط    | بطيء           | استخدام R2 + KV |
| Neon DB limits           | منخفض    | فقدان بيانات   | Upstash backup  |
| Email delivery issues    | منخفض    | لا يمكن التحقق | Resend webhooks |
| Bundle size increase     | متوسط    | بطيء           | Dynamic imports |

---

_خطة التنفيذ الشاملة — 2026-07-04_
