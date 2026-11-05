# تنفيذ الهوية البصرية — BRAND_IMPLEMENTATION

> المصدر: موجز الهوية المسلّم في المهمة (Teal `#127E87` · Gold `#DA9E2C` · Prussian `#083B40` ·
> الخطوط Almarai / Thmanyah · Clear Space ‏190px‏ · الحد الأدنى ‏152px‏).
> ملاحظة مصدر: لم يُعثر على ملف `ai_studio_code.html` داخل هذا المستودع (مجلد Visual Identity غير موجود)؛
> النسختان الموجودتان في `Data/_Inbox/` تخصان ألفية ابن مالك ومراجعة التفاضل ولا علاقة لهما بالهوية،
> فطُبّقت مواصفات الموجز مباشرة دون اختلاق محتوى من ملف غير موجود.

## 1) لوحة الألوان

| الدور | Hex | التوكن (Tailwind v4 `@theme`) | الاستخدام |
|---|---|---|---|
| Teal (أساسي) | `#127E87` | `--color-primary-*` / `--color-teal-*` (`-500`) | أزرار رئيسية، تركيز، نجاح(`--success`)، شارات |
| Gold (تمييز) | `#DA9E2C` | `--color-gold-*` (`-500`) / `--gold` | لمسات ذهبية، تحديد نص `::selection`، تدرّجات premium |
| Prussian (عميق) | `#083B40` | `--color-prussian-*` (`-500`) / `--brand-prussian` | الوضع الداكن: خلفية `#042023`، سطح `#083B40`، بطاقة `#0A454A` |

- السلم `50→900` لكل لون مولّد بخلط محسوب مع الأبيض/الأسود (انظر `brand.css`).
- الوضع الفاتح: `--btn-primary-bg: #127e87`، `--ring-focus: #127e87`، `--gold: #da9e2c`.
- الوضع الداكن (`.dark`): أسطح مائلة للـ Prussian بدل الرمادي المحايد، مع بقاء Teal للزر الرئيسي وGold للتمييز.
- ألوان دلالية محفوظة: خطأ `#dc2626`، معلومات `#3b82f6`، تحذير `#f59e0b`.

## 2) الخطوط

| الدور | الخط | التنفيذ |
|---|---|---|
| نص/واجهة | **Almarai** | `next/font/google` في `apps/web/src/ui/fonts.ts` (`--font-almarai`) |
| عناوين/عرض | **Thmanyah** | Stack في CSS: `"Thmanyah", Almarai, Amiri, "Noto Naskh Arabic", serif` (`--font-family-thmanyah`) |

- Thmanyah خط تجاري غير متاح على Google Fonts: يحتاج ملفات مرخّصة تُستضاف ذاتياً في `public/fonts/thmanyah/`
  مع `@font-face` حتى يظهر فعلياً؛ حتى ذلك الحين يسقط على Almarai/Amiri.
- توافق خلفي: `--font-family-cairo` → Almarai و`--font-family-amiri` → Thmanyah (لأن `reading.css`/`landing.css`
  ما زالا يستخدمانهما)، وتصديرا `cairo`/`amiri` في `fonts.ts` أُبقيا كـ aliases لـ `almarai` مع `@deprecated`.

## 3) قواعد الشعار (Logo Lockup)

```css
--logo-clear-space: 190px;  /* مساحة أمان على الجوانب الأربعة */
--logo-min-size: 152px;     /* أصغر عرض/ارتفاع مسموح للشعار */
```

- أدوات جاهزة في `brand.css`: `.brand-clear-space` (حشوة 190px)، `.brand-logo-min` (حد أدنى 152px)،
  `.brand-logo` (الاثنان معاً).
- ثوابت برمجية في `apps/web/src/ui/brand.ts`: `BRAND_COLORS`، `BRAND_LOGO { clearSpacePx: 190, minSizePx: 152 }`، `BRAND_FONTS`.

## 4) الملفات المعدّلة

- `apps/web/src/styles/brand.css` — `@theme` (مقاييس Teal/Gold/Prussian + خطوط) و`:root`/`.dark` + أدوات الشعار.
- `apps/web/src/styles/globals.css` — `::selection` من الذهبي القديم إلى `rgba(218,158,44,.28)`.
- `apps/web/src/ui/fonts.ts` — Almarai عبر `next/font`، وإبقاء aliases للتوافق.
- `apps/web/src/ui/brand.ts` — ثوابت الألوان/الشعار/الخطوط.
- `apps/web/src/app/layout.tsx` — `themeColor: #127E87` واستخدام `almarai.variable`.

## 5) التحقق

- `pnpm lint` ✅ (نجح دون أخطاء؛ التشغيل المباشر بـ `npx eslint` بدون `--rulesdir infrastructure/eslint/rules`
  يعطي خطأ إعداد مسبق `rule 'no-server-imports-in-client' was not found` لا علاقة له بهذا التغيير).
- `pnpm typecheck` ✅ (جميع مشاريع `tsc`: web/pipeline/ocr-worker/export-worker/database).
- لم تُشغَّل اختبارات بصرية (Playwright snapshots) — اللقطات القديمة مبنية على الألوان السابقة وستحتاج تحديثاً
  (`--update-snapshots`) عند مراجعة بصرية لاحقة.

## 6) ما تبقّى (خارج نطاق هذا التنفيذ)

1. استضافة ملفات Thmanyah المرخّصة + `@font-face`، ثم إزالة fallback Amiri.
2. تحديث لقطات Playwright البصرية بعد مراجعة تصميمية.
3. مراجعة أي ألوان صلبة متبقية خارج التوكنز (`shared/constants.ts` لون الوسم الافتراضي `#16A34A` لم يُمسّ لأنه بيانات مستخدم لا هوية).
