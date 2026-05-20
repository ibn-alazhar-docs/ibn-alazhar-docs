# قائمة تنفيذ Phase 1 — Ibn Al-Azhar Docs

> تاريخ: 2025-03-05 | حالة: جاهز للتنفيذ

---

## قبل كتابة أي كود

| # | العنصر | القيمة المطلوبة | تم؟ |
|---|--------|----------------|------|
| 1 | Repository name | `ibn-al-azhar-docs` | ⬜ |
| 2 | Package manager | `pnpm` (أو npm إذا تم الاتفاق) | ⬜ |
| 3 | Node version | 20 LTS (أو 22 LTS) | ⬜ |
| 4 | Git branch protection | main محمي، يتطلب PR + CI | ⬜ |

## متغيرات البيئة المطلوبة

```env
# Database
DATABASE_URL=postgresql://ibn_al_azhar_docs:dev_password@localhost:5432/ibn_al_azhar_docs

# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

# Redis
REDIS_URL=redis://localhost:6379

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET=ibn-al-azhar-docs-files

# File Upload
MAX_UPLOAD_SIZE_MB=100

# Admin Seed
ADMIN_EMAIL=admin@ibn-al-azhar-docs.local
ADMIN_PASSWORD=change-me-on-first-login
```

## أوامر Docker الأساسية

```bash
# تشغيل خدمات التطوير
docker compose -f docker-compose.dev.yml up -d

# التحقق من حالة الخدمات
docker compose -f docker-compose.dev.yml ps

# إنشاء قاعدة البيانات
npx prisma migrate dev --name init

# ملء البيانات الأولية
npx prisma db seed
```

## أوامر التطوير

```bash
# تثبيت التبعيات
pnpm install

# تشغيل الخادم المحلي
pnpm dev

# فحص الكود
pnpm lint

# اختبارات الوحدة
pnpm test

# بناء الإنتاج
pnpm build
```

## معايير النجاح لـ Phase 1

| # | المعيار | طريقة التحقق |
|---|--------|-------------|
| 1 | `docker compose up` يُشغّل PostgreSQL + Redis + MinIO | `docker compose ps` |
| 2 | `pnpm dev` يُشغّل الخادم على localhost:3000 | فتح المتصفح |
| 3 | إنشاء حساب جديد يعمل | E2E يدوي |
| 4 | تسجيل الدخول يعمل | E2E يدوي |
| 5 | الواجهة بالعربية RTL | فحص بصري |
| 6 | تبديل اللغة يعمل | اختبار يدوي |
| 7 | Dashboard layout يعرض Sidebar + Header | فحص بصري |
| 8 | CI pipeline ينجح | فحص GitHub Actions |
| 9 | 5+ اختبارات وحدة تنجح | `pnpm test` |

## عناصر محظورة

| ❌ لا تفعل | السبب |
|-----------|-------|
| لا تبنِ OCR pipeline | Phase 3 |
| لا تبنِ Upload كامل | Phase 2 |
| لا تبنِ Admin dashboard | Phase 5 |
| لا تبنِ Search | Phase 3 |
| لا تبنِ Sharing | Phase 4 |
| لا تبنِ Full offline PWA | Phase 5 |
| لا تضف Dark Mode | Post-MVP |
| لا تستخدم Jest | Vitest فقط |

## عناصر محجوبة (Blockers)

| إذا واجهت... | الحل |
|--------------|------|
| next-auth v5 لا يعمل مع Prisma Adapter | تحقق من @auth/prisma-adapter الإصدار المتوافق |
| shadcn/ui لا يدعم RTL | استخدم logical properties + dir=rtl |
| MinIO bucket لا يُنشأ | تحقق من minio-setup container logs |
| Prisma migrate يفشل | تحقق من DATABASE_URL في .env |

## أول 10 خطوات للتنفيذ

1. إنشاء مستودع GitHub: `ibn-al-azhar-docs`
2. تهيئة Next.js 16: `npx create-next-app@latest . --typescript --tailwind --app --src-dir`
3. تثبيت التبعيات: `pnpm add next-auth@beta @auth/prisma-adapter prisma @prisma/client zod next-intl zustand immer`
4. إنشاء docker-compose.dev.yml مع PostgreSQL + Redis + MinIO
5. إعداد Prisma: `npx prisma init` ثم كتابة الـ schema الأساسي
6. تشغيل Docker: `docker compose -f docker-compose.dev.yml up -d`
7. تنفيذ أول migration: `npx prisma migrate dev --name init`
8. إعداد NextAuth.js v5 مع Credentials provider
9. إعداد next-intl مع ar.json + en.json
10. إنشاء أول commit + push + التحقق من CI
