# تقرير تدقيق RTL — RTL Auditor

> **التاريخ:** 2026-05-24  
> **المرحلة:** Phase 0 (توثيق وتخطيط)  
> **التقييم العام:** ⚠️ **تحذير (Warning)** — توثيق ممتاز مع بعض التناقضات الداخلية  
> **الجهة المدققة:** وكيل RTL-auditor  

---

## 1. الملخص التنفيذي

المشروع يُظهر التزاماً واضحاً بـ **RTL-first** و **Arabic-first** على مستوى التوثيق. الوثائق الأساسية (ADR-011، نظام التصميم، دليل العلامة التجارية) تحتوي على توجيهات RTL شاملة ومفصلة. تم العثور على **3 تناقضات رئيسية** بين الوثائق يجب حلها قبل Phase 1، و**4 فجوات** في الاستعداد التقني متوقعة لمرحلة التوثيق لكن يجب تخطيطها.

---

## 2. تحليل الوثائق

### 2.1 ADR-011: Arabic-first / RTL-first Design ✅

| البند | الحالة | ملاحظات |
|-------|--------|---------|
| قرار RTL-first | ✅ واضح | التصميم يبدأ بالعربية، LTR لاحق |
| CSS Logical Properties | ✅ مذكور | `inline-start`/`inline-end` بدل `left`/`right` |
| next-intl | ✅ مذكور | لإدارة الترجمة والتعددية اللغوية |
| dir="rtl" على root | ✅ مذكور | `dir="rtl"` و `lang="ar"` |
| Tailwind RTL Plugin | ✅ مذكور | استخدام `rtl:` variant |
| اختبار RTL أولاً | ✅ مذكور | RTL هو الافتراضي في القوالب والاختبارات |
| ESLint rules | ⚠️ مخطط | مذكور في Follow-up لكن لم يُنفذ بعد (متوقع في Phase 0) |
| RTL Style Guide | ⚠️ مخطط | مذكور في Follow-up لكن لم يُكتب بعد |

**التوصية:** ADR-011 هو أقوى وثيقة RTL في المشروع. لا تغييرات مطلوبة حاليًا.

---

### 2.2 docs/04_UI_DESIGN_SYSTEM.md ✅ مع ⚠️

#### نقاط القوة:
- القسم 5 (Rules RTL الشاملة) ممتاز — يوضح الخصائص المنطقية وجدول تحويل كامل
- القسم 3.7 (نظام الأيقونات) يشرح آلية انعكاس الأيقونات في RTL بالتفصيل
- القسم 3.2 استخدم `text-start`/`text-end` و `ps-`/`pe-` للتباعد
- مكونات Button و Input تستخدم `iconPosition: 'start' | 'end'` (منطقي)

#### التناقضات المكتشفة:

| الموقع | المشكلة | خطورتها |
|--------|---------|---------|
| Line 104 `--color-primary-500: #16A34A` | تضع اللون الأساسي في `primary-500` بينما Brand Guide تضعه في `primary-600` | ⚠️ متوسطة |
| Line 134 `--color-success-500: #16A34A` | نفس المشكلة — `success-500` يجب أن يكون `#22C55E` حسب Brand Guide | ⚠️ متوسطة |
| Line 224-229 أوزان الخطوط | تستخدم `medium (500)` و `semibold (600)` المخالفة لـ Brand Guide الذي يمنعها | ⚠️ متوسطة |

**التوصية:** يجب تحديث `04_UI_DESIGN_SYSTEM.md` لتتوافق مع `29_BRAND_IMPLEMENTATION_GUIDE.md` (مصدر الحقيقة الأعلى).

---

### 2.3 docs/29_BRAND_IMPLEMENTATION_GUIDE.md ✅✅

| البند | الحالة | ملاحظات |
|-------|--------|---------|
| الألوان الرسمية | ✅ دقيقة | `#16A34A` للأخضر، `#CA8A04` للذهبي، `#1F2937` للنص، `#FFFFFF` للأبيض |
| تحذير Emerald | ✅ واضح | يمنع `#10B981` صراحة |
| خط Cairo | ✅ دقيق | استضافة ذاتية مع `@font-face` و `font-display: swap` |
| RTL للطباعة (3.8) | ✅ ممتاز | `dir="rtl"`, `text-start/end`, أرقام عربية-هندية |
| PWA manifest | ✅ ممتاز | `"dir": "rtl"`, `"lang": "ar"` |
| Tailwind v4 @theme | ✅ دقيق | مع أمثلة استخدام |
| هرم مصادر الحقيقة | ✅ واضح | Brand PDF > هذا الدليل > UI Design System |

**ملاحظة:** هذا الدليل هو **أفضل وثيقة** في المشروع من حيث الدقة والتفصيل.

---

### 2.4 `.opencode/skills/arabic-rtl/SKILL.md` ❌ تناقض

| السطر | المكتوب | الصحيح | خطورة |
|-------|---------|--------|-------|
| Line 31 | `Primary: Cairo (Google Fonts)` | Cairo مُستضاف **ذاتياً** وليس عبر Google Fonts CDN | ❌ عالية |
| Line 32 | `Load with next/font/google` | يجب أن يكون تحميلاً ذاتياً عبر `@font-face` | ❌ عالية |

**التوصية:** تحديث المهارة لتتوافق مع `29_BRAND_IMPLEMENTATION_GUIDE.md`:
```diff
- Primary: Cairo (Google Fonts)
- Load with next/font/google
- Apply to body and all text elements
+ Primary: Cairo (self-hosted, not Google Fonts CDN)
+ Load via @font-face in global CSS
+ font-display: swap for performance
+ Apply to body and all text elements
```

---

### 2.5 docker-compose.dev.yml ✅

لا توجد تعارضات متعلقة بـ RTL. الملف يحدد بنية تحتية فقط (PostgreSQL، Redis، MinIO) ولا يؤثر على اتجاه العرض.

---

### 2.6 docs/28_TERMINOLOGY_AND_NAMING_STANDARD.md ✅

| البند | الحالة | ملاحظات |
|-------|--------|---------|
| التسمية العربية | ✅ ممتاز | أسماء المنتج والمصطلحات كلها عربية |
| أسماء الجداول | ✅ جيد | عربية مع `@@map` إنجليزي مناسب |
| اسم المشروع | ✅ صحيح | `ibn-al-azhar-docs` متسق عبر السياقات |
| أسماء المحظورة | ✅ واضح | تمنع الأسماء القديمة الخطأ |
| هيكل src/ | ✅ جيد | `[locale]` في مسار التوجيه يدعم RTL/i18n |

---

### 2.7 pnpm-workspace.yaml ✅

هيكل سليم: `apps/*`، `packages/*`، `workers/*`. لا توجد تعارضات مع RTL.

---

## 3. التناقضات الرئيسية (يجب حلها قبل Phase 1)

### 🔴 التناقض 1: موقع اللون الأساسي (primary color level)

| الوثيقة | القيمة | المستوى |
|---------|--------|---------|
| `04_UI_DESIGN_SYSTEM.md` (line 104) | `--color-primary-500: #16A34A` | primary-500 |
| `29_BRAND_IMPLEMENTATION_GUIDE.md` (line 87-88) | `--color-primary-500: #22C55E`, `--color-primary-600: #16A34A` | primary-600 |

**الحل:** توحيد المرجع: `#16A34A` في `primary-600` (كما في Brand Guide).

### 🔴 التناقض 2: تحميل الخط (font loading strategy)

| الوثيقة | الطريقة |
|---------|---------|
| `.opencode/skills/arabic-rtl/SKILL.md` (line 32) | `next/font/google` |
| `29_BRAND_IMPLEMENTATION_GUIDE.md` (section 3.6) | استضافة ذاتية عبر `@font-face` |

**الحل:** تغيير المهارة لتستخدم الاستضافة الذاتية (self-hosting).

### 🟡 التناقض 3: أوزان الخطوط المسموحة

| الوثيقة | الأوزان |
|---------|---------|
| `04_UI_DESIGN_SYSTEM.md` (line 224-229) | 400, 500, 600, 700 |
| `29_BRAND_IMPLEMENTATION_GUIDE.md` (section 3.2) | 400, 700, 800 فقط — **يمنع 500 و 600** |

**الحل:** تحديث `04_UI_DESIGN_SYSTEM.md` لإزالة استخدام medium (500) و semibold (600).

---

## 4. الفجوات (Gaps) — يجب التخطيط لها في Phase 1

### 🟡 4.1 ESLint rules لـ RTL

ADR-011 (Follow-up) يذكر إنشاء ESLint rules تمنع `left`/`right` في CSS. لا يوجد ملف ESLint حتى الآن.

**التوصية لـ Phase 1:**
- إضافة `eslint-plugin-tailwindcss` مع rules:
  - `enforces-shorthand` (لاستخدام `ps-` بدل `pl-`/`pr-`)
  - منع `text-left`/`text-right` (يجب استخدام `text-start`/`text-end`)
  - منع `ml-`/`mr-` (يجب استخدام `ms-`/`me-`)

### 🟡 4.2 Tailwind CSS v4 RTL Configuration

لا يوجد ملف `app/globals.css` أو `tailwind.config.*` بعد. Brand Guide يوضح `@theme` blocks لكنها غير مطبقة.

**التوصية لـ Phase 1:**
- إعداد `@theme` في `globals.css` مع الألوان الرسمية (حسب Brand Guide)
- إضافة `@variant rtl (&:where([dir="rtl"] *))` للـ RTL variant
- استخدام `@config` مع إعدادات RTL

### 🟡 4.3 RTL Checklist للمطورين

لا يوجد checklist واضح للمطورين عند كتابة مكونات جديدة.

**التوصية لـ Phase 1:**
```markdown
## RTL Checklist للمكون الجديد
- [ ] `dir="rtl"` على root HTML (مضمون عالمياً)
- [ ] استخدام `ms-`/`me-` بدل `ml-`/`mr-`
- [ ] استخدام `ps-`/`pe-` بدل `pl-`/`pr-`
- [ ] استخدام `text-start`/`text-end` بدل `text-left`/`text-right`
- [ ] استخدام `start-*`/`end-*` بدل `left-*`/`right-*`
- [ ] الأيقونات الاتجاهية تنعكس في RTL
- [ ] Flexbox/Gird يستخدم `start`/`end` لا `left`/`right`
- [ ] شريط التمرير يعمل بشكل صحيح في RTL
- [ ] أُختبِر على متصفح عربي (Samsung Internet)
```

### 🟡 4.4 next-intl إعدادات RTL

مذكور في ADR-011 لكن لم يُجهز بعد. يحتاج:
- `i18n/ar.json` و `i18n/en.json`
- `next-intl` middleware مع توجيه RTL/LTR
- `locale`-based direction switching

---

## 5. نقاط القوة (Strengths)

1. **ADR-011** هو قرار معماري مبكر وحاسم — اتخاذه قبل كتابة سطر كود واحد يمنع تراكم ديون RTL
2. **توثيق شامل** — RTL موزع على 5+ وثائق بطرق مكرسة ومتداخلة
3. **استراتيجية الخطوط** — الاستضافة الذاتية لـ Cairo قرار صحيح (خصوصية، أداء، PWA)
4. **هرم مصادر الحقيقة** — واضح يمنع confusion: Brand Guide > UI Design System
5. **تحذير Emerald** — واضح يمنع استخدام `#10B981` (خطأ شائع)
6. **PWA Manifest** — يتضمن `dir: rtl` و `lang: ar` 
7. **RTL في OCR Pipeline** — مذكور في ADR-022 و specs بوعي كامل
8. **ترابط RTL عبر Ecosystem** — ADR، مهارة CodeRabbit، مهارة Playwright، Verification Engine
9. **مسارات Next.js** — `[locale]` في بنية المجلدات تدعم i18n بشكل طبيعي
10. **لا كود تطبيق مكتوب** — فرصة ذهبية لبناء RTL-first من البداية

---

## 6. توصيات لـ Phase 1 (حسب الأولوية)

| الأولوية | الإجراء | المرجع |
|----------|---------|--------|
| P0 | تحديث `.opencode/skills/arabic-rtl/SKILL.md` — Google Fonts → Self-hosted | البند 3 |
| P0 | توحيد `primary-500`/`primary-600` بين الوثائق | البند 3 |
| P0 | إزالة medium/semibold من `04_UI_DESIGN_SYSTEM.md` | البند 3 |
| P1 | إنشاء `globals.css` مع `@theme` للألوان الرسمية | Brand Guide 2.3 |
| P1 | إعداد ESLint مع قواعد RTL | ADR-011 |
| P1 | إعداد `next-intl` مع توجيه RTL/LTR | ADR-011 |
| P1 | إنشاء RTL Checklist للمطورين | التوصية 4.3 |
| P1 | كتابة RTL Style Guide | ADR-011 Follow-up |
| P2 | إعداد Playwright مع مشاريع RTL منفصلة | ADR-019 |
| P2 | إنشاء `scripts/verify-rtl.sh` للتحقق الآلي | — |
| P3 | إعداد Storybook مع RTL Preview | ADR-011 Follow-up |
| P3 | اختبار على Samsung Internet ومتصفحات عربية | ADR-011 Follow-up |

---

## 7. قائمة التحقق النهائية (Final Checklist)

### ✅ متوفر (جاهز)
- [x] ADR-011: RTL-first decision documented
- [x] UI Design System: RTL rules section
- [x] Brand Guide: RTL typography + font strategy
- [x] arabic-rtl skill defined
- [x] RTL in MEGA_SPEC covered
- [x] RTL in Playwright automation planned
- [x] RTL in verification engine planned
- [x] RTL in CodeRabbit review guide
- [x] PWA manifest with RTL config
- [x] Terminology standard: Arabic-first naming

### ❌ غير متوفر (يحتاج Phase 1)
- [ ] ESLint rules for RTL
- [ ] Tailwind CSS v4 RTL configuration
- [ ] next-intl setup with direction switching
- [ ] RTL Style Guide document
- [ ] RTL developer checklist
- [ ] RTL integration tests
- [ ] RTL Storybook preview
- [ ] Automated RTL verification script
- [ ] Cairo font files in `/public/fonts/`
- [ ] Icon RTL flip component

### ⚠️ يحتاج تنسيق
- [ ] Primary color level consistent across docs
- [ ] Font weights consistent across docs
- [ ] Font loading strategy consistent across docs

---

## 8. الخلاصة

```
التقييم العام: ⚠️ تحذير (Warning)
سبب التحذير:       تناقضات داخلية بين الوثائق الثلاث الرئيسية
الجاهزية للـ Phase 1: 85% (توثيق ممتاز، يحتاج تنسيقاً داخلياً)
المخاطر المتبقية:     منخفضة — لأن Phase 0 والتناقضات وثائقية وليست في الكود
```

المشروع في **حالة جيدة جداً** لمرحلة التوثيق. الـ RTL-first decision متخذ وموثق بوضوح. التناقضات الثلاثة المكتشفة بسيطة وسهلة الإصلاح. الفجوات الأربع متوقعة لمرحلة التوثيق.

**التوصية النهائية:** إصلاح التناقضات الداخلية قبل بدء Phase 1، وإنشاء ملفات الإعدادات الأساسية (CSS, ESLint, next-intl) كأول خطوة في Phase 1.
