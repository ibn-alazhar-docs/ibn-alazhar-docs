import { execFile } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { PipelineConfig, OcrEngineResult } from "./types";
import { GoogleDriveOcrProvider } from "./ocr-provider";
import { getPythonCommand } from "./ocr-providers/types";

export {
  estimateConfidence,
  GoogleDriveOcrProvider,
  SuryaOcrProvider,
  createOcrProvider,
  OcrManager,
} from "./ocr-provider";
export type { OcrProvider } from "./ocr-provider";

export async function extractTextViaGoogleDrive(
  config: PipelineConfig,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<OcrEngineResult> {
  const provider = new GoogleDriveOcrProvider();
  return provider.extractText(config, fileBuffer, fileName, mimeType);
}

export async function ocrImageViaGoogleDrive(
  config: PipelineConfig,
  pageGetters: (() => Promise<Buffer>)[],
  fileName: string,
): Promise<OcrEngineResult> {
  const provider = new GoogleDriveOcrProvider();
  return provider.extractPages(config, pageGetters, fileName);
}

export interface SplitResult {
  pagePaths: string[];
  tempDir: string;
  pageCount: number;
}

export async function splitPdfPages(fileBuffer: Buffer, dpi: number = 300): Promise<SplitResult> {
  const tempDir = await mkdtemp(join(tmpdir(), "pdf-split-"));
  const pdfPath = join(tempDir, "input.pdf");
  const scriptPath = join(dirname(fileURLToPath(import.meta.url)), "split-pdf.py");

  try {
    await writeFile(pdfPath, fileBuffer);

    const python = getPythonCommand();
    const resultJson = await new Promise<string>((resolve, reject) => {
      const proc = execFile(
        python,
        [scriptPath, pdfPath, tempDir, String(dpi)],
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

    let result: { pages: { number: number; path: string }[]; pageCount: number };
    try {
      result = JSON.parse(resultJson);
    } catch {
      throw new Error(`PDF_SPLIT_PARSE_FAILED: Could not parse split output`);
    }

    const pagePaths = result.pages.map((p) => p.path);
    return { pagePaths, tempDir, pageCount: result.pageCount };
  } catch (err) {
    // Only remove tempDir on failure. On success, caller is responsible for cleanup.
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
    throw err;
  }
}
