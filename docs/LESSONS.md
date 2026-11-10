# دروس

- تجنّب تحرير ملفات الضيوف المشتركة (`guest-limits.ts`/`guest-tool-processor.ts`/`guest-jobs.service.ts`) من جلستين متوازيتين — الـ lease يُقفلها ولن تُنفَّذ التعديلات.
- عند إضافة فرع نصي جديد (`tashkeel`) يُعرَّف البوابة على `(acceptsFiles || acceptsText)` وإلا يُرفض النص قبل المعالجة.
- الاختبار في `tests/api` الصفحات يفترض "أداة جانبها معلقة" — راجعه عند فتح أداة كان مغلقة.
## 2026-11-07 (013)
- lint: لا تشغّل eslint مباشرة على الملفات — القاعدة المحلية `no-server-imports-in-client` تأتي من `--rulesdir infrastructure/eslint/rules`؛ بدونها تظهر 800+ خطأ وهمي «Definition for rule not found». الفحص الصحيح: `pnpm lint`.
- HF Space: استبعاد `apps/web/public` من أرشيف النشر يكسر favicon/manifest — السكربت الآن ينشر public كاملًا عبر LFS (*.png/*.ico/*.wasm). قبل نشر أي أصل عام: curl على `/brand/favicon-64.png`.
- وكلاء النموذج المجاني في الخلفية يموتون بصمت عند نفاد الحصة («Free usage limit reached») — للمهام المتسلسلة على نفس الملفات: disptach أمامي أو دفعة واحدة لكل ملكية ملف.
