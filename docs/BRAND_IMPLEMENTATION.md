# تنفيذ الهوية البصرية — BRAND_IMPLEMENTATION

> الحالة: **مكتملة** (2026-11-06). المرجع الأعلى هو البراندبوك الرسمي، وهذه الورقة توثّق ما
> طُبِّق فعليًا في الكود لا ما كان مُخططًا. قرارات التصميم وسجلّها في [`DESIGN.md`](../DESIGN.md)،
> وقواعد الالتزام للوكلاء في [`docs/governance/AGENT_REFERENCE.md`](governance/AGENT_REFERENCE.md).

## 0) المصدر

`/home/abed/Data/06_Social/ابن_الازهر/Visual_Identity/` ويحتوي:

- `_brand_book_by_pomelli.pdf` — البراندبوك الرسمي (الألوان، الخطوط، الشعار، النبرة، القيم).
- `ai_studio_code.html` — ملف الاستوديو المصدري (لم يُقرأ منه أي قيمة دون تأكيد من الـ PDF).
- أصول الشعار المُصدَّرة، وقد نُقلت إلى المستودع في `apps/web/public/brand/` (15 ملفًا:
  `lockup.png`/`lockup@2x.png`/`lockup-on-dark.png`/`lockup-on-dark@2x.png`، `mark.svg`
  و`mark-white.svg` و`mark-mono-teal.svg`، `favicon-32/64.png`، `apple-touch-icon.png`،
  `icon-192/512.png`، `icon-maskable-192/512.png`، `og-base.png`).

لا يُشار إلى أي أصل من خارج المستودع في كود الإنتاج.

## 1) لوحة الألوان

| الدور | Hex | التوكن (`@theme` في `brand.css`) | الاستخدام |
|---|---|---|---|
| Classic Teal (أساسي) | `#127E87` | `--color-primary-*` / `--color-teal-*` (`-500`) | أزرار رئيسية، تركيز، شارات، روابط |
| Antique Gold (تمييز) | `#DA9E2C` | `--color-gold-*` (`-500`) / `--gold` | لمسات ذهبية، `::selection`، تدرّجات premium |
| Prussian Blue (عميق) | `#083B40` | `--color-prussian-*` (`-500`) / `--brand-prussian` | الوضع الداكن: خلفية `#042023` (`-800`)، سطح `#083B40`، بطاقة `#0A454A` |
| Warm Paper (ورقي) | `#FBF5E9` | `--page-bg` (فاتح) / `background_color` في الـ manifest | خلفية الصفحات والطباعة |
| Pure White | `#FFFFFF` | `--surface` (فاتح) / `bg-card` | البطاقات والنصوص على التركوازي |

- كل سلّم `50→900` مولّد بخلط محسوب مع الأبيض/الأسود حول قيمة البراندبوك، فاستعمال
  `bg-primary-700` أو `text-gold-300` يبقى داخل الهوية دون hex حرّ.
- **مهجورة** (لا تظهر في أي سطح جديد): `#16A34A` / `#10B981` / `#059669` / `#CA8A04` / `#1F2937`.
- ألوان دلالية محفوظة كما هي: خطأ `#dc2626`، معلومات `#3b82f6`، تحذير `#f59e0b`، نجاح أخضر
  دلالي للنصوص فقط حيث يعني «تم» لا «هوية».

## 2) الخطوط

| الدور | الخط | التنفيذ |
|---|---|---|
| نص/واجهة | **Almarai** | `next/font/google` في `apps/web/src/ui/fonts.ts` → `--font-almarai` |
| عناوين/عرض | **Amiri** | `next/font/google` → `--font-amiri` (Buckling/آيات/عناوين) |

- **Thmanyah Serif Display وGilroy وKitab تجاريون بلا ملفات رخصة في المستودع** — لا يُحمَّلون
  إطلاقًا (قاعدة `AGENTS.md`). ورد اسم Thmanyah أولًا في بعض stacks العرض ليسقط على Amiri
  تلقائيًا إن استُضيف لاحقًا برخصة، مع `@font-face` وملف الرخصة بجوار الخط.
- Amiri وNoto Naskh Arabic رخصتهما OFL 1.1، وملف الرخصة مجاور لكل ملف خط.

### سلسلة الخطوط (أين تنكسر وكيف صارت مضمونة)

الاسم في `fonts.ts` وحده لا يكفي؛ السلسلة كاملة يجب أن تُحلّ في المتصفح:

```
next/font (class على <html>)  →  --font-almarai / --font-amiri
  →  @theme static في brand.css  →  --font-family-almarai / --font-family-display
  →  --font-family-body / --font-body / --font-display
  →  html{font-family} و h1..h6{font-family} في globals.css
```

كسرُ أي حلقة يُنتج صفحة **سليمة الظاهر** بخط Serif الافتراضي (Times New Roman) بلا أي
خطأ في الـ console — وهذا بالضبط ما حدث بعد هجرة الهوية، لذلك صُحِّحت ثلاث نقاط:

1. **`@theme static`** (سطر 8 في `brand.css`): Tailwind 4 يُسقط متغيّرات الثيم التي لا
   يستهلكها أي utility من الـ CSS الناتج، وهذه تُستهلك عبر `var()` داخل CSS عادي
   (`globals.css` و`landing.css` و`reading.css`) فتسقط كلها. مع `static` تُكتب دائمًا.
2. **أصناف `next/font` على `<html>` لا `<body>`** (`apps/web/src/app/layout.tsx`): قاعدة
   `html { font-family: var(--font-family-body) }` تُحلّ عند عنصر الجذر، فلو عُرِّف
   `--font-almarai` على `<body>` فقط كان الاستبدال يفشل عند `html` فيسقط كل شيء للقيمة
   الابتدائية (Serif المتصفح).
3. **`--font-body` و`--font-display` نُقلت من `:root` إلى داخل `@theme static`**: أسماء
   `font-body`/`font-display` مستخدمة في 9 مواضع من الواجهة، ولم تكن Tailwind يولّدها
   أصلاً (الاسم خارج namespace الثيم) فكانت صنوفًا ميتة.

كذلك استُبدل `Cairo, sans-serif` القديم في `toastOptions` (`[locale]/layout.tsx`) بـ
`var(--font-family-body)` — اسم من ما قبل الهوية ولا يوجد وجه بخطه في المستودع.

الحارس: `tests/frontend/brand-tokens.test.ts` (4 اختبارات) يفحص السلسلة على الملفات
نفسها، ويُثبت أنه أحمر بتغيير `@theme static` → `@theme` (تُجرَّب فعليًا عند الشك).


## 3) الشعار: نقطة دخول واحدة

- المكوّن `apps/web/src/ui/brand-logo.tsx` (`<BrandLogo>`) هو **المدخل الوحيد** للشعار. أي
  `<Image>`/`<img>` مباشر للشعار في سطح جديد مخالفة.
- المساحة الآمنة والحد الأدنى ثابتان في مكانين متطابقين: `--logo-clear-space: 190px` و
  `--logo-min-size: 152px` في `brand.css`، و`BRAND_LOGO { clearSpacePx: 190, minSizePx: 152 }`
  في `apps/web/src/ui/brand.ts`. أدوات جاهزة: `.brand-clear-space`، `.brand-logo-min`، `.brand-logo`.
- لا يُطبَّق على الشعار فلتر `brightness`/`invert`/`hue-rotate` — للنسخة الفاتحة يوجد
  `lockup-on-dark.png` أصلًا.

## 4) التوكنز الدلالية والادّعاءات البصرية

تعريفات `:root` و`.dark` في `brand.css` لا يوازيها أي hex حرّ في مكوّن:

- أسطح ونصوص: `--page-bg`، `--surface`، `--card`، `--line`/`border-line`، `--badge`، `--hover`،
  `--gold-bg`، `--gold-border`، `--danger-bg`.
- حالة: `--success`، `--danger`، `--ring-focus`.
- عمق: `--shadow-sm` و`--shadow-md` — وهما **قيمة كاملة** قابلة للاستعمال مباشرة، بينما
  `--shadow-color` لون `rgba(...)` صحيح الصياغة (كان خطأ سابقًا ثلاثي أرقام `8 59 64` يُبتلع
  كـ color كامل فتسقط الظلال صامتة).
- أدوات: `.glass-panel`، `.brand-motif`/`.brand-motif-panel`، `.brand-rule`،
  `.premium-gradient-text`.
- زوايا: `rounded-brand-sm|md|lg|xl` بدل `rounded-xl/2xl` العام.

## 5) الملفات المعدّلة (هجرة 2026-11-06)

**الأساس**

- `apps/web/src/styles/brand.css` — سلالم `@theme`، `:root`/`.dark`، أدوات الشعار، إصلاح `--shadow-color`.
- `apps/web/src/styles/{globals,landing,discovery,reading}.css` — كل hex حرّ إلى توكن؛ ما بقي داخل
  `@media print` هو `#000/#ccc/#999/#f5f5f5` فقط (ورقي/قصد).
- `apps/web/src/ui/{brand,fonts,metadata,brand-logo}.ts(x)` — ثوابت الهوية، OG ثابت، `<BrandLogo>`.
- `apps/web/src/app/layout.tsx`، `apps/web/src/app/manifest.ts`، `apps/web/public/manifest.json`
  — `themeColor`/`theme_color` التركوازي، `background_color` الورقي، أيقونات PWA من `/brand/*`،
  و`openGraph`/`twitter` بصورة معاينة اجتماعية واحدة.
- `apps/web/src/shared/constants.ts` + `shared/validators/tag.ts` + `shared/openapi.ts` —
  `DEFAULT_TAG_COLOR = "#127E87"` مصدرًا واحدًا: رأس الـ tuple وقيمة zod الافتراضية مشتقتان منه.
- `apps/web/src/lib/email/templates/{welcome,verification}.tsx` — الشعار بـ `<img>` عادي يشير إلى
  `/brand/lockup-on-dark.png` (كان `Img` مستوردًا من `@react-email/components` وهو غير معلن في
  أنواعه ← TS2305).

**الواجهات**

- `apps/web/src/ui/tools/*` و`app/[locale]/(site)/tools/page.tsx` — emerald/amber إلى
  `bg-card`/`border-line`/`bg-gold-bg`/`text-gold`/`bg-danger-bg`، والشارات إلى
  `<Badge variant="success|warning">` بدل `<span>` مصبوغ يدويًا.
- `apps/web/src/ui/files/document-row.tsx` — `var(--primary-color)` غير الموجود (hover ميت)
  إلى `var(--brand-teal)`.
- `analytics-content.tsx` و`dashboard-content.tsx` — `bg-[var(--card-bg)]` إلى `bg-card`.

**النصوص والهوية اللفظية**

- `apps/web/src/messages/{ar,en}.json` — «مستندات ابن الأزهر» → «منصة ابن الأزهر»،
  الشعار «في بيت كل طالب أزهري»، والتموضع «أول منصة شاملة للثانوية الأزهرية» في الفوتر و
  `hero.eyebrow`. النسخة الإنجليزية مطابقة عددًا. `common.name` تُركت: تسمية حقل لا اسم علامة.

**الحوكمة والأدوات الآلية**

- `DESIGN.md` — مرجع الهوية الجديد كاملًا + سجل قرارات بخمسة صفوف 2026-11-06.
- `docs/governance/AGENT_REFERENCE.md` و`docs/governance/OPENCODE_FRAMEWORK.md` — قاعدة الهوية
  بألوان البراندبوك الخمسة والخطوط و`<BrandLogo>`.
- `.coderabbit.yaml` (نسختان) — كان المراجع الآلي يُلزِم **الهوية القديمة**؛ الآن يطلب وسم أي
  hex جديد أو لون من لوحة Tailwind الافتراضية وأي استعمال للشعار خارج `<BrandLogo>`.
- `docs/production/PRODUCTION_READINESS_CHECKLIST.md` — سطر الهوية WARN → PASS، وسطر الخطوط
  «Almarai body + Amiri display» PASS.
- `PROJECT.md` و`TEST_INFRA.md` و`TEST_READY.md` — «Cairo font» صُحِّح إلى الخطوط الفعلية.

**الاختبارات**

- `tests/frontend/validators-tag.test.ts` — الـ tuple يبدأ بـ `#127E87`، ولا يحمل أي أخضر قديم.
- 17 ملف اختبار لونه صريح: `16A34A→127E87`، `059669→0D5B61`، `10B981→127E87`، `CA8A04→DA9E2C`.
- `tests/api/openapi-spec.ts` — أُصلح عطل بناء (SyntaxError) أدخله وكيل ميت، والمواصفة عُدِّلت
  **نحو الكود** (`/api/debug/pg` قراءة GET فقط)، لا العكس.

**جولة التحقق النهائية (نفس اليوم)**

- `apps/web/src/middleware.ts` — الـ matcher صار `/:path*` آليًا مع `isStaticAsset()` داخل
  الدالة؛ بدون هذا لا يُقلاع `next dev` أصلًا (تفصيل في §7).
- `apps/web/src/styles/brand.css` — `@theme static` + نقل `--font-body`/`--font-display`
  إلى داخل الثيم (تفصيل في §2).
- `apps/web/src/app/layout.tsx` — أصناف `next/font` انتقلت من `<body>` إلى `<html>`.
- `apps/web/src/app/[locale]/layout.tsx` — `Cairo, sans-serif` في التوستات → `var(--font-family-body)`.
- `tests/frontend/brand-tokens.test.ts` — حارس السلسلة الجديد (4 اختبارات، مُثبت أنه أحمر
  عند نكس الإصلاح).

**كنس اسم العلامة القديم (`Ibn Al-Azhar Docs`)**

المسح كشف **14 موضعًا مرئيًا للمستخدم** ما زالوا بالاسم القديم بعد الهجرة؛ كلها صارت تُشتَقّ
من `BRAND_NAME` (`apps/web/src/ui/brand.ts`) بدل التسطير اليدوي:

- `app/[locale]/(public)/share/[token]/page.tsx` — فوتر صفحة المشاركة العامة.
- `app/[locale]/(site)/docs/page.tsx` و`(site)/journeys/page.tsx` — وسم `<title>` لصفحتي
  المكتبة والمسارات. ملاحظة تقنية: `generatePageMetadata` يلحق الاسم بعلامة **فقط** في عنوان
  Open Graph، أمّا `<title>` فيُمرَّر كما هو — لذلك تُكتب اللاحقة هنا من `BRAND_NAME`، وهذا
   سلوك موثَّق باختبار في `tests/frontend/metadata.test.ts` كان اسمه يقول «يُلحق الاسم» وهو
   يؤكد العكس.
- `app/[locale]/layout.tsx` — `name` و`publisher.name` في JSON-LD (schema.org).
- `lib/email/send.ts` — عناوين ثلاثة بريدات (تأكيد/إعادة تعيين/ترحيب)، و
  `lib/email/templates/reset-password.tsx` الذي كان الافتراضي فيه نصًا صريحًا بينما
  القالبان الآخران يستخدمان `BRAND_NAME.ar` أصلًا.
- `shared/content/i18n-data.ts` — وصف تصنيف «المنصة التعريفية» بالعربية والإنجليزية.
- `shared/openapi.ts` — عنوان الـ API و`contact.name` والوصف.
- `packages/pipeline/src/output/txt.ts` — **ترويسة الملف المُنتَج** (`… — OCR Export`)؛ هذا
  أعلى بنود الهوية قيمة لأنه داخل المُنتَج الذي يسلَّم للمستخدم، لا داخل الواجهة.
- الاختبارات التي تُثبّت تلك السلاسل: `tests/backend/output.test.ts` (2) و
  `tests/integration/pipeline-export-flow.test.ts` (2) و`tests/integration/full-pipeline-flow.test.ts` (1).

بقي الاسم القديم في وثائق داخلية للهندسة فقط (`tests/README.md`، `tests/CONVENTIONS.md`،
`tests/load/k6/README.md`، `tests/reporting/test-dashboard.html`، `tests/api/openapi-spec.ts`
وثابت `api-client.ts` في تعليق رأس الملف) — لا تظهر للمستخدم ولا للمنصّة، وتُترك لجولة توثيق.


## 6) صورة المعاينة الاجتماعية: لماذا ثابتة

`BRAND_OG_IMAGE = "/brand/og-base.png"` (1200×630) تُذكر دائمًا في `metadata.ts` و`layout.tsx`.
القرار مبني على حقيقة تقنية: `next/og` يبني الصورة بـ satori، و**satori لا شَكل عربي (shaping)**،
فتُخرج «م ن ص ة» مفصولة بدل «منصة» — صورة معاينة مكسورة أعلاه. PNG مُصدَّر من أصل الهوية آمن
ومتحكم به؛ لا `ImageResponse` ديناميكي عربي.

## 7) التحقق

- `pnpm check` → **EXIT=0** (Prettier + ESLint بـ `--max-warnings 0` + `tsc` على
  web/pipeline/ocr-worker/export-worker/database) بعد إصلاح سلسلة الخطوط و`middleware.ts`.
- `pnpm test` — ما يخص الهوية نظيف: `tests/frontend/validators-tag.test.ts` و`tests/api`
  (بعد إصلاح الـ spec) و`tests/backend` النصية **224/224** و`tests/frontend/brand-tokens.test.ts`
  **4/4**. الباقي يفشل لبيئة لا خدمات لها (`database connection refused` و
  `ECONNREFUSED 127.0.0.1:6379`) لأن الحارس `docker` متوقف عمدًا على آلة التطوير وفق
  `AGENTS.md` — لا علاقة له بالتغيير.
- **إصلاح حرج للبدء (boot)**: `next dev --turbopack` كان **يرفض الإقلاع على هذا الفرع من
  HEAD** — الـ matcher في `apps/web/src/middleware.ts` كان بصيغة lookahead القديمة
  `"/((?!_next|…).*)"`، وNext 16 يترجمها بـ path-to-regexp v8 الذي يرفض مجموعات الأسر
  ويرفض lookahead أصلًا (`Capturing groups are not allowed` ثم `Pattern cannot start with "?"`).
  الصيغة الآن `matcher: ["/:path*"]` مع استثناء الأصول الساكنة داخل الدالة نفسها
  (`isStaticAsset`: بادئات `/_next` و`/brand/` و`/pdfjs-wasm/` + امتدادات 2–5 حرف
  و`.webmanifest`)، فسلوك كل مسار محفوظ كما كان.
- **مراجعة بصرية في المتصفح (Playwright، خادم تطوير حقيقي)** — قياس لا انطباع:

  | المسار | النتيجة |
  |---|---|
  | `/ar` فاتح وداكن | Amiri على `h1/h2`، Almarai على النص، `--page-bg #fbf5e9`، الداكن `#042023` مع `html.dark` |
  | `/en` فاتح | اتجاه ltr سليم، نفس التوكنز، الشعار lockup في موضعه |
  | `/ar/tools` داكن | البطاقات الأربع، شارات «مباشر/قريبًا» مطابقة لحالة الأدوات في `AGENTS.md` |
  | `/ar/login` داكن | بطاقة بتدرج teal، رابط ذهبي، الوسم `في بيت كل طالب أزهري` في الأسفل |
  | الأصول الساكنة | `/brand/*`، `/manifest.json`، `/logo.svg`، `/sw.js`، `/pdfjs-wasm/*`، `/robots.txt`، `/sitemap.xml` كلها **200** بلا redirect |
  | بوابة الدخول | `/dashboard` → 307 إلى `/ar/login`، و`/tools` → 307 إلى `/ar/tools` (العام يبقى عامًا) |

  وجهاء الخطوط المؤكَّد تحميلها فعليًا من الحزمة الذاتية: `Almarai 400/700` و`Amiri 700`
  (قبل الإصلاح كانت كل الوجوه `unloaded`).

## 8) ما تبقّى مقصودًا (بند قرار لا أمر واقع)

1. **`packages/database/prisma/schema.prisma:198`** ما زال `color String @default("#16A34A")`.
   لم يُغيَّر لأنه يحتاج **هجرة**: التطبيق يمرّر لونًا دائمًا (zod افتراضيه `#127E87`) فالسلوك
   صحيح هويًا اليوم، والتغيير يستدعي ملف هجرة وتشغيلها — وهو ممنوع تلقائيًا في `AGENTS.md`
   ويتطلب إذنًا صريحًا. **قرار مطلوب:** هل تُضاف هجرة تغيير الافتراضي أم يُترك كمصدر احتياطي؟
2. **ألوان الأوسمة المخزَّنة قديمًا** لا تُهجَر قسرًا — قاعدة «المُنتَج نسخة طبق الأصل من الأصل»
   تمنع إعادة رسم بيانات المستخدم لمجاراة هوية.
3. **Thmanyah**: إن حُلّت الرخصة، تُستضاف الملفات + `@font-face` ثم يُزال fallback من Amiri.
4. **مراجعة بصرية في المتصفح**: تمّت للهبوط (فاتح/داكن) و`/en` والأدوات والدخول — البند
   المتبقّي **لوحة التحكم والبريد الإلكتروني المُرسل**، وكلاهما يحتاج خدمات محلية
   (`./ibn.sh dev-infra`) ورسائل بريد حقيقية، وهو ممنوع التشغيل التلقائي في `AGENTS.md`.
5. **Bidi خفيف في نصوص مختلطة**: جُمل تحتوي `PDF`/`Word`/`(JPG، PDF، PNG)` داخل عربية
   rtl تُظهر الأقواس والنقاط في موضع بصري غريب أحيانًا. الإصلاح الصحيح عزل المقاطع
   اللاتينية بعزل Unicode (FSI/PDI) أو `<bdi>` في طبقة العرض، لا إعادة كتابة النصوص —
   لم يُنفَّذ لأنه يمسّ عشرات الرسائل ويحتاج قرارًا في أسلوب الكتابة.
