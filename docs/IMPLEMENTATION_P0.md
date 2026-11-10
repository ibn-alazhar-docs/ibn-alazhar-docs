# P0 OCR — تنفيذ KeyPool + QA Gates

التاريخ: 2026-11-05 · المصدر: `SKILLS/arabic-pdf-to-book` v2.9.0 (الفرع lowercase `projects/`، HEAD `8f7f0ad`)
الحالة: منفّذ ومُتحقق بالبناء والاختبار

## ما تم

| الملف | المصدر | الدور |
|---|---|---|
| `packages/pipeline/src/keypool.ts` | `scripts/keypool.py` (121 سطر) | حصة (مفتاح × موديل) 20 طلب/يوم/موديل، قطعة ≤10 ص → 200 ص/موديل/مفتاح، 8 موديلات × مفاتيح |
| `packages/pipeline/src/qa-gates.ts` | `scripts/qa_gates.py` (348 سطر) | بوابات جودة قابلة للقياس، خروج 0/1/2، fail = `!ok && !warn` |
| `packages/pipeline/src/ocr-providers/gemini.ts` | ربط | `tryWithModelFallbacks` تدور على `KeyPool.plan()` فعليًا (في الأصل `gemini_ocr.py` لم يستخدم KeyPool — كان `dead_models` فقط) |
| `packages/pipeline/src/index.ts` | — | تصدير `keypool` و`qa-gates` |

## فروق مقصودة عن الأصل (أفضل من النسخ الحرفي)

1. **بصمة المفتاح**: `sha256(key).slice(0,12)` بدل آخر 6 حروف — آخر 6 قابلة للتصادم وتسرّب بصمة في ملف حالة.
2. **`lamSwapRate` مكرّرة داخل `qa-gates.ts`** (8 أسطر) بدل استيرادها من وحدة OCR — كما أوصى تدقيق الدمج؛ تجنّب coupling لا داعي له.
3. **عدّ الصفحات**: `pdfinfo` (binary) ← `pdf-lib` الموجودة أصلًا في dependencies. عدّ OMML يبقى عدّ `<m:oMath` في `word/document.xml` لكن عبر نصّه الجاهز (`docxDocumentXml`) — لا مكتبة zip جديدة.
4. **`consume()` يحتفظ بمعنى الأصل**: +1 طلب فقط مهما كان عدد الصفحات (الحصة بالطلبات)؛ `pages` للتوافق التوقيعي فقط. لا يغيّر السلوك.
5. **أخطاء الحصة/المفتاح لا تُسقط العملية**: 429/403/401 → تخطي الخانة للخانة التالية داخل `tryWithModelFallbacks`. الخطأ غير العابر وغير الحصة يُرمى فورًا كما كان. نفاد كل الخانات → `KEYPOOL_EXHAUSTED` برسالة واضحة (البديل: Tesseract محلي).
6. حالة KeyPool يومية وتُصفَّر تلقائيًا، كتابة ذرّية (tmp + rename)، المفاتيح لا تُسجَّل كاملة أبدًا — البصمة فقط.

## اكتشاف المفاتيح (نفس ترتيب الأصل)

`GEMINI_API_KEY_1..N` (مرتبة) ← `~/.config/ocr/gemini_keys` (سطر/مفتاح، `#` تعليق) ← `GEMINI_API_KEY` ← `~/.config/ocr/gemini_key`. مفتاح `config.gemini.apiKey` يأتي أولًا في القائمة المدمجة عند الربط.

الحالة: `~/.cache/pdf2book/keypool.json` — قابلة للتجاوز بـ `new KeyPool({ statePath, limit, pagesPerRequest })` للاختبارات والعمال. الحدود من `GEMINI_DAILY_LIMIT` (افتراضي 20) و`GEMINI_PAGES_PER_REQ` (افتراضي 10).

## بوابات QA (العتبات حرفيًا من الأصل)

`page-ratio` (≥50% ناتج/أصل) · `ocr-coverage` (≥85% fail-closed — بلا علامات صفحات = فشل «لا يمكن إثبات التغطية») · `no-garbled-layer` (`lam_swap_rate <6%`، عينة ≥1500 كلمة) · `chars-per-page` (≥250) · `short-lines` (≤28% عربي / ≤45% إنجليزي، تحذير للتشغيل الصغير <50 سطر أو <12 صفحة أو `row_ratio>0.3`) · `solo-diacritics` (≤20) · `no-pagebreak-leak` · `no-reversed-parens` (`)word(`) · `no-bad-markup` · `no-camscanner` · `duplicates` (≤20%) · `headings` (تحذير إلا بـ `--require-headings`) · `placeholders` (تحذير، تسامح `max(5, lines/100)`) · `latin-ratio` (تحذير >15%) · `duplicate-pages` (≤10%، تحذير إن ≤16 صفحة) · `equations`/`equations-count` (OMML ≥95%) · `tables` (أعمدة متساوية) · `docx` (≥5 فقرات + عربي + لا وسوم) · `pdf`.

الدالة النقية `evaluateQaGates(md, raw?, cleanReport?, inputPages, ...)` + طبقة رقيقة `runQaGatesOnFile` (buffers + pdf-lib). تقرير JSON بنفس شكل الأصل: `{pass, exitCode, inputPages, outputPages, charsPerPage, metrics, checks[]}`.

## التحقق

- `tsc -p packages/pipeline/tsconfig.json --noEmit` (أو `pnpm --filter @ibn-al-azhar-docs/pipeline build` حسب إعدادات المشروع)
- اختبار دخاني: `KeyPool` بخمسة مفاتيح × موديلين = سعة 2,000 صفحة/يوم، و`evaluateQaGates` على md سليم يجتاز، وعلى md بلا فواصل صفحات يفشل `ocr-coverage` (fail-closed).
- لا اعتماديات جديدة. لا تغيير في chunk sizes الحالية (native=4، batch=10) — خارج نطاق P0.

## ما لم يُنقل (خارج P0، موثّق في MERGE_PLAN)

`verify_quotes` (Q/H/T — يحتاج SequenceMatcher)، استخراج مباشر `<60%`، bidi/reference-doc عربي في `docx-generator`، Tools Hub. كلها P1+.

## ملحوظة فرع

النسخة `Projects/` (Capital-P) v2.7.0 فرع غير مدمج — نُقل من `projects/` lowercase v2.9.0 فقط. إضافات Capital-P (`arabic_nlp`، `table_extract`، `gemini_quality_gate`) لم تُدمج بعد.
