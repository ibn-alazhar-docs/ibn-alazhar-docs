import { execFile } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getPythonCommand } from "./ocr-providers/types";

export { estimateConfidence, createOcrProvider, OcrManager } from "./ocr-provider";
export type { OcrProvider } from "./ocr-provider";

export interface SplitResult {
  pagePaths: string[];
  tempDir: string;
  pageCount: number;
}

/**
 * Image pre-processing configuration passed to the Python split script.
 * Every flag maps directly to an OCR_* environment variable (see
 * scripts/split-pdf.py). All steps are individually toggleable; the chain
 * never alters glyph shapes, so Arabic diacritics are preserved.
 */
export interface PreprocessOptions {
  /** "auto" = upscale genuinely low-res pages + deskew/normalize/denoise; true = unconditional; false = off. */
  mode: "auto" | "on" | "off";
  minDpi: number;
  targetDpi: number;
  /** explicit upscale factor applied to every page (1.0 = none). */
  upscale: number;
  deskew: boolean;
  clahe: boolean;
  denoise: boolean;
  shadow: boolean;
  border: boolean;
  perspective: boolean;
  binarize: boolean;
  sauvola: boolean;
  sharpen: boolean;
}

export const DEFAULT_PREPROCESS: PreprocessOptions = {
  mode: "auto",
  minDpi: 300,
  targetDpi: 400,
  upscale: 1.0,
  deskew: true,
  clahe: true,
  denoise: true,
  shadow: true,
  border: false,
  perspective: false,
  binarize: false,
  sauvola: false,
  sharpen: false,
};

function buildPreprocessEnv(opts: PreprocessOptions): NodeJS.ProcessEnv {
  const on = (b: boolean) => (b ? "1" : "0");
  const mode = opts.mode === "on" ? "1" : opts.mode === "off" ? "0" : "auto";
  return {
    OCR_PREPROCESS: mode,
    OCR_MIN_DPI: String(opts.minDpi),
    OCR_TARGET_DPI: String(opts.targetDpi),
    OCR_UPSCALE: String(opts.upscale),
    OCR_DESKEW: on(opts.deskew),
    OCR_CLAHE: on(opts.clahe),
    OCR_DENOISE: on(opts.denoise),
    OCR_SHADOW: on(opts.shadow),
    OCR_BORDER: on(opts.border),
    OCR_PERSPECTIVE: on(opts.perspective),
    OCR_BINARIZE: on(opts.binarize),
    OCR_SAUVOLA: on(opts.sauvola),
    OCR_SHARPEN: on(opts.sharpen),
  } as unknown as NodeJS.ProcessEnv;
}

// Upper bound on pages per document. A single oversized PDF, if split into one
// PNG per page, can exhaust the worker's tmpfs; this caps temporary disk usage
// and downstream OCR work. Enforced in the split script (stops rendering) and
// re-checked below as defense-in-depth.
export const MAX_PDF_PAGES = 2000;

export async function splitPdfPages(
  fileBuffer: Buffer,
  dpi: number = 300,
  preprocess: PreprocessOptions = DEFAULT_PREPROCESS,
): Promise<SplitResult> {
  const tempDir = await mkdtemp(join(tmpdir(), "pdf-split-"));
  const pdfPath = join(tempDir, "input.pdf");
  const scriptPath = join(dirname(fileURLToPath(import.meta.url)), "..", "scripts", "split-pdf.py");

  try {
    await writeFile(pdfPath, fileBuffer);

    const python = getPythonCommand();
    const resultJson = await new Promise<string>((resolve, reject) => {
      const proc = execFile(
        python,
        [scriptPath, pdfPath, tempDir, String(dpi), String(MAX_PDF_PAGES)],
        {
          timeout: 1800_000,
          maxBuffer: 50 * 1024 * 1024,
          env: {
            ...process.env,
            ...buildPreprocessEnv(preprocess),
            PYTHONIOENCODING: "utf-8",
          },
        },
        (err, stdout) => {
          if (err) {
            reject(new Error(`PDF_SPLIT_EXECUTION_FAILED: ${err.message}`));
            return;
          }
          resolve(stdout.trim());
        },
      );
      proc.on("error", reject);
    });

    let result:
      | { pages: { number: number; path: string }[]; pageCount: number; error?: string }
      | { error: string };
    try {
      result = JSON.parse(resultJson);
    } catch {
      throw new Error(`PDF_SPLIT_PARSE_FAILED: Could not parse split output`);
    }

    // The Python script emits a structured {"error": "CODE: message"} on failure
    // instead of a raw stack trace, so we can surface a precise, actionable error.
    if ("error" in result && result.error) {
      throw new Error(`PDF_SPLIT_FAILED: ${result.error}`);
    }

    if (!("pages" in result) || !("pageCount" in result)) {
      throw new Error(`PDF_SPLIT_PARSE_FAILED: Missing fields in split output`);
    }

    if (result.pageCount > MAX_PDF_PAGES) {
      throw new Error(`PDF_EXCEEDS_MAX_PAGES: ${result.pageCount} > ${MAX_PDF_PAGES}`);
    }

    const pagePaths = result.pages.map((p) => p.path);
    return { pagePaths, tempDir, pageCount: result.pageCount };
  } catch (err) {
    // Only remove tempDir on failure. On success, caller is responsible for cleanup.
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
    throw err;
  }
}
