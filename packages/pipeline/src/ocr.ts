import { execFile } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getPythonCommand } from "./ocr-providers/types";

export {
  estimateConfidence,
  GoogleDriveOcrProvider,
  SuryaOcrProvider,
  createOcrProvider,
  OcrManager,
} from "./ocr-provider";
export type { OcrProvider } from "./ocr-provider";

export interface SplitResult {
  pagePaths: string[];
  tempDir: string;
  pageCount: number;
}

// Upper bound on pages per document. A single oversized PDF, if split into one
// PNG per page, can exhaust the worker's tmpfs; this caps temporary disk usage
// and downstream OCR work. Enforced in the split script (stops rendering) and
// re-checked below as defense-in-depth.
export const MAX_PDF_PAGES = 2000;

export async function splitPdfPages(fileBuffer: Buffer, dpi: number = 300): Promise<SplitResult> {
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
          env: { ...process.env, PYTHONIOENCODING: "utf-8" },
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
