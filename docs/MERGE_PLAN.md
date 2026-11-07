# خطة الدمج الكبرى — ابن الأزهر خارق (MERGE_PLAN)

الحالة: مبدئي — جارٍ انتظار تقارير الوكلاء الأربعة (ZIP / arabi.tools / pdf2book / hosting)
التاريخ: 2026-11-04

## الرؤية
ابن الأزهر = منصة عربية متكاملة: مكتبة مستندات (موجّهة + مجلدات + بحث) + Tools Hub ضيف (OCR / تشكيل / تفريغ / محوّل) + مصنع كتب (QC gates + DOCX RTL/OMML) + مدقق قرآني ونحوي + تدقيق 7 مراحل.

## المبادئ (من arabi.tools)
- بلا حساب للأدوات السريعة؛ النتيجة تبقى عالقة في المكان أثناء العمل.
- بحث ونسخ ومقارنة بالنتيجة الأصلي؛ تنزيلات TXT/DOCX/JSON.
- حذف تلقائي: الملف فور انتهاء المهمة، النتائج بعد 30 دقيقة.
- حد: 99MB / 1000 صفحة، طابور 4 jobs إجمالي و 3 لكل أداة و 1 لكل IP.
- عربي أولاً + إنجليزي، RTL/LTR، خطوط مدمجة محلياً.

## مصادر الميزات (ملخص أولي)
- ZIP pdf-to-word: استخراج مباشر مجاني → AI فقط لو <60% صفحات، 12-15 ص/طلب، عربي presentation forms (149/212 عينة)، تقسيم bidi runs، تدقيق قرآني عثماني + نحوي + بنيوي + layout + microscopic + textCleaner، ETA/history/batch ZIP.
- arabic-pdf-to-book 2.9: keypool (مفتاح×موديل، 8000ص/يوم)، قطعة 10 ص (تراجع 6)، بوابات QA (85%/250/28%/20/15%/0)، verify_quotes Q/H/T، explode() خيارات لاصقة، OMML مسارات pandoc، قائمة TOC، 12 اختبار.
- arabi.tools (Rust): تفريغ Wit، OCR Tahweel/Drive+PDFium، تشكيل Shakkelha/CATT + ONNX 1.31، نشر Cloudflare Tunnel + Docker.

## UVP الحالي المشروع (Ibn)
- 77 API، pipeline TS مع IR + pandoc، Gemini 3.5، PG queue، MinIO — الأساس سليم لكن بلا Tools Hub ضيف.

## خريطة أولوية (مبدئية)
P0: بوابة QA + استخراج مباشر + keypool + bidi/reference-doc عربي (إصلاح TODO في docx-generator).
P1: /tools hub + 30د حذف + Uthmani auditor كامل (تحويل من text-only إلى report).
P2: verify_quotes + clean_structure + book factory OMML.
P3: تشكيل وتفريغ كخدمة خارجية (HTTP sidecar) — لا Rust داخل Workers.
P4: نشر Cloudflare Workers (OpenNext) + Neon + R2 + Upstash — صفر فيزا.

## تحديثات قادمة من تقارير الوكلاء
- ستُلحق جداول الدمج التفصيلية + خطة cutover هنا بعد انتهاء الوكلاء.

---
## تحديث 2026-11-04 — تقارير الوكلاء (3/4)

### arabi.tools (تدقيق كامل)
- مبادئ نهائية: مجاني/غير ربحي/عربي أولاً، Input stays in place، read-only results، 4 jobs إجمالي/3 لكل أداة/1 لكل IP، نتائج 30 دقيقة، رفع 99MB/1000p، تدهور رشيق (OCR يختفي مؤقتاً لا الموقع كله).
- القوة الهندسية: CI صارم (fmt+clippy+test)، Playwright Chromium+WebKit بالعربية والإنجليزية (1280/390)، تثبيت بالبصمات SHA-256، خطوط مدمجة محلياً.
- الرخصة: لا يوجد ملف LICENSE في الجذر (license:null) رغم Cargo.toml يعلن MIT (publish=false). النية واضحة لكن قانونياً غامض — لا ننسخ الكود حرفياً؛ نستفيد من المبادئ والتصميم، ونتواصل/نثبت LICENSE قبل أي fork.
- الاعتماديات: Tashkeel MIT، CATT Apache-2.0، ONNX MIT، PDF.js MPL-2.0، PDFium BSD. الخطوط Gilroy/Noto/Thmanyah/Kitab ملفاتها غائبة — نستخدم Amiri/Noto Naskh البديلة المفتوحة.

### arabic-pdf-to-book 2.9.0 (تدقيق + خطة نقل)
- QA gates: exit 0/1/2، fail-closed OCR coverage (85% صفحات)، chars/page ≥250، short-lines 28%/45% en، solo-diacritics ≤20، duplicates ≤20%، equations + OMML count، tables متساوية الأعمدة، lam_swap_rate <6% — تُنقل عتباتها حرفياً للـ TS.
- Keypool: 20 طلب/يوم/موديل، قطعة 10 صفحات (تراجع 6)، 8 موديلات × مفاتيح = 8000ص/يوم. فجوة: gemini_ocr.py لا يستخدم KeyPool فعلياً (يستخدم dead_models). سنربط KeyPool فعلياً في OCR loop مع بصمة مفاتيح آمنة SHA-256.
- verify_quotes: Q001-Q005 آيات (fuzzy ≥0.72، coverage ≥0.50/0.95)، H001/H002 حديث (بخاري/مسلم)، T001-T010 نصية. أصعب نقل = difflib.SequenceMatcher — يُنقل كوحدة 150 سطر مسبقة باختبارات.
- OMML: المساران pandoc (OMML حقيقي عبر reference_rtl.docx + embed_fonts) مقابل native docx_engine (تسطيح بلا OMML). سيُبقي pandoc كمحرك OMML في TS (spawn) — لا توليد OMML يدوي.
- نُسخ projects/ vs Projects/: Canonical هو lowercase v2.9.0 (HEAD 8f7f0ad). نسخة Capital-P 2.7.0 فرع غير مدمج — نُثبت قبل النقل.

### Hosting — توصية نهائية (no-visa)
- الأساسي: Cloudflare Workers (OpenNext) + Neon + R2 + Upstash — إيميل فقط بلا فيزا، 100k req/day، R2 10GB صفر egress، Neon 100 projects/1GB/100 CU-hr بلا بطاقة، يُسمح بتجاري.
- Vercel Hobby: preview فقط (غير تجاري، 4.5MB cap، cron يومي) — لا إنتاج.
- HF Spaces Docker: لم يعد مجاني بلا فيزا (يحتاج PRO مدفوع + $5 تخزين) — احتياطي فقط.
- constraints: Workers 10ms CPU — gemini OCR سحابي يصلح، tesseract المحلي لا. البنية: web على Workers + QUEUE_DRIVER=pg، OCR/export كخدمات خارجية مؤقتة أو cron.

### ZIP pdf-to-word — بانتظار التقرير المتبقي
- لسه في وكيل جرّب — سيُدمج جدول 7-stage audit كاملاً فور وصوله.

---
## تحديث 2026-11-04 — تقرير ZIP (zip-audit.md) — اكتمال 4/4

- النطاق المقروء فعلياً 89 ملف (876 سطر server.ts + ~7700 سطر utils + ~18k سطر اختبارات) — التقرير: ~/.hermes/cache/scratch/merge-research/zip-audit.md.
- البنية: pipeline واحد إلزامي (direct pdf-parse مجاني مفضل — لو <60% صفحات أو <50 حرفاً يتحول OCR Gemini بدفعات 12-15 ص) + 7 مراحل تدقيق + تمريرتا Gemini اصلاح اختياريان.
- ابن اخذ بالفعل AZHAR_CORRECTION_RULES من الحزمة إلى text/clean/quranic.ts، وsegmentByScript وconvertHtmlTablesToMarkdown إلى output/docx-generator.ts، وaudit/structural إلى text/clean.
- الفجوات: 7-stage audit path، endpoints contextual+grammar، Uthmani dataset كامل (300+ آية + مطابقة)، truncation guards، DOCX BIDI كامل.
- القرارات المحبطة: الانحراف الثلاثي A/B/C في جداول التصحيح (quranAuditor/ VerificationAgent/ server cleanMarkdown) — يجب توحيد جدول معياري واحد قبل أي نقل؛ اختلاف عائلات كشف العربية (0.3x/0.4x/>20) و4 بوابات اقتطاع (5000x0.8 / 8000x0.75) و4 صيغ اشتقاق اسم ملف.
- ترتيب P0-P2: توحيد A/B/C وعائلة الكشف وعتبة الاقتطاع (P0)؛ قاعدة عثمانية + contextual/grammar + microscopic diff + BIDI (P1)؛ batch_runner وMCP وواجهة عميل (لا دمج P2).


---
## قرار 2026-11-06 — قاعدة «المُنتَج نسخة طبق الأصل من الأصل» (ملكية المالك، شرط إلزامي)

المالك حسمها نصًا: الملفات الناتجة لازم تكون نسخة أمينة من الملفات الأصلية — «لو دي فيها هوامش، هنا كدا تبقى دي فيها هوامش، وهكذا… في كل شيء». تُقرأ كقاعدة عليا تسبق أي نقل قدرات من أي مصدر:

1. **مسموح:** تطبيع الترميز، إزالة ضجيج الـ OCR (ترديد السطور/الكلمات، أرقام الصفحات المعلّقة، الرموز اليتيمة)، وإعادة البناء البنيوي (فقرات/عناوين/جداول/هوامش) بشرط أن يكون مصدره النص نفسه.
2. **ممنوع:** حذف محتوى موجود في الأصل. لذلك `text/clean/html.ts` **لا يحذف** `« » ‹ ›` بعد اليوم — الحذف كان يُجوّع `verify-quotes.ts` ويعمّي أنماط الهوامش التي تستند إلى العلامات.
3. **ممنوع:** إضافة نص غير موجود في الأصل. لذلك `KNOWN_SYNTACTIC_COMPLETIONS` من حزمة المحوّل **لا تُدمج كحقن**: الاقتطاع يبقى **تقريرًا** (`structural.ts:91` + مخرجات التدقيق) لا تعديلًا. ولا مسارات AI تصحيحية في التنظيف (بديل `enhanceArabicText` الـ dead stub يُقيَّم منفصلًا وبمبدأ «لا تخمين»: عند عدم اليقين يُترك النص بلا تغيير ويُسجَّل).
4. **البوابة:** أمانة الناتج تُقاس لا تُفترض — نسبة مطابقة الكلمات والمصطلحات والعدّ المتكافئ للكلمات المفتاحية (`scoreFidelity`) هي معيار القبول، وأي فرق غير مُفسَّر يُفشل المهمة بدل أن يمرّ.

يُلغى بهذا القرار بند «AI pass» من ترتيب النقل السابق، ويُعاد ترتيبه: provenance → أمانة علامات الاقتباس → هيكل الجداول RTL → تقرير الاقتطاع الواسع → تقرير تدقيق قرآني مُرقَّم → scoreFidelity → الهوامش والحواشي → تدقيق الاستشهادات.

## قرار 2026-11-06 — الطبقة العربية: قياس واحد من Unicode، لا أربع صياغات

كانت طبقة الحروف العربية تُكتب باليد في كل طبقة (`[؀-ۿ]`، وثلاث كتلات، وعتبة 0.4 منسوخة، ونطاق أسماء ملفات ضيّق). القياس على `unicodedata` 15.0.0 أعطى:

- **0600–06FF**: 150 حرفًا (Lo) + 52 علامة (Mn).
- **0750–077F** (Supplement): 48/48 حرفًا.
- **0870–089F** (Extended-B): 30 حرفًا (0870–0887 و 0889–088E) + 8 علامات (0898–089F).
- **08A0–08FF** (Extended-A): حروف 08A0–08C9، وعلامات 08CA–08E1 و 08E3–08FF.
- **FB50–FDFF / FE70–FEFF** (الأشكال العرضية): Lo، لكنها تُمثَّل حروفًا أساسية بالتحويل القياسي.

**القرار:** `packages/pipeline/src/text/constants.ts` هو المصدر الوحيد:

- `ARABIC_LETTER_RANGES = 0600-06FF 0750-077F 0870-08FF`. الصياغة القديمة بثلاث كتلات كانت **تُسقط Extended-B كلها** — حروف المخطوطات تُحسب أعجمية، فيفقد السطر اتجاهه RTL وتُمرّره عتبات الجودة. هذا خرق مباشر لقاعدة «نسخة طبق الأصل».
- `TASHKEEL_SOURCE = 0610-061A 064B-065F 0670 06D6-06ED 0898-089F 08CA-08E1 08E3-08FF` — العلامات كلها، لا التسع التي كانت تكفي في الوسوم وفي `booklet.stripTashkeel`.
- **الأشكال العرضية خارج النطاق عمدًا**: بواباتا `SHAPING_FORM` (qa-gates) و`PRESENTATION` (verify-quotes) وassertion الطبقة النصية في searchable-PDF تسأل «هل بقي التحويل قائمًا؟»؛ لو حُسبت حروفًا لنجحت بلا سبب.
- `containsArabic()` أضيفت هنا لأن غيابها هو سبب النسخ اليدوي؛ تُستدعى من book-factory وكاشف الفقرات ومقسّم DOCX ومقدّري ثقة OCR.
- **نسخة apps/web**: لا يمكن للواجهة استيراد حزمة pipeline (الجذب root يسحب bullmq/ioredis ولا توجد subpath exports، و`read-only-result.tsx` زبون)، فهي تحتفظ بنسخة مُثبَّتة في `apps/web/src/shared/arabic-ranges.ts`، ويقفل عليها `tests/backend/arabic-classes-single-source.test.ts` نقطةً بنقطة.
- **نطاق أسماء الملفات** صار النطاق القياسي نفسه (كان 0600–06FF + 0660–0669 فيسقط اسم مخطوط بحروف Extended-B مستبدَلًا بـ `_`) في `upload-document.use-case.ts` و`workers/ocr-worker/src/stages/generate.ts`.
- نفس الاختبار يمنع أي ملف إنتاج جديد أن يعيد كتابة طبقة الحروف بيده؛ نطاقات الأرقام `[٠-٩]` وحروف الترتيب `[أ-ي]` مستثناة لأنها ليست طبقة حروف.
