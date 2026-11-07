# Design System — منصة ابن الأزهر

> الهوية في هذا الملف هي هوية براندبوك «منصة ابن الأزهر» الرسمي.
> مصدر الحقيقة للتوكنات: `apps/web/src/styles/brand.css` — هذا الملف يشرحها، والكود يطبّقها.

## Product Context
- **What this is:** أول منصة شاملة للثانوية الأزهرية — منصة معالجة مستندات عربية أولاً
- **Who it's for:** طلاب الثانوية الأزهرية ومعلموها ومشرفوها
- **Space/industry:** Arabic academic / Islamic education technology
- **Project type:** Web app with public landing + authenticated dashboard
- **Positioning:** «أول منصة شاملة للثانوية الأزهرية»
- **Tagline:** «في بيت كل طالب أزهري»
- **Values:** جودة التعليم · التخصص · التنظيم والوضوح

## Aesthetic Direction
- **Direction:** Neo-Traditional EdTech — هيبة المخطوط الأزهرية بواجهة تعليمية معاصرة
- **Decoration level:** Subtle geometric motifs — زخرفة هندسية خفيفة تخدم المعنى لا تزين الجدران
- **Mood:** Approachable Authority · Warm Academic Polish — داعم ومبسّط في النبرة، رصين ومُنظَّم في الشكل
- **Voice:** مشجع، مبسّط، واضح، داعم

## Typography
- **Display/Hero:** Amiri — خط نسخي عربي بروح المخطوطة (OFL 1.1). عناوين الأقسام والنصوص البطولية.
- **Body/UI:** Almarai — سنس عربي نظيف ومتوفر الأوزان (OFL 1.1). النص والتنقل والأزرار والتسميات.
- **Reserved:** Thmanyah Sans هو خط الهوية في البراندبوك، لكنه **تجاري بلا ملف رخصة في المستودع** — مُدرَج أولًا في سلسلة `--font-family-thmanyah` فقط، ولا يُحمَّل عبر `next/font` قبل إضافة الرخصة وملف الخط.
- **Code:** Fira Code — مونواسبيس بالروابط.
- **Tokens:** `font-display` → `--font-family-display`، `font-body` → `--font-family-almarai`.

## Color
- **Approach:** Restrained — اللون نادر وذو معنى؛ التركواز للفعل والذهبي للتأكيد فقط
- **Classic Teal:** `#127E87` — الأزرار الأساسية والروابط والحالة النشطة والنجاح
- **Antique Gold:** `#DA9E2C` — فواصل التأكيد، الحالة المحددة، الشارات، حدّ رأس الصفحة
- **Prussian Blue:** `#083B40` — الأرضية الداكنة والنص العميق وسطح الوضع الليلي
- **Warm Paper:** `#FBF5E9` — خلفية الصفحة في الوضع الفاتح (ليست أبيض نقي)
- **Pure White:** `#FFFFFF` — أسطح البطاقات داخل الأرضية الورقية
- **Manuscript Brown:** `#92400E` — لمسة ثانوية (الكود المضمّن)
- **Neutrals:** درجات دافئة من `#FAF8F3` إلى `#1C1917` (معاد تعريفها في الوضع الليلي إلى سلسلة التركواز)
- **Dark mode:** Prussian `#083B40` surface · `#042023` page · ذهبي مُفتَّح `#E2B35A` · تركواز للقراءة `#469AA1`
- **Deprecated:** الأخضر `#16A34A`/`#10B981`/`#059669` والذهبي `#CA8A04` والرمادي `#1F2937` — لا تُستخدم في أي سطح جديد. البيانات المخزَّنة قديمًا (ألوان الأوسمة في قاعدة البيانات) تبقى كما هي ولا تُهجَر قسرًا.

## Radius
- **Tokens:** `rounded-brand-sm` 8px · `rounded-brand-md` 14px · `rounded-brand-lg` 20px · `rounded-brand-xl` 28px
- **Rule:** البطاقات `lg`، عناصر التحكم `md`، الشارات `full`.

## Spacing
- **Base unit:** 8px
- **Density:** Spacious — هوامش سخية كصفحة المخطوطة
- **Scale:** 2xs(4) xs(8) sm(12) md(16) lg(24) xl(32) 2xl(48) 3xl(64) 4xl(96)

## Layout
- **Approach:** Grid-disciplined (dashboard) + editorial flair (landing)
- **Grid:** 12-column responsive
- **Max content width:** 1200px
- **RTL:** خصائص منطقية دائمًا (`ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`/`text-start`) — لا `left/right/ml/mr` اتجاهية

## Motion
- **Approach:** Intentional — النص يُكتب ولا يقفز
- **Tokens:** `--motion-fast` 120ms · `--motion-base` 200ms · `--motion-slow` 320ms
- **Easing:** `--motion-ease` = `cubic-bezier(0.22, 0.61, 0.36, 1)`

## Logo & Lockup
- **Assets:** `public/brand/mark.svg` (+ `mark-white.svg`, `mark-mono-teal.svg`) · `lockup.png` / `lockup@2x.png` · `lockup-on-dark.png` · الأيقونات `icon-192/512`, `icon-maskable-*`, `apple-touch-icon`, `favicon-32/64` · `og-base.png`
- **Clear space:** `--logo-clear-space` = 190px حول الشعار الكامل
- **Minimum size:** `--logo-min-size` = 152px (1.58in)
- **Inline rule:** داخل أشرطة الواجهة استخدم `--logo-safe-inline` (0.75em) بدل مساحة الـ190px الثابتة
- **Component:** `<BrandLogo>` هو المدخل الوحيد للشعار — يبدّل بين النسخة الفاتحة والداكنة تلقائيًا. لا تستخدم فلتر `brightness/invert` على الشعار لأنه يflatten اللونين إلى كتلة واحدة.

## Decorative Elements
- **Geometric motifs:** `.brand-motif` / `.brand-motif-panel` — شبكة معينية ذهبية خفيفة، فواصل قسم لا خلفيات
- **Brand rule:** `.brand-rule` — خط فاصق بلون ذهبي أسماكه هوية (رأس الصفحة 2px)
- **Paper grain:** حبيبات ورقية خفيفة على أسطح البطاقات
- **Gold shimmer:** لمسة ذهبية قصيرة عند التحويم على عناصر الفعل الأساسية

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-05 | Digital Manuscripts direction | Islamic manuscript illumination adapted for digital. Heritage integrated into DNA, not bolted on. |
| 2026-07-05 | Amiri for display | Instant heritage authority. Immediately recognizable as Al-Azhar. |
| 2026-11-06 | Classic Teal `#127E87` replaces Primary Green `#16A34A` | البراندبوك الرسمي الجديد؛ التركواز يحمل الهيبة الأكاديمية بلا إحساس «نجاح/خطأ» الأخضر. |
| 2026-11-06 | Antique Gold `#DA9E2C` replaces Heritage Gold `#CA8A04` | البراندبوك؛ أدفأ وأعلى نقاءً ويقرأ على الأرضية الورقية والدكنة معًا. |
| 2026-11-06 | Prussian Blue `#083B40` replaces Dark Text Gray `#1F2937` | البراندبوك؛ يعطي الوضع الليلي أرضية زرقاء-خضراء عميقة بدل الرمادي المحايد. |
| 2026-11-06 | Almarai body + Amiri display، Thmanyah مؤجَّل | Thmanyah commercial بلا ملف رخصة في المستودع (قاعدة AGENTS.md) — OFL فقط حتى تُشترى الرخصة. |
| 2026-11-06 | `<BrandLogo>` + أصلان للونين بدل فلتر CSS | `brightness(0) invert(1)` كان يدمج التركواز والذهب في أبيض واحد ويقتل الشعار في الوضع الليلي. |
| 2026-11-06 | لا هجرة لألوان الأوسمة المخزَّنة | البيانات القديمة في قاعدة البيانات تبقى كما هي؛ التغيير في الافتراضي والمستقبل فقط — لا مساس بما يراه المستخدم. |
