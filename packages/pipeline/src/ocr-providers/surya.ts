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

// Adaptive batch sizing: small batches for high-quality, larger for speed on long docs
const BATCH_SIZE_MIN = 2;
const BATCH_SIZE_MAX = 8;
const CONFIDENCE_THRESHOLD_RETRY = 0.65; // Pages below this need aggressive reprocessing

interface SuryaPageResult {
  text: string;
  confidence: number;
  needsRetry?: boolean;
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

      // First pass: standard OCR
      logger.info(`First pass OCR for ${fileName} (${imagePaths.length} pages)`);
      const allResults = await this.runSuryaBatch(imagePaths, config.ocr.language);

      // Identify pages that need retry with aggressive preprocessing
      const retryIndices: number[] = [];
      for (let i = 0; i < allResults.length; i++) {
        if (allResults[i]?.needsRetry) {
          retryIndices.push(i);
        }
      }

      // Second pass: retry failed pages with aggressive preprocessing
      if (retryIndices.length > 0) {
        logger.warn(
          `Retrying ${retryIndices.length} low-confidence pages with aggressive preprocessing`,
        );

        // Re-preprocess failed pages with aggressive settings
        // (reprocessing is done via runSuryaBatch below)

        // Retry pages one by one (not batch) for maximum quality
        for (const idx of retryIndices) {
          try {
            const pageNum = idx + 1;
            const origPath = imagePaths[idx]!;

            // Read, reprocess, and re-OCR
            const { readFile: fsRead } = await import("fs/promises");
            const pageBuffer = await fsRead(origPath);

            // Apply aggressive preprocessing via Python
            const tempRetryDir = await mkdtemp(join(tmpdir(), "surya-retry-"));
            const retryPath = join(tempRetryDir, `retry_page_${pageNum}.png`);
            await writeFile(retryPath, pageBuffer);

            const retryResults = await this.runSuryaBatch([retryPath], config.ocr.language);

            if (retryResults[0] && retryResults[0].confidence > allResults[idx]!.confidence) {
              logger.info(
                `Page ${pageNum} improved: ${allResults[idx]!.confidence.toFixed(2)} → ${retryResults[0].confidence.toFixed(2)}`,
              );
              allResults[idx] = { ...retryResults[0], needsRetry: false };
            }

            await rm(tempRetryDir, { recursive: true, force: true }).catch(() => {});
          } catch (err) {
            logger.warn(
              `Retry failed for page ${idx + 1}: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }
      }

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
        const result = allResults[i];
        if (!result || result.text.length === 0) {
          pageErrors.push({ page: i + 1, error: "NO_TEXT" });
        } else if (result.confidence < CONFIDENCE_THRESHOLD_RETRY) {
          pageErrors.push({ page: i + 1, error: `LOW_CONFIDENCE:${result.confidence.toFixed(2)}` });
        }
      }

      if (pageErrors.length > 0) {
        logger.warn(
          `Page-level issues for ${fileName}: ${JSON.stringify(pageErrors.slice(0, 10))}${pageErrors.length > 10 ? ` (+${pageErrors.length - 10} more)` : ""}`,
        );
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

    // Adaptive batch size: use larger batches for long documents to improve throughput
    const totalPages = imagePaths.length;
    const batchSize = totalPages > 100 ? BATCH_SIZE_MAX : totalPages > 20 ? 4 : BATCH_SIZE_MIN;

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
BATCH_SIZE = ${batchSize}
CONFIDENCE_THRESHOLD = ${CONFIDENCE_THRESHOLD_RETRY}

# Pre-size to one empty slot per page so individual batch/image failures can
# never shift or misalign results relative to the input page order.
all_results = [{"lines": [], "needs_retry": False} for _ in paths]
total = len(paths)

for start in range(0, total, BATCH_SIZE):
    batch_paths = paths[start:start + BATCH_SIZE]
    batch_num = start // BATCH_SIZE + 1
    total_batches = (total + BATCH_SIZE - 1) // BATCH_SIZE
    print(f"[surya] Batch {batch_num}/{total_batches} ({start+1}-{min(start+len(batch_paths), total)}/{total}) [batch_size={BATCH_SIZE}]", file=sys.stderr, flush=True)
    
    images = []
    for p in batch_paths:
        try:
            images.append(PILImage.open(p).convert("RGB"))
        except Exception as e:
            print(f"[surya] Failed to load {p}: {e}", file=sys.stderr, flush=True)
            images.append(None)

    valid = [(i, img) for i, img in enumerate(images) if img is not None]
    if not valid:
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
        # Mark failed pages for retry
        for vi in valid_indices:
            all_results[start + vi]["needs_retry"] = True
        gc.collect()
        continue

    for vi, res in zip(valid_indices, ocr_results):
        lines = [{"text": l.text, "confidence": l.confidence} for l in res.text_lines]
        avg_conf = sum(l.confidence for l in res.text_lines) / len(res.text_lines) if res.text_lines else 0.0
        
        all_results[start + vi] = {
            "lines": lines,
            "needs_retry": avg_conf < CONFIDENCE_THRESHOLD or len(lines) == 0
        }
        
        if avg_conf < CONFIDENCE_THRESHOLD:
            print(f"[surya] Page {start + vi + 1} low confidence ({avg_conf:.2f}) - marked for retry", file=sys.stderr, flush=True)

    # Aggressive memory cleanup for long documents
    del images, valid_imgs, ocr_results
    gc.collect()
    
    # Extra GC every 50 batches for 1000+ page documents
    if batch_num % 50 == 0 and total > 500:
        import gc as gc_module
        gc_module.collect()
        gc_module.collect()
        print(f"[surya] Deep GC at batch {batch_num}", file=sys.stderr, flush=True)

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
            const allResults: {
              lines: { text: string; confidence: number }[];
              needs_retry: boolean;
            }[] = JSON.parse(stdout.trim());

            const results: SuryaPageResult[] = allResults.map((pageData) => {
              const lines = pageData.lines || [];
              const text = lines.map((l) => l.text).join("\n");
              const confidence =
                lines.length > 0
                  ? lines.reduce((sum, l) => sum + (l.confidence ?? 0.5), 0) / lines.length
                  : 0;
              return {
                text,
                confidence,
                needsRetry: pageData.needs_retry || confidence < CONFIDENCE_THRESHOLD_RETRY,
              };
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
