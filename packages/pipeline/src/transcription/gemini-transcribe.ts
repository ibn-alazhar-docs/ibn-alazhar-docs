import { GoogleGenerativeAI } from "@google/generative-ai";
import { loadGeminiKeys } from "../keypool";
import { loadConfig } from "../config";

export const TRANSCRIPTION_MOCK_TEXT = "هذا تفريغ صوتي تجريبي لا_أعلم_هويتي تفوق كبير وتألق";

const AUDIO_PROMPT_AR =
  "Transcribe this audio exactly as spoken in Arabic (lang=ar). Output ONLY the transcript text — no intro, no summary, no commentary. Preserve Arabic orthography and punctuation.";

const AUDIO_PROMPT_EN =
  "Transcribe this audio exactly as spoken in English (lang=en). Output ONLY the transcript text — no intro, no summary, no commentary.";

function promptFor(lang: string): string {
  return lang === "en" ? AUDIO_PROMPT_EN : AUDIO_PROMPT_AR;
}

/**
 * تحويل صوت → نص حقيقي عبر Gemini (دون whisper، دون Rust، دون package جديد).
 * - يقرأ المفاتيح عبر loadGeminiKeys().
 * - وضع الاختبار: MOCK_OCR=true → نص عربي تجريبي ثابت (بلا استدعاء شبكة).
 * - غياب المفتاح → خطأ مميز GEMINI_API_KEY_MISSING (يرسمه الـguest processor مميزًا).
 */
export async function transcribeAudio(buffer: Buffer, mime: string, lang = "ar"): Promise<string> {
  if (process.env.MOCK_OCR === "true") {
    return TRANSCRIPTION_MOCK_TEXT;
  }

  const keys = [...new Set([loadConfig().gemini.apiKey, ...loadGeminiKeys()].filter(Boolean))];
  if (keys.length === 0) {
    throw new Error(
      "GEMINI_API_KEY_MISSING: no Gemini API key available for audio transcription (set GEMINI_API_KEY or configure keypool)",
    );
  }

  const model = process.env.GEMINI_MODEL ?? loadConfig().gemini.model ?? "gemini-2.5-flash";
  const prompt = promptFor(lang);

  let lastError: unknown = null;
  for (const key of keys) {
    try {
      const genAI = new GoogleGenerativeAI(key);
      const generativeModel = genAI.getGenerativeModel({ model });
      const result = await generativeModel.generateContent([
        prompt,
        {
          inlineData: {
            data: buffer.toString("base64"),
            mimeType: mime,
          },
        },
      ]);
      const text = result.response.text().trim();
      if (!text) {
        throw new Error("TRANSCRIPTION_EMPTY: Gemini returned empty transcript");
      }
      return text;
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      // مفتاح ميت (401/403) → جرّب المفتاح التالي إن وُجد
      if (msg.includes("401") || msg.includes("403") || msg.includes("API key")) {
        continue;
      }
      throw err;
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error("GEMINI_API_KEY_MISSING: all Gemini keys failed for audio transcription");
}
