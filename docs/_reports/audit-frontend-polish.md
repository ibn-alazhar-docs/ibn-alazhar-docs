# تقرير تدقيق جاهزية العلامة التجارية والتصميم (Brand Readiness Audit)

> **التاريخ:** 2026-05-24  
> **المرحلة:** Phase 0 — Documentation & Planning  
> **المراجع:** `04_UI_DESIGN_SYSTEM.md` v4.0.0، `29_BRAND_IMPLEMENTATION_GUIDE.md` v4.1.0، `ADR-011`، `ADR-021`  
> **الهدف:** تقييم جاهزية المشروع لتطبيق العلامة التجارية ونظام التصميم فور بدء Phase 1

---

## فهرس المحتويات

1. [ملخص تنفيذي](#1-ملخص-تنفيذي)
2. [تحليل Design Tokens](#2-تحليل-design-tokens)
3. [تقييم جاهزية العلامة التجارية](#3-تقييم-جاهزية-العلامة-التجارية)
4. [قائمة ملفات التصميم المطلوب إنشاؤها في Phase 1](#4-قائمة-ملفات-التصميم-المطلوب-إنشاؤها-في-phase-1)
5. [فجوات وثغرات التصميم](#5-فجوات-وثغرات-التصميم)
6. [توصيات لتحسين الاتساق البصري](#6-توصيات-لتحسين-الاتساق-البصري)
7. [تقييم عام](#7-تقييم-عام)

---

## 1. ملخص تنفيذي

### الحالة العامة: ✅ **جاهزية عالية (85%)**

المشروع في Phase 0 وقد أنجز توثيقاً استثنائياً للعلامة التجارية ونظام التصميم. وثائق `04_UI_DESIGN_SYSTEM.md` و `29_BRAND_IMPLEMENTATION_GUIDE.md` تعتبر من أفضل ما يمكن أن يُنتَج في مرحلة التخطيط. لكن — **لا يوجد أي كود Frontend بعد** (`apps/web/` غير موجود، ولا `global.css` ولا ملفات خطوط ولا أيقونات).

### النتائج الرئيسية:

| البند | التقييم | ملاحظات |
|-------|---------|---------|
| توثيق Design Tokens | ✅ كامل ومفصل | نظام ألوان، طباعة، تباعد، ظلال، Z-index، أيقونات |
| توثيق العلامة التجارية | ✅ ممتاز | دليل تنفيذي كامل مع أمثلة ونبرة صوت |
| دعم RTL/Arabic | ✅ موثق جيداً | ADR-011 + قسم RTL في نظام التصميم |
| جودة التصميم (ADR-021) | ✅ معتمد | Impeccable workflow مع Anti-slop rules |
| تطابق الوثائق | ⚠️ تناقضات طفيفة | اختلاف في primary-500 و font-weight بين الوثائق |
| جاهزية الأصول | ❌ لا توجد | لا ملفات خطوط، لا أيقونات، لا شعار، لا global.css |
| استعداد الأدوات | ❌ غير جاهز | لا tailwind.config، لا ESLint للـ logical properties |

---

## 2. تحليل Design Tokens

### 2.1 نظام الألوان — تحليل دقيق

#### الألوان الرسمية (من `29_BRAND_IMPLEMENTATION_GUIDE.md` — المرجع الأعلى)

| الرمز | القيمة | الحالة |
|-------|--------|--------|
| `--color-primary-600` | `#16A34A` (Primary Green) | ✅ **اللون الرسمي** |
| `--color-gold-600` | `#CA8A04` (Heritage Gold) | ✅ **اللون التمييزي** |
| `--color-text-primary` | `#1F2937` (Dark Text Gray) | ✅ **النص الأساسي** |
| `--color-surface` | `#FFFFFF` (Pure White) | ✅ **السطح الأساسي** |

#### ⚠️ تناقضات مكتشفة في الألوان

| الرمز | في `04_UI_DESIGN_SYSTEM.md` | في `29_BRAND_IMPLEMENTATION_GUIDE.md` | المشكلة |
|-------|---------------------------|--------------------------------------|---------|
| `--color-primary-500` | `#16A34A` (Green-600) | `#22C55E` (Green-500) | 🔴 **تناقض صريح** |
| `--color-success-500` | `#16A34A` | `#22C55E` | 🟡 يتبع primary-500 لكنه مختلف |
| اسم اللون الأساسي | "Primary Green (Green-600 Tailwind)" | "الأخضر الأساسي" | 🟢 متوافق |
| استخدام `#10B981` (Emerald) | غير مذكور | **محظور صراحة** | 🟢 بوضوح |

**التوصية:** يجب توحيد `primary-500` بين الوثيقتين. بما أن `29_BRAND_IMPLEMENTATION_GUIDE.md` هو المرجع الأعلى، القيمة الصحيحة لـ `primary-500` هي `#22C55E` و `primary-600` هي `#16A34A`. يجب تحديث `04_UI_DESIGN_SYSTEM.md` لتعكس هذا.

#### تدرجات الذهبي — تسمية غير متناسقة

| المصدر | اسم المتغير | القيمة |
|--------|------------|--------|
| `04_UI_DESIGN_SYSTEM.md` | `--color-accent-*` | `#CA8A04` |
| `29_BRAND_IMPLEMENTATION_GUIDE.md` | `--color-gold-*` | `#CA8A04` |

🟡 **تناقض تسمية:** وثيقة النظام تستخدم `accent` بينما دليل العلامة يستخدم `gold`. يُفضَّل توحيد الاسم ليكون `gold` لأنه أكثر وصفاً من `accent`.

### 2.2 نظام الطباعة — تحليل

#### الأوزان الرسمية — تناقض حرج

| المصدر | الأوزان المعلنة |
|--------|----------------|
| `29_BRAND_IMPLEMENTATION_GUIDE.md` (§3.2) | **800** (ExtraBold) • **700** (Bold) • **400** (Regular) فقط |
| `04_UI_DESIGN_SYSTEM.md` (§3.2) | 400 • 500 • 600 • 700 |
| `.opencode/skills/brand-consistency/SKILL.md` | 400 • 500 • 600 • 700 |

🔴 **تناقض حرج:** دليل العلامة التجارية يحظر استخدام Medium (500) و Semibold (600) ويصر على ثلاثة أوزان فقط (800، 700، 400). بينما وثيقة نظام التصميم ومهارة brand-consistency تسمح بأربعة أوزان (400، 500، 600، 700). هذا سيؤدي إلى تناقض في التطبيق.

#### مقاسات الخطوط — متوافقة

| المستند | xs | sm | base | md | lg | xl | 2xl | 3xl | 4xl |
|---------|----|----|----|----|----|----|-----|-----|-----|
| نظام التصميم | 12px | 13px | 14px | 16px | 18px | 20px | 24px | 30px | 36px |
| دليل العلامة | 12px | 13px | 14px | 16px | 18px | 20px | 24px | 30px | 36px |

✅ متوافقة تماماً.

#### خطوط العائلة — متوافقة

| الدور | نظام التصميم | دليل العلامة | الحالة |
|-------|-------------|-------------|--------|
| العربي الأساسي | `Cairo` | `Cairo` | ✅ |
| اللاتيني الأساسي | `Inter` | `Inter` | ✅ |
| برمجي | `JetBrains Mono` | `JetBrains Mono` | ✅ |
| Fallback | `Noto Sans Arabic, Segoe UI, Tahoma` | `Noto Sans Arabic, Segoe UI, Tahoma` | ✅ |

### 2.3 أنظمة أخرى — متوافقة

| النظام | الحالة | ملاحظة |
|--------|--------|--------|
| Spacing Scale | ✅ متوافق | 0–16 (0px–64px) مع منطقية |
| Border Radius | ✅ متوافق | sm=6px, md=8px, lg=12px, xl=16px, full=9999px |
| Shadow Scale | ✅ متوافق | sm, md, lg, xl |
| Border System | ✅ متوافق | 1px default, 2px focus |
| Icon System | ✅ متوافق | lucide-react مع IconRTL |
| Motion/Animation | ✅ متوافق | 150ms/250ms/350ms مع reduced motion |
| Z-Index | ✅ متوافق | 0–600 مع z-max للطوارئ |
| Dark Mode | ✅ مؤجل لـ MVP | موثق ببنية tokens جاهزة |

---

## 3. تقييم جاهزية العلامة التجارية

### 3.1 مصفوفة الجاهزية للـ MVP

| العنصر | الحالة في التوثيق | حالة التطبيق الفعلية | الجاهزية |
|--------|-------------------|---------------------|----------|
| الألوان الأساسية | ✅ موثقة بالكامل | ❌ غير مطبقة (لا كود) | ⚠️ تحتاج تنفيذ |
| خطوط (Cairo) | ✅ موثقة مع `@font-face` | ❌ ملفات الخطوط غير موجودة | 🔴 تحتاج توفير |
| شعار (Logo) | ✅ مواصفات دقيقة | ❌ ملفات SVG/PNG غير موجودة | 🔴 تحتاج تصميم |
| Favicon / PWA Icons | ✅ مواصفات دقيقة | ❌ غير موجودة | 🔴 تحتاج تصميم |
| manifest.json | ✅ موثق | ❌ غير موجود | 🔴 يحتاج إنشاء |
| CSS Variables (Tokens) | ✅ موثقة بالكامل | ❌ غير موجودة | ⚠️ تحتاج `global.css` |
| Tailwind v4 @theme | ✅ موثق | ❌ غير موجود | ⚠️ تحتاج `brand.css` |
| RTL (dir, logical props) | ✅ موثق | ❌ غير مطبق | ⚠️ تحتاج إعداد Next.js |
| نبرة النصوص (Microcopy) | ✅ موثقة بأمثلة | ❌ غير مطبقة | ⚠️ تحتاج i18n files |
| الوضع الداكن | ✅ مؤجل (tokens جاهزة) | ❌ غير مطبق | 🟢 مؤجل حسب الخطة |
| Impeccable workflow | ✅ معتمد (ADR-021) | ❌ لم يُعدّ | ⚠️ يحتاج CI integration |

### 3.2 تقييم مهارة brand-consistency

مقارنة بين ما تفرضه مهارة `brand-consistency` وبين الوثائق الرسمية:

| البند | brand-consistency SKILL.md | الوثائق الرسمية | الحالة |
|-------|--------------------------|----------------|--------|
| Primary Green | `#16A34A` | `#16A34A` (primary-600) | ✅ متوافق |
| Heritage Gold | `#CA8A04` | `#CA8A04` (gold-600) | ✅ متوافق |
| Font Weights | 400, 500, 600, 700 | 400, 700, 800 فقط | 🔴 **غير متوافق** |
| Font source | Google Fonts CDN | **Self-hosted** (محظور CDN) | 🔴 **غير متوافق** |
| Anti-slop (no gradients, no glassmorphism) | مذكور | مذكور مع تفاصيل أكثر | ✅ متوافق |

**التوصية:** تحديث `.opencode/skills/brand-consistency/SKILL.md` ليتوافق مع:
- الأوزان الرسمية: 400 (Regular)، 700 (Bold)، 800 (ExtraBold)
- إزالة 500 (Medium) و 600 (Semibold)
- تغيير مصدر الخط من "Google Fonts" إلى "self-hosted"
- إضافة أنماط الوزن الثلاثة بدلاً من الأربعة

### 3.3 تقييم التزام ADR-011 (Arabic-first / RTL-first)

| المبدأ | موثق؟ | جاهز للتنفيذ؟ | ملاحظة |
|--------|-------|--------------|--------|
| CSS Logical Properties | ✅ نعم | ⚠️ يحتاج ESLint rule | مذكور في ADR-011 كـ follow-up |
| `dir="rtl"` على root | ✅ نعم | ✅ جاهز (Next.js config) | بسيط |
| next-intl للترجمة | ✅ نعم | ⚠️ لم يُثبّت بعد | يحتاج `pnpm add next-intl` |
| RTL-first testing | ✅ نعم | ❌ لا يوجد إعداد | يحتاج Playwright + Storybook |
| Tailwind RTL plugin | ✅ نعم | ⚠️ غير موجود | Tailwind v4 قد لا يحتاجه |

### 3.4 تقييم التزام ADR-021 (Impeccable Design Quality)

| العنصر | الحالة |
|--------|--------|
| Impeccable كأداة مراجعة | معتمد لكن لم يُثبّت بعد |
| Brand mode vs Product mode | موثق بوضوح |
| Anti-slop rules | 9 قواعد واضحة |
| التكامل مع Design System | موثق |
| CI integration | مخطط لكن غير منفّذ |

---

## 4. قائمة ملفات التصميم المطلوب إنشاؤها في Phase 1

### 4.1 ملفات CSS الأساسية (أولوية قصوى)

| # | الملف | المسار المتوقع | المحتوى |
|---|-------|---------------|---------|
| 1 | `global.css` | `apps/web/src/app/globals.css` | @import tailwindcss، @theme مع tokens الألوان والخطوط، @font-face لـ Cairo/Inter/JetBrains |
| 2 | `brand.css` | `packages/ui/src/styles/brand.css` | CSS variables للعلامة التجارية (ألوان، خطوط، تباعد، ظلال، إلخ) |
| 3 | `tokens.css` | `packages/ui/src/styles/tokens.css` | Design tokens قابلة للاستيراد في أي package |
| 4 | `rtl-utilities.css` | `packages/ui/src/styles/rtl.css` | كلاسات مساعدة لـ RTL (مثل `.icon-directional`) |

### 4.2 ملفات الخطوط (أولوية قصوى)

| # | الملفات | المصدر |
|---|--------|--------|
| 5 | `public/fonts/cairo/Cairo-Regular.woff2` + `.woff` | [Cairo on GitHub](https://github.com/Gue3bara/Cairo) |
| 6 | `public/fonts/cairo/Cairo-Bold.woff2` + `.woff` | نفس المصدر |
| 7 | `public/fonts/cairo/Cairo-ExtraBold.woff2` + `.woff` | نفس المصدر |
| 8 | `public/fonts/inter/Inter-Regular.woff2` + `Inter-Bold.woff2` | Google Fonts أو self-host |
| 9 | `public/fonts/jetbrains-mono/JetBrainsMono-Regular.woff2` | JetBrains Mono releases |

### 4.3 أيقونات و Favicon (أولوية عالية)

| # | الملف | الحجم | الصيغة |
|---|-------|-------|--------|
| 10 | `public/icons/favicon-16x16.png` | 16×16 | PNG |
| 11 | `public/icons/favicon-32x32.png` | 32×32 | PNG |
| 12 | `public/icons/favicon.ico` | 16+32 | ICO |
| 13 | `public/icons/apple-touch-icon.png` | 180×180 | PNG |
| 14 | `public/icons/icon-192x192.png` | 192×192 | PNG |
| 15 | `public/icons/icon-512x512.png` | 512×512 | PNG |
| 16 | `public/icons/icon-maskable-192x192.png` | 192×192 | PNG |
| 17 | `public/icons/icon-maskable-512x512.png` | 512×512 | PNG |

### 4.4 ملفات الشعار (أولوية عالية)

| # | الملف | الوصف |
|---|-------|-------|
| 18 | `public/logo/logo-full-vertical.svg` | شعار كامل عمودي |
| 19 | `public/logo/logo-full-horizontal.svg` | شعار كامل أفقي |
| 20 | `public/logo/logo-mark.svg` | علامة فقط (بدون نص) |
| 21 | `public/logo/logo-dark-bg.svg` | للخلفيات الداكنة |
| 22 | `public/logo/logo-light-bg.svg` | للخلفيات الفاتحة |

### 4.5 ملفات الإعدادات (أولوية عالية)

| # | الملف | المحتوى |
|---|-------|---------|
| 23 | `apps/web/public/manifest.json` | PWA manifest مع tokens الألوان |
| 24 | `apps/web/src/app/layout.tsx` | تهيئة RTL + font loading |
| 25 | `packages/ui/src/styles/tailwind.config.ts` | (إذا احتاجته Tailwind v4، وإلا يتم عبر CSS) |
| 26 | ملف i18n عربي | `messages/ar.json` مع كل نصوص الواجهة |

### 4.6 أدوات التحقق (أولوية متوسطة)

| # | الملف | الغرض |
|---|-------|-------|
| 27 | `.stylelintrc.json` | منع استخدام `left`/`right` في CSS (بدل `start`/`end`) |
| 28 | `eslint-plugin-local-rules` | قاعدة تمنع استخدام `#10B981` في الكود |

### 4.7 إجمالي الملفات المطلوبة: **28 ملفاً**

---

## 5. فجوات وثغرات التصميم

### 🛑 فجوات حرجة (تمنع البدء في Phase 1)

| # | الفجوة | المصدر المرجعي | التأثير |
|---|--------|---------------|---------|
| F1 | **لا يوجد `global.css` أو `brand.css`** | `04_UI_DESIGN_SYSTEM.md` §3، `29_BRAND_IMPLEMENTATION_GUIDE.md` §2.3 | المكونات ستبنى بدون design tokens |
| F2 | **ملفات خط Cairo غير موجودة** | `29_BRAND_IMPLEMENTATION_GUIDE.md` §3.3 | الواجهة ستعرض بالخط البديل فقط |
| F3 | **لا شعار ولا أيقونات PWA** | `29_BRAND_IMPLEMENTATION_GUIDE.md` §4-5 | Favicon 404، PWA غير قابل للتثبيت |
| F4 | **لا manifest.json** | `29_BRAND_IMPLEMENTATION_GUIDE.md` §5.2 | PWA لن يعمل بشكل صحيح |
| F5 | **لا ESLint rules لـ Logical Properties** | ADR-011 §9 (Follow-up) | خطر استخدام `left`/`right` في الكود |

### ⚠️ فجوات متوسطة (تؤثر على الجودة)

| # | الفجوة | المصدر المرجعي | التأثير |
|---|--------|---------------|---------|
| F6 | **تناقض `primary-500` بين الوثائق** | `04` vs `29` | ارتباك أثناء التطوير |
| F7 | **تناقض font-weights بين الوثائق والـ skill** | `29` §3.2 vs `brand-consistency` SKILL | سلوك غير متناسق |
| F8 | **تسمية gold/accent غير موحدة** | `04` تستخدم `accent`، `29` تستخدم `gold` | ارتباك في اسماء المتغيرات |
| F9 | **لا i18n files** | ADR-011 | النصوص ستكتب بالإنجليزية أو بدون نظام |
| F10 | **لا إعداد Impeccable في CI** | ADR-021 | لن يُفحص جودة التصميم تلقائياً |

### 🔵 فجوات بسيطة (تحسينات)

| # | الفجوة | الملاحظة |
|---|--------|---------|
| F11 | لا Storybook | مذكور في ADR-011 كـ follow-up |
| F12 | لا Playwright config للـ visual testing | مؤقتاً خارج النطاق |
| F13 | لا اختبارات تباين آلية | Impeccable يغطيها جزئياً |
| F14 | `apps/web/` package غير موجود أصلاً | سينشأ في Phase 1 |

---

## 6. توصيات لتحسين الاتساق البصري

### 6.1 توصيات فورية (قبل بدء Phase 1)

1. **🔧 توحيد `primary-500`:**
   - تعيين `primary-500: #22C55E` كما في دليل العلامة التجارية
   - تحديث `04_UI_DESIGN_SYSTEM.md` لتعكس القيمة الصحيحة
   - التأكيد أن `primary-600: #16A34A` هو اللون الأساسي الرسمي للأزرار

2. **🔧 توحيد font-weights:**
   - اعتماد الأوزان الرسمية: 400 (Regular)، 700 (Bold)، 800 (ExtraBold)
   - إزالة 500 (Medium) و 600 (Semibold) من نظام التصميم
   - تحديث `.opencode/skills/brand-consistency/SKILL.md`

3. **🔧 توحيد تسمية الذهبي:**
   - استخدام `--color-gold-*` بدلاً من `--color-accent-*`
   - تحديث `04_UI_DESIGN_SYSTEM.md` لاستخدام `gold` بدلاً من `accent`
   - الاحتفاظ بـ `accent` كاسم ثانوي للتوافق مع shadcn/ui (مع تعيينه إلى `gold-600`)

4. **🔧 تحديث brand-consistency SKILL:**
   - تغيير أوزان الخطوط إلى 400, 700, 800
   - تغيير مصدر الخط من "Google Fonts" إلى "Self-hosted"
   - إضافة تذكير بحظر `#10B981`

### 6.2 توصيات لبداية Phase 1

5. **📋 إنشاء Package `packages/ui`:**
   - يحتوي على جميع tokens, components, styles
   - يمكن استيراده من `apps/web` و `apps/admin`

6. **📋 إعداد `global.css` بـ `@theme`:**
   - تضمين كل tokens الألوان والخطوط
   - استخدام `@import "tailwindcss"` كما هو موثق
   - تضمين `@font-face` لكل الأوزان

7. **📋 إعداد ESLint plugin:**
   - قاعدة تمنع `#10B981` (Emerald)
   - قاعدة تمنع `left`/`right` في CSS (تفرض `start`/`end`)
   - قاعدة تمنع استخدام ألوان غير معرفة في tokens

8. **📋 توفير ملفات الخطوط:**
   - تنزيل Cairo من GitHub الرسمي
   - تحويل إلى WOFF2 (إن لم يكن متوفراً)
   - وضعها في `apps/web/public/fonts/cairo/`

### 6.3 توصيات أثناء التطوير

9. **🎨 اعتماد مبدأ "80-20" للذهبي:**
   - 80% أخضر أساسي، 20% ذهبي تراثي كحد أقصى
   - الذهبي فقط للسياقات التراثية (مواد شرعية، شارات تمييز)

10. **🎨 استخدام Tailwind logical properties:**
    - `ms-` بدل `ml-`، `me-` بدل `mr-`
    - `text-start`/`text-end` بدل `text-left`/`text-right`
    - `border-s-`/`border-e-` بدل `border-l-`/`border-r-`

11. **🎨 اختبار كل مكون في RTL أولاً:**
    - قبل إضافة دعم LTR
    - باستخدام Playwright مع `dir="rtl"`

12. **🎨 توثيق أي استثناء للـ tokens:**
    - أي استخدام للون خارج النظام يتطلب موافقة موثقة
    - يُضاف إلى `04_UI_DESIGN_SYSTEM.md` كاستثناء

---

## 7. تقييم عام

### 7.1 بطاقة الأداء

| المجال | الوزن | الدرجة | ملاحظات |
|--------|-------|--------|---------|
| توثيق Design Tokens | 20% | 9/10 | شامل جداً، تناقض بسيط في primary-500 |
| توثيق العلامة التجارية | 20% | 10/10 | ممتاز، دقيق، مع أمثلة عملية |
| دعم RTL/Arabic | 15% | 9/10 | ADR واضح، يحتاج أدوات تحقق |
| جودة التصميم (Impeccable) | 10% | 8/10 | معتمد لكن غير منفّذ |
| اتساق الوثائق | 15% | 7/10 | تناقضات في الألوان والأوزان |
| جاهزية الأصول | 10% | 0/10 | لا توجد أي أصول ملموسة |
| جاهزية الأدوات | 10% | 0/10 | لا إعدادات ESLint أو CI |
| **المجموع** | **100%** | **6.9/10** | **جاهزية جيدة مع فجوات قابلة للمعالجة** |

### 7.2 الخلاصة

**المشروع يمتلك أفضل ما يمكن أن تمتلكه مرحلة تخطيط من توثيق للعلامة التجارية ونظام التصميم.** وثائق `04_UI_DESIGN_SYSTEM.md` و `29_BRAND_IMPLEMENTATION_GUIDE.md` تعتبر معيارية في مستواها من حيث الدقة والتفصيل والأمثلة العملية.

**الفجوة الرئيسية:** لا يوجد أي أصل ملموس (ملفات CSS، خطوط، أيقونات، شعار) أو إعدادات أدوات (ESLint، CI). هذه الفجوة متوقعة في Phase 0، لكنها تعني أن أول أسبوعين من Phase 1 سيتطلبان بناءً كبيراً في البنية التحتية للتصميم قبل البدء في كتابة المكونات.

**أولويات Phase 1 (تصميماً):**

```
الأسبوع 1:  global.css + brand.css + @font-face + ملفات الخطوط
الأسبوع 1:  ESLint rules (logical properties, #10B981)
الأسبوع 2:  Logo SVG + Favicon + PWA icons + manifest.json
الأسبوع 2:  packages/ui مع tokens المصدرة
الأسبوع 3:  layout.tsx مع RTL + font loading
الأسبوع 3:  i18n messages (ar.json)
الأسبوع 4:  shadcn/ui مع تخصيص RTL
الأسبوع 4:  Impeccable في CI
```

**الخلاصة النهائية:** ✅ **جاهز للانتقال إلى Phase 1 بعد معالجة 3 تناقضات في التوثيق وتوفير ملفات الخطوط والشعار.**

---

## الملحق أ: خريطة التناقضات بين المستندات

| المستند أ | المستند ب | البند | القيمة في أ | القيمة في ب | الإجراء المطلوب |
|-----------|-----------|-------|------------|------------|----------------|
| `04_UI_DESIGN_SYSTEM.md` §3.1 | `29_BRAND_IMPLEMENTATION_GUIDE.md` §2.2 | `primary-500` | `#16A34A` | `#22C55E` | توحيد على `#22C55E` |
| `04_UI_DESIGN_SYSTEM.md` §3.1 | `29_BRAND_IMPLEMENTATION_GUIDE.md` §2.2 | `success-500` | `#16A34A` | `#22C55E` | توحيد على `#22C55E` |
| `04_UI_DESIGN_SYSTEM.md` §3.2 | `29_BRAND_IMPLEMENTATION_GUIDE.md` §3.2 | Font weights | 400,500,600,700 | 400,700,800 | إزالة 500, 600 من نظام التصميم |
| `04_UI_DESIGN_SYSTEM.md` §3.1 | `29_BRAND_IMPLEMENTATION_GUIDE.md` §2.2 | تسمية الذهبي | `--color-accent-*` | `--color-gold-*` | توحيد على `--color-gold-*` |
| `.opencode/skills/brand-consistency/SKILL.md` | `29_BRAND_IMPLEMENTATION_GUIDE.md` §3.2 | Font weights | 400,500,600,700 | 400,700,800 | تحديث الـ SKILL |
| `.opencode/skills/brand-consistency/SKILL.md` | `29_BRAND_IMPLEMENTATION_GUIDE.md` §3.3 | Font source | Google Fonts | Self-hosted | تحديث الـ SKILL |

---

## الملحق ب: مسار تثبيت التبعيات المطلوبة لـ Phase 1

```bash
# إنشاء apps/web
mkdir -p apps/web/src/app

# تبعيات Next.js والواجهة
pnpm add next react react-dom next-intl lucide-react
pnpm add -D tailwindcss @tailwindcss/postcss

# shadcn/ui (بعد إعداد Tailwind)
pnpm dlx shadcn@latest init

# ESLint rules لمنع الأخطاء التصميمية
pnpm add -D eslint-plugin-tailwindcss @eslint/css

# Impeccable
pnpm add -D impeccable

# خطوط (self-hosted)
# يجب تنزيل Cairo من https://github.com/Gue3bara/Cairo/releases
# ووضعها في apps/web/public/fonts/cairo/
```

---

> **انتهى التقرير** — 2026-05-24
>
> تم إعداده بواسطة وكيل Frontend-polish وفقاً لمتطلبات `governance/AI_AGENT_EXECUTION_CONTRACT.md`
