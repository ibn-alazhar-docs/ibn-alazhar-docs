# تقرير التناسق النهائي — Ibn Al-Azhar Docs V4

> إصدار: 4.0 | تاريخ: 2025-03-05 | حالة: مكتمل

---

## 1. التناقضات التي وُجدت

| # | التناقض | الملفات المتأثرة | القرار النهائي |
|---|---------|-----------------|---------------|
| C-01 | اسم المشروع غير موحد (مستند/DocEd/doced) | جميع الملفات الـ37 | Ibn Al-Azhar Docs — ابن الأزهر دوكس |
| C-02 | نموذج المصادقة: access/refresh tokens مقابل NextAuth JWT | 05, 06, 07, 08, 09, 13, ADRs | NextAuth.js v5 JWT strategy (24h)، لا refresh token منفصل في MVP (ADR-016) |
| C-03 | حد حجم الملف: 50MB مقابل 100MB | 05, 06, 07, 08, 14, ADR-014 | 100MB موحد (ADR-014) |
| C-04 | ShareLink token: UUID/sh_+24chars مقابل 64 hex chars | 07, 08, ADR-015 | crypto.randomBytes(32).toString('hex') = 64 hex chars، VarChar(128) في DB |
| C-05 | دمج Conversion مع Export | 05, 06, 07, 12 | فصل كامل: Conversion = OCR extraction، Export = format generation (ADR-017) |
| C-06 | PWA Service Worker: next-pwa/@serwist/يدوي | 09, 14, ADR-009 | @serwist/next كاقتراح افتراضي، spike مطلوب قبل الاعتماد |
| C-07 | Reverse Proxy: Caddy/Nginx مفتوح | 10, 18 | Caddy مقرر (Q01 Resolved) |
| C-08 | أدوات QA: Jest/Vitest | 09, 13, 14 | Vitest + React Testing Library + Playwright |
| C-09 | ادعاءات التكلفة: "مجاني بالكامل" | 11, ADR-013 | free-first / self-hostable بدون وعود مطلقة |
| C-10 | Concurrent sessions: 3 مقابل 5 | 05, 08 | 5 جلسات متزامنة لكل مستخدم |
| C-11 | Bucket/container naming: doced-files/doced-* | 05, 07, 08, 10, 13 | ibn-al-azhar-docs-files / ibn-al-azhar-docs-* |
| C-12 | SameSite cookie: Strict مقابل Lax | 05, 08 | SameSite=Lax (افتراضي NextAuth.js v5) |
| C-13 | Launch Readiness يطلب ميزات خارج MVP | 14 | تقسيم إلى Required/Recommended/Post-MVP/Enterprise |

---

## 2. التعديلات التي تمت

### 2.1 تغييرات الاسم (Name Unification)
- استبدال "مستند | DocEd" → "Ibn Al-Azhar Docs — ابن الأزهر دوكس" في 37 ملف
- استبدال "doced" → "ibn-al-azhar-docs" في:
  - Repository name
  - Package scope (@ibn-al-azhar-docs)
  - Database name (ibn_al_azhar_docs)
  - Docker container names (ibn-al-azhar-docs-*)
  - MinIO bucket (ibn-al-azhar-docs-files)
  - PWA cache name (ibn-al-azhar-docs-v1)
  - System user paths (/opt/ibn-al-azhar-docs)

### 2.2 تغييرات المصادقة (Auth Model Fix)
- إزالة access_token/refresh_token flow من: 05, 06, 08, 09
- استبداله بـ NextAuth.js v5 JWT model
- إنشاء ADR-016
- تحديث API Spec: POST /api/auth/refresh → GET /api/auth/session
- تحديث QA tests: فحص next-auth.session-token بدل access_token

### 2.3 تغييرات Conversion/Export
- فصل Conversion (OCR extraction) عن Export (format generation)
- إنشاء Export table في DB schema
- إضافة POST /api/exports endpoint
- إزالة format من Conversion request
- إنشاء ADR-017

### 2.4 تغييرات ShareLink Token
- تحديث token إلى crypto.randomBytes(32).toString('hex') = 64 hex chars
- تحديث DB field إلى VarChar(128)
- إزالة "sh_" prefix و UUID references

### 2.5 تغييرات File Size
- توحيد 100MB في جميع الملفات
- تحديث Zod validation code examples
- تحديث Security threat model

### 2.6 تغييرات إضافية
- Caddy كقرار نهائي (بدون Nginx كبديل)
- Vitest بدل Jest في جميع المراجع
- free-first بدل "مجاني بالكامل"
- Launch Readiness مقسم إلى 4 مستويات
- Phase 1 محدد كـ foundation فقط

---

## 3. الأسئلة المفتوحة المتبقية

| # | السؤال | الأهمية | Owner | Deadline |
|---|--------|---------|-------|----------|
| Q06 | تأكيد البريد قبل الرفع؟ | High | Product Lead | Phase 2 |
| Q08 | Service Account أم User OAuth لـ Google Drive API؟ | Critical | Backend Lead | Phase 2 |
| Q09 | PDF.js Worker: CDN أم Self-hosted؟ | Medium | Frontend Lead | Phase 3 |
| Q10 | الإشعارات: in-app فقط أم +email؟ | Medium | Product Lead | Phase 4 |
| Q11 | التسجيل: مفتوح أم بدعوة؟ | High | Product Lead | Phase 2 |
| Q12 | مكتبة DOCX: npm docx أم LibreOffice؟ | High | Backend Lead | Phase 4 |
| Q14 | تتبع الأخطاء: Sentry أم self-hosted؟ | Medium | DevOps Lead | Phase 5 |
| Q15 | التحليلات: بدون/Plausible/GA؟ | Low | Product Lead | بعد الإطلاق |
| Q17 | تسمية الملفات على MinIO: UUID أم مقروء؟ | Medium | Backend Lead | Phase 1 |
| Q18 | Rate Limiting: per-user أم per-IP؟ | High | Security Lead | Phase 2 |

---

## 4. نتائج فحص التناسق

| البعد | النتيجة | ملاحظات |
|-------|---------|---------|
| اسم المشروع موحد | ✅ نعم | لا توجد مراجع لـ DocEd كمشروع حالي |
| Auth model موحد | ✅ نعم | NextAuth JWT في جميع الملفات |
| File size موحد | ✅ نعم | 100MB في كل مكان |
| Share token موحد | ✅ نعم | 64 hex chars في DB/API/Security/ADR |
| Conversion ≠ Export | ✅ نعم | منفصلان في API/DB/PRD/Backlog |
| Reverse Proxy محسوم | ✅ نعم | Caddy في كل مكان |
| QA tools موحدة | ✅ نعم | Vitest + Playwright |
| Cost language دقيق | ✅ نعم | free-first بدون ادعاءات مطلقة |
| Phase 1 واقعي | ✅ نعم | Foundation فقط |
| Launch Readiness مطابق MVP | ✅ نعم | 4 مستويات |
| ADRs متوافقة | ✅ نعم | 17 ADR بدون تناقضات |
| Bucket naming موحد | ✅ نعم | ibn-al-azhar-docs-files |

---

## ملحق V4.1 — توافق العلامة التجارية والبنية التحتية — 2026-05-18

### تناقضات تم حلها في V4.1

| # | التناقض | الحالة في V4 | القرار في V4.1 | الملفات المتأثرة |
|---|---------|-------------|---------------|------------------|
| 1 | اللون الأساسي Emerald #10B981 vs Green #16A34A | غير محدد | #16A34A (رسمي من دليل الهوية البصرية) | 04, 05, 22, 29, 33 |
| 2 | الخط العربي IBM Plex Sans Arabic vs Cairo | غير محدد | Cairo (رسمي من دليل الهوية البصرية) | 04, 05, 13, 22, 29, 33 |
| 3 | مصطلح Sprint 1 vs Phase 1 | Sprint 1 | Phase 1 (V4.1+) | 02, 11, 12, 13, 14, 16, 18, 19, 21, 22, 23, 24, 25, 26, 30, 31, 32, 33 |
| 4 | عدم وجود لون Heritage Gold | مفقود | #CA8A04 (رسمي من دليل الهوية البصرية) | 04, 28, 29 |
| 5 | عدم وجود استراتيجية استضافة مفصلة | مفقود | 30_HOSTING_AND_DEPLOYMENT_OPTIONS.md | جديد |
| 6 | عدم وجود Docker-First رسمي | ضمني | ADR-019 + تحديثات DevOps/Technical | 05, 10, 22 |
| 7 | عدم وجود Spec Kit workflow | مفقود | 31_SPEC_KIT_WORKFLOW.md + ADR-020 | جديد |
| 8 | عدم وجود Impeccable workflow | مفقود | 32_IMPECCABLE_DESIGN_WORKFLOW.md + ADR-021 | جديد |
| 9 | عدم وجود خط أنابيب أصول | مفقود | 33_ASSET_PIPELINE.md | جديد |
| 10 | عدم وجود دليل تطبيق العلامة التجارية | مفقود | 29_BRAND_IMPLEMENTATION_GUIDE.md | جديد |

### أسئلة مفتوحة متبقية

| # | السؤال | الأولوية | المسؤول |
|---|--------|---------|---------|
| 1 | هل @serwist/next متوافق مع Next.js 16؟ | عالية | Tech Lead |
| 2 | أي مزود استضافة Full-stack مجاني مناسب لـ MVP؟ | عالية | DevOps |
| 3 | هل Impeccable متاح للتثبيت في البيئة؟ | متوسطة | Frontend |
| 4 | هل أصول الشعار متوفرة بصيغة SVG؟ | عالية | Design |
| 5 | هل Cairo font WOFF2 weights (400/700/800) متوفرة للاستضافة الذاتية؟ | متوسطة | Frontend |

### حالة المشروع بعد V4.1

**CONDITIONAL GO** — المشروع جاهز تقنيًا لبدء المرحلة 1 مع الشروط التالية:
1. التحقق من توافق @serwist/next أو استخدام بديل
2. تأمين أصول الشعار الرسمية
3. اختيار مزود استضافة MVP
4. تثبيت وتحقق من Impeccable
