import type { PipelineConfig, OcrEngineType, OcrPageResult, OcrEngineResult } from "../types";
import { accessSync, constants } from "node:fs";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { mkdtemp, writeFile, unlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
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

/**
 * فحص وحدة Python المطلوبة للمزوّد المحلي. يشاركه Surya وTesseract دون
 * تغيير المهلة/التعبير لكلٍّ منهما — المزوّد يحتفظ بسقفه وعبارة استيراده
 * وينوم أن ذلك ضمن `isAvailable` الخاصة به.
 */
export async function probePythonModule(importExpr: string, timeoutMs: number): Promise<boolean> {
  try {
    await new Promise<void>((resolve, reject) => {
      const python = getPythonCommand();
      const proc = execFile(
        python,
        ["-c", importExpr],
        { timeout: timeoutMs, env: { ...process.env, PYTHONIOENCODING: "utf-8" } },
        (err) => {
          if (err) reject(err);
          else resolve();
        },
      );
      proc.on("error", reject);
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * كتابة صور الصفحات المؤقتة ثم تنفيذ المزوّد. كان Surya وTesseract يكرّران
 * الحلقة والتنظيف حرفيًّا (المجلّد، والأسماء، و`finally`) — هنا يُوحَّد الشكل
 * دون تغيير سلوك كتابة الصفحات.
 */
export async function materializePageFiles(
  pageGetters: (() => Promise<Buffer>)[],
  tempDirPrefix: string,
): Promise<{ tempDir: string; imagePaths: string[] }> {
  const tempDir = await mkdtemp(join(tmpdir(), tempDirPrefix));
  const imagePaths: string[] = [];
  for (let i = 0; i < pageGetters.length; i++) {
    const imagePath = join(tempDir, `page_${i + 1}.png`);
    const pageBuf = await pageGetters[i]!();
    await writeFile(imagePath, pageBuf);
    imagePaths.push(imagePath);
  }
  return { tempDir, imagePaths };
}

export async function cleanupPageFiles(tempDir: string, imagePaths: string[]): Promise<void> {
  for (const p of imagePaths) {
    await unlink(p).catch(() => {});
  }
  await rm(tempDir, { recursive: true, force: true }).catch(() => {});
}

/** متوسط ثقة صفحات نتيجة: صفر عند غياب الصفحات، وإلا متوسطها الحسابي. */
export function averageConfidence(pages: { confidence: number }[]): number {
  return pages.length > 0 ? pages.reduce((s, p) => s + p.confidence, 0) / pages.length : 0;
}

/** نصّ النتيجة المجمع: الصفحات غير الفارغة فقط مفصولة بأسطرين. */
export function joinPageTexts(pages: { text: string }[]): string {
  return pages
    .filter((p) => p.text.length > 0)
    .map((p) => p.text)
    .join("\n\n");
}

export interface BatchPageResult {
  text: string;
  confidence: number;
  lines?: { text?: string; bbox?: number[] | null }[];
}

/** تحويل نتيجة دفعة محلية (نص/ثقة/سطور مبعثرة) إلى صفحات OCR موحّدة. */
export function toOcrPagesFromBatch(results: BatchPageResult[]): OcrPageResult[] {
  return results.map((r, i) => {
    const layerLines = placedOcrLines(
      (r.lines ?? []) as { text?: string; bbox?: number[] | null }[],
    );
    return {
      number: i + 1,
      text: r.text,
      confidence: r.confidence,
      ...(layerLines.length > 0 ? { layout: { lines: layerLines } } : {}),
    };
  });
}

/**
 * `extractText` عبر `splitPdfPages` ثم `extractPages` — كان Surya وTesseract
 * يكرّران التقسيم والقراءة والتنظيف. يمرّر المزوّد سابقة خطأ التقسيم الخاصة
 * به (`SURYA_SPLIT_FAILED` / `TESSERACT_SPLIT_FAILED`) ودقيقته دون تغيير
 * الاستيراد المتأخر لتجنّب دائرة ocr-providers → ocr.
 */
export async function extractTextViaSplitPages(
  config: PipelineConfig,
  fileBuffer: Buffer,
  fileName: string,
  splitErrorLabel: string,
  extractPages: (
    config: PipelineConfig,
    pageGetters: (() => Promise<Buffer>)[],
    fileName: string,
  ) => Promise<OcrEngineResult>,
): Promise<OcrEngineResult> {
  const { splitPdfPages } = await import("../ocr");
  let splitResult;
  try {
    splitResult = await splitPdfPages(fileBuffer, config.ocr.dpi);
  } catch (err) {
    throw new Error(`${splitErrorLabel}: ${err instanceof Error ? err.message : String(err)}`);
  }
  const { readFile } = await import("node:fs/promises");
  try {
    const pageGetters = splitResult.pagePaths.map((p) => () => readFile(p));
    return await extractPages(config, pageGetters, fileName);
  } finally {
    await rm(splitResult.tempDir, { recursive: true, force: true }).catch(() => {});
  }
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
