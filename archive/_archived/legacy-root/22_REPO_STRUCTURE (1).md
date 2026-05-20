# ابن الأزهر دوكس — هيكل المستودع | Ibn Al-Azhar Docs — Repository Structure

> **التصنيف:** مرجعي — دليل شامل لهيكل المستودع وحدود الوحدات
> **الإصدار:** 4.1.0 | آخر تحديث: 2025-03-05
> **المرتبط:** أنظر `05_TECHNICAL_DESIGN.md` للبنية التقنية، `21_CONTRIBUTING.md` لاصطلاحات الكود

---

## جدول المحتويات

1. [نظرة عامة](#نظرة-عامة)
2. [الشجرة الكاملة للمستودع](#الشجرة-الكاملة-للمستودع)
3. [وصف المجلدات والملفات الرئيسية](#وصف-المجلدات-والملفات-الرئيسية)
4. [ملفات الإعداد الرئيسية](#ملفات-الإعداد-الرئيسية)
5. [حدود الوحدات وقواعد الاعتماد](#حدود-الوحدات-وقواعد-الاعتماد)
6. [اصطلاحات الاستيراد](#اصطلاحات-الاستيراد)
7. [مخرجات البناء](#مخرجات-البناء)
8. [هيكل ملفات Docker](#هيكل-ملفات-docker)

---

## نظرة عامة

يتبع مشروع ابن الأزهر دوكس (Ibn Al-Azhar Docs) نمط **Monorepo** مُدارًا عبر **pnpm workspaces فقط** (بدون Turborepo). يتكون المستودع من تطبيقين (apps) وحزمتين مشتركتين (packages)، بالإضافة إلى مجلدات مخصصة لقاعدة البيانات (prisma)، الحاويات (docker)، التوثيق (docs)، والاختبارات (tests).

### مبادئ التصميم

| المبدأ | الشرح |
|--------|-------|
| **الفصل حسب المسؤولية** | كل حزمة لها مسؤولية واحدة واضحة |
| **مشاركة الأنواع** | الأنواع والثوابت في `packages/shared` لمنع التكرار |
| **استقلالية النشر** | كل تطبيق يمكن بناؤه ونشره بشكل مستقل |
| **اتجاه الاعتماد** | أحادي الاتجاه: apps → packages → لا شيء |
| **توحيد الإعداد** | إعدادات مشتركة في الجذر، إعدادات خاصة في كل حزمة |

---

## الشجرة الكاملة للمستودع

```
ibn-al-azhar-docs/
│
├── .github/                              # إعداد GitHub
│   └── workflows/
│       ├── ci-cd.yml                     # خط أنابيب CI/CD الرئيسي
│       ├── release.yml                   # أتمتة الإصدارات
│       └── stale.yml                     # إدارة Issues المعلقة
│
├── apps/                                 # التطبيقات
│   ├── web/                              # تطبيق Next.js 16 PWA
│   │   ├── app/                          # App Router — الصفحات وAPI Routes
│   │   │   ├── [locale]/                 # مقطع اللغة الديناميكي (ar, en)
│   │   │   │   ├── layout.tsx            # التخطيط الجذري (Server Component)
│   │   │   │   ├── page.tsx              # الصفحة الرئيسية
│   │   │   │   ├── not-found.tsx         # صفحة 404
│   │   │   │   ├── (auth)/               # مجموعة مسارات المصادقة
│   │   │   │   │   ├── login/
│   │   │   │   │   │   └── page.tsx      # صفحة تسجيل الدخول
│   │   │   │   │   ├── register/
│   │   │   │   │   │   └── page.tsx      # صفحة إنشاء حساب
│   │   │   │   │   └── forgot-password/
│   │   │   │   │       └── page.tsx      # صفحة استعادة كلمة المرور
│   │   │   │   ├── (dashboard)/          # مجموعة مسارات لوحة التحكم
│   │   │   │   │   ├── layout.tsx        # تخطيط Dashboard مع sidebar
│   │   │   │   │   ├── files/
│   │   │   │   │   │   └── page.tsx      # صفحة إدارة الملفات
│   │   │   │   │   ├── folders/
│   │   │   │   │   │   └── page.tsx      # صفحة إدارة المجلدات
│   │   │   │   │   ├── conversions/
│   │   │   │   │   │   └── page.tsx      # صفحة التحويلات (Conversion/OCR)
│   │   │   │   │   └── settings/
│   │   │   │   │       └── page.tsx      # صفحة الإعدادات
│   │   │   │   ├── admin/                # مسارات المدير
│   │   │   │   │   ├── users/
│   │   │   │   │   │   └── page.tsx      # إدارة المستخدمين
│   │   │   │   │   └── stats/
│   │   │   │   │       └── page.tsx      # إحصائيات النظام
│   │   │   │   └── share/
│   │   │   │       └── [token]/
│   │   │   │           └── page.tsx      # صفحة المشاركة العامة
│   │   │   ├── api/                      # API Routes
│   │   │   │   ├── auth/
│   │   │   │   │   └── [...nextauth]/
│   │   │   │   │       └── route.ts      # نقطة نهاية NextAuth.js v5 (JWT 24h)
│   │   │   │   ├── files/
│   │   │   │   │   ├── upload/
│   │   │   │   │   │   └── route.ts      # رفع ملف
│   │   │   │   │   ├── [id]/
│   │   │   │   │   │   └── route.ts      # قراءة/حذف ملف
│   │   │   │   │   └── route.ts          # قائمة الملفات
│   │   │   │   ├── folders/
│   │   │   │   │   └── route.ts          # إدارة المجلدات
│   │   │   │   ├── conversions/
│   │   │   │   │   ├── route.ts          # إنشاء/قائمة تحويلات (OCR extraction)
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── route.ts      # تفاصيل/إلغاء تحويل
│   │   │   │   │       └── events/
│   │   │   │   │           └── route.ts  # SSE — أحداث التقدّم
│   │   │   │   ├── exports/
│   │   │   │   │   └── [format]/
│   │   │   │   │       └── route.ts      # تصدير (txt/docx/json) — منفصل عن التحويل
│   │   │   │   ├── share/
│   │   │   │   │   └── route.ts          # إنشاء/إدارة روابط المشاركة (64 hex chars token)
│   │   │   │   ├── admin/
│   │   │   │   │   ├── users/
│   │   │   │   │   │   └── route.ts      # إدارة المستخدمين (admin)
│   │   │   │   │   └── stats/
│   │   │   │   │       └── route.ts      # إحصائيات النظام (admin)
│   │   │   │   └── health/
│   │   │   │       └── route.ts          # فحص صحة التطبيق
│   │   │   ├── manifest.ts              # PWA Web App Manifest (ديناميكي)
│   │   │   └── offline/
│   │   │       └── page.tsx              # صفحة العمل دون اتصال
│   │   ├── components/                   # مكوّنات React
│   │   │   ├── ui/                       # مكوّنات shadcn/ui الأساسية
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── dropdown-menu.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   ├── sonner.tsx            # إشعارات Toast
│   │   │   │   ├── table.tsx
│   │   │   │   └── ...                   # مكوّنات shadcn إضافية
│   │   │   ├── auth/                     # مكوّنات المصادقة
│   │   │   │   ├── login-form.tsx
│   │   │   │   ├── register-form.tsx
│   │   │   │   └── auth-provider.tsx
│   │   │   ├── files/                    # مكوّنات إدارة الملفات
│   │   │   │   ├── file-card.tsx
│   │   │   │   ├── file-list.tsx
│   │   │   │   ├── file-uploader.tsx
│   │   │   │   ├── folder-tree.tsx
│   │   │   │   └── storage-quota.tsx
│   │   │   ├── conversions/              # مكوّنات التحويلات (Conversion/OCR)
│   │   │   │   ├── conversion-card.tsx
│   │   │   │   ├── conversion-progress.tsx
│   │   │   │   └── create-conversion-dialog.tsx
│   │   │   ├── exports/                  # مكوّنات التصدير (Export — منفصل عن التحويل)
│   │   │   │   ├── export-dialog.tsx
│   │   │   │   └── export-options.tsx
│   │   │   └── shared/                   # مكوّنات مشتركة
│   │   │       ├── app-shell.tsx
│   │   │       ├── sidebar.tsx
│   │   │       ├── header.tsx
│   │   │       ├── language-switcher.tsx
│   │   │       ├── install-prompt.tsx
│   │   │       └── loading-skeleton.tsx
│   │   ├── lib/                          # وحدات مساعدة
│   │   │   ├── prisma.ts                 # Prisma Client singleton
│   │   │   ├── minio.ts                  # MinIO client + Presigned URLs
│   │   │   ├── redis.ts                  # Redis client + PubSub
│   │   │   ├── auth.ts                   # NextAuth.js v5 إعداد (JWT strategy 24h)
│   │   │   ├── auth-guards.ts            # RBAC guards (requireRole)
│   │   │   ├── api.ts                    # API client (frontend)
│   │   │   ├── error-handler.ts          # معالجة أخطاء مركزية
│   │   │   ├── file-validation.ts        # التحقق من الملفات (100MB max)
│   │   │   ├── text-cleaner.ts           # تنظيف نص OCR
│   │   │   ├── ocr-retry.ts              # إعادة محاولة OCR
│   │   │   └── utils.ts                  # دوال مساعدة عامة (cn, formatDate)
│   │   ├── validators/                   # Zod schemas
│   │   │   ├── auth.ts                   # loginSchema, registerSchema (8 chars + upper + lower + digit)
│   │   │   ├── files.ts                  # fileUploadSchema
│   │   │   ├── conversions.ts            # createConversionSchema
│   │   │   ├── exports.ts                # createExportSchema
│   │   │   ├── folders.ts                # createFolderSchema
│   │   │   └── share.ts                  # createShareLinkSchema (token 64 hex chars)
│   │   ├── services/                     # طبقة منطق الأعمال
│   │   │   ├── file.service.ts           # عمليات الملفات
│   │   │   ├── conversion.service.ts     # عمليات التحويلات (OCR extraction)
│   │   │   ├── export.service.ts         # عمليات التصدير (format generation — منفصل عن التحويل)
│   │   │   ├── folder.service.ts         # عمليات المجلدات
│   │   │   ├── share.service.ts          # عمليات المشاركة
│   │   │   └── admin.service.ts          # عمليات الإدارة
│   │   ├── stores/                       # Zustand stores
│   │   │   ├── auth-store.ts             # حالة المصادقة
│   │   │   ├── files-store.ts            # حالة الملفات
│   │   │   ├── conversions-store.ts      # حالة التحويلات
│   │   │   ├── exports-store.ts          # حالة التصدير
│   │   │   ├── upload-store.ts           # حالة الرفع
│   │   │   └── ui-store.ts              # حالة الواجهة (sidebar, theme)
│   │   ├── hooks/                        # React hooks مخصصة
│   │   │   ├── use-sse.ts               # اتصال SSE
│   │   │   ├── use-files.ts             # جلب وتعديل الملفات
│   │   │   ├── use-conversions.ts       # جلب وتعديل التحويلات
│   │   │   ├── use-exports.ts           # جلب وتعديل التصدير
│   │   │   ├── use-upload.ts            # رفع ملفات مع تقدّم
│   │   │   └── use-install-prompt.ts    # PWA install prompt
│   │   ├── messages/                     # ملفات الترجمة (next-intl)
│   │   │   ├── ar.json                   # العربية (أساسي)
│   │   │   └── en.json                   # الإنجليزية
│   │   ├── i18n/                         # إعداد next-intl
│   │   │   ├── request.ts               # إعداد التدويل من جانب الخادم
│   │   │   └── routing.ts               # إعداد التوجيه متعدد اللغات
│   │   ├── public/                       # ملفات ثابتة
│   │   │   ├── icons/                    # أيقونات PWA
│   │   │   │   ├── icon-192x192.png
│   │   │   │   ├── icon-512x512.png
│   │   │   │   └── icon-maskable-192x192.png
│   │   │   ├── screenshots/              # لقطات PWA
│   │   │   │   └── desktop.png
│   │   │   └── sw.js                     # Service Worker (@serwist/next proposal)
│   │   ├── next.config.ts               # إعداد Next.js
│   │   ├── tailwind.config.ts            # إعداد Tailwind CSS v4
│   │   ├── tsconfig.json                 # إعداد TypeScript
│   │   ├── vitest.config.ts              # إعداد Vitest
│   │   ├── postcss.config.js             # إعداد PostCSS
│   │   ├── package.json                  # تبعيات التطبيق
│   │   └── middleware.ts                 # Next.js Middleware (أمن، لغة، CORS)
│   │
│   └── worker/                           # عامل BullMQ لمعالجة OCR والتصدير
│       ├── src/
│       │   ├── processors/               # معالجات طوابير المهام
│       │   │   ├── conversion.processor.ts   # معالج التحويلات (OCR extraction)
│       │   │   ├── export.processor.ts       # معالج التصدير (format generation — منفصل)
│       │   │   └── cleanup.processor.ts      # معالج تنظيف الملفات المؤقتة
│       │   ├── exporters/                # مُصدِّرات الملفات (Export فقط)
│       │   │   ├── txt-exporter.ts       # تصدير TXT
│       │   │   ├── docx-exporter.ts      # تصدير DOCX (rtl)
│       │   │   └── json-exporter.ts      # تصدير JSON
│       │   ├── ocr/                      # محرك OCR (Conversion فقط)
│       │   │   ├── google-drive.ts       # Google Drive OCR client
│       │   │   └── text-cleaner.ts       # تنظيف نتائج OCR
│       │   ├── storage/                  # إدارة التخزين
│       │   │   └── minio-client.ts       # عميل MinIO للعامل (bucket: ibn-al-azhar-docs-files)
│       │   ├── pdf/                      # معالجة PDF
│       │   │   └── splitter.ts           # تقسيم PDF إلى صفحات صور
│       │   ├── utils/                    # أدوات مساعدة
│       │   │   ├── logger.ts             # pino logger
│       │   │   ├── retry.ts              # إعادة المحاولة مع backoff
│       │   │   └── rate-limiter.ts       # تحديد معدل الطلبات
│       │   └── index.ts                  # نقطة دخول العامل
│       ├── Dockerfile                    # صورة Docker للعامل
│       ├── tsconfig.json                 # إعداد TypeScript للعامل
│       ├── vitest.config.ts              # إعداد Vitest للعامل
│       └── package.json                  # تبعيات العامل
│
├── packages/                             # حزم مشتركة
│   ├── shared/                           # أنواع وثوابت مشتركة
│   │   ├── src/
│   │   │   ├── types/                    # تعريفات TypeScript
│   │   │   │   ├── file.ts              # File, FileMetadata, FileStatus
│   │   │   │   ├── conversion.ts        # Conversion, ConversionStatus, ConversionSettings
│   │   │   │   ├── export.ts            # Export, ExportFormat, ExportStatus
│   │   │   │   ├── user.ts              # User, UserRole, UserStatus
│   │   │   │   ├── folder.ts            # Folder, FolderTree
│   │   │   │   ├── share.ts             # ShareLink, SharePermission
│   │   │   │   ├── api.ts               # ApiResponse, ApiError, Pagination
│   │   │   │   └── index.ts             # إعادة تصدير جميع الأنواع
│   │   │   ├── constants/                # ثوابت مشتركة
│   │   │   │   ├── roles.ts             # تعريفات الأدوار والصلاحيات
│   │   │   │   ├── file-limits.ts       # حدود الملفات (100MB) والحصص
│   │   │   │   ├── conversion.ts        # حالات التحويل والمراحل
│   │   │   │   ├── export.ts            # حالات التصدير والصيغ
│   │   │   │   ├── mime-types.ts        # أنواع MIME المدعومة
│   │   │   │   ├── auth.ts              # ثوابت المصادقة (JWT 24h, password rules)
│   │   │   │   └── index.ts             # إعادة تصدير جميع الثوابت
│   │   │   └── index.ts                 # نقطة دخول الحزمة
│   │   ├── tsconfig.json
│   │   └── package.json                  # @ibn-al-azhar-docs/shared
│   │
│   └── ui/                               # إعداد shadcn/ui المشترك
│       ├── components.json               # إعداد shadcn/ui CLI
│       └── package.json                  # @ibn-al-azhar-docs/ui
│
├── prisma/                               # إدارة قاعدة البيانات
│   ├── schema.prisma                     # مخطط Prisma — تعريف النماذج والعلاقات
│   ├── seed.ts                           # بذر البيانات (ينشئ admin من ADMIN_EMAIL/ADMIN_PASSWORD)
│   ├── seed-staging.ts                   # بذر بيانات staging
│   └── migrations/                       # ترحيلات قاعدة البيانات
│       ├── migration_lock.toml
│       └── 20250305_initial/
│           └── migration.sql             # الترحيلة الأولية
│
├── docker/                               # ملفات Docker والحاويات
│   ├── Dockerfile                        # صورة Docker متعددة المراحل
│   ├── docker-compose.yml                # تأليف الحاويات — التطوير
│   ├── docker-compose.prod.yml           # تأليف الحاويات — الإنتاج
│   ├── Caddyfile                         # إعداد Caddy reverse proxy (القرار النهائي)
│   ├── caddy/                            # إعداد Caddy (V4.1)
│   │   └── Caddyfile                     # إعداد Caddy
│   ├── postgres/                         # PostgreSQL (V4.1)
│   │   └── init/                         # سكريبتات تهيئة PostgreSQL
│   ├── minio/                            # MinIO (V4.1)
│   │   └── policies/                     # سياسات MinIO
│   └── scripts/                          # سكريبتات مساعدة (V4.1)
│
├── docs/                                 # التوثيق
│   ├── 00_PROJECT_BRIEF.md               # ملخّص المشروع
│   ├── 01_PRD.md                         # متطلبات المنتج
│   ├── 02_ROADMAP.md                     # خارطة الطريق
│   ├── 03_UX_SPEC.md                     # مواصفات تجربة المستخدم
│   ├── 04_UI_DESIGN_SYSTEM.md            # نظام التصميم
│   ├── 05_TECHNICAL_DESIGN.md            # التصميم التقني
│   ├── 06_API_SPEC.md                    # مواصفات API
│   ├── 07_DATABASE_SCHEMA.md             # مخطط قاعدة البيانات
│   ├── 08_SECURITY_PRIVACY.md            # الأمان والخصوصية
│   ├── 09_QA_TEST_PLAN.md               # خطة الاختبار (Vitest + Playwright)
│   ├── 10_DEVOPS_DEPLOYMENT.md           # العمليات والنشر
│   ├── 11_COST_AND_OPERATIONS.md         # التكاليف والتشغيل (free-first)
│   ├── 12_EXECUTION_BACKLOG.md           # سجل التنفيذ
│   ├── 13_PHASE_1_PLAN.md              # خطة Phase 1
│   ├── 14_LAUNCH_READINESS.md            # جاهزية الإطلاق
│   ├── 15_DOCUMENTATION_PLAN.md          # خطة التوثيق
│   ├── 16_RISK_REGISTER.md              # سجل المخاطر
│   ├── 17_GLOSSARY.md                    # المسرد
│   ├── 18_OPEN_QUESTIONS.md             # الأسئلة المفتوحة
│   ├── 19_DECISION_LOG.md               # سجل القرارات
│   ├── 20_RELEASE_NOTES_TEMPLATE.md      # قالب ملاحظات الإصدار
│   ├── 21_CONTRIBUTING.md               # دليل المساهمة
│   ├── 22_REPO_STRUCTURE.md             # هذا الملف
│   ├── 29_BRAND_IMPLEMENTATION_GUIDE.md  # دليل تطبيق العلامة التجارية (V4.1)
│   ├── 30_HOSTING_AND_DEPLOYMENT_OPTIONS.md  # خيارات الاستضافة والنشر (V4.1)
│   ├── 31_SPEC_KIT_WORKFLOW.md          # سير عمل Spec Kit (V4.1)
│   ├── 32_IMPECCABLE_DESIGN_WORKFLOW.md  # سير عمل Impeccable للتصميم (V4.1)
│   └── 33_ASSET_PIPELINE.md             # خط أنابيب الأصول (V4.1)
│
├── specs/                                # Spec Kit — مواصفات الميزات (V4.1)
│   ├── 001-auth-foundation/             # أساس المصادقة
│   │   ├── spec.md                      # مواصفات الميزة
│   │   ├── plan.md                      # خطة التنفيذ
│   │   ├── tasks.md                     # المهام
│   │   ├── data-model.md                # نموذج البيانات
│   │   ├── contracts/
│   │   │   └── openapi.yaml             # عقد API
│   │   └── quickstart.md                # دليل البدء السريع
│   ├── 002-app-shell-rtl/               # هيكل التطبيق RTL
│   ├── 003-file-upload/                 # رفع الملفات
│   └── 004-conversion-pipeline/         # خط أنابيب التحويل
│
├── tests/                                # اختبارات E2E
│   └── e2e/
│       ├── auth.spec.ts                  # اختبارات المصادقة
│       ├── files.spec.ts                 # اختبارات إدارة الملفات
│       ├── conversions.spec.ts           # اختبارات التحويلات (Conversion/OCR)
│       ├── exports.spec.ts               # اختبارات التصدير (Export)
│       ├── share.spec.ts                 # اختبارات المشاركة
│       ├── admin.spec.ts                 # اختبارات لوحة الإدارة
│       ├── rtl.spec.ts                   # اختبارات RTL/LTR
│       ├── pwa.spec.ts                   # اختبارات PWA
│       └── fixtures/                     # ملفات اختبار ثابتة
│           ├── sample.pdf
│           ├── sample.png
│           └── large-file.pdf
│
├── .env.example                          # نموذج المتغيرات البيئية
├── .gitignore                            # ملفات مستثناة من Git
├── .dockerignore                         # ملفات مستثناة من Docker (V4.1)
├── .eslintrc.json                        # إعداد ESLint
├── .prettierrc                           # إعداد Prettier
├── compose.yaml                          # تأليف الحاويات الأساسي (V4.1)
├── compose.dev.yaml                      # تأليف حاويات التطوير (V4.1)
├── compose.prod.example.yaml             # نموذج تأليف الإنتاج (V4.1)
├── Dockerfile                            # صورة التطبيق (V4.1)
├── Dockerfile.worker                     # صورة العامل (V4.1)
├── pnpm-workspace.yaml                   # تعريف مساحات عمل pnpm
├── package.json                          # إعداد الجذر — scripts مشتركة
├── pnpm-lock.yaml                        # قفل التبعيات
├── tsconfig.json                         # إعداد TypeScript الجذري (references)
├── vitest.config.ts                      # إعداد Vitest الجذري
├── playwright.config.ts                  # إعداد Playwright
├── LICENSE                               # ترخيص MIT
└── README.md                             # مقدمة المشروع
```

---

## وصف المجلدات والملفات الرئيسية

### `apps/web/` — تطبيق Next.js 16 PWA

التطبيق الرئيسي — واجهة المستخدم وAPI الخلفية. يتبع نمط Next.js App Router مع دعم PWA والتدويل.

| المجلد | المسؤولية |
|--------|-----------|
| `app/` | صفحات App Router وAPI Routes — نقطة الدخول للتطبيق |
| `app/[locale]/` | مقطع اللغة الديناميكي — جميع الصفحات تُقدَّم ضمن هذا المجلد |
| `app/[locale]/(auth)/` | Route Group لصفحات المصادقة — بدون sidebar |
| `app/[locale]/(dashboard)/` | Route Group لصفحات لوحة التحكم — مع sidebar |
| `app/[locale]/admin/` | صفحات المدير — محمية بـ RBAC |
| `app/api/` | API Routes — RESTful endpoints مع Zod validation |
| `app/api/conversions/` | نقاط نهاية التحويل (Conversion/OCR) — استخراج النص |
| `app/api/exports/` | نقاط نهاية التصدير (Export) — توليد ملف بصيغة — **منفصل عن التحويل** |
| `components/` | مكوّنات React — مفصولة حسب النطاق الوظيفي |
| `components/conversions/` | مكوّنات التحويل (Conversion/OCR) |
| `components/exports/` | مكوّنات التصدير (Export) — **منفصل عن التحويل** |
| `components/ui/` | مكوّنات shadcn/ui الأساسية — لا تُعدَّل مباشرة |
| `lib/` | وحدات مساعدة — عملاء الخدمات، أدوات، أنماط |
| `lib/auth.ts` | إعداد NextAuth.js v5 — JWT strategy (24h)، لا access/refresh token منفصل |
| `validators/` | Zod schemas — التحقق من جميع المدخلات |
| `validators/auth.ts` | قواعد كلمة المرور: 8 أحرف + حرف كبير + صغير + رقم + blacklist |
| `services/` | طبقة منطق الأعمال — فصل المنطق عن API Routes |
| `services/conversion.service.ts` | منطق التحويل (OCR extraction) |
| `services/export.service.ts` | منطق التصدير (format generation) — **منفصل عن التحويل** |
| `stores/` | Zustand stores — إدارة حالة العميل |
| `hooks/` | React hooks مخصصة — استخراج المنطق من المكوّنات |
| `messages/` | ملفات ترجمة next-intl — ar.json وen.json |
| `i18n/` | إعداد next-intl — request.ts وrouting.ts |
| `public/` | ملفات ثابتة — أيقونات، لقطات، Service Worker |
| `middleware.ts` | Next.js Middleware — أمن، لغة، CORS (Same-origin + allowed origins) |

### `apps/worker/` — عامل BullMQ

تطبيق Node.js مستقل يعالج مهام التحويل (Conversion) والتصدير (Export) بشكل غير متزامن. يتواصل مع تطبيق الويب عبر Redis PubSub.

| المجلد | المسؤولية |
|--------|-----------|
| `src/processors/` | معالجات طوابير BullMQ — تنفيذ المهام |
| `src/processors/conversion.processor.ts` | معالج التحويلات (OCR extraction) — طابور `conversion` |
| `src/processors/export.processor.ts` | معالج التصدير (format generation) — طابور `export` — **منفصل عن التحويل** |
| `src/exporters/` | مُصدِّرات الملفات — TXT, DOCX, JSON (Export فقط) |
| `src/ocr/` | محرك OCR — Google Drive API client + تنظيف النص (Conversion فقط) |
| `src/pdf/` | معالجة PDF — تقسيم إلى صفحات صور عبر pdfjs-dist |
| `src/storage/` | عميل MinIO — قراءة وكتابة الملفات (bucket: `ibn-al-azhar-docs-files`) |
| `src/utils/` | أدوات مساعدة — تسجيل، إعادة محاولة، rate limiting |

### `packages/shared/` — الأنواع والثوابت المشتركة

حزمة مشتركة تُستخدم من قِبل `apps/web` و`apps/worker` لضمان تناسق الأنواع والثوابت.

| المجلد | المسؤولية |
|--------|-----------|
| `src/types/` | تعريفات TypeScript — جميع الأنواع المشتركة |
| `src/types/conversion.ts` | أنواع التحويل (Conversion/OCR) |
| `src/types/export.ts` | أنواع التصدير (Export) — **منفصل عن التحويل** |
| `src/constants/` | ثوابت التطبيق — حدود، أدوار، حالات |
| `src/constants/file-limits.ts` | `MAX_FILE_SIZE = 100 * 1024 * 1024` (100MB) |
| `src/constants/auth.ts` | ثوابت المصادقة — JWT 24h، قواعد كلمة المرور |
| `src/constants/export.ts` | صيغ التصدير المدعومة — TXT, DOCX, JSON |

**ملاحظة مهمة:** هذه الحزمة لا تحتوي على منطق أعمال أو تبعيات خارجية ثقيلة—أنواع وثوابت فقط.

### `packages/ui/` — إعداد shadcn/ui المشترك

إعداد مركزي لمكوّنات shadcn/ui يُستخدم من قِبل `apps/web`. يحتوي على `components.json` الذي يحدد مسار المكوّنات وأسلوبها.

### `prisma/` — إدارة قاعدة البيانات

| الملف | المسؤولية |
|-------|-----------|
| `schema.prisma` | مخطط قاعدة البيانات — النماذج والعلاقات والفهارس. اسم DB: `ibn_al_azhar_docs` |
| `seed.ts` | بذر البيانات — يُنشئ أول حساب مدير من `ADMIN_EMAIL` و`ADMIN_PASSWORD` |
| `seed-staging.ts` | بذر بيانات اختبارية لبيئة staging |
| `migrations/` | ترحيلات SQL — كل تغيير في الـ schema يُنشئ مجلدًا |

أنظر `07_DATABASE_SCHEMA.md` للتفاصيل الكاملة.

### `docker/` — الحاويات

| الملف | المسؤولية |
|-------|-----------|
| `Dockerfile` | صورة Docker متعددة المراحل (deps → builder → development → production) |
| `docker-compose.yml` | تأليف حاويات التطوير |
| `docker-compose.prod.yml` | تأليف حاويات الإنتاج (مع Caddy وreplicas) |
| `Caddyfile` | إعداد Caddy — SSL تلقائي، rate limiting، security headers |
| `caddy/Caddyfile` | إعداد Caddy — ملف إعداد منفصل (V4.1) |
| `postgres/init/` | سكريبتات تهيئة PostgreSQL (V4.1) |
| `minio/policies/` | سياسات MinIO (V4.1) |
| `scripts/` | سكريبتات مساعدة للتحقق والتشغيل (V4.1) |

أسماء حاويات Docker: `ibn-al-azhar-docs-web`, `ibn-al-azhar-docs-worker`, `ibn-al-azhar-docs-db`, `ibn-al-azhar-docs-redis`, `ibn-al-azhar-docs-minio`, `ibn-al-azhar-docs-caddy`

أنظر `10_DEVOPS_DEPLOYMENT.md` و `30_HOSTING_AND_DEPLOYMENT_OPTIONS.md` للتفاصيل الكاملة.

### `docs/` — التوثيق

جميع وثائق المشروع مرقّمة بالترتيب المنطقي. أنظر `15_DOCUMENTATION_PLAN.md` للفهرس الكامل.

**ملفات V4.1 المضافة:**

| الملف | المسؤولية |
|-------|-----------|
| `29_BRAND_IMPLEMENTATION_GUIDE.md` | دليل تطبيق العلامة التجارية — ألوان، خطوط، أنماط |
| `30_HOSTING_AND_DEPLOYMENT_OPTIONS.md` | خيارات الاستضافة والنشر — مقارنة المنصات |
| `31_SPEC_KIT_WORKFLOW.md` | سير عمل Spec Kit — منهجية التطوير المبني على المواصفات |
| `32_IMPECCABLE_DESIGN_WORKFLOW.md` | سير عمل Impeccable للتصميم — عملية التصميم المتقن |
| `33_ASSET_PIPELINE.md` | خط أنابيب الأصول — إدارة الصور والأيقونات والخطوط |

### `specs/` — Spec Kit مواصفات الميزات (V4.1)

مجلد مواصفات الميزات يتبع منهجية Spec-Driven Development. كل ميزة لها مجلد رقمي يحتوي على المواصفات والخطط والعقود.

| المجلد | المسؤولية |
|--------|-----------|
| `001-auth-foundation/` | أساس المصادقة — spec.md، plan.md، tasks.md، data-model.md، contracts/openapi.yaml، quickstart.md |
| `002-app-shell-rtl/` | هيكل التطبيق RTL — مواصفات واجهة المستخدم العربية |
| `003-file-upload/` | رفع الملفات — مواصفات الرفع والتخزين |
| `004-conversion-pipeline/` | خط أنابيب التحويل — مواصفات OCR والمعالجة |

أنظر `31_SPEC_KIT_WORKFLOW.md` للتفاصيل الكاملة.

### `tests/e2e/` — اختبارات E2E

اختبارات Playwright التي تختبر التطبيق من منظور المستخدم. أنظر `09_QA_TEST_PLAN.md` للتفاصيل.

---

## ملفات الإعداد الرئيسية

### `apps/web/next.config.ts`

```typescript
// الإعدادات الرئيسية
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  // PWA — إعداد Service Worker (@serwist/next proposal)
  // أنظر public/sw.js للتنفيذ الفعلي

  // Docker — standalone output
  output: 'standalone',

  // صور — تحسين الصور
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'storage.ibn-al-azhar-docs.app' },
    ],
  },

  // أمان — رؤوس HTTP
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
```

| الإعداد | الغرض |
|---------|-------|
| `output: 'standalone'` | بناء مستقل لـ Docker — يحتوي جميع التبعيات اللازمة |
| `withNextIntl` | إضافة دعم التدويل عبر next-intl |
| `images.remotePatterns` | السماح بتحميل صور من MinIO فقط |
| `headers` | رؤوس أمان افتراضية لجميع الصفحات |

### `apps/web/tailwind.config.ts`

```typescript
// الإعدادات الرئيسية لـ Tailwind CSS v4
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // ألوان ابن الأزهر دوكس المخصصة
      colors: {
        brand: {
          50: '#eff6ff',
          // ... مقياس ألوان كامل
          900: '#1e3a5f',
        },
      },
      // دعم RTL
      // Tailwind v4 يدعم logical properties أصلاً
    },
  },
  plugins: [
    require('@tailwindcss/typography'),  // تنسيق المحتوى النصي
  ],
};

export default config;
```

### `tsconfig.json` (الجذر)

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true
  },
  "references": [
    { "path": "./apps/web" },
    { "path": "./apps/worker" },
    { "path": "./packages/shared" }
  ]
}
```

| الإعداد | الغرض |
|---------|-------|
| `references` | TypeScript Project References — بناء تزايدي لكل حزمة |
| `strict: true` | أقصى مستوى أمان أنواع |
| `isolatedModules: true` | كل ملف وحدة مستقلة — يمنع التأثيرات الجانبية |

### `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['apps/*/src/**', 'apps/*/lib/**', 'packages/*/src/**'],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
    alias: {
      '@ibn-al-azhar-docs/shared': path.resolve(__dirname, 'packages/shared/src'),
    },
  },
});
```

### `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    locale: 'ar',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### `docker/docker-compose.yml`

أنظر `10_DEVOPS_DEPLOYMENT.md` القسم 1.3 للملف الكامل.

الخدمات الرئيسية:
- **app** — خادم Next.js على المنفذ 3000
- **db** — PostgreSQL 16 على المنفذ 5432 (DB: `ibn_al_azhar_docs`)
- **redis** — Redis 7 على المنفذ 6379
- **minio** — MinIO على المنفذ 9000 (console: 9001, bucket: `ibn-al-azhar-docs-files`)
- **minio-init** — تهيئة الحاوية (one-shot)

### `docker/Caddyfile`

أنظر `10_DEVOPS_DEPLOYMENT.md` القسم 2.5 للملف الكامل.

الوظائف: reverse proxy → app:3000، SSL تلقائي، compression، security headers، rate limiting، CORS (Same-origin + allowed origins).

### `.env.example`

أنظر `10_DEVOPS_DEPLOYMENT.md` القسم 3.1 للملف الكامل.

يحتوي على جميع المتغيرات البيئية المطلوبة مع تعليقات توضيحية وقيم افتراضية للتطوير. المتغيرات الأساسية:

```bash
AUTH_SECRET=                          # openssl rand -hex 32
ADMIN_EMAIL=                          # بريد المدير الأول
ADMIN_PASSWORD=                       # كلمة مرور المدير الأول
DATABASE_URL=postgresql://ibn_al_azhar_docs:...@localhost:5432/ibn_al_azhar_docs
CORS_ALLOWED_ORIGINS=                 # نطاقات CORS المسموحة في الإنتاج
```

---

## حدود الوحدات وقواعد الاعتماد

### رسم الاعتماد

```
┌──────────────┐     ┌──────────────┐
│   apps/web   │     │ apps/worker  │
│  (Next.js)   │     │  (BullMQ)    │
└──────┬───────┘     └──────┬───────┘
       │                    │
       │    ┌──────────┐    │
       └───►│ packages │◄───┘
            │ /shared  │
            └──────────┘
```

### قواعد الاعتماد

| القاعدة | الشرح |
|---------|-------|
| **apps/web → packages/shared** | مسموح — يُستورد الأنواع والثوابت |
| **apps/worker → packages/shared** | مسموح — يُستورد الأنواع والثوابت |
| **apps/web → apps/worker** | **ممنوع** — لا اعتماد مباشر بين التطبيقين |
| **apps/worker → apps/web** | **ممنوع** — التواصل عبر Redis PubSub فقط |
| **packages/shared → apps/** | **ممنوع** — الحزم المشتركة لا تعتمد على التطبيقات |
| **packages/shared → حزم خارجية** | مسموح — فقط حزم خفيفة (zod للتأكد من الأنواع) |
| **apps/web → packages/ui** | مسموح — إعداد shadcn/ui المشترك |

### ما يوضع أين

| العنصر | المكان | السبب |
|--------|--------|-------|
| أنواع TypeScript مشتركة | `packages/shared/src/types/` | يُستخدم من web وworker |
| أنواع التحويل (Conversion) | `packages/shared/src/types/conversion.ts` | نوع منفصل عن التصدير |
| أنواع التصدير (Export) | `packages/shared/src/types/export.ts` | نوع منفصل عن التحويل |
| ثوابت مشتركة | `packages/shared/src/constants/` | حدود الملفات (100MB)، الأدوار، الحالات |
| أنواع خاصة بالويب | `apps/web/lib/types/` أو داخل المكوّن | لا يحتاجه العامل |
| مكوّنات واجهة | `apps/web/components/` | خاص بالتطبيق |
| منطق أعمال API | `apps/web/services/` | قريب من API Routes |
| منطق تحويل (Conversion) | `apps/web/services/conversion.service.ts` | استخراج OCR فقط |
| منطق تصدير (Export) | `apps/web/services/export.service.ts` | توليد ملف بصيغة — منفصل |
| منطق أعمال Worker | `apps/worker/src/processors/` | خاص بالعامل |
| Zod schemas للـ API | `apps/web/validators/` | خاص بنقاط النهاية |
| Prisma schema | `prisma/schema.prisma` | مركزي — يُشاركه web وworker |
| ملفات الترجمة | `apps/web/messages/` | خاص بواجهة الويب |

### قاعدة Prisma

بما أن `prisma/` موجود في الجذر وليس داخل `apps/web/`:

- `apps/web/lib/prisma.ts` يستورد من `@prisma/client`
- `apps/worker/src/storage/` يستورد من `@prisma/client`
- كلاهما يشتركان في نفس Prisma Client المُولَّد من `prisma/schema.prisma`
- الترحيلات تُدار مركزيًا من الجذر: `pnpm prisma migrate dev`
- اسم قاعدة البيانات: `ibn_al_azhar_docs`

---

## اصطلاحات الاستيراد

### أسماء مستعارة (Aliases)

| الاسم المستعار | المسار | الاستخدام |
|---------------|--------|----------|
| `@/` | `apps/web/` | داخل تطبيق الويب |
| `@ibn-al-azhar-docs/shared` | `packages/shared/src/` | من أي حزمة |
| `@ibn-al-azhar-docs/ui` | `packages/ui/` | من تطبيق الويب |

### أمثلة الاستيراد

```typescript
// داخل apps/web — استخدام @/
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { authOptions } from '@/lib/auth';
import { fileUploadSchema } from '@/validators/files';

// أنواع مشتركة من @ibn-al-azhar-docs/shared
import type { Conversion, ConversionStatus } from '@ibn-al-azhar-docs/shared';
import type { Export, ExportFormat } from '@ibn-al-azhar-docs/shared';
import { MAX_FILE_SIZE, SUPPORTED_MIME_TYPES } from '@ibn-al-azhar-docs/shared';

// داخل apps/worker — استخدام المسارات النسبية أو @ibn-al-azhar-docs/shared
import { googleDriveOcr } from './ocr/google-drive';
import type { FileMetadata, ConversionSettings } from '@ibn-al-azhar-docs/shared';
import { CONVERSION_STAGES } from '@ibn-al-azhar-docs/shared';
```

### إعداد الأسماء المستعارة

```typescript
// apps/web/tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@ibn-al-azhar-docs/shared": ["../../packages/shared/src"],
      "@ibn-al-azhar-docs/ui": ["../../packages/ui"]
    }
  }
}
```

### قواعد الاستيراد

| القاعدة | الشرح |
|---------|-------|
| استخدم `@/` داخل تطبيق الويب | وليس مسارات نسبية طويلة مثل `../../../lib/auth` |
| استخدم `@ibn-al-azhar-docs/shared` للأنواع المشتركة | وليس المسار المباشر للحزمة |
| استورد الأنواع بـ `import type` | يُقلّل حجم الحزمة — لا كود وقت التشغيل |
| رتّب الواردات: مكتبات → حزم مشتركة → محلي | اتساق عبر المشروع |

```typescript
// ✅ صحيح — مرتّب
import { useState } from 'react';                                    // مكتبات
import type { Conversion } from '@ibn-al-azhar-docs/shared';         // حزم مشتركة
import { Button } from '@/components/ui/button';                     // محلي
import { useConversionsStore } from '@/stores/conversions-store';

// ❌ خطأ — غير مرتّب
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import type { Conversion } from '@ibn-al-azhar-docs/shared';
```

---

## مخرجات البناء

### تطبيق الويب (`apps/web`)

```
apps/web/.next/                           # مخرجات بناء Next.js
├── standalone/                           # بناء مستقل لـ Docker
│   ├── server.js                         # نقطة دخول الخادم
│   ├── .next/                            # ملفات Next.js المُحسّنة
│   │   ├── static/                       # JS/CSS مع hash في الاسم
│   │   └── server/                       # Server Components المُترجمة
│   ├── public/                           # ملفات ثابتة
│   └── node_modules/                     # تبعيات الإنتاج فقط
└── static/                               # ملفات ثابتة (منسوخة لـ standalone)
```

### عامل BullMQ (`apps/worker`)

```
apps/worker/dist/                         # مخرجات بناء TypeScript
├── processors/
│   ├── conversion.processor.js
│   ├── export.processor.js
│   └── cleanup.processor.js
├── exporters/
│   ├── txt-exporter.js
│   ├── docx-exporter.js
│   └── json-exporter.js
├── ocr/
│   ├── google-drive.js
│   └── text-cleaner.js
├── pdf/
│   └── splitter.js
├── storage/
│   └── minio-client.js
├── utils/
│   ├── logger.js
│   ├── retry.js
│   └── rate-limiter.js
└── index.js                              # نقطة دخول العامل
```

### Prisma Client

```
node_modules/.prisma/client/              # Prisma Client المُولَّد
├── index.js
├── index.d.ts
└── runtime/
```

---

## هيكل ملفات Docker

### صورة التطبيق (Dockerfile متعدد المراحل)

```
المرحلة 1: deps        → تثبيت جميع التبعيات
المرحلة 2: builder     → بناء التطبيق (next build + prisma generate)
المرحلة 3: development → بيئة التطوير (مع hot reload)
المرحلة 4: production  → بيئة الإنتاج (ملفات ضرورية فقط)
```

أنظر `10_DEVOPS_DEPLOYMENT.md` القسم 2.4 للملف الكامل.

### تأليف الحاويات — التطوير

```
┌─────────────────────────────────────────┐
│             Docker Network               │
│                                          │
│  ┌─────────┐  ┌─────────┐  ┌──────────┐│
│  │  app     │  │  db     │  │  redis   ││
│  │ :3000   │  │ :5432   │  │ :6379    ││
│  │ Next.js │  │ Postgres│  │  Redis   ││
│  └─────────┘  └─────────┘  └──────────┘│
│                            ┌──────────┐ │
│                            │  minio   │ │
│                            │ :9000    │ │
│                            │ MinIO    │ │
│                            └──────────┘ │
│                            ┌──────────┐ │
│                            │minio-init│ │
│                            │(one-shot)│ │
│                            └──────────┘ │
└─────────────────────────────────────────┘
```

أسماء الحاويات: `ibn-al-azhar-docs-web`, `ibn-al-azhar-docs-db`, `ibn-al-azhar-docs-redis`, `ibn-al-azhar-docs-minio`

### تأليف الحاويات — الإنتاج

```
                ┌──────────────┐
                │    Caddy     │
                │   :443/:80   │
                │  Reverse     │
                │  Proxy + SSL │
                └──────┬───────┘
                       │
          ┌────────────┼────────────┐
          │            │            │
   ┌──────▼──┐  ┌─────▼─────┐  ┌──▼────────┐
   │  app    │  │  worker-1 │  │  worker-2 │
   │ :3000   │  │  (BullMQ) │  │  (BullMQ) │
   │ Next.js │  │           │  │           │
   └────┬────┘  └─────┬─────┘  └─────┬─────┘
        │             │              │
   ┌────▼────┐  ┌─────▼─────┐  ┌────▼────┐
   │  db     │  │  redis    │  │  minio  │
   │ :5432   │  │ :6379     │  │ :9000   │
   │ ibn_al_ │  │  (BullMQ  │  │ ibn-al- │
   │azhar_   │  │  + PubSub)│  │azhar-   │
   │docs     │  │           │  │docs-    │
   │         │  │           │  │files    │
   └─────────┘  └───────────┘  └─────────┘
```

أسماء الحاويات: `ibn-al-azhar-docs-caddy`, `ibn-al-azhar-docs-web`, `ibn-al-azhar-docs-worker`, `ibn-al-azhar-docs-db`, `ibn-al-azhar-docs-redis`, `ibn-al-azhar-docs-minio`

### ملخص أسماء الحاويات (Docker)

| الحاوية | الاسم | المنفذ |
|---------|-------|--------|
| Next.js Web | `ibn-al-azhar-docs-web` | 3000 |
| BullMQ Worker | `ibn-al-azhar-docs-worker` | — |
| PostgreSQL | `ibn-al-azhar-docs-db` | 5432 |
| Redis | `ibn-al-azhar-docs-redis` | 6379 |
| MinIO | `ibn-al-azhar-docs-minio` | 9000 (console: 9001) |
| Caddy | `ibn-al-azhar-docs-caddy` | 80, 443 |

### ملخص أسماء الموارد

| المورد | الاسم |
|--------|-------|
| المستودع (GitHub) | `ibn-al-azhar-docs` |
| حزمة shared | `@ibn-al-azhar-docs/shared` |
| حزمة ui | `@ibn-al-azhar-docs/ui` |
| قاعدة البيانات | `ibn_al_azhar_docs` |
| MinIO bucket | `ibn-al-azhar-docs-files` |
| Docker network | `ibn-al-azhar-docs-network` |

---

## تحديثات V4.1 على هيكل المستودع

> **الإصدار:** 4.1 | **تاريخ التحديث:** 2025-03-05
> **الغرض:** توثيق الإضافات والتغييرات التي طرأت على هيكل المستودع في إصدار V4.1

### الإضافات الجديدة في V4.1

#### 1. مجلد `specs/` — Spec Kit

مجلد جديد على مستوى الجذر يتبع منهجية Spec-Driven Development. يحتوي كل مجلد رقمي على:
- `spec.md` — مواصفات الميزة التفصيلية
- `plan.md` — خطة التنفيذ
- `tasks.md` — قائمة المهام
- `data-model.md` — نموذج البيانات
- `contracts/openapi.yaml` — عقد API
- `quickstart.md` — دليل البدء السريع

الميزات الموثقة حاليًا: `001-auth-foundation`، `002-app-shell-rtl`، `003-file-upload`، `004-conversion-pipeline`

#### 2. مجلدات `docker/` الفرعية

إضافة مجلدات فرعية منظمة داخل `docker/`:
- `docker/caddy/Caddyfile` — إعداد Caddy منفصل
- `docker/postgres/init/` — سكريبتات تهيئة PostgreSQL
- `docker/minio/policies/` — سياسات MinIO
- `docker/scripts/` — سكريبتات مساعدة

#### 3. ملفات Docker على مستوى الجذر

إضافة ملفات Docker مباشرة على مستوى الجذر:
- `compose.yaml` — تأليف الحاويات الأساسي
- `compose.dev.yaml` — تأليف حاويات التطوير
- `compose.prod.example.yaml` — نموذج تأليف الإنتاج
- `Dockerfile` — صورة التطبيق
- `Dockerfile.worker` — صورة العامل (منفصل)
- `.dockerignore` — ملفات مستثناة من Docker

#### 4. ملفات توثيق V4.1 (29–33)

إضافة خمسة ملفات توثيق جديدة:
- `29_BRAND_IMPLEMENTATION_GUIDE.md` — دليل تطبيق العلامة التجارية
- `30_HOSTING_AND_DEPLOYMENT_OPTIONS.md` — خيارات الاستضافة والنشر
- `31_SPEC_KIT_WORKFLOW.md` — سير عمل Spec Kit
- `32_IMPECCABLE_DESIGN_WORKFLOW.md` — سير عمل Impeccable للتصميم
- `33_ASSET_PIPELINE.md` — خط أنابيب الأصول

#### 5. ملاحظة حول سجلات قرارات العمارة (ADRs 018–021)

تمت إضافة أربع قرارات عمارة جديدة في V4.1:
- **ADR-018:** Docker-first development approach
- **ADR-019:** Spec-Driven Development workflow
- **ADR-020:** Brand color token system (#16A34A primary, #CA8A04 accent)
- **ADR-021:** Worker separation with dedicated Dockerfile.worker

أنظر `19_DECISION_LOG.md` للتفاصيل الكاملة حول جميع قرارات العمارة.
