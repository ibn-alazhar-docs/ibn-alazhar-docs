# سجل تغييرات V4 — Ibn Al-Azhar Docs

> إصدار: 4.0 | تاريخ: 2025-03-05

---

## Added

- ADR-016: Auth Model — NextAuth.js v5 JWT strategy (24h)
- ADR-017: Export Model — Conversion ≠ Export separation
- 23_FINAL_CONSISTENCY_REPORT.md — تقرير التناسق النهائي
- 24_V4_CHANGELOG.md — هذا الملف
- 25_GO_NO_GO_REVIEW.md — مراجعة Go/No-Go
- 26_PHASE_1_EXECUTION_CHECKLIST.md — قائمة تنفيذ Phase 1
- 27_MVP_SCOPE_LOCK.md — قفل نطاق MVP
- 28_TERMINOLOGY_AND_NAMING_STANDARD.md — معيار التسمية والمصطلحات
- Export table في Database Schema (منفصل عن ConvertedFile)
- POST /api/exports endpoints في API Spec
- D-2025-03-05-V4-01 عبر D-2025-03-05-V4-13 في Decision Log

## Changed

- اسم المشروع: مستند/DocEd → Ibn Al-Azhar Docs — ابن الأزهر دوكس
- Repository: doced → ibn-al-azhar-docs
- Package scope: doced → @ibn-al-azhar-docs
- Database: doced → ibn_al_azhar_docs
- Docker containers: doced-* → ibn-al-azhar-docs-*
- MinIO bucket: doced-files → ibn-al-azhar-docs-files
- PWA cache: doced-v1 → ibn-al-azhar-docs-v1
- Auth model: access_token(15min)+refresh_token(7days) → NextAuth.js v5 JWT (24h)
- API: POST /api/auth/refresh → GET /api/auth/session (NextAuth built-in)
- Cookie name: access_token → next-auth.session-token
- SameSite: Strict → Lax (NextAuth default)
- File size limit: 50MB → 100MB (مUnified per ADR-014)
- ShareLink token: UUID/sh_+24chars → crypto.randomBytes(32).hex (64 chars)
- ShareLink DB field: VarChar(30) → VarChar(128)
- Conversion API: format parameter removed from POST /api/conversions
- QA tools: Jest → Vitest + React Testing Library
- Cost language: "مجاني بالكامل" → "free-first"
- Concurrent sessions: 3 → 5 per user
- Launch Readiness: single checklist → 4-tier (Required/Recommended/Post-MVP/Enterprise)
- Q01 (Caddy): تأكيد كقرار نهائي
- Q02 (100MB): تأكيد كقرار نهائي
- Q03 (@serwist/next): Resolved Provisionally
- Q07 (First admin): Resolved — seed script
- Q13 (Monorepo): Resolved — pnpm workspaces only
- Q16 (Auth sessions): Resolved — NextAuth JWT
- Q19 (CORS): Resolved — Same-origin + specific origins
- Q20 (Password): Resolved — 8 chars + complexity + blacklist

## Removed

- access_token/refresh_token flow من Security Privacy doc
- format parameter من POST /api/conversions
- sh_ prefix من ShareLink token description
- Nginx كبديل لـ Caddy في DevOps doc
- Jest كأداة اختبار من جميع الملفات
- ادعاءات "مجاني بالكامل" من Cost doc
- Combined Conversion+Export concept

## Fixed

- التناقض بين Technical Design (50MB) وPRD (100MB) → 100MB موحد
- التناقض بين Security (access/refresh) وTechnical Design (NextAuth JWT) → NextAuth JWT
- التناقض بين DB Schema (VarChar(30) token) وSecurity (256-bit) → VarChar(128) + 64 hex
- التناقض بين Concurrent sessions (3 vs 5) → 5
- التناقض بين SameSite (Strict vs Lax) → Lax
- التناقض بين QA tools (Jest vs Vitest) → Vitest

## Deferred

- OCR محلي (Tesseract) ← V2
- تصدير Markdown/HTML ← V2
- البحث بالنص الكامل ← V2
- تتبع الإصدارات ← V2
- معاينة PDF ← V2
- المشاركة مع مستخدمين محددين ← V2
- واجهة برمجة تطبيقات عامة ← V3
- نظام المؤسسات ← V3
- الإشعارات Push ← V3
- Dark Mode ← Post-MVP
- Prisma Accelerate ← Post-MVP
- Background Sync ← Post-MVP

---

## V4.1 — Brand, Hosting, Docker, Spec Kit, Impeccable — 2026-05-18

### Added (ملفات جديدة)
- `29_BRAND_IMPLEMENTATION_GUIDE.md` — دليل تطبيق الهوية البصرية الرسمية (ألوان #16A34A/#CA8A04، خط Cairo، نغمة النصوص، أمثلة)
- `30_HOSTING_AND_DEPLOYMENT_OPTIONS.md` — تحليل شامل لخيارات الاستضافة المجانية مع جدول مقارنة 11 مزود
- `31_SPEC_KIT_WORKFLOW.md` — سير عمل Spec-Driven Development مع هيكل مجلدات specs/
- `32_IMPECCABLE_DESIGN_WORKFLOW.md` — سير عمل Impeccable لمراجعة جودة التصميم (Brand/Product mode)
- `33_ASSET_PIPELINE.md` — خط أنابيب الأصول (شعار، أيقونات PWA، خطوط، favicon)
- `ADR-018-hosting-strategy.md` — قرار استضافة مجانية أولاً
- `ADR-019-docker-container-first.md` — قرار Docker-first
- `ADR-020-spec-kit-workflow.md` — قرار Spec-Driven Development
- `ADR-021-impeccable-design-quality.md` — قرار Impeccable لجودة التصميم

### Changed (تغييرات)
- اللون الأساسي من Emerald #10B981 إلى Primary Green #16A34A في جميع الملفات
- إضافة لون Heritage Gold #CA8A04 كألوان تمييزي رسمي
- الخط العربي من IBM Plex Sans Arabic إلى Cairo في جميع الملفات
- تغيير مصطلح "Sprint 1" إلى "Phase 1" عبر جميع الملفات
- تغيير اسم `13_SPRINT_1_PLAN.md` إلى `13_PHASE_1_PLAN.md`
- تغيير اسم `26_SPRINT_1_EXECUTION_CHECKLIST.md` إلى `26_PHASE_1_EXECUTION_CHECKLIST.md`
- إضافة الشعار الرسمي "في بيت كل طالب أزهري" ووعد العلامة التجارية
- تحديث 04_UI_DESIGN_SYSTEM.md بمقياس ألوان Green-600 وألوان Heritage Gold
- تحديث 27_MVP_SCOPE_LOCK.md بعناصر البنية التحتية والعلامة التجارية V4.1
- تحديث 25_GO_NO_GO_REVIEW.md بفحوصات إضافية (Brand, Hosting, Docker, Spec Kit, Impeccable)
- تحديث 13_PHASE_1_PLAN.md بسيناريو عرض تقديمي ومخرجات محدّثة
- تحديث 22_REPO_STRUCTURE.md بهيكل specs/ و docker/ وملفات Docker الجذرية
- تحديث 10_DEVOPS_DEPLOYMENT.md بفلسفة Docker-First ومتغيرات بيئة موحدة
- تحديث 05_TECHNICAL_DESIGN.md بتحديثات العلامة التجارية وDocker-First وSpec Kit
- تحديث 15_DOCUMENTATION_PLAN.md بملفات V4.1 وADRs
- تحديث 21_CONTRIBUTING.md بقراءات مطلوبة للدليلين 29 و31
- تحديث 28_TERMINOLOGY_AND_NAMING_STANDARD.md بمصطلحات العلامة التجارية والمراحل

### Fixed (إصلاحات)
- إصلاح تناقض اللون الأساسي (Emerald vs Green) — اعتماد #16A34A الرسمي
- إصلاح تناقض الخط العربي — اعتماد Cairo الرسمي
- إصلاح مصطلح Sprint 1 → Phase 1 عبر جميع الملفات
- إضافة لون Heritage Gold #CA8A04 المفقود من V4

### Deferred (مؤجل)
- التحقق من تثبيت Impeccable (needs-verification)
- التحقق من خيارات الاستضافة الكاملة (needs-verification)
- التحقق من توافق @serwist/next مع Next.js 16 (needs-verification)
- الوضع الداكن (مؤجل لـ Phase 2+)
- OCR محلي عبر Tesseract (مؤجل لـ Phase 2+)
