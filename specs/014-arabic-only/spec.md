# Spec 014 — عربية بالكامل + وثائق صادقة

**قرار مستخدم نهائي (2026-11-07):** ميزة اللغة الإنجليزية تُمحى من الموقع كله من جذورها؛ والمنصة **منصة تحويل/معالجة مستندات** — أي محتوى «رحلة معرفية/فقه طلب العلم/أمهات الكتب» وهمٌ يُشال.

## User Stories

- **US1**: مستخدم عربي لا يرى أي أثر للإنجليزية: لا زر EN/AR، لا خيار لغة، لا `/en/*`، لا hreflang إنجليزي، لا رسائل en.
- **US2**: من يصل `/en/...` قديمًا يُحوَّل إلى `/ar/...` بلا كسر.
- **US3**: `/docs` يشرح الحقيقة فقط: رفع PDF/صور ← OCR ← تنظيف ← معاينة ← تصدير (Word/PDF/EPUB/Markdown)، مجلدات ووسوم وبحث وحذف.
- **US4**: لا `/journeys` ولا «رحلات طلب العلم» — نظام كامل يُقتلع.

## Requirements (FR)

- **FR-001**: `i18n/routing.ts` locales `["ar"]` وحدها؛ حذف `messages/en.json`؛ حذف `locale-toggle.tsx` وكل تركيباته (header/public-header)؛ حذف `direction-provider` إن صار تافهًا أو تبسيطه لـrtl ثابت؛ بطاقة اللغة في الإعدادات تُحذف (الثيم يبقى)؛ مفاتيح `language/english/arabic` تُمحى من ar.json.
- **FR-002**: middleware: حذف فرع accept-language=en؛ `/en/*` → 301/302 نحو `/ar/*`؛ فحص urlLocale يبقى "ar" فقط؛ `global-error` و`verify-email` و`SUPPORTED_LOCALES`: ar فقط؛ تواريخ `toLocaleDateString`: "ar-EG" بلا فرع en؛ metadata: `languageAlternates`/hreflang بلا en، ogLocale `ar_AR` ثابت.
- **FR-003**: حذف `apps/web/content/en/**` و`apps/web/content/ar/talab-alilm/** (8 quest-*.mdx)` و`doc-003-knowledge-taxonomies` الوهمي؛ حذف نظام journeys كاملًا: `journeys-data.ts`، دوال getJourneys/getJourney/getDocJourneys واستعمالاتها، صفحات `(site)/journeys/**`، مكوّنات journey-card/journey-context، رابط «جميع المسارات» من docs/page، `"/journeys"` من publicPagePrefixes، حلقة journeys من sitemap.
- **FR-004**: إعادة كتابة doc-001 وdoc-002 وorganization MDX بصدق (فصحى مبسطة ux-araby): ما تفعله المنصة فعليًا فقط، بلا superlatives ولا وعود «مكتبة حية/مرجع لكل طالب علم»؛ CATEGORY_LABELS: introduction «مقدمة»، organization «تنظيم المكتبة» — وحذف talab-alilm من كل بيانات الفئات؛ `getLocaleName` بلا English.
- **FR-005**: brand.ts: كل ما يظهر للعموم بالعربية (manifest short_name «ابن الأزهر»، og siteName ar)؛ لا `BRAND_NAME.en` في مسارات UI.
- **FR-006**: اختبارات: كل e2e/frontend يفتح `/en/` أو يفحص EN toggle أو يلتقط snapshots لصفحات محذوفة — يُحدَّث أو تُحذف بنوده مع سطر سبب؛ ممنوع إسكات أخطاء بلا سبب.
- **FR-007**: `pnpm check` + build + `test:unit` + `test:frontend` خضراء؛ حيًا بعد النشر: `/en` → تحويل `/ar`، لا EN في DOM، `/journeys` 404، `/docs` بلا «طلب العلم».

## Non-goals

- لا تغيير في بنية `[locale]` (يبقى بادئة `/ar` — أرخص وأأمن)؛ لا لمس لـswagger `/docs` التقني (app/docs/page.tsx).
