# Implementation Audit — التدقيق السباعي (7-Stage Audit)

> **النطاق:** نقل/تنفيذ ما يلي إلى `packages/pipeline/src/text/clean/` و `packages/pipeline/src/qa-gates.ts`:
> مجموعة بيانات عثمانية (300 آية) + `calculateArabicSimilarity` + تدقيق سياقي/نحوي + فرق مجهري + `textCleaner`، مع اختبارات وتوثيق.
> **التاريخ:** 2026-11-05 · **الحالة:** منفّذ ومُختبَر (انظر §7).

---

## 1) ما كان موجودًا قبل هذه المهمة (حالة بداية صادقة)

| المكوّن | الحالة عند البدء |
|---|---|
| `text/clean/quranic.ts` — ‏`AZHAR_CORRECTION_RULES` (42 قاعدة) + `applyQuranicFixes` | موجود (غير مُتتبَّع في git) |
| `text/clean/structural.ts` — ‏`auditStructuralIntegrity` + `applyStructuralFixes` | موجود (غير مُتتبَّع) |
| `qa-gates.ts` — ‏`evaluateQaGates`/`runQaGatesOnFile` (منقول من `qa_gates.py`) | موجود (غير مُتتبَّع)، بلا اختبارات |
| `text/clean/index.ts` + `text/index.ts` | مربوطة بالتصدير |
| اختبارات `quranic.test.ts` (2) + `structural.test.ts` (3) | موجودة ورقيقة |
| **مجموعة عثمانية 300 آية** | ❌ مفقودة |
| **`calculateArabicSimilarity`** | ❌ مفقودة (كانت `similarity()` الكلماتية فقط) |
| **تدقيق سياقي/نحوي** | ❌ مفقود |
| **فرق مجهري (microscopic diff)** | ❌ مفقود |
| **`textCleaner`** (واجهة موحّدة) | ❌ مفقودة (كانت `cleanArabicText` فقط) |
| **اختبارات qa-gates** | ❌ مفقودة |
| **`docs/IMPLEMENTATION_AUDIT.md`** | ❌ مفقود |

---

## 2) ما أُضيف في هذه المهمة

### 2.1 مجموعة البيانات العثمانية — `text/clean/uthmani-data.json` + `uthmani.ts`
- **المصدر:** AlQuran Cloud API، طبعة `quran-uthmani` (رواية حفص عن عاصم، مبنية على Tanzil) — جُلبت آليًا وقت التنفيذ (لا نسخ يدوي قابل للخطأ).
- **التغطية (300 آية بالضبط):** الفاتحة كاملة (7) + البقرة كاملة (286) + آل عمران 1–7 = **300**.
- **الدوال:** `uthmaniSkeleton` (مطابقة بلا تشكيل/تطويل، توحيد ألف/ياء/كاف + ألف الوصلة `ٱ`→`ا` + إزالة `﴿﴾۝`)، `getUthmaniAyah`، `findUthmaniMatches` (ترشيح بالطول + Dice على الكلمات)، `verifyQuranicText` (مطابقات + مقاطع `﴿...﴾` غير الموثّقة).
- **حدّ صريح:** ليست المصحف كاملًا (6236 آية) — عيّنة تدقيق مقصودة قابلة للتوسيع بإعادة الجلب من نفس المصدر.

### 2.2 التشابه العربي — `text/clean/similarity.ts`
- `normalizeForSimilarity`: نفس هيكل العثماني (بلا تشكيل/تطويل، أحرف موحّدة، وصلة، بلا زخارف).
- `calculateArabicSimilarity(a, b)`: مزيج `0.5 × Dice(كلمات) + 0.5 × (1 − Levenshtein/أطول_طول)` مع تفصيل `tokenScore`/`charScore`. **ليس تشابهًا دلاليًا** — أداة كشف انحراف OCR/تحريف.
- `microscopicDiff(a, b)`: فرق حرفي عبر LCS (ذاكرة صفّية لـ Levenshtein في التشابه، وجدول LCS للفرق) يُرجع عمليات `equal/delete/insert` مدمجة مع المواضع + `changedChars` + نسبة تطابق. **حدّ أمان:** يرفض أي طرف > 4000 حرف (`MICROSCOPIC_DIFF_MAX_CHARS`) برسالة واضحة.

### 2.3 التدقيق السياقي/النحوي — `text/clean/contextual.ts`
قواعد حتمية (ليس محلّلًا لغويًا — لا صرف/نحو كامل)، بلا تصحيح تلقائي:
1. كلمة مكررة فوريًا · 2. `إأ/أإ` (همزة منعكسة) · 3. اختلاط `ى/ي` لنفس الجذع · 4. اختلاط `ة/ه` · 5. تنوين على ألف (`ًا`) · 6. `ال` منفصلة · 7. رقم ملتصق بكلمة · 8. تشكيل معلّق.
- مفارقة موثّقة: `normalizeArabicLetters` يحوّل `ى`→`ي` فيُخفي الخلل رقم 3؛ لذا توحيد الجذع هنا الألفات فقط.

### 2.4 الفرق المجهري — في `similarity.ts` ( أعلاه )
- `microscopicDiff` + نوعا `DiffOp`/`MicroscopicDiffResult`.

### 2.5 `textCleaner` + المنظّم السباعي — `text/clean/text-cleaner.ts`
- `runSevenStageAudit(text, {reference?, minSimilarity=0.85, applyFixes, uthmaniMinSimilarity=0.5})` — المراحل §3.
- `textCleaner.clean()` (عبر `cleanArabicText` مع `quranicFixes`/`structuralFixes`)، `.audit()`، `.cleanAndAudit()`.

### 2.6 التكامل مع `qa-gates.ts`
- `sevenStageToQaChecks(report)` — تحويل المراحل السبع إلى `QaCheck[]`.
- `evaluateQaGatesWithSevenStage(input, report)` — حكم مدموج: `qa.pass && sevenStage.ok`.

### 2.7 الربط بالتصدير
`clean/index.ts` → `clean.ts` → `text/index.ts` → `pipeline/src/index.ts` (المحليّات: `uthmani`، `similarity`، `contextual`، `text-cleaner`).

---

## 3) المراحل السبع (7-Stage)

| # | المرحلة | الملف/الدالة | مخرج الحكم |
|---|---|---|---|
| 1 | التطبيع/اليونيكود | `normalizeUnicode` + `normalizeArabicLetters` + تطويل/مسافات | `ok` إن لم يفرغ النص فجأة |
| 2 | السلامة البنيوية | `auditStructuralIntegrity` | `isValid` (عناوين/ترقيم/أنابيب/تكرار) |
| 3 | القواعد القرآنية | عدّ إصابات `AZHAR_CORRECTION_RULES` ثم `applyQuranicFixes` | إصلاح لا فشل — الفشل يُحكم في 4 |
| 4 | التحقق العثماني | `verifyQuranicText` مقابل 300 آية | فشل إن وُجد `﴿...﴾` بلا مطابقة |
| 5 | التشابه | `calculateArabicSimilarity` مقابل مرجع (اختياري) | `score ≥ minSimilarity (0.85)` |
| 6 | السياقي/النحوي | `auditContextualGrammar` | فشل عند أي `critical` (لا يوجد حاليًا) |
| 7 | الفرق المجهري + الحكم | `microscopicDiff` (اختياري) + `pass = كل المراحل ok` | `ratio ≥ minSimilarity` |

ملاحظة: المرحلتان 5 و7 **تتخطّيان بأمان** (لا تُسقطان الحكم) عند غياب مرجع أو تجاوز حدّ 4000 حرف — وهذا موثّق في `detail` التقرير، لا صمت.

---

## 4) العتبات

| البند | القيمة | المصدر/السبب |
|---|---|---|
| تشابه أدنى (مرحلة 5/7) | `0.85` | عتبة دقيقة كفاية لكشف تحريف كلمة واحدة في جملة قصيرة |
| مطابقة عثمانية أدنى | `0.5` | Dice على الكلمات؛ الهدف رصد لا إثبات قرآني |
| حد الفرق المجهري | `4000` حرف/طرف | سقف `O(n·m)` = 16M خلية |
| بوابات qa (موجودة سابقًا) | نسبة ناتج `≥0.5`، تغطية `≥0.85`، `cpp ≥250`، تكرار `≤0.2` | منقولة حرفيًا من `qa_gates.py v2.9.0` |

---

## 5) خريطة الملفات

```
packages/pipeline/src/text/clean/
  uthmani-data.json     # 300 آية (AlQuran Cloud quran-uthmani)
  uthmani.ts            # هيكل/بحث/تحقق عثماني
  similarity.ts         # calculateArabicSimilarity + microscopicDiff
  contextual.ts         # auditContextualGrammar (8 قواعد)
  text-cleaner.ts       # runSevenStageAudit + textCleaner
  quranic.ts            # (موجود سابقًا) 42 قاعدة + applyQuranicFixes
  structural.ts         # (موجود سابقًا) auditStructuralIntegrity
packages/pipeline/src/qa-gates.ts        # + sevenStageToQaChecks / evaluateQaGatesWithSevenStage
tests/backend/
  uthmani.test.ts (9) · similarity-diff.test.ts (11) · contextual-grammar.test.ts (9)
  seven-stage.test.ts (9) · qa-gates.test.ts (11)
```

---

## 6) إصلاحات وُجدت أثناء الاختبار (موثّقة لا مخفية)
1. **ألف الوصلة `ٱ`** (U+0671) لم تكن تتوحّد → أُضيف `ٱ`→`ا` في هيكلي المطابقة.
2. **علامات `﴿﴾`** كانت تلوّث أول/آخر كلمة → أُزيلت من الهيكل (كانت تُخفض تشابه آية كاملة إلى 0.905).
3. **`ى`→`ي` في normalizeArabicLetters** يُخفي خلل الألف المقصورة → توحيد الألفات فقط في `contextual.ts`.
4. **NFKC يعيد ترتيب الشدة/الفتحة** (`لّ` → `لَ ّ`) → اختبار `cleanAndAudit` يقارن على الهيكل المُطبَّع لا بالسلسلة الخام.
5. **بوابة التغطية في qa-gates** تفشل بلا دليل صفحات → اختبارات النجاح تمرّر `cleanReport.pages`.

---

## 7) نتائج الاختبارات

```
# الملفات الجديدة/الموسّعة (unit)
npx vitest run --project=unit \
  tests/backend/uthmani.test.ts tests/backend/similarity-diff.test.ts \
  tests/backend/contextual-grammar.test.ts tests/backend/seven-stage.test.ts \
  tests/backend/qa-gates.test.ts tests/backend/quranic.test.ts \
  tests/backend/structural.test.ts
→ 7 ملفات، 57 اختبارًا — كلها ناجحة
```

- `tsc -p packages/pipeline/tsconfig.json --noEmit`: **لا أخطاء جديدة**؛ خطآن مسبقان خارج نطاقي (`verify-quotes.ts` — ملف غير متتبَّع من جلسة أخرى، `output/pandoc.ts`).
- **الحزمة الكاملة (unit، 63 ملفًا):** 1309 ناجحة / 39 فاشلة في 15 ملفًا — **صفر منها من ملفاتي السبعة**. الفشل مباشرة من شجرة العمل المتسخة من جلسة سابقة (mock/spy في use-cases + منطق auto-detect في `clean/index.ts` الذي لم ألمسه؛ `analyze.ts`/`constants.ts` سليمة في HEAD). فشل `text.test.ts:437` وحده كان ظاهرًا قبل بدئي.
- ملفاتي السبعة (49 اختبارًا جديدًا + `quranic`/`structural` السابقان): **كلها ناجحة**، بلا أي انحدار أحدثته.

---

## 8) حدود معروفة (ليست عيوبًا مخفية)
- المجموعة العثمانية **300 آية فقط** (الجزء الأول + بداية آل عمران) — آيات خارجها تُعامل «غير موثّقة في المجموعة» لا «محرفة»؛ وسّع الجلب لتوسيع التغطية.
- التشابه **سطحي** (كلمات/حروف) لا دلالي؛ لا يُستعمل وحده حكمًا على صحة نص ديني.
- التدقيق السياقي **قواعدي** لا نحوي كامل؛ الفشل الحرج لا يُنتَج حاليًا (كل القواعد warning/minor) — الحكم الفعلي يأتي من المراحل 2/4/5/7.
- الفرق المجهري **محدود بـ 4000 حرف**؛ النصوص الأطول تُقسّم أولًا.
- لا يوجد **endpoint HTTP** للتدقيق السباعي بعد — الواجهة مكتبية (pipeline) فقط، والتكامل مع `qa-gates` عبر `evaluateQaGatesWithSevenStage`.

---

## 9) أوامر التحقق

```bash
npx vitest run --project=unit tests/backend/uthmani.test.ts tests/backend/similarity-diff.test.ts tests/backend/contextual-grammar.test.ts tests/backend/seven-stage.test.ts tests/backend/qa-gates.test.ts
npx tsc -p packages/pipeline/tsconfig.json --noEmit   # خطآن مسبقان: verify-quotes.ts، pandoc.ts
```
