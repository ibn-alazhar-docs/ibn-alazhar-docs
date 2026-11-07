# Correction Rule Divergence — توحيد القاعدة (درجة قصوى واحدة)

**المصدر:** `pdf-to-word--markdown---text-converter.zip` → `docs/correction-rule-divergence.md` (مواد نصوص من ملف `/home/abed/Data/_Inbox/pdf-to-word--markdown---text-converter.zip`، فُتح بـ `unzip -p` في موضع التنفيذ).

**القرار (specs/012-amazing-merge US3 / T032، FR-003):** درجه قصوى واحدة — `AZHAR_CORRECTION_RULES` في `packages/pipeline/src/text/clean/quranic.ts` هي المالك Canonical الوحيد. أي نسخة أخرى من القاعدة (جدول `KNOWN_OCR_CANONICAL_TARGETS` في `quranicVerificationAgent.ts` أو سلسلة `.replace()` في `server.ts`) تُقابل عليها وتُهمل؛ نص الاستبدال الذي يفوز هو نص `AZHAR_CORRECTION_RULES`. و`server.ts` نفسه لا يُنقل (FR-003): منطق الـ zip يدخل كبيانات (قواعد + سلوك) لا كخدمة Express.

## المصادر الثلاثة

| Source | File (في الـ zip) | Form |
| --- | --- | --- |
| **A (canonical)** | `src/utils/quranAuditor.ts` | `AZHAR_CORRECTION_RULES` — المالك الرسمي للقاعدة |

في هذا المستودع: `packages/pipeline/src/text/clean/quranic.ts` (`AZHAR_CORRECTION_RULES`, `applyQuranicFixes`) — نقلٌ نصّي من `quranAuditor` الأصلي. المصدرا `B` و`C` أدناه لا ينقلان هنا؛ ذكرها هنا للتوثيق فقط.

| Source | File (في الـ zip) | Form |
| --- | --- | --- |
| B (مهمل) | `src/utils/quranicVerificationAgent.ts` | `KNOWN_OCR_CANONICAL_TARGETS` table |
| C (مهمل) | `server.ts` | inline `.replace()` chain inside `cleanMarkdown` |

## لماذا لم تُوحَّد لفظيًا من تلقاء نفسها

لعدة تصحيحات قرآنية وحديثية، تختلف المصادر في **نص الاستبدال** نفسه لا في النمط فقط. مثال `يَعْمَوْا عَمَهًا`:

- **A** يُنتج `سَمِعُوا لَهَا شَهِيقًا`
- **B** يُنتج `﴿سَمِعُوا لَهَا شَهِيقًا وَهِيَ تَفُورُ﴾` (الآية الكاملة الأطول)
- **C** يُنتج `سَمِعُوا لَهَا شَهِيقًا`

اختيار نص دون قرار محتوى صريح يغيّر ما يراه القارئ — فالقرار هنا:
A (جدول `AZHAR_CORRECTION_RULES`) يفوز دائمًا، وB/C لا يُنقلان. أي تغيير محتوى لصياغة استبدال يُعالج لاحقًا بمراجعة قرآنية مستقلة، لا بدمج صامت.

## ما أُصلح دون مساس نص الاستبدال (عيوب مطابقة لا قلاف)

- **ترتيب الحركات.** عدة أنماط كانت تضع الشدة قبل الحركة — تسلسل لا ينتجه NFC — فلا يطابق شيئًا. الإصلاح في هذا المستودع: `toHarakaPattern` في `packages/pipeline/src/text/clean/unicode.ts` (من `shared/arabicPattern.ts` في الـ zip) يجعل الحركات اختيارية ويهمل ترتيبها، والحروف ثابتة. نص الاستبدال لم يتغيّر.
- **وصول قاعدة النقاط المتناثرة.** القاعدة كانت تجري بعد ضغط تناثر ما يطابقها. الإصلاح: ترتيب + الاحتفاظ بالمساحات المستعملة لإدخالات الملاحظة/الفراغ في `text/clean` (لا `......` هنا — في هذا المستودع `......` تُحفظ لأسئلة الفراغ، لا تُطوى إلى `...`).

## إلى أي حالة توحيد مبكر واتصال

1. صياغة الطبقة القابلة للقراءة المستبدلة تتبع `AZHAR_CORRECTION_RULES` وحده (أعلاه).
2. توصيل النمط/الاختصارات من `shared/arabicPattern.ts` مباشرة في `unicode.ts` (`toHarakaPattern`, `consonantSpine`, `harakaOrderProblem`, `containsHaraka`).
3. لا نقل لـ `server.ts` (FR-003) ولا اعتماد على جدول `KNOWN_OCR_CANONICAL_TARGETS` — جدول `AZHAR_CORRECTION_RULES` مفرد مصدره هنا.

## الاختبارات

- `tests/backend/arabic-haraka-pattern.test.ts` — تثبيت `toHarakaPattern` المتسامح مع الحركات و`harakaOrderProblem` و`consonantSpine` و`containsHaraka`.
- `tests/backend/text-clean-golden-corpus.test.ts` و`tests/backend/text-clean-invariants.test.ts` — ذهبية/ثوابت `cleanArabicText` (نصوص الاستبدال ثابتة من A).
