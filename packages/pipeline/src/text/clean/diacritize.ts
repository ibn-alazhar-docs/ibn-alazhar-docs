import { GoogleGenerativeAI } from "@google/generative-ai";
import { loadGeminiKeys } from "../../keypool";
import { loadConfig } from "../../config";

/**
 * التشكيل النصي عبر Gemini — بدون أي موديلات محلية.
 * يتبع نمط `ocr-providers/gemini.ts`: اكتشاف المفاتيح عبر `loadGeminiKeys`
 * ووضع `MOCK_OCR` الحتمي للاختبارات.
 */
const DIACRITIZE_PROMPT = `أضف التشكيل العربي الكامل (الحروف المتحركة: الفتحة والضمة والكسرة والشدة والسكون) إلى النص العربي التالي.
قواعد صارمة:
- أعد النص كاملًا مشكولًا فقط، دون حذف أي كلمة أو إضافة كلمات جديدة.
- لا ترجمة ولا تلخيص ولا تفسير ولا تعليق.
- حافظ على ترتيب الكلمات وعلامات الترقيم والأسطر الجديدة كما هي.
- أعد النص المشكول فقط، بلا مقدمات وبلا شرح.

النص:
`;

/**
 * تشكيل نص عربي عبر Gemini.
 * - `""` → تُعاد كما هي دون استدعاء API.
 * - `MOCK_OCR=true` → يُعاد النص كما هو (لا شبكة).
 * - غياب المفتاح → يرمي `GEMINI_API_KEY_MISSING` صراحةً (يُحوَّل إلى 503 في طبقة الضيوف).
 */
export async function diacritizeArabic(text: string): Promise<string> {
  if (text === "") return text;
  if (process.env.MOCK_OCR === "true") return text;

  const keys = [...new Set([loadConfig().gemini.apiKey, ...loadGeminiKeys()].filter(Boolean))];
  if (keys.length === 0) {
    throw new Error(
      "GEMINI_API_KEY_MISSING: لا يوجد مفتاح Gemini — اضبط GEMINI_API_KEY أو ملف ~/.config/ocr/gemini_key(s)",
    );
  }

  const modelName = process.env.GEMINI_MODEL ?? loadConfig().gemini.model ?? "gemini-2.5-flash";
  let lastError: unknown = null;
  for (const key of keys) {
    try {
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([DIACRITIZE_PROMPT, text]);
      const output = result.response.text().trim();
      return output.length > 0 ? output : text;
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("401") || msg.includes("403") || msg.includes("API key")) {
        continue;
      }
      throw err;
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error("GEMINI_API_KEY_MISSING: all Gemini keys failed for diacritize");
}
