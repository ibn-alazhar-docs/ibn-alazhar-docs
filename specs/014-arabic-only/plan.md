# Plan 014 — عربية فقط

## الاستراتيجية

دفعة تنفيذ واحدة (وكيل implementer) لأن الملفات متشابكة (routing ↔ middleware ↔ toggle ↔ settings ↔ tests)، ثم تحقق المنسّق + نشر + فحص حي. إبقاء `[locale]` وبادئة `/ar` — الحذف الجذري للبنية يمس عشرات الملفات بلا مكسب للمستخدم.

## القرارات

1. `routing.ts`: `locales: ["ar"]` وحدها. next-intl بـ locale واحد: `/en/...` لا يطابق أي locale ⇒ middleware يحوّله صراحة إلى `/ar/...` (قبل أن يصل 404 غامض).
2. `messages/en.json` يُحذف؛ `i18n/request.ts` يبقي ar فقط (بدون fallback en).
3. `ui/locale/locale-toggle.tsx` يُحذف وكل استعمالاته؛ قسم اللغة في الإعدادات يتحول لسطر «اللغة: العربية» ثابت أو يُحذف بالكامل.
4. `shared/content/i18n-data.ts`: حذف قيم `en` من كل كائن وتسمية الحقول ar-only؛ حذف فئة `talab-alilm`؛ `journeys-data.ts`: رحلات صادقة عن استخدام المنصة (رفع→معالجة→تنظيم→تصدير) أو حذف /journeys إن بقي مصطنعًا — **القرار: إعادة كتابة صادقة، والحذف إن تعذّر**.
5. `apps/web/content/en/**` و`content/ar/talab-alilm/**` تُحذف (git rm). MDX المتبقي (doc-001..003) يُعاد توجيهه: مقدمة عن منصة التحويل، منهجية العمل على الملفات، تنظيم المكتبة/المجلدات/الوسوم — بلا «رحلة معرفية/تأليف وتصنيف» عبط.
6. sitemap/robots/manifest/layout alternates: نسخة ar فقط.
7. الاختبارات: أي e2e/frontend/api يفتح `/en/` أو يفحص EN toggle → يُحدَّث أو تُحذف بنداته (توثيق السبب سطرًا). snapshots: تشغيل CI يعيد توليدها؟ إن كان `--update-snapshots` غير مفعّل، بنود الـvisual التي تتغير تُعدَّل لتتوافق مع ar-only.
8. الفحوص الحية بعد النشر: `/en` → 30x نحو `/ar`؛ لا زر EN في DOM الرئيسي؛ `/docs` و`/journeys` بلا «طلب العلم» (grep HTML).

## ترتيب التنفيذ

D1 implementer (الكود+المحتوى+الاختبارات) → تحقق المنسّق (check/build/unit/frontend) → commit+push → sync-hf → curl حي → spec_gate 014.
