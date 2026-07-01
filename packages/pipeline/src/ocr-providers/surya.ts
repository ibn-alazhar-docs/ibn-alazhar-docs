import { execFile } from "child_process";
import { mkdtemp, writeFile, unlink, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import type { PipelineConfig, OcrEngineType, OcrPageResult, OcrEngineResult } from "../types";
import { logger as baseLogger } from "@ibn-al-azhar-docs/shared";

const logger = baseLogger.child({ module: "ocr-surya" });
import type { OcrProvider } from "./types";
import { getPythonCommand } from "./types";

const SURYA_TIMEOUT = Math.max(60_000, Number(process.env.OCR_TIMEOUT ?? 1_500_000) || 1_500_000);

interface SuryaPageResult {
  text: string;
  confidence: number;
}

export class SuryaOcrProvider implements OcrProvider {
  readonly name = "Surya OCR";
  readonly type = "surya" as OcrEngineType;

  private cachedAvailable: boolean | null = null;

  async isAvailable(_config: PipelineConfig): Promise<boolean> {
    if (this.cachedAvailable !== null) return this.cachedAvailable;
    try {
      await new Promise<void>((resolve, reject) => {
        const python = getPythonCommand();
        const proc = execFile(
          python,
          [
            "-c",
            "from surya.detection import DetectionPredictor; from surya.recognition import FoundationPredictor, RecognitionPredictor; print('available')",
          ],
          { timeout: 120_000, env: { ...process.env, PYTHONIOENCODING: "utf-8" } },
          (err) => {
            if (err) reject(err);
            else resolve();
          },
        );
        proc.on("error", reject);
      });
      this.cachedAvailable = true;
    } catch {
      this.cachedAvailable = false;
    }
    return this.cachedAvailable;
  }

  async extractText(
    config: PipelineConfig,
    fileBuffer: Buffer,
    fileName: string,
    _mimeType: string,
  ): Promise<OcrEngineResult> {
    const available = await this.isAvailable(config);
    if (!available) {
      throw new Error("SURYA_NOT_AVAILABLE: Python surya package not found");
    }

    const { splitPdfPages } = await import("../ocr");
    let splitResult;
    try {
      splitResult = await splitPdfPages(fileBuffer, config.ocr.dpi);
    } catch (err) {
      throw new Error(`SURYA_SPLIT_FAILED: ${err instanceof Error ? err.message : String(err)}`);
    }

    const { readFile, rm: rmFn } = await import("fs/promises");
    try {
      const pageGetters = splitResult.pagePaths.map((p) => () => readFile(p));
      return await this.extractPages(config, pageGetters, fileName);
    } finally {
      await rmFn(splitResult.tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  async extractPages(
    config: PipelineConfig,
    pageGetters: (() => Promise<Buffer>)[],
    fileName: string,
  ): Promise<OcrEngineResult> {
    const available = await this.isAvailable(config);
    if (!available) {
      throw new Error("SURYA_NOT_AVAILABLE: Python surya package not found");
    }

    const tempDir = await mkdtemp(join(tmpdir(), "surya-ocr-"));
    const imagePaths: string[] = [];

    try {
      for (let i = 0; i < pageGetters.length; i++) {
        const pageNum = i + 1;
        const imagePath = join(tempDir, `page_${pageNum}.png`);
        const pageBuf = await pageGetters[i]!();
        await writeFile(imagePath, pageBuf);
        imagePaths.push(imagePath);
      }

      const allResults = await this.runSuryaBatch(imagePaths, config.ocr.language);

      const pages: OcrPageResult[] = allResults.map((r, i) => ({
        number: i + 1,
        text: r.text,
        confidence: r.confidence,
      }));

      const text = pages
        .filter((p) => p.text.length > 0)
        .map((p) => p.text)
        .join("\n\n");

      const confidence =
        pages.length > 0 ? pages.reduce((sum, p) => sum + p.confidence, 0) / pages.length : 0;

      const pageErrors: { page: number; error: string }[] = [];
      for (let i = 0; i < allResults.length; i++) {
        if (!allResults[i] || allResults[i]!.text.length === 0) {
          pageErrors.push({ page: i + 1, error: "NO_TEXT" });
        }
      }

      if (pageErrors.length > 0) {
        logger.warn(`Page-level failures for ${fileName}: ${JSON.stringify(pageErrors)}`);
      }

      return {
        text,
        pages,
        confidence,
        engine: "surya",
        pageErrors: pageErrors.length > 0 ? pageErrors : undefined,
      };
    } finally {
      for (const p of imagePaths) {
        await unlink(p).catch(() => {});
      }
      await rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  private async runSuryaBatch(imagePaths: string[], _language: string): Promise<SuryaPageResult[]> {
    const pathsJsonPath = join(await mkdtemp(join(tmpdir(), "surya-paths-")), "paths.json");
    await writeFile(pathsJsonPath, JSON.stringify(imagePaths));
    const script = `
import json, sys, gc
from PIL import Image as PILImage
from surya.detection import DetectionPredictor
from surya.recognition import FoundationPredictor, RecognitionPredictor

det_predictor = DetectionPredictor()
foundation = FoundationPredictor()
rec_predictor = RecognitionPredictor(foundation)

with open(sys.argv[1], "r") as f:
    paths = json.load(f)
BATCH_SIZE = 2
all_results = []
total = len(paths)

for start in range(0, total, BATCH_SIZE):
    batch_paths = paths[start:start + BATCH_SIZE]
    batch_num = start // BATCH_SIZE + 1
    total_batches = (total + BATCH_SIZE - 1) // BATCH_SIZE
    print(f"[surya] Batch {batch_num}/{total_batches} ({start+1}-{min(start+len(batch_paths), total)}/{total})", file=sys.stderr, flush=True)
    
    images = []
    for p in batch_paths:
        try:
            images.append(PILImage.open(p).convert("RGB"))
        except Exception as e:
            print(f"[surya] Failed to load {p}: {e}", file=sys.stderr, flush=True)
            images.append(None)

    valid = [(i, img) for i, img in enumerate(images) if img is not None]
    if not valid:
        for _ in batch_paths:
            all_results.append([])
        continue

    valid_indices = [v[0] for v in valid]
    valid_imgs = [v[1] for v in valid]

    try:
        lang_list = [["ar"] if "${_language}" == "ar" else ["en"]] * len(valid_imgs)
        ocr_results = rec_predictor(
            images=valid_imgs,
            langs=lang_list,
            task_names=["ocr_with_boxes"] * len(valid_imgs),
            det_predictor=det_predictor,
            sort_lines=True,
        )
    except Exception as e:
        print(f"[surya] Batch {batch_num} recognition failed: {e}", file=sys.stderr, flush=True)
        for vi in valid_indices:
            while len(all_results) < start + vi:
                all_results.append([])
            all_results.append([])
        for i, img in enumerate(images):
            idx = start + i
            if img is None and idx >= len(all_results):
                all_results.append([])
        gc.collect()
        continue

    for vi, res in zip(valid_indices, ocr_results):
        lines = [{"text": l.text, "confidence": l.confidence} for l in res.text_lines]
        while len(all_results) < start + vi:
            all_results.append([])
        all_results.append(lines)

    for i, img in enumerate(images):
        idx = start + i
        if img is None and idx >= len(all_results):
            all_results.append([])

    # Free memory between batches
    del images, valid_imgs, ocr_results
    gc.collect()

while len(all_results) < len(paths):
    all_results.append([])

print(json.dumps(all_results))
`;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("SURYA_TIMEOUT"));
      }, SURYA_TIMEOUT);

      const python = getPythonCommand();
      const proc = execFile(
        python,
        ["-c", script, pathsJsonPath],
        {
          timeout: SURYA_TIMEOUT - 5_000,
          maxBuffer: 50 * 1024 * 1024,
          env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUNBUFFERED: "1" },
        },
        (err, stdout, stderr) => {
          clearTimeout(timeout);
          unlink(pathsJsonPath).catch(() => {});
          if (err) {
            const stderrSnippet = stderr ? stderr.slice(-2000) : "";
            reject(new Error(`SURYA_EXECUTION_FAILED: ${err.message}\nSTDERR: ${stderrSnippet}`));
            return;
          }
          try {
            const allLines: { text: string; confidence: number }[][] = JSON.parse(stdout.trim());
            const results: SuryaPageResult[] = allLines.map((lines) => {
              const text = lines.map((l) => l.text).join("\n");
              const confidence =
                lines.length > 0
                  ? lines.reduce((sum, l) => sum + (l.confidence ?? 0.5), 0) / lines.length
                  : 0;
              return { text, confidence };
            });
            resolve(results);
          } catch {
            reject(
              new Error(
                `SURYA_PARSE_FAILED: Could not parse OCR output. stdout length: ${stdout.length}`,
              ),
            );
          }
        },
      );
      proc.on("error", reject);
    });
  }
}
