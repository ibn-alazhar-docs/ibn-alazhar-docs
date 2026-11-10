# Plan 013

## Strategy

دفعتان تنفذّان بالترتيب (نفس ملف `messages/*.json` لا يُلمس بالتوازي):

- **D1 — الهدم والبناء الداخلي**: حذف كل طبقات أدوات الضيوف والتفريغ الصوتي، ونقل التشكيل لأداة داخلية خلف الجلسة.
- **D2 — جولة التصميم والمنطق**: شريط تقدم، clamp الرفع، مراحل المعالجة، RTL الخروج، تعبئة الهبوط والإعدادات، فاتح سليم.

## File map (D1)

| الإجراء | المسار |
|---|---|
| حذف صفحات | `apps/web/src/app/[locale]/(site)/tools/**` (5 ملفات) |
| حذف API | `apps/web/src/app/api/tools/guest/**` (2 route.ts) |
| حذف خدمات | `apps/web/src/core/services/guest/**` (5 ملفات) |
| حذف نطاق/مشترك | `domain/guest-tools.ts` · `shared/guest-route-response.ts` · `shared/tools/guest-limits.ts` |
| حذف UI | `ui/tools/guest-tool-client.tsx` · `tool-card.tsx` · `read-only-result.tsx` |
| middleware | `(site)/tools` و`/api/tools/guest` تُزال من `publicPagePrefixes`؛ حذف استثناء سطر 215 |
| sitemap | حذف 5 روابط tools |
| public-header | حذف روابط الأدوات (أسطر 38,76,82,88,94) |
| messages ar/en | حذف كتلة `tools.*` الضيوف + keys `transcription`؛ استبدال `section.hero.eyebrow` و`footer.tagline` بلا superlative؛ إضافة keys `dashboardTools.*` و`conversions.stages.*` (D2 يستعملها) |
| tests | حذف `tests/api/guest-tools-api.test.ts` · `tests/backend/guest-text-path.test.ts` · `tests/backend/transcription.test.ts`؛ تحديث `tests/api/openapi-spec.ts` (guest schemas) و`tests/security/headers-config.test.ts` إن يمس /tools |
| pipeline | حذف `packages/pipeline/src/transcription/**` + تصديره من `index.ts`؛ تبقى `text/clean/diacritize.ts` |
| جديد | `app/[locale]/(dashboard)/tools/page.tsx` + `app/api/tools/tashkeel/route.ts` (جلسة إلزامية) |
| docs | `IMPLEMENTATION_TOOLS.md` §7 (ضيوف→داخلي)؛ `openapi.yaml` حذف guest/transcription |

## File map (D2)

`ui/layout/header.tsx` (ترتيب logout RTL + wordmark لا يُقطع نصفيًا) · `ui/layout/route-progress.tsx` جديد + استعماله · `ui/pipeline/file-upload.tsx` + `conversion-status.tsx` (clamp + مراحل + استعادة jobId + polling fallback) · `loading.tsx` skeletons للمجلدات · `settings-content.tsx` شبكة أعرض + بطاقة «حول» · تدقيق فاتح (text/bg-white) · `public-footer`/hero تعبئة فراغ الجوانب بشبكة ميزات لا أسطر ميتة.

## Copy rules (من ملاحظات المستخدم)

- «منصة ابن الأزهر» بالهمزة والتاء المربوطة — لا «منصه»/«الازهر».
- بلا «أول منصة شاملة للثانوية الأزهرية»؛ الوصف الصادق: أداة مستندات داخل منظومة ابن الأزهر.
- صياغة ux-araby: فصحى مبسطة، بلا عرنجة، بلا حشو إنجليزي، لا إيموجي في الواجهة.

## Verify

`pnpm check` → `pnpm --filter @ibn-al-azhar-docs/web build` → `pnpm test:unit` → `python3 -c json.load` على messages → `spec_gate` → commit/push → sync-hf → curl حي (`/tools` بلا جلسة ⇒ 3xx لتسجيل الدخول، `/api/tools/guest/jobs` ⇒ 401/404، favicon 200).
