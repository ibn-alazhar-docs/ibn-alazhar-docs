# قفل نطاق MVP — Ibn Al-Azhar Docs

> إصدار: 4.1 | تاريخ: 2025-03-05 | حالة: مقفل
> أي تغيير على هذا المستند يحتاج موافقة Product Lead + Tech Lead

---

## ما يدخل MVP

### المصادقة وإدارة المستخدمين
- [x] تسجيل حساب بالبريد وكلمة المرور
- [x] تسجيل الدخول والخروج
- [x] أدوار: طالب / معلم / مشرف
- [x] NextAuth.js v5 مع JWT (24h)
- [x] أول حساب مشرف عبر seed script
- [x] تعديل الملف الشخصي

### إدارة الملفات
- [x] رفع ملفات PDF + JPG + PNG (حتى 100MB)
- [x] رفع ملفات متعددة
- [x] عرض قائمة الملفات مع ترتيب وتصفية
- [x] إعادة تسمية الملفات
- [x] حذف ملفات (soft delete)
- [x] استعادة من سلة المحذوفات
- [x] حذف نهائي من سلة المحذوفات
- [x] تحميل الملف الأصلي

### إدارة المجلدات
- [x] إنشاء مجلدات هرمية
- [x] نقل ملفات بين المجلدات
- [x] إعادة تسمية المجلدات
- [x] حذف المجلدات

### التحويل (Conversion)
- [x] بدء تحويل OCR لملف PDF/صورة
- [x] خط أنابيب: preparing → splitting → ocr → writing → done
- [x] تحديث التقدم عبر SSE
- [x] إعادة محاولة التحويل الفاشل
- [x] OCR عبر Google Drive API فقط

### التصدير (Export)
- [x] تصدير نتيجة التحويل بصيغة TXT
- [x] تصدير نتيجة التحويل بصيغة DOCX
- [x] تصدير نتيجة التحويل بصيغة JSON
- [x] تصدير منفصل عن التحويل (لا يعاد OCR لكل صيغة)

### المشاركة
- [x] إنشاء رابط مشاركة عام لملف
- [x] صلاحيات: عرض / تحميل
- [x] تاريخ انتهاء اختياري
- [x] إلغاء الرابط
- [x] وصول مجهول عبر الرابط

### البحث
- [x] بحث أساسي في أسماء الملفات والمجلدات

### الإدارة
- [x] لوحة إدارة أساسية (إحصائيات + إدارة مستخدمين)
- [x] تغيير أدوار المستخدمين
- [x] تعطيل/تفعيل المستخدمين

### PWA
- [x] Service Worker أساسي (App Shell caching)
- [x] Web App Manifest
- [x] Install Prompt مخصص
- [x] صفحة Offline أساسية

### التدويل والتصميم
- [x] واجهة عربية RTL كاملة
- [x] واجهة إنجليزية LTR
- [x] تبديل اللغة
- [x] Design Tokens + shadcn/ui + Tailwind

### الإعدادات
- [x] DPI الافتراضي
- [x] مستوى التزامن
- [x] صيغ التصدير الافتراضية
- [x] فاصل الصفحات

### البنية التحتية والعلامة التجارية (V4.1)
- [x] Docker Compose local stack (web, worker, PostgreSQL, Redis, MinIO, Caddy candidate)
- [x] Cairo font as primary Arabic font
- [x] Official brand colors (#16A34A primary green, #CA8A04 heritage gold)
- [x] Phase 1 instead of Sprint 1 terminology
- [x] Spec Kit workflow foundation (31_SPEC_KIT_WORKFLOW.md)
- [x] Impeccable design review workflow (32_IMPECCABLE_DESIGN_WORKFLOW.md)
- [x] Brand Implementation Guide (29_BRAND_IMPLEMENTATION_GUIDE.md)
- [x] Asset Pipeline (33_ASSET_PIPELINE.md)

---

## ما لا يدخل MVP

### V1 (ميزات محسّنة)
- [ ] OCR محلي عبر Tesseract كبديل
- [ ] تصدير Markdown وHTML
- [ ] بحث نص كامل
- [ ] تتبع إصدارات الملفات
- [ ] معاينة PDF داخل المنصة
- [ ] مشاركة مع مستخدمين محددين
- [ ] إشعارات داخل التطبيق

### V2 (توسع)
- [ ] واجهة برمجة تطبيقات عامة (Public API)
- [ ] نظام المؤسسات والمنظمات
- [ ] إشعارات Push
- [ ] Dark Mode
- [ ] خلفية Background Sync

### MVP لا يتطلب صراحةً
- [ ] Final paid production hosting decision (see 30_HOSTING_AND_DEPLOYMENT_OPTIONS.md)
- [ ] Full enterprise deployment
- [ ] Full offline file access
- [ ] Native mobile app
- [ ] Advanced organization management
- [ ] Fully automated brand asset generation (unless assets are ready)

### V3 (مؤسسي)
- [ ] تكامل LMS (Moodle/Canvas)
- [ ] تطبيق سطح مكتب (Tauri)
- [ ] تحليلات متقدمة
- [ ] سير عمل الموافقات

### لا يدخل أبدًا (Non-Goals)
- [ ] بناء محرك OCR من الصفر
- [ ] منصة تعليمية متكاملة (LMS)
- [ ] معالجة الفيديو أو الصوت
- [ ] تعاون في الوقت الفعلي
- [ ] سوق إلكتروني

---

## سياسة تغيير النطاق

| نوع التغيير | الموافقة المطلوبة | العملية |
|------------|-----------------|---------|
| إضافة ميزة جديدة إلى MVP | Product Lead + Tech Lead | فتح Open Question → مناقشة → قرار → تحديث هذا الملف |
| تأجيل ميزة من MVP | Product Lead | توثيق السبب + تحديث Roadmap |
| تغيير قرار تقني | Tech Lead + صاحب ADR | تحديث ADR + تحديث الملفات المتأثرة |
| رفع حد أو quote | Tech Lead + DevOps Lead | تقييم الأثر + تحديث ADR-014 |

---

## التحقق من النطاق

قبل كل Phase Planning، يجب أن يجيب الفريق على:

1. هل كل مهمة في هذا Phase موجودة في MVP أعلاه؟
2. هل توجد مهمة ليست في MVP لكنها "سريعة" وقد تُضاف؟ → يجب توثيقها وموافقتها أولًا
3. هل Phase الحالي يُنفّذ MVP فقط دون إضافات؟
4. هل أثر هذا التغيير على Launch Readiness واضح؟
