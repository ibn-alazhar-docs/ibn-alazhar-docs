# معيار التسمية والمصطلحات — Ibn Al-Azhar Docs

> إصدار: 4.1 | تاريخ: 2025-03-05 | حالة: مقفل

---

## 1. اسم المشروع

| السياق | الاسم | مثال |
|--------|-------|------|
| العرض للمستخدم | Ibn Al-Azhar Docs — ابن الأزهر دوكس | عنوان الصفحة، الـ manifest |
| اسم المستودع | ibn-al-azhar-docs | github.com/org/ibn-al-azhar-docs |
| نطاق الحزمة | @ibn-al-azhar-docs | @ibn-al-azhar-docs/ui |
| اسم قاعدة البيانات | ibn_al_azhar_docs | DATABASE_URL=...ibn_al_azhar_docs |
| اسم مشروع Docker | ibn-al-azhar-docs | container: ibn-al-azhar-docs-postgres |
| النطاق المحلي | localhost:3000 | (افتراضي للتطوير) |
| اسم الـ bucket | ibn-al-azhar-docs-files | MinIO bucket |
| PWA cache | ibn-al-azhar-docs-v1 | Service Worker cache |
| System user | ibn-al-azhar-docs | /opt/ibn-al-azhar-docs |

### أسماء محظورة

لا تستخدم هذه الأسماء كأسماء للمشروع الحالي:

| الاسم المحظور | السبب | الاستخدام المسموح |
|--------------|-------|------------------|
| DocEd / doced | اسم قديم تم استبداله | فقط كمرجع تاريخي: "كان يُعرف سابقًا بـ DocEd" |
| مستند (كاسم مشروع) | غير دقيق، اسم عام | فقط ككلمة عربية تعني "document" |
| RAQIM / رقميم | اسم قديم مختلف | لا يُذكر |
| tahweel / tahweel-tauri | مشروع مختلف | فقط كمرجع بحثي وإلهام |

---

## 2. أسماء الجداول (Prisma)

| الجدول | اسم Prisma Model | اسم DB (@@map) |
|--------|-----------------|----------------|
| المستخدمون | User | users |
| الحسابات OAuth | Account | accounts |
| الجلسات | Session | sessions |
| رموز التحقق | VerificationToken | verification_tokens |
| المجلدات | Folder | folders |
| الملفات | File | files |
| التحويلات | Conversion | conversions |
| ملفات التحويل | ConversionFile | conversion_files |
| الملفات المحولة | ConvertedFile | converted_files |
| التصديرات | Export | exports |
| روابط المشاركة | ShareLink | share_links |
| سجل النشاط | ActivityLog | activity_logs |

---

## 3. أسماء Endpoints

| المجموعة | Base Path | أمثلة |
|----------|-----------|-------|
| المصادقة | /api/auth/* | /api/auth/register, /api/auth/login |
| الملفات | /api/files/* | /api/files/upload, /api/files/:id |
| المجلدات | /api/folders/* | /api/folders, /api/folders/:id |
| التحويلات | /api/conversions/* | /api/conversions, /api/conversions/:id |
| التصديرات | /api/exports/* | /api/exports, /api/exports/:id |
| المشاركة | /api/share/* | /api/share, /api/share/:token |
| الإدارة | /api/admin/* | /api/admin/users, /api/admin/stats |
| البحث | /api/search | /api/search?q=... |
| الصحة | /api/health | /api/health |

---

## 4. أسماء الملفات والمجلدات

```
src/
├── app/
│   ├── [locale]/
│   │   ├── (auth)/
│   │   ├── (dashboard)/
│   │   ├── admin/
│   │   └── share/[token]/
│   └── api/
├── components/
├── lib/
│   ├── auth.ts
│   ├── prisma.ts
│   ├── minio.ts
│   └── redis.ts
├── stores/
├── i18n/
│   ├── ar.json
│   └── en.json
└── types/
```

---

## 5. أسماء المتغيرات البيئية

| المتغير | الوصف | مثال |
|---------|-------|------|
| DATABASE_URL | رابط PostgreSQL | postgresql://ibn_al_azhar_docs:pass@localhost:5432/ibn_al_azhar_docs |
| NEXTAUTH_URL | رابط التطبيق | http://localhost:3000 |
| NEXTAUTH_SECRET | مفتاح التشفير | (openssl rand -base64 32) |
| REDIS_URL | رابط Redis | redis://localhost:6379 |
| MINIO_ENDPOINT | عنوان MinIO | localhost |
| MINIO_PORT | منفذ MinIO | 9000 |
| MINIO_ACCESS_KEY | مفتاح الوصول | minioadmin |
| MINIO_SECRET_KEY | مفتاح السر | minioadmin123 |
| MINIO_BUCKET | اسم Bucket | ibn-al-azhar-docs-files |
| MAX_UPLOAD_SIZE_MB | حد الرفع | 100 |
| GOOGLE_CLIENT_ID | معرف Google OAuth | (من Google Cloud) |
| GOOGLE_CLIENT_SECRET | سر Google OAuth | (من Google Cloud) |
| ADMIN_EMAIL | بريد المشرف الأول | admin@ibn-al-azhar-docs.local |
| ADMIN_PASSWORD | كلمة مرور المشرف | (تُغيّر عند أول دخول) |

---

## 6. مصطلحات المنتج

| المصطلح العربي | المصطلح الإنجليزي | المعنى |
|---------------|------------------|--------|
| تحويل | Conversion | عملية استخراج النص من PDF/صورة عبر OCR |
| تصدير | Export | إنشاء ملف بتنسيق محدد (TXT/DOCX/JSON) من نتيجة التحويل |
| رفع | Upload | إرسال ملف من جهاز المستخدم إلى الخادم |
| تحميل | Download | استرجاع ملف من الخادم إلى جهاز المستخدم |
| مشاركة | Sharing | إنشاء رابط عام للوصول لملف |
| رابط مشاركة | Share Link | رابط فريد يسمح بالوصول لملف بدون تسجيل دخول |
| سلة المحذوفات | Trash / Recycle Bin | ملفات محذوفة ناعميًا قابلة للاستعادة |
| حذف ناعم | Soft Delete | تعليم الملف كمحذوف دون إزالته فعليًا |
| حذف نهائي | Hard Delete | إزالة الملف من قاعدة البيانات والتخزين |
| خط أنابيب | Pipeline | مراحل المعالجة المتسلسلة (preparing→splitting→ocr→writing→done) |
| طالب | Student | دور المستخدم الأساسي |
| معلم | Teacher | دور المستخدم المتقدم (حصة أعلى) |
| مشرف | Admin | دور إدارة النظام |
| لوحة الإدارة | Admin Dashboard | واجهة إدارة النظام |
| إشعار | Notification | رسالة للمستخدم (Toast في MVP) |
| إعدادات | Settings | تفضيلات المستخدم |

---

## 7. مصطلحات تقنية

| المصطلح | الاستخدام |
|---------|----------|
| JWT | JSON Web Token — رمز المصادقة |
| SSE | Server-Sent Events — تحديثات فورية |
| PWA | Progressive Web App |
| Service Worker | عامل الخدمة (PWA offline) |
| OCR | Optical Character Recognition |
| BullMQ | نظام طوابير المهام |
| Prisma | ORM لقاعدة البيانات |
| MinIO | تخزين الكائنات (S3-compatible) |
| Caddy | Reverse Proxy |
| Vitest | أداة اختبار |
| Playwright | أداة اختبار E2E |
| next-intl | مكتبة التدويل |
| Zustand | إدارة حالة العميل |
| shadcn/ui | مكوّنات الواجهة |

---

## 8. مصطلحات العلامة التجارية (V4.1)

| المصطلح | القيمة | الاستخدام |
|---------|--------|----------|
| Primary Green | #16A34A (Green-600 Tailwind) | اللون الأساسي الرسمي — أزرار، روابط، مؤشرات نجاح |
| Heritage Gold | #CA8A04 (Yellow-600 Tailwind) | لون التمييز الرسمي — شارات، عناصر بارزة، زخارف |
| Cairo | خط عربي رسمي | الخط العربي الأساسي — `--font-family-arabic: 'Cairo', 'Noto Sans Arabic', sans-serif` |
| في بيت كل طالب أزهري | الشعار الرسمي (Tagline) | يُستخدم في صفحة الهبوط والـ manifest |
| محتوى تعليمي يليق بتفوق طالب الثانوية الأزهرية | وعد العلامة التجارية (Brand Promise) | يُراعى في كل قرار تصميمي ومحتوى |

> **تحذير:** لا يُستخدم Emerald (#10B981) كلون أساسي. لا يُستخدم IBM Plex Sans Arabic كخط عربي أساسي. راجع [29_BRAND_IMPLEMENTATION_GUIDE.md](./29_BRAND_IMPLEMENTATION_GUIDE.md) للتفاصيل.

---

## 9. مصطلحات المراحل (Phase Terminology)

| المصطلح القديم | المصطلح الجديد | السبب |
|---------------|---------------|-------|
| Sprint 1 | Phase 1 | توضيح أن المراحل تنفيذية وليست بالضرورة زمنية قصيرة |
| Sprint 2 | Phase 2 | نفس السبب |
| Sprint Planning | Phase Planning | يتوافق مع مصطلحات المراحل |
| Sprint Review | Phase Review | يتوافق مع مصطلحات المراحل |

> **ملاحظة:** مصطلح "sprint" يُستخدم فقط عند الحديث عن منهجية Agile بشكل عام (مثل "sprints of one week each") وليس لتسمية مراحل هذا المشروع.
