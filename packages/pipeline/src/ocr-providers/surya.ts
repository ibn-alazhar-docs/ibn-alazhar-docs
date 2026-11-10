import { execFile } from "node:child_process";
import { mkdtemp, writeFile, unlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PipelineConfig, OcrEngineType, OcrPageResult, OcrEngineResult } from "../types";
import { logger as baseLogger } from "@ibn-al-azhar-docs/shared";

const logger = baseLogger.child({ module: "ocr-surya" });
import type { OcrProvider } from "./types";
import {
  getPythonCommand,
  probePythonModule,
  materializePageFiles,
  cleanupPageFiles,
  averageConfidence,
  joinPageTexts,
  toOcrPagesFromBatch,
  extractTextViaSplitPages,
} from "./types";

const SURYA_TIMEOUT = Math.max(60_000, Number(process.env.OCR_TIMEOUT ?? 1_500_000) || 1_500_000);

// Adaptive batch sizing: small batches for high-quality, larger for speed on long docs
const BATCH_SIZE_MIN = 2;
const BATCH_SIZE_MAX = 8;
const CONFIDENCE_THRESHOLD_RETRY = 0.65; // Pages below this need aggressive reprocessing

interface SuryaPageResult {
  text: string;
  confidence: number;
  needsRetry?: boolean;
  /** سطور OCR بمواضعها ببكسلات صورة الصفحة نفسها — لا نقاط ولا dpi آخر. */
  lines?: SuryaOcrLine[];
}

interface SuryaOcrLine {
  text: string;
  confidence: number;
  bbox?: number[] | null;
}

export class SuryaOcrProvider implements OcrProvider {
  readonly name = "Surya OCR";
  readonly type = "surya" as OcrEngineType;

  private cachedAvailable: boolean | null = null;

  async isAvailable(_config: PipelineConfig): Promise<boolean> {
    if (process.env.MOCK_OCR === "true" || process.env.PLAYWRIGHT_TEST === "true" || process.env.NODE_ENV === "test") return true;
    if (this.cachedAvailable !== null) return this.cachedAvailable;
    this.cachedAvailable = await probePythonModule(
      "from surya.detection import DetectionPredictor; from surya.recognition import FoundationPredictor, RecognitionPredictor; print('available')",
      120_000,
    );
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
    return extractTextViaSplitPages(config, fileBuffer, fileName, "SURYA_SPLIT_FAILED", (c, g, f) =>
      this.extractPages(c, g, f),
    );
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

    const { tempDir, imagePaths } = await materializePageFiles(pageGetters, "surya-ocr-");

    try {
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

      // Second pass: retry failed pages with a fresh batch run
      if (retryIndices.length > 0) {
        logger.warn(
          `Retrying ${retryIndices.length} low-confidence pages with aggressive preprocessing`,
        );

        // Retry pages one by one (not batch) for maximum quality
        for (const idx of retryIndices) {
          try {
            const pageNum = idx + 1;
            const origPath = imagePaths[idx]!;

            const { readFile: fsRead } = await import("node:fs/promises");
            const pageBuffer = await fsRead(origPath);
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

      const pages: OcrPageResult[] = toOcrPagesFromBatch(allResults);

      const text = joinPageTexts(pages);

      const confidence = averageConfidence(pages);

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
      await cleanupPageFiles(tempDir, imagePaths);
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

def line_bbox(line):
    # صندوق [x0,y0,x1,y1] ببكسلات الصورة كما هي: surya ترجع polygon أو bbox بحسب
    # الإصدار، وكلاهما إحداثيات الصورة الأصلية بلا تحجيم — لا تُختلق عند غيبوبتهما.
    poly = getattr(line, "polygon", None)
    box = None
    if poly is not None:
        try:
            pts = [(float(p[0]), float(p[1])) for p in poly]
            if pts:
                box = [min(x for x, _ in pts), min(y for _, y in pts),
                       max(x for x, _ in pts), max(y for _, y in pts)]
        except (TypeError, ValueError, IndexError):
            box = None
    if box is None:
        bb = getattr(line, "bbox", None)
        if bb is not None:
            try:
                vals = [float(v) for v in bb]
            except (TypeError, ValueError):
                vals = []
            if len(vals) == 4:
                box = vals
    return box

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
        lines = [{"text": l.text, "confidence": float(l.confidence), "bbox": line_bbox(l)} for l in res.text_lines]
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
              lines: { text: string; confidence: number; bbox?: number[] | null }[];
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
                lines,
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
