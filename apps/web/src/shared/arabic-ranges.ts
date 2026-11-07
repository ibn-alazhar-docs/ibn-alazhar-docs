/**
 * النطاقات العربية التي يحتاجها `apps/web` بدون استيراد حزمة الـ pipeline.
 *
 * السبب تقني لا جمالي: جذر `@ibn-al-azhar-docs/pipeline` يجلب bullmq وioredis
 * و@google/generative-ai، فاستيرادُه ثابتًا من مكوّن `"use client"` يدخل كل ذلك
 * في حزمة المتصفّح. لذلك تُنسخ النطاقات هنا نصًّا، ويقفل الانحرافَ اختبارٌ
 * واحد: `tests/backend/arabic-classes-single-source.test.ts` يقارن كل حرف في
 * المصدر القياسي `packages/pipeline/src/text/constants.ts` مع هذا الملف، فلا
 * يمكن أن يتباعد الاثنان دون أن يحمرّ الاختبار.
 */

/** = `ARABIC_LETTER_RANGES`: الكتل الأربع التي تحمل الحروف العربية. */
export const ARABIC_LETTER_RANGES = "\\u0600-\\u06FF\\u0750-\\u077F\\u0870-\\u08FF";

/** = `TASHKEEL_SOURCE`: التشكيل والعلامات القرآنية، مقاسةً من Unicode 15. */
export const TASHKEEL_SOURCE =
  "\\u0610-\\u061A\\u064B-\\u065F\\u0670\\u06D6-\\u06ED\\u0898-\\u089F\\u08CA-\\u08E1\\u08E3-\\u08FF";

/** = `TATWEEL_SOURCE`. */
export const TATWEEL_SOURCE = "\\u0640";

const MARKS = new RegExp(`[${TASHKEEL_SOURCE}]`, "g");
const MARKS_AND_TATWEEL = new RegExp(`[${TASHKEEL_SOURCE}${TATWEEL_SOURCE}]`, "g");

/** إزالة كل علامات التشكيل والعلامات القرآنية (لا تُزال التشديدة ولا المدّ دون سواهما). */
export function stripArabicMarks(text: string): string {
  return text.replace(MARKS, "");
}

/** إزالة التشكيل والمدّ (التطويل) معًا — ما يحتاجه البحث والتطابق. */
export function stripArabicMarksAndTatweel(text: string): string {
  return text.replace(MARKS_AND_TATWEEL, "");
}
