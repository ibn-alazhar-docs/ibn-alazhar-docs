# نظام التصميم البصري (UI Design System) — ابن الأزهر دوكس / Ibn Al-Azhar Docs

> **الإصدار:** 4.0.0
> **التاريخ:** 2026-03-05
> **التصنيف:** وثيقة مرجعية — للمصممين والمطورين
> **المرجع التقني:** راجع `03_UX_SPEC.md` لمواصفات تدفقات التجربة وسلوك الصفحات

---

## جدول المحتويات

1. [مبادئ التصميم (Design Principles)](#1-مبادئ-التصميم-design-principles)
2. [الاتجاه البصري (Brand Direction)](#2-الاتجاه-البصري-brand-direction)
3. [الرموز التصميمية (Design Tokens)](#3-الرموز-التصميمية-design-tokens)
4. [جرد المكونات (Components Inventory)](#4-جرد-المكونات-components-inventory)
5. [قواعد RTL (شاملة)](#5-قواعد-rtl-شاملة)
6. [قواعد إمكانية الوصول (Accessibility Rules)](#6-قواعد-إمكانية-الوصول-accessibility-rules)
7. [قواعد الجوال (Mobile Rules)](#7-قواعد-الجوال-mobile-rules)
8. [سياسة الوضع الداكن (Dark Mode Policy)](#8-سياسة-الوضع-الداكن-dark-mode-policy)

---

## 1. مبادئ التصميم (Design Principles)

### 1.1 العربية أولاً (Arabic First)

التصميم يبدأ من اليمين إلى اليسار (RTL) كحالة افتراضية، ثم يُحوَّل لليسار إلى اليمين (LTR) كلغة ثانوية. هذا المبدأ لا يعني فقط عكس الاتجاه، بل يعني أن كل قرار تصميمي — من اختيار الخطوط إلى أحجام النصوص إلى تباعد العناصر — يُختبر أولاً في السياق العربي. النص العربي يتطلب مساحة أفقية أكبر من اللاتيني في كثير من الأحيان، والأرقام الهندية قد تُفضَّل على العربية في بعض السياقات التعليمية، وعرض النص (line length) يجب أن لا يتجاوز 70 حرفاً عربياً للحفاظ على القراءة المريحة. عند استخدام المكونات الجاهزة (shadcn/ui)، يُعاد ضبط كل القيم الافتراضية لتناسب العربية قبل تطبيقها. المنصة لا تترجم واجهة لاتينية، بل تصمم عربية وتُصدَّر للاتينية.

### 1.2 البساطة المتعمدة (Intentional Simplicity)

كل عنصر في الواجهة يجب أن يبرر وجوده. لا زخارف زائدة، لا ظلال ثقيلة، لا ألوان كثيرة، لا animations مفرطة. البساطة هنا ليست نقصاً بل هي قرار واعٍ يقلل الحمل المعرفي على المستخدم ويوجه انتباهه للمحتوى والوظائف الأساسية. هذا يعني أن كل ظل (shadow) يخدم غرضاً (التمييز بين الطبقات)، وكل لون يخدم غرضاً (التمييز بين الحالات)، وكل animation يخدم غرضاً (التغذية الراجعة على التفاعل). عندما يكون هناك شك في إضافة عنصر زخرفي، الإجابة الافتراضية هي "لا" حتى يثبت العكس. النتيجة النهائية هي واجهة نظيفة، هادئة، ومحترمة لوقت المستخدم وتركيزه.

### 1.3 الاستجابة الكاملة (Full Responsiveness)

التصميم لا يُكيَّف للشاشات الصغيرة بعد الانتهاء، بل يُصمم من البداية ليعمل على ثلاث نقاط كسر أساسية: الجوال (320px-767px)، الجهاز اللوحي (768px-1279px)، وسطح المكتب (1280px فأكثر). كل مكون يُختبر على الأبعاد الثلاثة قبل اعتماده. على الجوال، لا يُكتفي بتصغير العناصر بل يُعاد التفكير في التخطيط بالكامل: القوائم تتحول لأدراج، الجداول تتحول لبطاقات، الأعمدة المتعددة تتحول لعمود واحد. اللمس هو الطريقة الأساسية للتفاعل على الجوال، لذلك كل عنصر تفاعلي يجب أن يكون بحجم لا يقل عن 44×44px. لا يوجد محتوى مخفي أو يصعب الوصول إليه على أي حجم شاشة.

### 1.4 الاتساق (Consistency)

الاتساق يعني أن نفس النمط المرئي والتفاعلي يُستخدم لنفس الوظيفة في كل مكان. زر الحذف دائماً أحمر بأيقونة Trash، Toast النجاح دائماً أخضر، حقل الخطأ دائماً بحد أحمر ورسالة تحت الحقل. هذا الاتساق يقلل من منحنى التعلم ويبني ذاكرة عضلية لدى المستخدم. على مستوى الكود، الاتساق يتحقق عبر design tokens ومكونات مشتركة (shared components) في مكتبة واحدة لا يُسمح بتجاوزها. لا يُسمح باستخدام لون أو حجم أو ظل خارج ما هو محدد في الـ tokens. أي استثناء يتطلب موافقة من فريق التصميم وتوثيقاً في هذا المستند.

### 1.5 التعليقات المرئية الفورية (Instant Visual Feedback)

كل تفاعل من المستخدم يجب أن يُنتج استجابة بصرية فورية — خلال 100 مللي ثانية كحد أقصى. النقر على زر يُظهر حالة الضغط (active state)، التمرير فوق عنصر يُظهر حالة التحويم (hover state)، بدء تحميل يُظهر مؤشراً فوراً، إكمال إجراء يُعرض رسالة نجاح. لا يجب أن يتساءل المستخدم أبداً "هل ضغطت بنجاح؟" أو "هل بدأ التحميل؟" أو "هل تم الحفظ؟". هذه التعليقات الفورية تبني الثقة وتقلل القلق وتجعل التفاعل مع المنصة مُرضياً على المستوى الحسي.

---

## 2. الاتجاه البصري (Brand Direction)

### 2.1 شخصية العلامة التجارية (Brand Personality)

ابن الأزهر دوكس هي علامة تجارية تعليمية تقنية تتميز بشخصية:

- **موثوقة (Reliable):** المستخدم يثق أن ملفاته بأمان وأن التحويلات دقيقة. اللون الأخضر الأساسي (Primary Green #16A34A) يعكس الثقة والنمو، والذهب التراثي (Heritage Gold #CA8A04) يُبرز العناصر المميزة.
- **ذكية (Smart):** المنصة تستخدم تقنيات متقدمة (OCR, PWA) لكن لا تتباهى بذلك. الذكاء يظهر في سهولة الاستخدام لا في تعقيدها.
- **ودودة (Friendly):** رسائل النصوص دافئة ومتعاطفة. الأخطاء تُعرض بلغة بشرية لا تقنية. الواجهة ترحب بالمستخدم ولا تخيفه.
- **مهنية (Professional):** التصميم نظيف ومنظم. لا عناصر طفولية أو مبالغ في مرحها. تناسب البيئة الأكاديمية.
- **عربية (Arabic):** الهوية بصرية عربية في جوهرها. ليست ترجمة لواجهة أجنبية بل تصميم ينطلق من الثقافة العربية.

**الشعار الرسمي (Official Tagline):** في بيت كل طالب أزهري

**وعد العلامة التجارية (Brand Promise):** محتوى تعليمي يليق بتفوق طالب الثانوية الأزهرية

### 2.2 الهوية البصرية (Visual Identity)

**الشعار (Logo):**
- يتكون من اسم "ابن الأزهر دوكس" بخط Cairo Bold مع عنصر بصري يمثل ورقة مستند مع سهم تحويل
- اللون الأساسي للشعار: #16A34A (Primary Green / Green-600)
- نسخة داكنة: #15803D (Green-700)
- نسخة أبيض وأسود متوفرة للخلفيات المختلفة
- الحد الأدنى لحجم الشعار: 120px عرض في الواجهة، 32px كأيقونة

**استخدام الشعار:**
- في الشريط الجانبي: شعار كامل (نص + أيقونة) في الحالة الموسعة، أيقونة فقط في الحالة المطوية
- في صفحة الهبوط: شعار كبير في Hero section
- في صفحات المصادقة: شعار متوسط فوق النموذج
- لا يُستخدم الشعار كعنصر زخرفي في المحتوى
- مساحة آمنة حول الشعار: مسافة لا تقل عن ارتفاع الحرف "ا" من كل جانب

### 2.3 إرشادات استخدام الشعار (Logo Usage Guidelines)

- ✅ استخدام الألوان الرسمية
- ✅ الحفاظ على النسب الأصلية
- ✅ استخدام نسخة مناسبة للخلفية (داكنة/فاتحة)
- ❌ لا تدوير الشعار
- ❌ لا تغيير نسب العرض للارتفاع
- ❌ لا إضافة ظلال أو تأثيرات
- ❌ لا وضع الشعار على خلفية مشوشة
- ❌ لا استخدام نسخة بيضاء على خلفية فاتحة

---

## 3. الرموز التصميمية (Design Tokens)

### 3.1 نظام الألوان (Color System)

#### الألوان الأساسية (Primary Colors)

```css
--color-primary-50:  #F0FDF4;
--color-primary-100: #DCFCE7;
--color-primary-200: #BBF7D0;
--color-primary-300: #86EFAC;
--color-primary-400: #4ADE80;
--color-primary-500: #16A34A; /* الأساسي — Primary Green (Green-600 Tailwind) */
--color-primary-600: #15803D;
--color-primary-700: #166534;
--color-primary-800: #14532D;
--color-primary-900: #052E16;
```

**الاستخدام:** الأزرار الرئيسية، الروابط، مؤشرات التقدم الناجح، عناصر التمييز، شريط التمرير المخصص. `primary-500` هو اللون الأساسي للتفاعل، `primary-600` لحالة hover، `primary-100` للخلفيات الخفيفة، `primary-700` للنصوص على خلفيات فاتحة.

#### الألوان الدلالية (Semantic Colors)

```css
--color-error-50:  #FEF2F2;
--color-error-100: #FEE2E2;
--color-error-500: #EF4444; /* خطأ */
--color-error-600: #DC2626;
--color-error-700: #B91C1C;

--color-warning-50:  #FFFBEB;
--color-warning-100: #FEF3C7;
--color-warning-500: #F59E0B; /* تحذير */
--color-warning-600: #D97706;

--color-info-50:  #EFF6FF;
--color-info-100: #DBEAFE;
--color-info-500: #3B82F6; /* معلومة */
--color-info-600: #2563EB;

--color-success-50:  #ECFDF5;
--color-success-100: #D1FAE5;
--color-success-500: #16A34A; /* نجاح (مطابق لـ primary) */
--color-success-600: #15803D;
```

**الاستخدام الدلالي:** الألوان الدلالية لا تُستخدم لأغراض زخرفية. `error` للمدخلات الخاطئة والأخطاء والعمليات الفاشلة، `warning` للتنبيهات غير الحرجة والحدود القريبة، `info` للمعلومات والتلميحات، `success` للتأكيدات والعمليات الناجحة. لا يُستخدم أكثر من لون دلالي واحد في نفس العنصر.

#### الألوان المحايدة (Neutral Colors)

```css
--color-neutral-50:  #F9FAFB; /* خلفية الصفحة */
--color-neutral-100: #F3F4F6; /* خلفية البطاقات الثانوية */
--color-neutral-200: #E5E7EB; /* حدود */
--color-neutral-300: #D1D5DB; /* حدود focus في حالة معطلة */
--color-neutral-400: #9CA3AF; /* نص ثانوي على خلفية داكنة */
--color-neutral-500: #6B7280; /* نص ثانوي */
--color-neutral-600: #4B5563; /* نص على خلفيات فاتحة */
--color-neutral-700: #374151;
--color-neutral-800: #1F2937; /* نص أساسي */
--color-neutral-900: #111827; /* نص عناوين */
```

#### لون التمييز (Accent Color — Heritage Gold)

```css
--color-accent-50:  #FFFBEB;
--color-accent-100: #FEF3C7;
--color-accent-400: #FBBF24;
--color-accent-500: #CA8A04; /* Heritage Gold — اللون المميز الرسمي */
--color-accent-600: #A16207;
```

**الاستخدام:** Heritage Gold (#CA8A04) هو اللون المميز الرسمي (accent) المستخدم للعناصر البارزة والشارات (badges) والعناصر الزخرفية الخاصة. يُستخدم بحذر كلمسة بصريّة مميزة وليس كلون أساسي. `accent-500` للشارات والأيقونات المميزة، `accent-400` للخلفيات الخفيفة المميزة، `accent-100` لخلفيات التمييز.

#### ألوان السطح (Surface Colors)

```css
--color-surface:        #FFFFFF; /* خلفية البطاقات والنماذج */
--color-background:     #F9FAFB; /* خلفية الصفحة */
--color-overlay:        rgba(0, 0, 0, 0.50); /* خلفية Dialog و Drawer */
--color-surface-hover:  #F3F4F6; /* خلفية العناصر عند التحويم */
--color-surface-active: #E5E7EB; /* خلفية العناصر عند الضغط */
```

#### هيكل الوضع الداكن (مستقبلي — ليس في MVP)

```css
/* لا يُنفذ في MVP لكن البنية جاهزة في tokens */
--color-dark-surface:        #1F2937;
--color-dark-background:     #111827;
--color-dark-text-primary:   #F9FAFB;
--color-dark-text-secondary: #9CA3AF;
--color-dark-border:         #374151;
```

---

### 3.2 الطباعة (Typography)

#### عائلات الخطوط (Font Families)

```css
--font-family-arabic: 'Cairo', 'Noto Sans Arabic', sans-serif;     /* للنصوص العربية — Cairo هو الخط الرسمي */
--font-family-latin:  'Inter', sans-serif;      /* للنصوص اللاتينية */
--font-family-code:   'JetBrains Mono', monospace; /* للنصوص البرمجية */
--font-family-fallback: 'Noto Sans Arabic', 'Segoe UI', Tahoma, sans-serif;
```

**ملاحظات حيوية عن الخطوط:**
- كل الخطوط **مستضافة ذاتياً** (self-hosted) ولا تُحمَّل من Google Fonts CDN
- ملفات الخطوط تُخزَّن في `/public/fonts/` وتُحمَّل عبر `@font-face`
- صيغ الخطوط المطلوبة: WOFF2 (أساسي) + WOFF (احتياطي)
- يتم تحميل الخطوط باستخدام `font-display: swap` لضمان عرض النص فوراً بالخط البديل ثم الاستبدال عند التحميل
- Service Worker يخزن ملفات الخطوط باستخدام Cache First strategy

#### مقاسات الخطوط (Font Sizes)

```css
--font-size-xs:   0.75rem;  /* 12px — تلميحات، طوابع زمنية */
--font-size-sm:   0.8125rem; /* 13px — نصوص صغيرة، أوصاف */
--font-size-base: 0.875rem;  /* 14px — نص أساسي للجسم */
--font-size-md:   1rem;      /* 16px — نص أساسي كبير */
--font-size-lg:   1.125rem;  /* 18px — عناوين فرعية صغيرة */
--font-size-xl:   1.25rem;   /* 20px — عناوين فرعية */
--font-size-2xl:  1.5rem;    /* 24px — عناوين */
--font-size-3xl:  1.875rem;  /* 30px — عناوين كبيرة */
--font-size-4xl:  2.25rem;   /* 36px — عناوين الصفحات الرئيسية */
```

#### أوزان الخطوط (Font Weights)

```css
--font-weight-regular:  400; /* نص عادي */
--font-weight-medium:   500; /* نص مميز */
--font-weight-semibold: 600; /* عناوين فرعية */
--font-weight-bold:     700; /* عناوين رئيسية */
```

#### ارتفاعات السطر (Line Heights)

```css
--line-height-tight:   1.25; /* للعناوين */
--line-height-normal:  1.5;  /* للنص الأساسي */
--line-height-relaxed: 1.75; /* للفقرات الطويلة */
```

#### أمثلة استخدام الطباعة

| العنصر | الخط | الحجم | الوزن | ارتفاع السطر |
|--------|------|-------|-------|---------------|
| عنوان الصفحة (h1) | Cairo | 2xl-3xl (24-30px) | Bold (700) | Tight (1.25) |
| عنوان القسم (h2) | Cairo | xl-2xl (20-24px) | Semibold (600) | Tight (1.25) |
| عنوان البطاقة (h3) | Cairo | lg-xl (18-20px) | Semibold (600) | Tight (1.25) |
| نص الجسم | Cairo | base (14px) | Regular (400) | Normal (1.5) |
| نص ثانوي | Cairo | sm (13px) | Regular (400) | Normal (1.5) |
| تلميح/مساعد | Cairo | xs (12px) | Regular (400) | Normal (1.5) |
| نص برمجي | JetBrains Mono | base (14px) | Regular (400) | Normal (1.5) |
| زر أساسي | Cairo | base-md (14-16px) | Semibold (600) | Tight (1.25) |
| شارة/Badge | Cairo | xs (12px) | Medium (500) | Tight (1.25) |

**ملاحظة RTL:** عند وجود نص مختلط (عربي + لاتيني)، الخط يُحدَّد تلقائياً بناءً على الحرف الأول في كل مقطع عبر نظام Unicode range في `@font-face`. الأرقام في السياق العربي تستخدم الأرقام العربية-الهندية (٠١٢٣٤٥٦٧٨٩) افتراضياً عبر `font-feature-settings: "ss01"` مع Cairo.

---

### 3.3 مقياس التباعد (Spacing Scale)

```css
--spacing-0:   0;      /* 0px */
--spacing-0-5: 0.125rem; /* 2px */
--spacing-1:   0.25rem;  /* 4px */
--spacing-1-5: 0.375rem; /* 6px */
--spacing-2:   0.5rem;   /* 8px */
--spacing-2-5: 0.625rem; /* 10px */
--spacing-3:   0.75rem;  /* 12px */
--spacing-4:   1rem;     /* 16px */
--spacing-5:   1.25rem;  /* 20px */
--spacing-6:   1.5rem;   /* 24px */
--spacing-8:   2rem;     /* 32px */
--spacing-10:  2.5rem;   /* 40px */
--spacing-12:  3rem;     /* 48px */
--spacing-16:  4rem;     /* 64px */
```

**استخدامات شائعة:**
- `spacing-1` (4px): فجوة بين أيقونة ونص داخل زر
- `spacing-2` (8px): padding داخلي لعناصر صغيرة (Badge, Chip)
- `spacing-3` (12px): padding داخلي لحقول الإدخال
- `spacing-4` (16px): padding بطاقة، gap بين عناصر قائمة
- `spacing-6` (24px): padding صفحة الجوال، فجوة بين أقسام
- `spacing-8` (32px): padding صفحة سطح المكتب
- `spacing-12` (48px): فجوة بين أقسام رئيسية
- `spacing-16` (64px): فجوة أقسام الصفحة الرئيسية

**ملاحظة Tailwind v4:** نستخدم الخصائص المنطقية (logical properties) بدل الاتجاهية. مثل: `ps-4` بدل `pl-4`، `me-2` بدل `mr-2`، `ms-auto` بدل `ml-auto`. هذا يضمن انعكاس التباعد تلقائياً في RTL.

---

### 3.4 مقياس نصف قطر الحدود (Border Radius Scale)

```css
--radius-sm:   0.375rem; /* 6px  — عناصر صغيرة: Badge, Chip */
--radius-md:   0.5rem;   /* 8px  — حقول الإدخال، أزرار */
--radius-lg:   0.75rem;  /* 12px — بطاقات، Dialog */
--radius-xl:   1rem;     /* 16px — بطاقات كبيرة، Modal */
--radius-full: 9999px;   /* دائري — Avatar, Switch, Pill buttons */
```

---

### 3.5 مقياس الظلال (Shadow Scale)

```css
--shadow-sm:  0 1px 2px 0 rgba(0, 0, 0, 0.05);                    /* ظل خفيف — بطاقات في حالة افتراضية */
--shadow-md:  0 4px 6px -1px rgba(0, 0, 0, 0.1),                   /* ظل متوسط — بطاقات عند التحويم */
              0 2px 4px -2px rgba(0, 0, 0, 0.1);
--shadow-lg:  0 10px 15px -3px rgba(0, 0, 0, 0.1),                 /* ظل كبير — Dialog، Dropdown */
              0 4px 6px -4px rgba(0, 0, 0, 0.1);
--shadow-xl:  0 20px 25px -5px rgba(0, 0, 0, 0.1),                 /* ظل كبير جداً — Modal كبير */
              0 8px 10px -6px rgba(0, 0, 0, 0.1);
```

**استخدامات الظلال:**
- `shadow-sm`: البطاقات في حالتها الافتراضية — تمييز خفيف عن الخلفية
- `shadow-md`: البطاقات عند hover — تمييز أوضح يُشير للتفاعلية
- `shadow-lg`: العناصر المنبثقة (Dropdown, Popover) — تمييز طبقي واضح
- `shadow-xl`: Dialog و Modal — أعلى مستوى طبقي
- لا ظل: الأزرار، حقول الإدخال، العناصر المضمنة

---

### 3.6 نظام الحدود (Border System)

```css
--border-width-default: 1px;
--border-width-focus:   2px;
--border-color-default: #E5E7EB; /* neutral-200 */
--border-color-focus:   #16A34A; /* primary-500 */
--border-color-error:   #EF4444; /* error-500 */
--border-color-disabled:#D1D5DB; /* neutral-300 */
```

---

### 3.7 نظام الأيقونات (Icon System)

**المكتبة:** `lucide-react` — مكتبة أيقونات مفتوحة المصدر تتوافق مع shadcn/ui

**مقاسات الأيقونات:**

```css
--icon-size-xs:  14px; /* داخل Badge أو نص صغير */
--icon-size-sm:  16px; /* داخل أزرار صغيرة، حقول إدخال */
--icon-size-md:  20px; /* داخل أزرار عادية، قوائم */
--icon-size-lg:  24px; /* أيقونات مستقلة، شريط جانبي */
--icon-size-xl:  32px; /* أيقونات حالة فارغة، رسوم توضيحية */
--icon-size-2xl: 48px; /* أيقونات صفحات الخطأ */
```

**قواعد انعكاس الأيقونات في RTL:**
- الأيقونات الاتجاهية **يجب** تنعكس في RTL: `arrow-left` ↔ `arrow-right`، `chevron-right` ↔ `chevron-left`، `log-out` (السهم)، `external-link`
- الأيقونات غير الاتجاهية **لا** تُنعكس: `search`، `upload`، `download`، `check`، `x`، `plus`
- آلية الانعكاس: عبر CSS `transform: scaleX(-1)` يُطبَّق عبر class `[dir="rtl"] .icon-directional`
- أو استخدام مكون `<IconRTL>` مخصص يتعامل مع الانعكاس تلقائياً

---

### 3.8 الحركة والرسوم المتحركة (Motion/Animation)

#### مدد الانتقالات (Transition Durations)

```css
--duration-fast:   150ms;  /* تغيير لون، تغيير حجم */
--duration-normal: 250ms;  /* ظهور/اختفاء عناصر، توسيع/طي */
--duration-slow:   350ms;  /* فتح/إغلاق Dialog، انتقال صفحة */
```

#### دوال التسهيل (Easing Functions)

```css
--ease-default: cubic-bezier(0.4, 0, 0.2, 1);   /* ease-in-out معتدل */
--ease-in:      cubic-bezier(0.4, 0, 1, 1);      /* دخول */
--ease-out:     cubic-bezier(0, 0, 0.2, 1);      /* خروج */
--ease-bounce:  cubic-bezier(0.34, 1.56, 0.64, 1); /* ارتداد خفيف — للإشعارات */
```

#### أنماط الحركة

| النمط | المدة | التسهيل | الاستخدام |
|-------|-------|---------|-----------|
| Hover color | fast (150ms) | default | تغيير لون أزرار وروابط |
| Focus ring | fast (150ms) | default | ظهور حلقة التركيز |
| Tooltip show | fast (150ms) | ease-out | ظهور التلميح |
| Dropdown open | normal (250ms) | ease-out | فتح القائمة المنسدلة |
| Dialog open | slow (350ms) | ease-out | فتح النافذة الحوارية |
| Toast enter | normal (250ms) | ease-bounce | دخول الإشعار |
| Toast exit | fast (150ms) | ease-in | خروج الإشعار |
| Skeleton pulse | 2000ms | default | نبض التحميل |
| Progress fill | normal (250ms) | ease-out | تعبئة شريط التقدم |

#### تقليل الحركة (Reduced Motion)

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

### 3.9 نظام مؤشر Z (Z-Index System)

```css
--z-base:      0;     /* المحتوى العادي */
--z-dropdown:  50;    /* القوائم المنسدلة، Select */
--z-sticky:    100;   /* الشريط العلوي الثابت */
--z-sidebar:   200;   /* الشريط الجانبي */
--z-overlay:   300;   /* خلفية Dialog/Drawer */
--z-modal:     400;   /* Dialog، Modal */
--z-toast:     500;   /* إشعارات Toast */
--z-tooltip:   600;   /* تلميحات Tooltip */
--z-max:       9999;  /* فقط لحالات الطوارئ */
```

**قاعدة:** لا يُستخدم رقم z-index خارج هذا المقياس. كل مكون يرث z-index من المستوى المناسب. التعارضات تُحل بتعديل ترتيب العناصر في DOM، لا بزيادة z-index.

---

## 4. جرد المكونات (Components Inventory)

> جميع المكونات مبنية على shadcn/ui مع تخصيص لدعم RTL والعربية. التفاصيل الكاملة لكل مكون كما في الإصدار السابق مع تحديث الاسم المرجعي.

### 4.1 زر (Button)

**الغرض:** العنصر التفاعلي الأساسي لتشغيل الإجراءات.

**الخصائص/API:**

```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'start' | 'end'; // منطقي: start = يمين في RTL
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  children: React.ReactNode;
}
```

**المتغيرات:**

| المتغير | الخلفية | النص | الحدود | الاستخدام |
|---------|---------|------|--------|-----------|
| Primary | primary-500 | white | لا | الإجراء الرئيسي (تحويل، حفظ) |
| Secondary | neutral-100 | neutral-800 | لا | الإجراءات الثانوية (إلغاء، رجوع) |
| Danger | error-500 | white | لا | إجراءات الحذف والتدمير |
| Ghost | transparent | neutral-700 | لا | إجراءات خفيفة (مزيد، فلترة) |
| Outline | transparent | primary-500 | 1px primary-500 | إجراءات بارزة غير أساسية |

**المقاسات:**

| المقاس | الارتفاع | الـ padding | حجم الخط | حجم الأيقونة |
|--------|---------|------------|---------|-------------|
| sm | 32px | px-3 py-1 | 13px | 14px |
| md | 40px | px-4 py-2 | 14px | 16px |
| lg | 48px | px-6 py-3 | 16px | 20px |

**الحالات:**

| الحالة | التغيير المرئي |
|--------|---------------|
| Default | حسب المتغير |
| Hover | Primary: bg-primary-600، Secondary: bg-neutral-200، Danger: bg-error-600، Ghost: bg-neutral-100، Outline: bg-primary-50 |
| Focus | ring-2 ring-primary-500 ring-offset-2 |
| Active | Primary: bg-primary-700، scale(0.98) |
| Disabled | opacity-50، cursor-not-allowed، no pointer events |
| Loading | نص يُستبدل بـ spinner + "جاري التنفيذ..."، زر معطل |

**إمكانية الوصول:** `role="button"` (أو `<button>` عنصر)، `aria-disabled`، `aria-busy` عند التحميل، `aria-label` إن لم يكن نص ظاهر

**سلوك RTL:** الأيقونة في `start` تظهر على اليمين، `end` على اليسار. النص محاذاة لليمين افتراضياً.

**سلوك الجوال:** المقاس الأدنى `md`، المساحة اللمسية ≥ 44px

**مثال:**

```tsx
<Button variant="primary" size="md" icon={<Upload />} iconPosition="start">
  رفع ملف
</Button>
```

---

### 4.2 حقل إدخال (Input)

**الغرض:** إدخال نص قصير من سطر واحد.

**الخصائص/API:**

```typescript
interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'search' | 'url';
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  label?: string;
  helperText?: string;
  error?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'start' | 'end';
  fullWidth?: boolean;
  dir?: 'rtl' | 'ltr' | 'auto';
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
}
```

**الحالات:**

| الحالة | الحدود | الخلفية | النص |
|--------|--------|---------|------|
| Default | 1px neutral-200 | white | neutral-800 |
| Hover | 1px neutral-300 | white | neutral-800 |
| Focus | 2px primary-500 | white | neutral-800 |
| Error | 1px error-500 | white | neutral-800 |
| Error Focus | 2px error-500 | white | neutral-800 |
| Disabled | 1px neutral-300 | neutral-50 | neutral-400 |
| ReadOnly | 1px neutral-200 | neutral-50 | neutral-600 |

**الارتفاع:** 40px (md)، 36px (sm)، 48px (lg)

**الـ padding:** `ps-3 pe-3` (منطقي)، مع `ps-10` إن وُجدت أيقونة في البداية

**سلوك RTL:** اتجاه النص تلقائي بناءً على المحتوى (`dir="auto"`). بريد إلكتروني وأرقام تعرض LTR تلقائياً.

**إمكانية الوصول:** `<label>` مرتبط عبر `htmlFor`، `aria-invalid` عند الخطأ، `aria-describedby` لرسالة الخطأ/المساعدة، `aria-required`

---

### 4.3–4.11 مكونات إضافية

المكونات التالية كما في الإصدار السابق مع تحديث المراجع:
- **4.3 حقل نصي (Textarea)** — مطابق للإصدار السابق
- **4.4 قائمة اختيار (Select)** — مطابق للإصدار السابق
- **4.5 مربع تحقق (Checkbox)** — مطابق للإصدار السابق
- **4.6 زر اختيار (Radio)** — مطابق للإصدار السابق
- **4.7 مفتاح تبديل (Switch)** — مطابق للإصدار السابق
- **4.8 بطاقة (Card)** — حاوية أساسية لبناء واجهة ابن الأزهر دوكس
- **4.9 نافذة حوارية (Dialog/Modal)** — مطابق للإصدار السابق
- **4.10 قائمة منسدلة (Dropdown Menu)** — مطابق للإصدار السابق
- **4.11 إشعار (Toast/Sonner)** — مطابق للإصدار السابق

---

## 5. قواعد RTL (شاملة)

### 5.1 الخصائص المنطقية

استخدام الخصائص المنطقية في Tailwind v4 بدل الاتجاهية:

| الاتجاهية (قديم) | المنطقية (جديد) | الاستخدام |
|---------|---------|------|
| `ml-*` / `mr-*` | `ms-*` / `me-*` | margin |
| `pl-*` / `pr-*` | `ps-*` / `pe-*` | padding |
| `left-*` / `right-*` | `start-*` / `end-*` | position |
| `border-l-*` / `border-r-*` | `border-s-*` / `border-e-*` | border |
| `rounded-l-*` / `rounded-r-*` | `rounded-s-*` / `rounded-e-*` | border radius |
| `text-left` / `text-right` | `text-start` / `text-end` | text align |

### 5.2 انعكاس الأيقونات

الأيقونات الاتجاهية تنعكس تلقائياً في RTL عبر CSS `[dir="rtl"] .icon-directional { transform: scaleX(-1) }` أو عبر مكون `<IconRTL>` مخصص.

### 5.3 انعكاس التخطيط

- Flexbox: `flex-row` ينعكس تلقائياً في RTL
- Grid: لا يتأثر بالاتجاه
- Float: `float-start` / `float-end` بدل `float-left` / `float-right`
- Position: `start-0` / `end-0` بدل `left-0` / `right-0`

---

## 6. قواعد إمكانية الوصول (Accessibility Rules)

### 6.1 التباين

- نسبة التباين ≥ 4.5:1 للنص العادي (WCAG AA)
- نسبة التباين ≥ 3:1 للنص الكبير (WCAG AA)
- نسبة التباين ≥ 3:1 لعناصر الواجهة التفاعلية

### 6.2 لوحة المفاتيح

- جميع العناصر التفاعلية قابلة للوصول عبر Tab
- ترتيب Tab منطقي (بصري في RTL: من اليمين لليسار)
- Focus ring مرئي دائمًا: `ring-2 ring-primary-500 ring-offset-2`
- Escape يغلق Dialog/Dropdown/Drawer
- أسهم لوحة المفاتيح للتنقل في القوائم

### 6.3 قارئات الشاشة

- صور: `alt` وصفي
- أيقونات تزيينية: `aria-hidden="true"`
- أيقونات تفاعلية: `aria-label`
- Dialog: `role="dialog"`, `aria-modal="true"`
- Toast: `role="status"`, `aria-live="polite"`
- حالات التحويل: `aria-live="polite"` لتحديثات SSE

### 6.4 الألوان

- الألوان ليست الوسيلة الوحيدة لنقل المعلومات
- الأخطاء: لون + أيقونة + نص (ثلاث وسائل)
- الحالات: لون + أيقونة + نص

---

## 7. قواعد الجوال (Mobile Rules)

### 7.1 نقاط الكسر

| النوع | العرض | التخطيط |
|-------|-------|---------|
| الجوال | 320px-767px | عمود واحد، أدراج، بطاقات |
| الجهاز اللوحي | 768px-1279px | عمودان، شريط جانبي مطوي |
| سطح المكتب | 1280px+ | أعمدة متعددة، شريط جانبي كامل |

### 7.2 مساحة اللمس

- الحد الأدنى: 44×44px لكل عنصر تفاعلي
- المسافة بين العناصر التفاعلية: ≥ 8px
- الأزرار على الجوال: المقاس الأدنى `md` (40px ارتفاع)

### 7.3 التمرير

- `scroll-behavior: smooth`
- شريط تمرير مخصص: `scrollbar-width: thin` و `scrollbar-color`
- عند فتح Drawer: قفل تمرير المحتوى الخلفي (`overflow: hidden` على body)

---

## 8. سياسة الوضع الداكن (Dark Mode Policy)

### 8.1 قرار MVP

**الوضع الداكن ليس جزءًا من MVP.** البنية جاهزة في design tokens (انظر قسم 3.1 — هيكل الوضع الداكن)، لكن التنفيذ الفعلي مؤجل لإصدار لاحق.

### 8.2 أسباب التأجيل

1. **نطاق MVP:** التركيز على الوظائف الأساسية (تحويل، تصدير، مشاركة) أولوية أعلى
2. **جهد التصميم:** كل مكون يحتاج اختبار في الوضعين الفاتح والداكن
3. **تعقيد RTL + Dark Mode:** تركيبة RTL + Dark Mode تضاعف حالات الاختبار
4. **shadcn/ui:** يدعم Dark Mode أصلاً، لكن التخصيصات العربية تحتاج مراجعة

### 8.3 التحضير المستقبلي

- جميع الألوان محفوظة كـ CSS custom properties (tokens)
- بنية الوضع الداكن محددة مسبقاً (انظر قسم 3.1)
- عند التنفيذ: استخدام `next-themes` مع `class` strategy
- المتغيرات الداكنة تستخدم نفس الأسماء مع prefix `dark-`

### 8.4 التوقيت المتوقع

- V1 أو V2 حسب أولويات المستخدمين بعد إطلاق MVP
- يتطلب spike لتقييم الجهد اللازم لتخصيصات shadcn/ui + RTL + Dark Mode
