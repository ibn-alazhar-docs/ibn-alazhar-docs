# النشر على الاستضافة NoVisa — Ibn Al-Azhar Docs

> **الحالة: مجهَّز ولم يُنشر بعد.** الإعدادات الحالية (`wrangler.jsonc`) جاهزة، لكن
> **لا تنشر (`wrangler deploy` / `pnpm run deploy`) إلا بإذن صريح من ابد.**

## 1. ما معنى NoVisa؟

الاستضافة بدون فيزا: حسابات بالإيميل فقط، بدون بطاقة ائتمانية وبدون هاتف، على
الخطط المجانية. هذا هو الدليل الرسمي للاستضافة في `docs/MERGE_PLAN.md` (قسم
«Hosting — توصية نهائية (no-visa)») و`docs/DEPLOYMENT_PLAN.md`.

| الخدمة | المنصة | التكلفة | لماذا |
| --- | --- | --- | --- |
| Frontend (Next.js عبر OpenNext) | Cloudflare Workers | $0/شهر | Edge، 100K طلب/يوم، بدون هاتف |
| PostgreSQL 16 (قاعدة + قائمة المهام) | Neon | $0/شهر | Serverless، بلا بطاقة، `directUrl` للـ migrations |
| Object Storage | Cloudflare R2 | $0/شهر | 10GB مجانًا، zero egress |

**المجموع: $0/شهر — بدون فيزا، بدون هاتف.**

## 2. البنية

```
Web (Next.js عبر OpenNext) على Cloudflare Workers
        │
        ├── Neon (PostgreSQL) ── قاعدة البيانات + قائمة المهام (QUEUE_DRIVER=pg)
        │
        └── R2 (ibnalazhardocs) ── ملفات الرفع والمخرجات
```

**لماذا `QUEUE_DRIVER=pg`؟** لأن Workers لا تشغّل Node.js دائمًا ولا Redis
خارجيًا. الوضع `pg` يجعل PostgreSQL هي القائمة، والكود الحالي يتجاهل Redis
تلقائيًا في هذا الوضع:

- `apps/web/src/app/api/health/route.ts` — يتخطّى فحص Redis عند `QUEUE_DRIVER=pg`
- `apps/web/src/clients/redis/rate-limit/redis.ts` — يُرجع `null` (بدون
  انتظار timeout) في وضع `pg`
- `packages/pipeline/src/queue/validate-config.ts` — يفرض وجود
  `DATABASE_URL` و `DATABASE_URL_DIRECT` مع `QUEUE_DRIVER=pg`

النتيجة: **لا حاجة لـ Upstash Redis** في هذا الإعداد.

> **قيد معروف:** Workers free tier يحدّ CPU بـ ~10ms لكل طلب. الـ OCR السحابي
> (Gemini) يناسب هذا القيد، أمّا Tesseract المحلي فلا. لذلك الوضع الإنتاجي
> يستخدم `OCR_PROVIDER=gemini` (راجع `docs/OCR_CONFIGURATION.md`).

## 3. الإعدادات الحالية في `wrangler.jsonc`

```jsonc
{
  "name": "ibnalazhardocs",
  "main": ".open-next/worker.js",
  "compatibility_date": "2026-06-30",
  "compatibility_flags": ["nodejs_compat"],
  "assets": { "directory": ".open-next/assets", "binding": "ASSETS" },
  "r2_buckets": [
    { "binding": "R2_BUCKET", "bucket_name": "ibnalazhardocs" }
  ],
  "vars": {
    "QUEUE_DRIVER": "pg",
    "STORAGE_DRIVER": "s3",
    "NODE_ENV": "production"
  }
}
```

### ملاحظات مهمة

| العنصر | القيمة | السبب |
| --- | --- | --- |
| `r2_buckets` / `R2_BUCKET` | `ibnalazhardocs` | الوصول الأصلي (native) إلى R2 من داخل Workers |
| `QUEUE_DRIVER=pg` | PostgreSQL للقائمة | بدون Redis خارجي |
| `STORAGE_DRIVER=s3` | تخزين S3-compatible | `packages/pipeline/src/config/storage.ts` يختار درايفر `s3` فقط عند هذه القيمة؛ بدونها يعود إلى `local` (غير دائم على Workers) |
| `NODE_ENV=production` | — | يفعّل فحوصات الإنتاج (مثلًا اشتراط مفاتيح S3) |

> **دقيقتان عن R2 في هذا المشروع:** الكود الحالي لا يقرأ الـ binding مباشرةً؛
> هو يتحدث إلى R2 عبر S3-compatible API باستخدام متغيرات `S3_*` (انظر
> `packages/pipeline/src/config/storage.ts`). الـ binding في `wrangler.jsonc`
> جاهز للوصول الأصلي مستقبلًا، لكن الوصول الفعلي حاليًا يتم عبر secrets
> في القسم التالي.

## 4. الحسابات المطلوبة (إيميل فقط، بدون فيزا)

1. **Cloudflare** — https://dash.cloudflare.com — حساب مجاني، تفعيل بالإيميل فقط
2. **Neon** — https://neon.tech — PostgreSQL مجاني بلا بطاقة
3. **Google Cloud** — https://console.cloud.google.com — OAuth + Gemini مجانًا
   (مطلوب لتسجيل الدخول والـ OCR)

## 5. خطوات التحضير (بدون نشر)

### 5.1 إنشاء R2 bucket وتوكن

1. Cloudflare Dashboard → R2 → Create bucket → الاسم: `ibnalazhardocs`
2. R2 → Manage R2 API Tokens → توكن بصلاحيات `Object Read & Write`
3. انسخ: Access Key ID، Secret Access Key، و الـ Endpoint
   (`https://<account-id>.r2.cloudflarestorage.com`)

### 5.2 إنشاء Neon project

1. neon.tech → مشروع جديد (PostgreSQL 16)
2. انسخ **pooled** connection string → `DATABASE_URL`
3. انسخ **direct** connection string → `DATABASE_URL_DIRECT`
4. شغّل الـ migrations مرة واحدة (من جهازك، ليس على Workers):

```bash
DATABASE_URL="<direct-url>" npx prisma migrate deploy \
  --schema=packages/database/prisma/schema.prisma
```

### 5.3 ضبط secrets على Cloudflare (بدون نشر)

كل الأسرار تُضبط عبر `wrangler secret put` ولا توضع أبدًا في `wrangler.jsonc`:

```bash
npx wrangler login

npx wrangler secret put DATABASE_URL
npx wrangler secret put DATABASE_URL_DIRECT
npx wrangler secret put S3_ENDPOINT
npx wrangler secret put S3_ACCESS_KEY_ID
npx wrangler secret put S3_SECRET_ACCESS_KEY
npx wrangler secret put AUTH_SECRET
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

> القيم غير السرية المرتبطة بالتخزين (`S3_REGION=auto`، `S3_BUCKET=ibnalazhardocs`)
> تُضبط أيضًا كمتغيرات في لوحة تحكم Cloudflare أو تُترك للافتراضات في الكود.

### 5.4 تسجيل Google OAuth

في Google Cloud Console أضف الـ redirect URI التالي كأAuthorized redirect URI:

```
https://ibnalazhardocs.workers.dev/api/auth/callback/google
```

وأضف **test user** (إلا فسيُرفض الدخول بـ `Access blocked`).

## 6. النشر (يتطلب إذن ابد الصريح)

```bash
pnpm run deploy
# = opennextjs-cloudflare build && opennextjs-cloudflare deploy
```

> ⚠️ **لا تنفّذ هذا الأمر بدون إذن ابد.** هذا الدليل يوثّق التحضير فقط.

## 7. التحقق بعد النشر

```bash
# يجب أن يرجع healthy
curl https://ibnalazhardocs.workers.dev/api/health

# يجب أن يرجع 401 (بدون جلسة) — ليس 500
curl https://ibnalazhardocs.workers.dev/api/documents

# فحص readiness
curl https://ibnalazhardocs.workers.dev/api/health/ready
```

- `/` → 307 (تحويل لتسجيل الدخول)
- `/api/health` → 200 مع `database: ok` (و`redis: ok` لأن فحص Redis يُتخطّى في وضع `pg`)
- رفع PDF → يظهر في `/api/documents` → يتقدّم الـ OCR (Gemini) → تصدير يعمل
  (md/txt/json/docx)

## 8. التراجع (Rollback)

```bash
npx wrangler rollback        # لأحدث نسخة سابقة
```

## 9. بديل HF Spaces

الخطة السابقة كانت HF Spaces + Docker. حسب `docs/MERGE_PLAN.md`، لم يعد
HF Spaces Docker مجانيًا بدون فيزا (يحتاج PRO مدفوع + تخزين $5)، لذلك هو
**احتياطي فقط** وليس المسار الرئيسي. راجع `docs/deployment/HF_DEPLOYMENT_GUIDE.md`
إذا لزم الرجوع إليه.

## 10. checklist قبل النشر

- [ ] R2 bucket `ibnalazhardocs` موجود + توكن Read & Write
- [ ] Neon project موجود + migrations مطبّقة (`DATABASE_URL_DIRECT`)
- [ ] كل الـ secrets في القسم 5.3 مضبوطة
- [ ] Google OAuth redirect URI + test user
- [ ] **إذن النشر الصريح من ابد** ⬅️ شرط إلزامي
