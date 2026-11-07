# قرار الاستضافة — HOSTING_DECISION

التاريخ: 2026-11-07 · الحالة: قرار موثّق جاهز للنشر اليدوي · المرجع التفصيلي: `docs/deployment/HF_DEPLOYMENT_GUIDE.md`

> **صراحة: هذه وثيقة قرار وخطوات نشر — ليست إعلانًا عن نشر فعلي.**
> لم يُنشر أي شيء من هذه الخطة؛ ولا يُدَّعى هنا أن أي بيئة إنتاجية تعمل. النشر يحدث فقط عندما يُنفَّذ قسم «خطوات النشر» يدويًا على HF Spaces والخدمات الخارجية.

## 1. القرار

| الطبقة        | الاختيار                              | الوظيفة                                          |
| ------------- | ------------------------------------- | ------------------------------------------------ |
| الاستضافة     | **HF Spaces (Docker)**                | الحاوية الواحدة: Next.js (7860) + workers + MinIO |
| قاعدة البيانات | **Neon (Postgres)**                   | البيانات + طابور PG عند `QUEUE_DRIVER=pg`        |
| الطابور الاحتياطي | **Upstash (Redis)**                 | BullMQ عند `QUEUE_DRIVER=redis` (افتراضي الويب)  |
| التخزين        | **Cloudflare R2** (الافتراضي خارجيًا) أو MinIO داخل الحاوية | ملفات s3-compatible — 10GB وصفر egress على R2 |
| بديل الواجهة فقط | **Cloudflare Pages / Workers Assets** | تقديم الواجهة/الأصول الساكنة فقط — لا يستبدل HF Spaces للتطبيق (**للرابط/الواجهة فقط**) |

الهندسة المقصودة لـ HF Spaces: صورة واحدة (`infrastructure/hf/Dockerfile`) تعمل `Next.js` على `PORT=7860` و`OCR Worker` و`Export Worker` وMinIO الاختياري (داخلي/محلي) مع خدمات Neon + Upstash خارجية عبر env.

## 2. QUEUE_DRIVER (قرار سلامة)

- `packages/pipeline/src/queue/driver.ts` افتراضيًا `QUEUE_DRIVER=redis` (Upstash/BullMQ).
- صورة HF تستخدم `QUEUE_DRIVER=pg` لأن الحاوية لا تشغّل Redis (Neon هو الطابور هناك — `infrastructure/hf/Dockerfile`).
- لا dual-write: وضع PG لا يفتح اتصال Redis/BullMQ إطلاقًا.
- لا تُعدَّل `QUEUE_DRIVER` في prod/runtime config أو Dockerfile أو supervisord خارج صورة HF.
- القيمة الموجودة في `wrangler.jsonc` (`"QUEUE_DRIVER": "pg"`) **تخالف** هذا القرار — انظر تعليق النزاهة داخل الملف نفسه؛ هي ملاحظة مراجعة لا تصويت استضافة.

## 3. قائمة Secrets (HF Spaces → Variables and Secrets)

لا توضع أي قيمة سرّية في هذا المستودع — تُنقل قيمة كل متغير من لوحات الخدمات إلى HF Spaces فقط.

| المتغير                    | النوع   | المصدر                                    |
| -------------------------- | ------- | ------------------------------------------ |
| `DATABASE_URL`             | Variable | Neon (pooled)                              |
| `DATABASE_URL_DIRECT`      | Variable | Neon (direct — للمايجريت)                  |
| `AUTH_SECRET`              | Secret   | `openssl rand -base64 64`                  |
| `AUTH_URL`                 | Variable | عنوان Space العام `https://<space>.hf.space` (مثال: `https://ibn-alazhar.hf.space`) |
| `NEXT_PUBLIC_SITE_URL`     | Variable | نفس URL العام (قاعدة روابط/sitemap/OG)    |
| `ADMIN_EMAIL`              | Variable | بريد مسؤول                                 |
| `ADMIN_PASSWORD`           | Secret   | كلمة مرور قوية                            |
| `PROMETHEUS_BEARER_TOKEN`  | Secret   | توكن القياس (`/api/metrics/prometheus`)    |
| `REDIS_URL`                | Variable | Upstash (عند وضع Redis)                   |
| `S3_ACCESS_KEY_ID`         | Secret   | R2 أو MinIO                                |
| `S3_SECRET_ACCESS_KEY`     | Secret   | R2 أو MinIO                                |
| `S3_ENDPOINT`              | Variable | R2 `https://<account-id>.r2.cloudflarestorage.com` أو `http://localhost:9000` |
| `S3_BUCKET`                | Variable | اسم bucket                                |
| `S3_REGION`                | Variable | `us-east-1` (MinIO) أو `auto` (R2)         |
| `GOOGLE_CLIENT_ID`         | Variable | اختياري (OAuth)                            |
| `GOOGLE_CLIENT_SECRET`     | Secret   | اختياري (OAuth)                            |

المزيد من التنسيق والتجاوزات الناتجة: `docs/deployment/HF_DEPLOYMENT_GUIDE.md`.

## 4. خطوات النشر (يدوية — لم تُنفَّذ هنا)

1. Neon: أنشئ مشروعًا مجانيًا، ثم نفّذ `pnpm db:migrate` عبر `DATABASE_URL_DIRECT`.
2. Upstash (اختياري): أنشئ قاعدة Redis واحفظ `REDIS_URL`.
3. R2 (اختياري): أنشئ bucket واحفظ مفاتيح `S3_*` مع endpoint R2.
4. HF Spaces: أنشئ Space بـ SDK **Docker** على Hardware 2vCPU + 16GB RAM، ثم ارسم الملفات عبر `./scripts/sync-hf-space.sh --push` كما في `infrastructure/hf/README.md` (أو عبر Git يدويًا).
5. HF Spaces → Settings → Variables and Secrets: الصق متغيرات §3 (لا ملفات `.env` في المستودع أبدًا).
6. انتظار البناء تلقائيًا، ثم افحص `GET /api/health/ready` ومنفذ `PORT=7860` (انظر قسم «فحص الإقلاع» في `infrastructure/hf/README.md`).
7. سجّل الدخول بمسؤول (`ADMIN_EMAIL`/`ADMIN_PASSWORD`)، وارفع PDF تجريبيًا وتحقق من OCR.

> **لم يُنشر أي شيء بعد.** أي ادعاء بوجود نشر فعلي يتطلب خطوة 6 الناجحة على HF Spaces.
