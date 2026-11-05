# Book Factory — تنفيذ QA gates + verify_quotes + OMML + booklet

التاريخ: 2026-11-05 · المصدر: `SKILLS/arabic-pdf-to-book` v2.9.x (الفرع lowercase `projects/`، HEAD `f19dc09`)
الحالة: منفّذ ومُتحقق بالبناء والاختبار (204 اختبارًا في 3 ملفات، منها 21 جديدًا)
الموقع: `packages/pipeline/src/` — التصدير عبر `index.ts` و`output/index.ts`

## ما تم

| الملف | المصدر | الدور |
|---|---|---|
| `qa-gates.ts` (توسعة) | `qa_gates.py` (v2.9.2) | فجوات مغلقة: `--reflow` + `punct-spacing` + `hamza-forms` + `heading-levels` (كانت غائبة عن TS) |
| `verify-quotes.ts` (جديد) | `verify_quotes.py` (676 سطر) | Q/H/T كاملة: normalize عربي + indexes + SequenceMatcher مُعاد تنفيذه |
| `booklet.ts` (جديد) | `docx_engine.py` (~855-1130) | `explode()` + هرمية البوكليت + علَم `s_main` (س٢:) |
| `clean-structure.ts` (جديد) | `clean_structure.py` | S1–S8 (إصلاح بنيوي آمن قبل البناء/التدقيق) |
| `output/embed-fonts.ts` (جديد) | `embed_fonts.py` | تضمين Amiri في DOCX (ECMA-376 §17.8.1) بلا اعتمادية جديدة |
| `output/pandoc.ts` (توسعة) | `build_book.py --math pandoc` | وضع OMML + `--toc` + `embedAmiri` |
| `book-factory.ts` (جديد) | — (ربط جديد) | خط أنابيب واحد: clean → verify → build → QA gates |
| `tests/backend/book-factory.test.ts` | اختبارات المصدر (`test_explode/hierarchy/math/verify_quotes`) | 21 اختبارًا، منها OMML وتضمين حقيقيان عبر pandoc |

## QA gates — الربط والفجوات المغلقة

`qa-gates.ts` كان منقولًا من v2.9.0؛ رُوجع مقابل النسخة الحالية (389 سطرًا) فأُضيف:

1. **`reflow`** (`--reflow`): الناتج معاد تدفقه (بوكليت) — `page-ratio` تُحكم بالحروف/التغطية لا بعدّ الصفحات (تُقاس الآن `pages/inPages` برسالة توضيحية وتنجح دائمًا).
2. **`punct-spacing`** (تحذير): عدّ `\s[،؛؟.!]` + ترقيم ملتصق بعد `،؛:؟` — من `punct_issues` في الأصل.
3. **`hamza-forms`** (تحذير): كلمات بلا همزة (`اي/الي/ان/ابو/احمد/اذا/ازهر`) — من `hamza_issues`.
4. **`heading-levels`** (تحذير): قفزات مستوى العنوان `## ← ####` — من `_heading_jumps`.

**الربط (book-factory.ts §4):** `runBookFactory` يبني DOCX أولًا ثم يغذّي `evaluateQaGates` بـ`docxDocumentXml` المستخرج فعليًا من الناتج (لعدّ OMML الحقيقي) + `DocxMetrics` مشتقة من `word/document.xml` (فقرات/عربي/وسوم) — بدل تمرير أرقام يدوية. الحكم: `pass = qa.pass && quoteExitCode === 0`.

**فروق مقصودة:**
- `\b` في JS لا يعمل مع العربية (ASCII فقط) — `hamza-forms` يستخدم `(?:^|\s)…(?=\s|$|[ترقيم])` بدل `\b`؛ النتيجة مطابقة للـPython Unicode.
- `punct_issues` يُحسب بنفس تعبير Python حرفيًا.

## verify_quotes — Q/H/T

### SequenceMatcher (difflib) — مُعاد تنفيذه
غير موجود في JS. نُقلت خوارزمية CPython كاملة: `b2j` + `findLongestMatch` (مع تمديد junk/non-junk) + `getMatchingBlocks` (دمج متجاور + sentinel) + `getOpcodes` + `ratio`، مع **autojunk** (استبعاد العناصر الشائعة >1% إذا n≥200). مُتحقق: `'abcd'/'abce' → 0.75` كما في Python.

### normalize عربي (منقول حرفيًا — هو معيار المقارنة)
- `MARKS`/`IGNORE` (تشكيل + رموز وقف)، `PRESENTATION` (أشكال عرضية)، `FARSI` (حروف فارسية)
- توحيد: `أإآٱ→ا`، `ىئ→ي`، `ؤ→و`، `ة→ه`؛ حذف الأرقام المفردة (`NUM_TOKEN`)؛ حذف «يا/ايها» المدمجة (`STOPWORDS`)
- `clusterKey`: حرف + حركاته مرتّبة مع توحيد السكون العثماني `ۡ→ْ` — لاكتشاف Q002 (تشكيل مخالف)

### indexes
- **قرآن**: `byFirst` (أول كلمة) + `byWord` (كل كلمة) فوق 6236 آية مسطّحة؛ `resolve` بعتبة **0.72**؛ `span` بتغطية **≥0.50**؛ `bestVerse` بعتبة **0.90**؛ `mergeSpan` (آيتان متتاليتان) بعتبة **0.95**؛ حذف بسملة الفاتحة من آيات السور الأخرى.
- **حديث**: فهرس `rare` (df≤400) + تقاطع 3 كلمات نادرة؛ عتبة **0.85**؛ H001 إن غاب، H002 إن خالف النص.

### رموز Q/H/T (كما في الأصل)
Q001 نصّ مخالف · Q002 تشكيل مخالف · Q003 مرجع خاطئ (+تصحيح مقترح) · Q004 بلا مرجع/مرجع غير مفهوم · Q005 متعدد الآيات (مقسّم بأرقام مضمّنة أو مدمج) · H001/H002 · T001 `{}`→`﴿﴾` · T002 عرضية/فارسية/تطويل · T003 «» غير متوازنة في الفقرة · T004 مسافة قبل ترقيم · T005 مزدوجة · T006 `**` · T007 أعمدة جدول · T008 عنوان مكرر · T009 سطر >600 · T010 سطر مكرر (تسرّب ترويسة، أرضية `max(5, lines/60)`).
الحكم: `quoteExitCode = 1` إن وُجد أي `error`.

**قاعدة البيانات تُحقن** (`QuranCorpus`/`HadithItem`) — لا تنزيل شبكة داخل المكتبة؛ العميل يمرّر `quran-simple.json` من `~/.cache/ar-verify` كما في الأصل. `--fix` مدعوم (T001/T002/T004/T005).

## OMML عبر pandoc + embed Amiri

- **OMML**: `generateDocx(md, { math: "pandoc" })` = أمر `build_book.py` حرفيًا: `pandoc -f markdown-yaml_metadata_block --reference-doc reference_rtl.docx -M dir=rtl -M lang=ar [--toc]`. المرجع يُبحث في `REFERENCE_RTL_DOCX` ← مسارات SKILLS ← `~`. **لا توليد OMML يدوي** (قرار MERGE_PLAN). `math:"off"` (الافتراضي) = السلوك التاريخي بلا تغيير.
- **تحقق OMML**: إن طُلب `pandoc` وكانت هناك `$…$` ولم ينتج أي `<m:oMath` ⇒ `EXPORT_FORMAT_FAILED` (نفس بوابة `equations-count` في QA: OMML ≥95%).
- **embed Amiri** (`output/embed-fonts.ts`): نقل `embed_fonts.py` — تشويب أول 32 بايت بمفتاح GUID (ترتيب OOXML)، `word/fonts/font1.odttf` (+font2 إن وُجد العريض)، `fontTable.xml` (إدخال داخل عنصر `Amiri` أو إنشاؤه)، rels، `[Content_Types].xml`، `settings.xml` (`embedTrueTypeFonts`). الخطوط من `/usr/share/fonts/opentype/fonts-hosny-amiri/` ← `~/.fonts/` ← `AMIRI_FONT_DIR`.
  - **ZIP يدوي** (قراءة central-directory + `inflateRawSync`، كتابة STORE + CRC32 مُنفّذ) — لا اعتمادية جديدة في `package.json`. الناتج ZIP صالح يعيد قراءته Word/LibreOffice (مُتحقق بالاختبار الذي يعيد استخراج `document.xml`).
  - `readDocxDocumentXml` + `countOmml` لعدّ OMML في QA gates.

## booklet hierarchy (س2:) + explode()

- **`explode(s)`**: يفصل `(خيار - خيار)`، `١- … -٢ …`، `1- … 2- …`، و`1 - … 2 - …` (مسافات حول الشرطة — إصلاح v2.9.1) إلى أسطر مستقلّة؛ تُستدعى قبل `handle()` لكل سطر كما في الأصل.
- **آلة الحالة** (`parseBooklet`): الأنواع `title/source/section/h3/instruction/main/item/option/sub/answer/body/table` مع التسميات `س١:` / `١-` / `أ)`. **علَم `s_main`**: سؤال `س٢: …` في المصدر ⇒ البنود المرقّمة بعده `item` (أو `option` إن كان فرعًا) لا `main` — يمنع عطل «كل بند فعلَ تكليف سؤال رئيسي». `splitNumbered` يدعم `٣-` و`-٣` و`٣.` و`٣)`؛ `isMainQuestion` بأفعال التكليف + `؟/:` مع استبعاد المقتبسات.
- **الناتج** بنية `BookletBlock[]` نقية + `renderBookletMarkdown` (Markdown موسوم يحفظ التسلسل قبل pandoc). لا `python-docx` هنا — الطبقة الرقيقة تحوّل عبر pandoc (نفس مسار TS الموحّد).
- البوكليت ⇒ `reflow:true` تلقائيًا في QA gates.

## التحقق

- `npx tsc -p packages/pipeline/tsconfig.json --noEmit` — نظيف.
- `npx vitest run tests/backend/book-factory.test.ts` — 21/21 (منها: SequenceMatcher مقابل Python، Q001/Q002/T001/H001/H002، explode ×4، س٢:، S4/S5، reflow، OMML حقيقي `<m:oMath`، تضمين Amiri حقيقي يعيد قراءة DOCX).
- `output.test.ts` + `edge-cases.test.ts` — 183/183 (لا كسر في السلوك التاريخي).

## ما لم يُنقل (خارج النطاق، موثّق)

- `structure.py` (إضافة عناوين Gemini) — يتطلب مفتاح Gemini؛ البنية تُبنى هنا قواعديًا فقط (`cleanStructure` + booklet).
- المحرك الأصلي `docx_engine.py` (أنماط Word مباشرة بـpython-docx) — TS يبقى على pandoc (قرار MERGE_PLAN: pandoc محرك OMML)؛ البنية الهرمية تُنتج Markdown موسومًا ثم pandoc.
- `fix_quotes.py`/`review_report.py`/`insert_figures.py` — أدوات مساعدة خارج خط الأنابيب.
- قاعدة المصحف الكاملة (300+ آية عثمانية) — تُحقن من cache العميل.
