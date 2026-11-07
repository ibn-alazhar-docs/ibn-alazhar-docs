/**
 * التطبيع الواحد للبحث العربي — المطابقة بين ما يُستعلَم به (JS) وما يُخزَّن في
 * `normalize_arabic` (SQL) شرطُ عملٍ لا تجميل: الانحراف بينهما يعني نتائج بحث
 * تختفي بصمت. جدول الطيات هنا هو التعريف القياسي، وهجرة SQL تكتبه حروفًا،
 * ويقفل تطابقَهما حرفًا بحرفٍ الاختبار:
 * `tests/backend/arabic-search-normalize-single-source.test.ts`.
 *
 * لا تُعِد تعريف أيٍّ من هذه الطبقات في مكان آخر: نطاقات العلامات والتطويل
 * مستوردة من `./arabic-ranges` (المقفولة أصلاً على القياسي في
 * `packages/pipeline/src/text/constants.ts`).
 */
import { TASHKEEL_SOURCE, TATWEEL_SOURCE } from "./arabic-ranges";

/**
 * حرف → حرف. ؤ/ئ تُطويان إلى الحرف الحامل (و/ي) لا إلى الهمزة العارية ء:
 * «سؤل» و«سول» يجب أن يقعا على الرمز نفسه، وطَيُّهما إلى ء كان يجعل الاستعلام
 * لا يطابق أي وثيقة.
 */
export const ARABIC_SEARCH_FOLD_PAIRS: ReadonlyMap<string, string> = new Map([
  ["\u0623", "\u0627"], // U+0623 -> U+0627
  ["\u0625", "\u0627"], // U+0625 -> U+0627
  ["\u0622", "\u0627"], // U+0622 -> U+0627
  ["\u0671", "\u0627"], // U+0671 (همزة الوصل؛ شائعة في المخطوطات) -> U+0627
  ["\u0649", "\u064A"], // U+0649 -> U+064A
  ["\u06A9", "\u064A"], // U+06A9 -> U+064A
  ["\u06CC", "\u064A"], // U+06CC -> U+064A
  ["\u0624", "\u0648"], // U+0624 -> U+0648
  ["\u0626", "\u064A"], // U+0626 -> U+064A
  ["\u0629", "\u0647"], // U+0629 -> U+0647
]);

// طبقات جاهزة للاستعمال مع replace فقط؛ لا تستخدم .test() مع هذه الكائنات.
const FOLD_CLASSES: ReadonlyArray<{ readonly source: RegExp; readonly target: string }> = (() => {
  const byTarget = new Map<string, string>();
  for (const [from, to] of ARABIC_SEARCH_FOLD_PAIRS) {
    byTarget.set(to, (byTarget.get(to) ?? "") + from);
  }
  return [...byTarget.entries()].map(([target, sources]) => ({
    source: new RegExp(`[${sources}]`, "g"),
    target,
  }));
})();

const MARKS_AND_TATWEEL = new RegExp(`[${TASHKEEL_SOURCE}${TATWEEL_SOURCE}]`, "g");

/**
 * الشكل القياسي لكلمة عربية من أجل الفهرسة والبحث: تصغيرٌ للأحرف اللاتينية، ثم
 * إزالة كل علامات التشكيل والقرآن المقيسة (TASHKEEL_SOURCE) والتطويل، ثم طي
 * الحروف المتغيرة وفق ARABIC_SEARCH_FOLD_PAIRS. التصغير لازم على طرف JS لأن
 * `to_tsvector('simple', …)` و`plainto_tsquery('simple', …)` تصغّر ASCII فقط
 * على الطرفين، فلا خطر انحراف عليه.
 */
export function normalizeArabicForSearch(text: string): string {
  let out = text.toLowerCase().replace(MARKS_AND_TATWEEL, "");
  for (const fold of FOLD_CLASSES) {
    out = out.replace(fold.source, fold.target);
  }
  return out;
}
