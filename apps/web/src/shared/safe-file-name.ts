import { ARABIC_LETTER_RANGES } from "./arabic-ranges";

/**
 * اسم ملف آمن للاستخدام كمكوّن مسار تخزين. لا يُقبل إلا الحروف اللاتينية والرقمية
 * والنقطة والشرطة السفلية وحروف العربية القياسية — والقياس هنا ليس زخرفيًا: الصياغة
 * السابقة كانت 0600–06FF وحدها، فاسم مسحوبة مخطوط بحروف Extended-B كان يخرج
 * مستبدَل الحروف بـ "_". التطابق مع النطاق القياسي يقفله
 * tests/backend/arabic-classes-single-source.test.ts.
 */
const UNSAFE_CHARS = new RegExp(`[^a-zA-Z0-9._${ARABIC_LETTER_RANGES}-]`, "g");

/** سقف طول الاسم: مفتاح التخزين يُبنى من userId/jobId/الاسم، والتقليم يمنع انفجار المسار. */
export const SAFE_FILE_NAME_MAX_LENGTH = 200;

export function safeFileName(name: string, maxLength: number = SAFE_FILE_NAME_MAX_LENGTH): string {
  return name.replace(UNSAFE_CHARS, "_").slice(0, maxLength);
}
