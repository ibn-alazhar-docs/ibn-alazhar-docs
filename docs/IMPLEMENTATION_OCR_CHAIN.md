# سلسلة OCR الموحّدة — direct pdf-parse → Tesseract → Gemini keypool (مع retry chunk 6 عند فشل QA)

التاريخ: 2026-11-05 · المصدر: `projects/SKILLS/arabic-pdf-to-book` v2.9.0 (HEAD `8f7f0ad`)
الحالة: منفّذ ومُتحقَّق (typecheck + vitest داخل المشروع)

## السلسلة ونطاقها

```
PDF
 │
 ▼ 1. Direct pdf-parse  (مجاني، بلا OCR)
 │  document-router.routeDocument() → decideRoute()
 │  native فقط إن: تغطية ≥60% صفحات بنصّ (≥50 حرفًا/صفحة)،
 │  متوسط ≥25 كلمة/صفحة، lam-swap <6%. وإلا ocr.
 ▼
 2. Tesseract (محلي، بلا حصة)
 │  OcrManager عبر resolveOcrChainOrder() — محلي أولًا دائمًا
 ▼
 3. Gemini keypool (سحابي)
 │  آخر السلسلة فقط عند توفّر خانة (مفتاح × موديل) في KeyPool
 │  قطعة قياسية 10 صفحات، وعند فشل QA تُعاد مرة واحدة بقطع 6 صفحات
 ▼
 QA gates الكاملة (evaluateQaGates) بعد كل نتيجة، في مرحلتي ocr ثم clean
```

> **التوجيه:** `document-router` يحسم native-vs-ocr. `ocr-chain` ينسّق المزوّدين + QA + إعادة 6. `ocr-providers` هي التنفيذ (tesseract.ts محلي، gemini.ts keypool + قطع 10/6). `ocr-provider.OcrManager` هو fallback الآلي.

## الملفات والمكوّنات

| الملف | الدور في السلسلة |
|---|---|
| `packages/pipeline/src/document-router.ts` | `routeDocument()` + `decideRoute()` النقيّة، حدود `NATIVE_MIN_COVERAGE=0.6`، `NATIVE_MIN_WORDS_PER_PAGE=25`، `NATIVE_GARBLED_MAX_PCT=6` |
| `packages/pipeline/src/ocr-chain.ts` | المنسّق: `runOcrChain()`، `runQaOnResult()`، `shouldRetryChunkOnQaFailure()`، `OCR_CHAIN_STEPS` |
| `packages/pipeline/src/ocr-provider.ts` | `resolveOcrChainOrder()` + `buildOcrChain()`، `OcrManager` يستخدم الترتيب الجديد في المحاولة وإعادة الترتيب التكيّفية |
| `packages/pipeline/src/ocr-providers/tesseract.ts` | محلي؛ `isAvailable` بفحص pytesseract مرة واحدة (مخزّن)، batch ثابت 10 |
| `packages/pipeline/src/ocr-providers/gemini.ts` | `GEMINI_DEFAULT_CHUNK_SIZE=10`، `GEMINI_RETRY_CHUNK_SIZE=6`، `retryChunkSizeOnQaFailure()`، `isChunkQaFailed()`، دفعات صور = حجم القطعة من config، QA خفيف لكل قطعة |
| `packages/pipeline/src/config/google.ts` | `GEMINI_NATIVE_CHUNK_SIZE` default 10 (كان 4) |
| `packages/pipeline/src/keypool.ts` | (من P0) حصة يومية بالطلبات، بصمة SHA-256، تخطّي الخانة عند 429/403/401 |
| `packages/pipeline/src/qa-gates.ts` | (من P0) العتبات حرفيًّا كما في الأصل |
| `workers/ocr-worker/src/stages/split.ts` | يستخدم `routeDocument()` بدل التصنّع المباشر |
| `workers/ocr-worker/src/stages/ocr.ts` | يستخدم `runOcrChain()`؛ أُزيل انتظام Gemini-first الخاص — محلي-أولًا فعليًّا؛ يكتب `text.json` + `qa.json` |
| `workers/ocr-worker/src/stages/clean.ts` | يوثّق QA بعد التنظيف في `qa.json` + `needsReview` عند الفشل، دون إسقاط المهمة |
| `tests/backend/ocr-chain.test.ts` | 11 اختبارًا: توجيه، ترتيب، retry، isChunkQaFailed، runOcrChain-native |

## القرارات التنفيذية (عمدًا لا نسخًا حرفيًّا)

1. **محلي-أولًا مُثبَّت آليًّا:** `resolveOcrChainOrder` يعيد ترتيب `OCR_PROVIDERS` فيحفظ كل المزوّدين لكن يضمن `tesseract` قبل `gemini` حتى لو تُكتب `OCR_PROVIDERS=gemini,tesseract`. لا يحذف ولا يضيف مزوّدًا. أُزيل الانتظام الخاص في `ocr stage` الذي كان يقدّم Gemini حتى عند وجود ذلك المزوّد.
2. **إعادة 6 مرة واحدة فقط، وGemini فقط:** نفس `pipeline.py` §5 حرفيًّا — إن كان المصدر OCR (route=ocr)، والمحرك Gemini، و`--no-retry` غير مفعّلة، والقطعة الحالية >6: إعادة بقطعة 6 ثم تقييم ثانٍ. المحلي وحده لا يُعاد (`ocr_engine != "local"`)، وnative لا يُعاد (`used_ocr` فقط). الاحتفاظ بالأفضل بين المحاولتين.
3. **فشل QA لا يُسقط المهمة:** بعد الإعادة، إن بقي QA فاشلًا تُستمر بنفس النتيجة degraded + `needsReview=true` + تقرير `qa.json` (أصلًا الأصل يُفضّله على إضاعة كتاب ينجح جزئيًّا). الأصل في `pipeline.py` يُعيد البناء ثم يقرأ `passed` لكن لا يموت الكتاب في التقرير النهائي تلقائيًّا.
4. **KeyPool نُفاد ⇒ انتقال، لا إسقاط:** `KEYPOOL_EXHAUSTED` يُرمى من Gemini لكن `OcrManager` ينتقل للاحتياطي التالي إن وُجد، وإلا `ALL_OCR_PROVIDERS_FAILED`. سلوك P0 السابق يُحافظ عليه مع الترتيب الجديد.

## إعدادات البيئة

| المتغيّر | الافتراضي | المعنى |
|---|---|---|
| `OCR_PROVIDERS` | `surya,tesseract` | المزوّدات المفعّلة؛ يُعاد ترتيبها محليًّا |
| `OCR_CLOUD_ENABLED=true` | `false` | يلحق `gemini` أخيرًا إن وُجدت مفاتيح |
| `GEMINI_NATIVE_CHUNK_SIZE` | `10` | حجم القطعة القياسي (الصفحات) |
| `GEMINI_API_KEY_N` / `GEMINI_API_KEY` / `~/.config/ocr/gemini_keys` | — | مفاتيح KeyPool بنفس ترتيب P0 |
| `GEMINI_DAILY_LIMIT` / `GEMINI_PAGES_PER_REQ` | `20` / `10` | حصة الطلبات |
| `OCR_MIN_CONFIDENCE` | `0` | تحتها تُعلّم `needsReview` لكن تستمر |

## الإعداد المقترح للنشر

```
OCR_PROVIDERS=tesseract,gemini
GEMINI_NATIVE_CHUNK_SIZE=10
OCR_MIN_CONFIDENCE=0.5
```
ملاحظة إقامة البيانات: `direct` و`Tesseract` محليّان تمامًا، و`Gemini` وحده يرفع الصفحات إلى vendor — لا يُوصَل إليه ما دام محلي متاحًا.

## التحقق

```
npx tsc -p packages/pipeline/tsconfig.json --noEmit
npx tsc -p workers/ocr-worker/tsconfig.json --noEmit
npx vitest run tests/backend/ocr-chain.test.ts                # 11 test: توجيه + ترتيب + retry
npx vitest run tests/backend/ocr-manager.test.ts tests/backend/ocr-providers-cloud.test.ts
```
> **حالة الاختبارات الحالية:** أثناء التنفيذ ظهرت 2 إخفاقات مسبقة في `tests/backend/ocr-providers-local.test.ts` (Surya payload format: test يتوقّع `[[{text,confidence}]]` والشيفرة الحالية `[{lines:[...],needs_retry}]`). هي غير متعلّقة بهذه السلسلة (تقدّم على HEAD)، وتُوثَّق في تقرير الإنجاز.

## خارج النطاق

`verify_quotes` (Q/H/T — SequenceMatcher) واستخراج مباشر `<60%` بدل 60% (قديمة ZIP) — P1+ في `MERGE_PLAN.md`.
كان bidi خارج النطاق وأصبح معالجةً: `reference_rtl.docx` مبيعة داخل المستودع وطبقة OOXML تصحيحية (`output/docx-rtl.ts`) للمخرَج، والطبقة المخزّنة بالرصف البصري في *الإدخال* مرفوضة الآن ببوابة `shapedGlyphRate` أعلاه بدل أن تُسلَّم.

## مسار النصّ الأصلي (native) — إصلاحات 2026-11-06

### 1) الحِمل لم يكن يصل أبدًا (P0 صامت)

PyMuPDF ≥ 1.28 يطبع `warning: The \`fitz\` API is deprecated…` على **stdout** لحظة
استيراد `fitz`. المساعد كان `print(json)` ثم تُقرأ `JSON.parse(result.stdout)`،
فيفشل التحليل على **كل** PDF، وتُعلَن طبقة النصّ غير متاحة، فتذهب كل ملفات النصّ
إلى OCR السحابي (Gemini) بدل أن تُقرأ مجانًا. لم يظهر في الاختبارات لأنّ الـunit
لم يكن يستدعي Python.

الإصلاح: helper يكتب الحِمل إلى ملف يُمرَّر في `argv`، والقراءة من ذلك الملف —
لا يفسده أي ثرثرة مكتبة. كما يفضّ الاستيراد إلى الاسم الحديث:
`import pymupdf as fitz` مع `except ImportError: import fitz`.

القياس بعد الإصلاح (كتاب حقيقي من `test-data/source`): `route: native`,
`engine: native` — بلا أي طلب سحابي.

الحرس: `tests/backend/document-router-native-text.test.ts` (يُقلّد stdout صاخبًا
ويثبت أن الحِمل ينجو، و`argv` بأماكنها، و`not /print\(json/`).

### 2) بوابتا «نسخة طبق الأصل» على طبقة النصّ (P0)

مسار native صار يُقيَّم بمقياسين قبل تسليمه — لأن قاعدة المنتج أن يكون المُنتَج
نسخة طبق الأصل من الأصل، ونصٌّ مقلوبُ الترتيب أسوأ من لا شيء:

| المقياس | الدالة | العتبة | قياس حقيقي |
|---|---|---|---|
| نسبة الحروف المتشكّلة (presentation forms) | `shapedGlyphRate` | ≥ 2% ⇒ OCR | ملف بالرصف البصري: **97.9%** — ملف منطقي/كتاب حقيقي: **0.0%** |
| الحروف التحكمية الشاردة لكل ألف حرف | `controlCharRate` | ≥ 2/ألف ⇒ OCR | خريطة ToUnicode مكسورة: **52/ألف** — نظيف: **0** |

الحالتان المقياستُهن مُثبتتان كعيّنات اختبار في
`tests/backend/document-router-native-text.test.ts` (عبارات من `get_text("words")`
فعلًا لا من تأليف يدوي). الاستثناءات محسوبة: قوسا المصحف ﴿﴾ (U+FD3E/F وU+FEFB/C)
والروابط الدينية ﷲ ﷺ (U+FDF0–FDFD) لا تُعدّ «تشكيلًا» أبدًا، والنصّ كامل التشكيل
يُعدّ حرفًا بحرف فتبقى النسبة صفرًا.

### 3) علامات التشكيل والترقيم في المُخرَج

- `DEFAULT_OPTIONS.normalizeArabic` أُطفئت: تسطيح الهمزات (أإآ→ا، ى→ي) كان يخرج
  آية قرآنية بصمة مختلفة عن الأصل. البحث لا يحتاجها — التطبيع يُجرى في SQL بـ
  `normalize_arabic()` (`apps/web/src/core/repositories/document.repository.ts`).
  الطي الاختياري متاح دائمًا بـ `{ normalizeArabic: true }`.
- `garbageRatio`/`qualityScore` صارا يقيسان «هل الحروف معروفة» (`\p{L}\p{M}\p{N}\p{P}`)
  بدل «كم منها عربي»: نصٌّ لاتيني نظيف أو مصحف كامل التشكيل لم يعد يُعلَّق عليه
  `garbageRatio 1 / qualityScore 0`.
- `normalizeArabicPunctuation` لم يعد يعيد كتابة الشُرَط ولا النِقاط: `—` تبقى `—`
  و`......` تبقى كما هي (فارغة الاختبار)، ولا يُصلَح إلا `ー` (U+30FC) — حرف لا
  يوجد في مصدر عربي. ملاحظة: NFKC تُوسّع `…` (U+2026) إلى `...` بحكم التفكك
  التكافؤي؛ هذا طبيعي ولا يُفقِد أي محتوى.

## التحقق (هذه القسم)

```
pnpm exec vitest run --project unit tests/backend/document-router-native-text.test.ts
pnpm exec vitest run --project unit --project fuzz --project edge   # 96 ملف / 2846 اختبار
pnpm check                                                          # prettier + eslint + tsc
```
