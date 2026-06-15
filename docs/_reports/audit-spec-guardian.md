# تقرير تدقيق Spec-Guardian

> **التاريخ:** 2026-05-24  
> **المراجع:** AI Agent (Spec-Guardian)  
> **النطاق:** جميع ملفات `specs/` و `docs/ADR/` في مشروع Ibn-Al-Azhar Docs  
> **التقييم العام:** ⚠️ **تحذير (Warning)**

---

## 1. ملخص العدد

| العنصر | العدد المتوقع | العدد الفعلي | الحالة |
|--------|--------------|-------------|--------|
| ملفات `specs/*/spec.md` | 10 | 10 | ✅ صحيح |
| ملف `specs/INDEX.md` | 1 | 1 | ✅ صحيح |
| ملفات `docs/ADR/ADR-0*.md` | 22 | 22 | ✅ صحيح |
| **المجموع** | **33** | **33** | ✅ صحيح |

العدد الإجمالي للملفات صحيح. لكن **المحتوى** يعاني من ثغرات جوهرية.

---

## 2. الثغرات المكتشفة (Gaps)

### 🔴 GAP-01: INDEX.md فارغ بالكامل
| الملف | `specs/INDEX.md` |
|-------|-----------------|
| **الوصف** | الملف موجود لكنه فارغ (0 lines). لا يحتوي على فهرس للمواصفات، ولا روابط، ولا ترتيب. |
| **الخطورة** | عالية |
| **التوصية** | كتابة INDEX.md يتضمن: جدول محتويات لجميع الـ 10 specs، رقم المرحلة لكل spec، حالة كل spec، روابط ADR المقابلة. |

---

### 🔴 GAP-02: 7 من أصل 10 specs فارغة أو شبه فارغة

| الملف | السطور الفعلية | السطور المفيدة | الحالة |
|-------|---------------|---------------|--------|
| `005-document-viewer/spec.md` | 47 | 0 (قالب فقط) | ⚠️ فارغ |
| `006-folder-tag-management/spec.md` | 47 | 0 (قالب فقط) | ⚠️ فارغ |
| `007-export-download/spec.md` | 47 | 0 (قالب فقط) | ⚠️ فارغ |
| `008-user-settings-preferences/spec.md` | 47 | 0 (قالب فقط) | ⚠️ فارغ |
| `009-search-filtering/spec.md` | 47 | 0 (قالب فقط) | ⚠️ فارغ |
| `010-share-links/spec.md` | 47 | 0 (قالب فقط) | ⚠️ فارغ |
| `001-auth-foundation/spec.md` | 18 | 10 (قائمة متطلبات فقط) | ⚠️ ناقص |
| `002-app-shell-rtl/spec.md` | 15 | 8 (قائمة متطلبات فقط) | ⚠️ ناقص |
| `003-file-upload/spec.md` | 18 | 10 (قائمة متطلبات فقط) | ⚠️ ناقص |
| `004-conversion-pipeline/spec.md` | 368 | 350+ (كامل ومفصل) | ✅ كامل |

**التوصية:** بناءً على نمط `004-conversion-pipeline`، يجب إكمال الـ specs الـ 9 الباقية بنفس المستوى من التفصيل: User Stories, Acceptance Criteria, UI States, Functional Requirements, Edge Cases, Schema Reference, API Contract, Security, Test Plan.

---

### 🔴 GAP-03: معظم الـ specs لا تشير إلى ADRs

| الملف | ADRs ذات الصلة | هل يشير إليها؟ |
|-------|---------------|---------------|
| `001-auth-foundation/spec.md` | ADR-016 (Auth Model), ADR-010 (Security) | ❌ لا |
| `002-app-shell-rtl/spec.md` | ADR-001 (PWA), ADR-009 (PWA Cache), ADR-011 (RTL-first) | ❌ لا |
| `003-file-upload/spec.md` | ADR-005 (MinIO), ADR-012 (Soft Delete), ADR-014 (File Size Limits) | ❌ لا |
| `004-conversion-pipeline/spec.md` | ADR-022, ADR-007, ADR-006, ADR-008, ADR-017 | ✅ نعم (ADR-022/007) |
| `005-document-viewer/spec.md` | (فارغ) | ❌ لا |
| `006-folder-tag-management/spec.md` | (فارغ) | ❌ لا |
| `007-export-download/spec.md` | ADR-017 (Export Model) | ❌ لا |
| `008-user-settings-preferences/spec.md` | (فارغ) | ❌ لا |
| `009-search-filtering/spec.md` | (فارغ) | ❌ لا |
| `010-share-links/spec.md` | ADR-015 (Public Share Links) | ❌ لا |

**التوصية:** إضافة قسم "المعمارية المرجعية" (Architecture Reference) في رأس كل spec، مشيراً إلى ADR(ات) المقابلة. على سبيل المثال:  
> `> **المعمارية المرجعية:** ADR-016, ADR-010`

---

### 🔴 GAP-04: ADR-022 بحالة "Proposed" لكن spec 004 مبني عليه بالكامل

| التفاصيل | القيمة |
|----------|--------|
| حالة ADR-022 | `Proposed` (لم يُقبل) |
| حالة spec 004 | `Draft` |
| اعتماد spec 004 على ADR-022 | **كامل** — pipeline مبني على Surya وفيه 13 FR و 368 سطراً |

**المخاطرة**: إذا لم يُقبل ADR-022، فإن spec 004 بأكمله سيحتاج إعادة كتابة.

**التوصية:**  
1. ترقية ADR-022 من `Proposed` إلى `Accepted` إذا كان القرار نهائياً.  
2. أو إضافة حاشية في spec 004 تفيد بأن المحتوى مرتبط بـ ADR-022 المقترح وقد يتغير.

---

### 🔴 GAP-05: ADR-018 بحالة "Proposed / Needs Verification"

| التفاصيل | القيمة |
|----------|--------|
| حالة ADR-018 | `Proposed / Needs Verification` |
| التأثير | استراتيجية الاستضافة متعددة المراحل غير مقفلة |

**التوصية:** إكمال التحقق المطلوب (Cloudflare Pages, Render, Oracle Cloud verification matrix) وترقية ADR-018 إلى `Accepted` أو `Rejected` مع توثيق السبب.

---

### 🔴 GAP-06: انحراف المرحلة (Phase Misalignment) في specs 009 و 010

| الملف | المرحلة في spec | موقع الميزة في MVP |
|-------|----------------|-------------------|
| `009-search-filtering/spec.md` | **Phase 2** | MVP يذكر "بحث أساسي في أسماء الملفات والمجلدات" في النطاق |
| `010-share-links/spec.md` | **Phase 2** | MVP يذكر المشاركة كاملة في النطاق |

**المشكلة:** الـ specs مصنفة في Phase 2 بينما MVP يطلب هذه الميزات في النطاق الحالي. هذا تناقض.

**التوصية:** توحيد المراجع — إما تحديث الـ specs إلى Phase 1 (إذا كانت الميزات ضمن النطاق الحالي) أو تحديث MVP Scope Lock.

---

### 🟡 GAP-07: ميزات MVP غير مغطاة بأي spec

الميزات التالية مذكورة في `docs/27_MVP_SCOPE_LOCK.md` لكن ليس لها spec مخصص أو غير مفصلة في أي spec موجود:

| ميزة MVP | spec المقابل | ملاحظة |
|----------|-------------|--------|
| إعادة تسمية الملفات | 003-file-upload (غير مفصلة) | غير مذكورة |
| حذف ملفات (soft delete) | 003-file-upload (غير مفصلة) | غير مذكورة |
| استعادة من سلة المحذوفات | 003-file-upload (غير مفصلة) | غير مذكورة |
| تحميل الملف الأصلي | 003-file-upload (غير مفصلة) | غير مذكور |
| إنشاء مجلدات هرمية | 006-folder-tag-management (فارغ) | |
| نقل ملفات بين المجلدات | 006-folder-tag-management (فارغ) | |
| إدارة التحويل (إعادة محاولة، تقدم عبر SSE) | 004-conversion-pipeline (موجود جزئياً) | |
| لوحة إدارة (إحصائيات + إدارة مستخدمين) | **لا يوجد spec** | ❌ |
| تغيير أدوار المستخدمين (Admin) | **لا يوجد spec** | ❌ |
| تعطيل/تفعيل المستخدمين | **لا يوجد spec** | ❌ |
| PWA (Service Worker, Manifest, Install Prompt, Offline) | 002-app-shell-rtl (يذكر PWA فقط) | غير مفصلة |
| الإعدادات (DPI, التزامن, صيغ التصدير, فاصل الصفحات) | 008-user-settings-preferences (فارغ) | |
| Design Tokens + shadcn/ui + Tailwind | 002-app-shell-rtl (غير مذكورة) | غير مذكورة |
| تبديل اللغة (عربي/إنجليزي) | 002-app-shell-rtl (غير مذكور) | غير مذكور |

**التوصية:** إضافة spec جديد لـ "Admin Panel" أو دمجها مع spec 001 (Auth). إكمال specs 002 و 003 و 006 و 008 لتغطية جميع ميزات MVP المذكورة.

---

### 🟡 GAP-08: FRs في معظم الـ specs غير قابلة للقياس

| spec | FRs موجودة؟ | قابلة للقياس؟ |
|------|------------|--------------|
| 001-auth-foundation | 5 checkboxes | ❌ — لا معايير قبول، لا حدود زمنية |
| 002-app-shell-rtl | 5 checkboxes | ❌ — لا معايير قبول |
| 003-file-upload | 5 checkboxes | ❌ — لا معايير قبول |
| 004-conversion-pipeline | 13 FRs (FR-001 to FR-013) | ✅ — معايير واضحة (30 دقيقة TTL، 3 retries، 100 صفحة حد أقصى...) |
| 005-010 | لا توجد FRs | — |

**التوصية:** تحويل جميع checkboxes في specs 001-003 إلى FRs مرقمة مع معايير قياسية (أرقام، حدود زمنية، شروط قبول). اتباع نمط spec 004.

---

### 🟡 GAP-09: لا يوجد spec لـ "لوحة الإدارة" (Admin Panel)

ميزة "لوحة إدارة أساسية (إحصائيات + إدارة مستخدمين)" مذكورة بوضوح في MVP Scope Lock، لكن لا يوجد أي spec يغطيها:
- لا spec 001 يذكر لوحة إدارة
- لا spec مستقل موجود

هذه ميزة كاملة (API endpoints + UI + صلاحيات) وتحتاج spec خاص بها.

**التوصية:** إما إنشاء `specs/011-admin-panel/spec.md` أو دمجها مع spec 001-auth-foundation.

---

## 3. قائمة ADRs التي ليس لها spec مقابل مباشر

بعض ADRs بطبيعتها لا تحتاج spec (قرارات بنية تحتية أو منهجية). لكن هذه تحتاج على الأقل إشارة في spec موجود:

| ADR | spec محتمل | هل يشير إليه؟ |
|-----|-----------|--------------|
| ADR-001 (PWA-first) | 002-app-shell-rtl | ❌ |
| ADR-009 (PWA Cache Boundaries) | 002-app-shell-rtl | ❌ |
| ADR-011 (Arabic-first/RTL-first) | 002-app-shell-rtl | ❌ |
| ADR-005 (Object Storage) | 003-file-upload | ❌ (يذكر MinIO لكن لا يشير إلى ADR-005) |
| ADR-012 (Soft Delete) | 003-file-upload | ❌ |
| ADR-014 (File Size Limits) | 003-file-upload | ❌ |
| ADR-016 (Auth Model) | 001-auth-foundation | ❌ |
| ADR-017 (Export Model) | 007-export-download | ❌ |
| ADR-015 (Public Share Links) | 010-share-links | ❌ |

ADRs التي لا تحتاج spec مباشر (قرارات بنية تحتية/منهجية):
- ADR-002 (Frontend Stack)
- ADR-003 (Backend Stack)
- ADR-004 (Database & ORM)
- ADR-006 (Job Queue)
- ADR-008 (Progress Updates)
- ADR-010 (Security Baseline)
- ADR-013 (Self-Hosting/Free-First)
- ADR-018 (Hosting Strategy) — مقترح
- ADR-019 (Docker Container-First)
- ADR-020 (Spec Kit Workflow)
- ADR-021 (Impeccable Design Quality)

---

## 4. قائمة specs التي ليس لها ADR مرجعي

| الملف | ADRs المطلوبة |
|-------|--------------|
| `001-auth-foundation/spec.md` | ADR-016, ADR-010 |
| `002-app-shell-rtl/spec.md` | ADR-001, ADR-009, ADR-011 |
| `003-file-upload/spec.md` | ADR-005, ADR-012, ADR-014 |
| `004-conversion-pipeline/spec.md` | ✅ ADR-022 (موجود) |
| `005-document-viewer/spec.md` | لا توجد ADRs ذات صلة مباشرة |
| `006-folder-tag-management/spec.md` | لا توجد ADRs ذات صلة مباشرة |
| `007-export-download/spec.md` | ADR-017 (مفقود) |
| `008-user-settings-preferences/spec.md` | لا توجد ADRs ذات صلة مباشرة |
| `009-search-filtering/spec.md` | لا توجد ADRs ذات صلة مباشرة |
| `010-share-links/spec.md` | ADR-015 (مفقود) |

---

## 5. جدول التقييم التفصيلي لكل spec

| Spec | الحالة | ADR مرجعي | FRs قابلة للقياس | UI States | API Contract | Test Plan | Security |
|------|--------|----------|-----------------|-----------|-------------|-----------|----------|
| INDEX.md | ❌ فارغ | — | — | — | — | — | — |
| 001 | ⚠️ ناقص | ❌ لا | ❌ غير قابلة | ❌ | ❌ | ❌ | ❌ |
| 002 | ⚠️ ناقص | ❌ لا | ❌ غير قابلة | ❌ | ❌ | ❌ | ❌ |
| 003 | ⚠️ ناقص | ❌ لا | ❌ غير قابلة | ❌ | ❌ | ❌ | ❌ |
| 004 | ✅ كامل | ✅ ADR-022 | ✅ قابلة | ✅ 6 حالات | ✅ | ✅ | ✅ FR-009/013 |
| 005 | ❌ فارغ | ❌ لا | ❌ | ❌ | ❌ | ❌ | ❌ |
| 006 | ❌ فارغ | ❌ لا | ❌ | ❌ | ❌ | ❌ | ❌ |
| 007 | ❌ فارغ | ❌ لا | ❌ | ❌ | ❌ | ❌ | ❌ |
| 008 | ❌ فارغ | ❌ لا | ❌ | ❌ | ❌ | ❌ | ❌ |
| 009 | ❌ فارغ | ❌ لا | ❌ | ❌ | ❌ | ❌ | ❌ |
| 010 | ❌ فارغ | ❌ لا | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 6. التوصيات مُرتَّبة حسب الأولوية

### الأولوية العاجلة (P0)

| # | التوصية | الملفات المتأثرة |
|---|---------|-----------------|
| 1 | ترقية ADR-022 من `Proposed` إلى `Accepted` | ADR-022, spec 004 |
| 2 | إكمال `specs/INDEX.md` بفهرس كامل لجميع الـ specs | INDEX.md |
| 3 | إكمال spec 001-auth-foundation: إضافة FRs, API contract, قبول ADR-016 | 001-auth-foundation |
| 4 | إكمال spec 003-file-upload: إضافة FRs للـ soft delete, سلة المحذوفات, تحميل, إعادة تسمية | 003-file-upload |
| 5 | تصحيح Phase alignment لـ specs 009 و 010 (Phase 2 → Phase 1 إن كانت في MVP) | 009, 010 |

### أولوية عالية (P1)

| # | التوصية | الملفات المتأثرة |
|---|---------|-----------------|
| 6 | إكمال spec 002-app-shell-rtl: PWA تفاصيل, RTL-first, تبديل لغة, Design Tokens | 002-app-shell-rtl |
| 7 | إكمال spec 006-folder-tag-management: إدارة المجلدات الهرمية, نقل ملفات | 006-folder-tag-management |
| 8 | إكمال spec 007-export-download: ربط بـ ADR-017, API contract للـ Export | 007-export-download |
| 9 | إكمال spec 008-user-settings-preferences: DPI, تزامن, صيغ تصدير افتراضية | 008-user-settings-preferences |
| 10 | إكمال spec 010-share-links: ربط بـ ADR-015, صلاحيات, انتهاء صلاحية | 010-share-links |

### أولوية متوسطة (P2)

| # | التوصية | الملفات المتأثرة |
|---|---------|-----------------|
| 11 | إنشاء spec جديد للوحة الإدارة (Admin Panel) أو دمجه مع 001 | جديد |
| 12 | إكمال spec 005-document-viewer | 005-document-viewer |
| 13 | إكمال spec 009-search-filtering | 009-search-filtering |
| 14 | ترقية ADR-018 من `Proposed` إلى `Accepted` بعد التحقق | ADR-018 |

### أولوية منخفضة (P3)

| # | التوصية | الملفات المتأثرة |
|---|---------|-----------------|
| 15 | إضافة روابط ADR في رأس كل spec (حقل "المعمارية المرجعية") | جميع specs |
| 16 | إعادة تسمية "document-viewer" إلى شيء أكثر دقة (مثل "document-preview") | 005-document-viewer |
| 17 | توحيد تنسيق الرأس بين جميع specs (بعضها يستخدم `> **Status:**` والبعض `- **Status**:`) | جميع specs |

---

## 7. ملخص التقييم

| المحور | التقييم | التفاصيل |
|--------|---------|----------|
| عدد الملفات | ✅ ناجح | 33/33 ملفاً موجوداً |
| اكتمال المحتوى | ⚠️ تحذير | 1 فقط كامل من 10 specs (004) |
| ربط ADR → Spec | ⚠️ تحذير | 9 ADRs لها specs مقابلة لكن لا إشارات متبادلة |
| قابلية قياس FRs | ❌ فشل | 9 من 10 specs بدون FRs قابلة للقياس |
| توافق المرحلة | ⚠️ تحذير | specs 009 و 010 في Phase 2 بينما MVP يطلبهما |
| تغطية MVP | ⚠️ تحذير | ميزات كاملة (Admin Panel, PWA تفاصيل) بدون أي spec |
| حالة ADRs | ⚠️ تحذير | 2 ADRs (018, 022) بحالة Proposed |

### ⚠️ التقييم العام: تحذير (Warning)

المشروع يملك الهيكل الصحيح من حيث عدد الملفات، لكن **90% من الـ specs غير مكتملة** و **100% من الـ specs (عدا 004) لا تربط بـ ADRs**. هذا يعني أن آلية التتبع بين القرارات المعمارية والمواصفات منقطعة. هناك أيضاً تناقض في تحديد المراحل (Phase 1 vs Phase 2).

**الحد الأدنى المطلوب للوصول إلى حالة "ناجح":**
1. إكمال INDEX.md
2. إكمال specs 001, 002, 003 بنفس مستوى جودة spec 004
3. إضافة روابط ADR إلى specs 001, 002, 003, 007, 010
4. ترقية ADR-022 و ADR-018 إلى `Accepted`
5. حل تناقض المرحلة في specs 009 و 010

---

## 8. ملحق: حالة كل ADR

| ADR | الحالة | له spec مقابل؟ | spec يشير إليه؟ |
|-----|--------|---------------|----------------|
| ADR-001 (PWA-first) | ✅ Accepted | جزئي (002) | ❌ |
| ADR-002 (Frontend Stack) | ✅ Accepted | لا يحتاج | — |
| ADR-003 (Backend Stack) | ✅ Accepted | لا يحتاج | — |
| ADR-004 (Database & ORM) | ✅ Accepted | لا يحتاج | — |
| ADR-005 (Object Storage) | ✅ Accepted | 003-file-upload | ❌ |
| ADR-006 (Job Queue) | ✅ Accepted | لا يحتاج | — |
| ADR-007 (OCR Strategy) | ⚠️ Superseded | — | — (بواسطة ADR-022) |
| ADR-008 (Progress Updates) | ✅ Accepted | لا يحتاج | — |
| ADR-009 (PWA Cache) | ✅ Accepted | جزئي (002) | ❌ |
| ADR-010 (Security Baseline) | ✅ Accepted | لا يحتاج | — |
| ADR-011 (RTL-first) | ✅ Accepted | 002-app-shell-rtl | ❌ |
| ADR-012 (Soft Delete) | ✅ Accepted | 003-file-upload | ❌ |
| ADR-013 (Self-Hosting) | ✅ Accepted | لا يحتاج | — |
| ADR-014 (File Size Limits) | ✅ Accepted | 003-file-upload | ❌ |
| ADR-015 (Public Share Links) | ✅ Accepted | 010-share-links | ❌ |
| ADR-016 (Auth Model) | ✅ Accepted | 001-auth-foundation | ❌ |
| ADR-017 (Export Model) | ✅ Accepted | 007-export-download | ❌ |
| ADR-018 (Hosting Strategy) | ⚠️ Proposed | لا يحتاج | — |
| ADR-019 (Docker Container-First) | ✅ Accepted | لا يحتاج | — |
| ADR-020 (Spec Kit Workflow) | ✅ Accepted | لا يحتاج | — |
| ADR-021 (Impeccable Design) | ✅ Accepted | لا يحتاج | — |
| ADR-022 (OCR Local Surya) | ⚠️ Proposed | 004-conversion-pipeline | ✅ |

---

*— نهاية التقرير —*
