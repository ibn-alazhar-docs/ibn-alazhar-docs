# HF Runbook (T041) — نشر يدوي بأسرار

> لا يُنشر تلقائيًا. هذه خطوات يدوية بالأسرار فقط.

## 1. المتغيرات (HF Space Secrets)

- `DATABASE_URL` (Neon)
- `DATABASE_URL_DIRECT` (Neon)
- `REDIS_URL` (Upstash `rediss://...:6380`)
- `AUTH_SECRET` (32+ حرفًا عشوائيًا)
- `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` (R2)
- `APP_URL` (رابط الـSpace الحالي)

## 2. البناء

```
pnpm check
pnpm --filter @ibn-al-azhar-docs/web build
```

## 3. الدفع (HF Spaces)

- `Hardware: CPU Basic` ثم `CPU Upgrade` (اختياري `8vCPU + 32GB` عند $0.03/hr).
- `OS: Docker` من `infrastructure/hf/Dockerfile` (`PORT 7860`).
- الصورة تستخدم `QUEUE_DRIVER=pg` بـ env فقط (لا تعديل prod).

## 4.Smoke (بعد الإقلاع)

```bash
curl -fsS http://localhost:7860/api/health/ready
# يتوقع: { "status": "healthy" }
```

- إن غاب `DATABASE_URL` فإنها تتخطى الترحيل بصمت — عالجها أولًا.

## 5. قائمة إقلاع لاحقة

- `NEXT_PUBLIC_SITE_URL` و`ADMIN_EMAIL/PASSWORD` و`PROMETHEUS_BEARER_TOKEN` (مطلوبة فيCompose، أعد تعيينها في HF Secrets).
