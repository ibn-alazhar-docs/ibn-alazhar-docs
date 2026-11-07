import type { PipelineConfig, OcrEngineType, OcrPageResult, OcrEngineResult } from "../types";
import { accessSync, constants } from "node:fs";
import { join } from "node:path";
import { ARABIC_STRONG_MIN_RATIO, arabicLetterRatio } from "../text/constants";

export interface OcrProvider {
  readonly name: string;
  readonly type: OcrEngineType;
  isAvailable(config: PipelineConfig): boolean | Promise<boolean>;
  extractText(
    config: PipelineConfig,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<OcrEngineResult>;
  extractPages(
    config: PipelineConfig,
    pageGetters: (() => Promise<Buffer>)[],
    fileName: string,
  ): Promise<OcrEngineResult>;
}

/**
 * سُلَّم تقدير الثقة. `HIGH_ARABIC_SHARE` خاص بهذا التقدير وحده (لا يوجد له مقابل
 * في عتبات الكشف)؛ العتبة السفلية هي بوابة العربية القياسية `ARABIC_STRONG_MIN_RATIO`
 * نفسها — كانت مكتوبة 0.4 هنا باليد بينما تُعرَّف في text/constants.
 */
const HIGH_ARABIC_SHARE = 0.7;

export function estimateConfidence(text: string): number {
  // صفحة بلا حروف ثقةُها صفر لا 0.5: لا يجوز أن تُقرأ نتيجة OCR فارغة أبدًا
  // كنتيجة مقبولة عند عتبات القبول أو إعادة المحاولة.
  if (text.replace(/\s/g, "").length === 0) return 0;
  const ratio = arabicLetterRatio(text);
  if (ratio > HIGH_ARABIC_SHARE) return 0.9;
  if (ratio > ARABIC_STRONG_MIN_RATIO) return 0.7;
  return 0.5;
}

export function toOcrPageResult(pages: { number: number; text: string }[]): OcrPageResult[] {
  return pages.map((p) => ({
    number: p.number,
    text: p.text,
    confidence: estimateConfidence(p.text),
  }));
}

/** سطور OCR قابلة للوضع: نصٌّ غير فارغ وصندوقٌ رباعي حقيقي — بلا صندوق لا موضع. */
export function placedOcrLines(
  lines: { text?: string; bbox?: number[] | null }[] | undefined,
): { text: string; bbox: number[] }[] {
  const out: { text: string; bbox: number[] }[] = [];
  for (const l of lines ?? []) {
    const text = typeof l.text === "string" ? l.text.trim() : "";
    if (text && Array.isArray(l.bbox) && l.bbox.length === 4) {
      out.push({ text, bbox: l.bbox });
    }
  }
  return out;
}

export function getPythonCommand(): string {
  const envPython = process.env.SURYA_PYTHON_PATH;
  if (envPython) return envPython;

  // Check multiple known venv locations (HF Spaces uses /opt/ocr-venv).
  const candidates = [
    join(process.env.HOME ?? process.env.USERPROFILE ?? ".", ".venv", "bin", "python3"),
    "/opt/ocr-venv/bin/python3",
  ];
  for (const candidate of candidates) {
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // not found, try next
    }
  }
  return "python3";
}
