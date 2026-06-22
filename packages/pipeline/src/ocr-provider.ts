import { GoogleGenerativeAI } from "@google/generative-ai";
import { drive_v3 } from "@googleapis/drive";
import { execFile } from "child_process";
import { mkdtemp, writeFile, unlink, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { accessSync, constants } from "node:fs";
import type { PipelineConfig, OcrEngineType, OcrPageResult, OcrEngineResult } from "./types";

const SURYA_TIMEOUT = Math.max(60_000, Number(process.env.OCR_TIMEOUT ?? 1_500_000) || 1_500_000);

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

let driveClient: drive_v3.Drive | null = null;
let lastGoogleEmail = "";
let lastGooglePrivateKey = "";

async function getDriveClient(config: PipelineConfig): Promise<drive_v3.Drive> {
  const changed =
    !driveClient ||
    lastGoogleEmail !== config.google.serviceAccountEmail ||
    lastGooglePrivateKey !== config.google.privateKey;

  if (changed) {
    const { JWT } = await import("google-auth-library");
    const auth = new JWT({
      email: config.google.serviceAccountEmail,
      key: config.google.privateKey,
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    });
    // @ts-expect-error - Type mismatch between google-auth-library and googleapis
    driveClient = (await import("@googleapis/drive")).drive({ version: "v3", auth });
    lastGoogleEmail = config.google.serviceAccountEmail;
    lastGooglePrivateKey = config.google.privateKey;
  }
  return driveClient!;
}

export function estimateConfidence(text: string): number {
  const arabic = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
  const total = text.replace(/\s/g, "").length;
  if (total === 0) return 0;
  const ratio = arabic / total;
  if (ratio > 0.7) return 0.9;
  if (ratio > 0.4) return 0.7;
  return 0.5;
}

function toOcrPageResult(pages: { number: number; text: string }[]): OcrPageResult[] {
  return pages.map((p) => ({
    number: p.number,
    text: p.text,
    confidence: estimateConfidence(p.text),
  }));
}

export class GoogleDriveOcrProvider implements OcrProvider {
  readonly name = "Google Drive OCR";
  readonly type = "google" as OcrEngineType;

  isAvailable(config: PipelineConfig): boolean {
    return !!(config.google.serviceAccountEmail && config.google.privateKey);
  }

  async extractText(
    config: PipelineConfig,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<OcrEngineResult> {
    const drv = await getDriveClient(config);
    const uploaded = await drv.files.create({
      requestBody: {
        name: `ocr_${Date.now()}_${fileName}`,
        mimeType,
      },
      media: {
        mimeType,
        body: fileBuffer,
      },
      fields: "id",
    });

    const fileId = uploaded.data.id ?? null;
    if (!fileId) throw new Error("OCR_UPLOAD_FAILED");

    try {
      let response;
      let lastErr: unknown = null;
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          response = await drv.files.export(
            { fileId, mimeType: "text/plain" },
            { responseType: "text" },
          );
          break;
        } catch (err: unknown) {
          lastErr = err;
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(
            `[ocr-provider:google] Export attempt ${attempt}/5 failed for file ${fileId}:`,
            msg,
          );
          if (attempt < 5) {
            await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
          }
        }
      }

      if (!response) {
        const errMsg =
          lastErr instanceof Error ? lastErr.message : String(lastErr ?? "Unknown error");
        throw new Error(`OCR_EXPORT_FAILED: ${errMsg}`);
      }

      const fullText =
        typeof response.data === "string" ? response.data : JSON.stringify(response.data);

      if (!fullText || fullText.trim().length === 0) {
        throw new Error("OCR_NO_TEXT");
      }

      const rawPages = fullText
        .split("\f")
        .filter(Boolean)
        .map((text: string, i: number) => ({
          number: i + 1,
          text: text.trim(),
        }));

      const pages = toOcrPageResult(rawPages);
      const confidence = estimateConfidence(fullText);

      return { text: fullText, pages, confidence, engine: "google" };
    } finally {
      try {
        await drv.files.delete({ fileId });
      } catch {
        // Non-critical
      }
    }
  }

  async extractPages(
    config: PipelineConfig,
    pageGetters: (() => Promise<Buffer>)[],
    fileName: string,
  ): Promise<OcrEngineResult> {
    const drv = await getDriveClient(config);
    const allPages: { number: number; text: string }[] = [];
    const errors: { page: number; error: string }[] = [];

    for (let i = 0; i < pageGetters.length; i++) {
      let fileId: string | null = null;
      const pageNum = i + 1;

      try {
        const uploaded = await drv.files.create({
          requestBody: {
            name: `ocr_${Date.now()}_${fileName}_p${pageNum}`,
            mimeType: "image/png",
          },
          media: {
            mimeType: "image/png",
            body: pageGetters[i]!,
          },
          fields: "id",
        });

        fileId = uploaded.data.id ?? null;
        if (!fileId) {
          errors.push({ page: pageNum, error: "UPLOAD_FAILED" });
          allPages.push({ number: pageNum, text: "" });
          continue;
        }

        await new Promise((r) => setTimeout(r, 1000));

        const response = await drv.files.export(
          { fileId, mimeType: "text/plain" },
          { responseType: "text" },
        );

        const text =
          typeof response.data === "string" ? response.data : JSON.stringify(response.data);

        allPages.push({ number: pageNum, text: text?.trim() ?? "" });
      } catch (err: unknown) {
        errors.push({ page: pageNum, error: err instanceof Error ? err.message : "UNKNOWN" });
        allPages.push({ number: pageNum, text: "" });
      } finally {
        if (fileId) {
          try {
            await drv.files.delete({ fileId });
          } catch {
            // Non-critical
          }
        }
      }
    }

    const fullText = allPages.map((p) => p.text).join("\n\n");
    const pages = toOcrPageResult(allPages);
    const confidence = estimateConfidence(fullText);

    if (errors.length > 0) {
      console.warn(`[ocr-provider:google] Page-level failures for ${fileName}:`, errors);
    }

    return {
      text: fullText,
      pages,
      confidence,
      engine: "google",
      pageErrors: errors.length > 0 ? errors : undefined,
    };
  }
}

interface SuryaPageResult {
  text: string;
  confidence: number;
}

export class SuryaOcrProvider implements OcrProvider {
  readonly name = "Surya OCR";
  readonly type = "surya" as OcrEngineType;

  private cachedAvailable: boolean | null = null;

  private getPythonCommand(): string {
    const envPython = process.env.SURYA_PYTHON_PATH;
    if (envPython) return envPython;
    try {
      const home = process.env.HOME ?? process.env.USERPROFILE ?? ".";
      const venvPython = join(home, ".venv", "bin", "python3");
      accessSync(venvPython, constants.X_OK);
      return venvPython;
    } catch {
      return "python3";
    }
  }

  async isAvailable(_config: PipelineConfig): Promise<boolean> {
    if (this.cachedAvailable !== null) return this.cachedAvailable;
    try {
      await new Promise<void>((resolve, reject) => {
        const python = this.getPythonCommand();
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

    // Surya requires page images — split PDF first
    const { splitPdfPages } = await import("./ocr");
    let splitResult;
    try {
      splitResult = await splitPdfPages(fileBuffer, config.ocr.dpi);
    } catch (err) {
      throw new Error(`SURYA_SPLIT_FAILED: ${err instanceof Error ? err.message : String(err)}`);
    }

    const { readFile, rm } = await import("fs/promises");
    try {
      const pageGetters = splitResult.pagePaths.map((p) => () => readFile(p));
      return await this.extractPages(config, pageGetters, fileName);
    } finally {
      await rm(splitResult.tempDir, { recursive: true, force: true }).catch(() => {});
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
        console.warn(`[ocr-provider:surya] Page-level failures for ${fileName}:`, pageErrors);
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
    const pathsJson = JSON.stringify(imagePaths);
    const script = `
import json, sys, gc
from PIL import Image as PILImage
from surya.detection import DetectionPredictor
from surya.recognition import FoundationPredictor, RecognitionPredictor

det_predictor = DetectionPredictor()
foundation = FoundationPredictor()
rec_predictor = RecognitionPredictor(foundation)

paths = ${pathsJson}
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

      const python = this.getPythonCommand();
      const proc = execFile(
        python,
        ["-c", script],
        {
          timeout: SURYA_TIMEOUT - 5_000,
          maxBuffer: 50 * 1024 * 1024,
          env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUNBUFFERED: "1" },
        },
        (err, stdout, stderr) => {
          clearTimeout(timeout);
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

export function createOcrProvider(type: OcrEngineType): OcrProvider {
  switch (type) {
    case "google":
      return new GoogleDriveOcrProvider();
    case "surya":
      return new SuryaOcrProvider();
    case "tesseract":
      return new TesseractOcrProvider();
    case "gemini":
      return new GeminiOcrProvider();
  }
}

export class GeminiOcrProvider implements OcrProvider {
  readonly name = "Gemini 1.5 Flash OCR";
  readonly type = "gemini" as OcrEngineType;

  isAvailable(config: PipelineConfig): boolean {
    return !!config.gemini?.apiKey;
  }

  async extractText(
    config: PipelineConfig,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<OcrEngineResult> {
    if (!config.gemini?.apiKey) {
      throw new Error("Gemini API Key is missing");
    }

    const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are an expert Arabic OCR and document layout analysis system.
Extract all text exactly as it appears in this document.
Maintain the exact structure and layout of the original text.
Preserve all tables using Markdown format perfectly.
Return ONLY the markdown text, without any conversational prefixes.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: fileBuffer.toString("base64"),
          mimeType,
        },
      },
    ]);

    const text = result.response.text();
    return {
      text: text,
      pages: [{ number: 1, text, confidence: 1.0 }],
      confidence: 1.0,
      engine: "gemini",
    };
  }

  async extractPages(
    config: PipelineConfig,
    pageGetters: (() => Promise<Buffer>)[],
    _fileName: string,
  ): Promise<OcrEngineResult> {
    if (!config.gemini?.apiKey) {
      throw new Error("Gemini API Key is missing");
    }

    const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const BATCH_SIZE = 10;
    const batchPrompt = `You are an expert Arabic OCR and document layout analysis system.
I am providing you with multiple pages from a document.
Extract all text exactly as it appears in this document.
Maintain the exact structure and layout of the original text.
Preserve all tables using Markdown format perfectly.
IMPORTANT: If the page contains footnotes or marginalia (الهوامش والحواشي السفلية), you MUST extract them accurately, preserve their reference numbers, and place them at the bottom of the extracted page text separated by a horizontal rule "---".
Return ONLY the markdown text, without any conversational prefixes.
IMPORTANT INSTRUCTION: You MUST separate the text of each page with exactly this separator on a new line: "===PAGE_BREAK==="`;
    const pages: OcrPageResult[] = [];
    let fullText = "";

    for (let i = 0; i < pageGetters.length; i += BATCH_SIZE) {
      const batchGetters = pageGetters.slice(i, i + BATCH_SIZE);
      try {
        // eslint-disable-next-line no-console
        console.log(
          `[gemini] Processing batch pages ${i + 1} to ${i + batchGetters.length} of ${pageGetters.length}`,
        );

        const parts: Array<string | { inlineData: { data: string; mimeType: string } }> = [
          batchPrompt,
        ];
        const batchImages = await Promise.all(batchGetters.map((get) => get()));
        for (const imgBuf of batchImages) {
          parts.push({
            inlineData: {
              data: imgBuf!.toString("base64"),
              mimeType: "image/png",
            },
          });
        }

        const result = await model.generateContent(parts);
        const text = result.response.text();

        // Split text by the separator.
        const pageTexts = text.split("===PAGE_BREAK===").map((t) => t.trim());

        for (let j = 0; j < batchGetters.length; j++) {
          const pageNum = i + j + 1;
          const pageText = pageTexts[j] || "";
          pages.push({ number: pageNum, text: pageText, confidence: 1.0 });
          fullText += pageText + "\n\n";
        }

        // Sleep for 4 seconds to avoid hitting the 15 RPM limit on fast batches
        if (i + BATCH_SIZE < pageGetters.length) {
          await new Promise((resolve) => setTimeout(resolve, 4000));
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        // eslint-disable-next-line no-console
        console.warn(
          `[gemini] Failed to process batch ${i + 1}-${i + batchGetters.length}: ${msg}`,
        );
        // Add empty pages for the failed batch
        for (let j = 0; j < batchGetters.length; j++) {
          pages.push({ number: i + j + 1, text: "", confidence: 0.0 });
        }
      }
    }

    const confidence =
      pages.length > 0 ? pages.reduce((sum, p) => sum + p.confidence, 0) / pages.length : 0;

    return {
      text: fullText.trim(),
      pages,
      confidence,
      engine: "gemini",
    };
  }
}

export class TesseractOcrProvider implements OcrProvider {
  readonly name = "Tesseract OCR";
  readonly type = "tesseract" as OcrEngineType;
  private cachedAvailable: boolean | null = null;

  private getPythonCommand(): string {
    const envPython = process.env.SURYA_PYTHON_PATH;
    if (envPython) return envPython;
    try {
      const home = process.env.HOME ?? process.env.USERPROFILE ?? ".";
      const venvPython = join(home, ".venv", "bin", "python3");
      accessSync(venvPython, constants.X_OK);
      return venvPython;
    } catch {
      return "python3";
    }
  }

  async isAvailable(_config: PipelineConfig): Promise<boolean> {
    if (this.cachedAvailable !== null) return this.cachedAvailable;
    try {
      await new Promise<void>((resolve, reject) => {
        const python = this.getPythonCommand();
        const proc = execFile(
          python,
          ["-c", "import pytesseract; print('available')"],
          { timeout: 10_000, env: { ...process.env, PYTHONIOENCODING: "utf-8" } },
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
    const { splitPdfPages } = await import("./ocr");
    let splitResult;
    try {
      splitResult = await splitPdfPages(fileBuffer, config.ocr.dpi);
    } catch (err) {
      throw new Error(
        `TESSERACT_SPLIT_FAILED: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    const { readFile, rm } = await import("fs/promises");
    try {
      const pageGetters = splitResult.pagePaths.map((p) => () => readFile(p));
      return await this.extractPages(config, pageGetters, fileName);
    } finally {
      await rm(splitResult.tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  async extractPages(
    config: PipelineConfig,
    pageGetters: (() => Promise<Buffer>)[],
    _fileName: string,
  ): Promise<OcrEngineResult> {
    const tempDir = await mkdtemp(join(tmpdir(), "tesseract-ocr-"));
    const imagePaths: string[] = [];

    try {
      for (let i = 0; i < pageGetters.length; i++) {
        const imagePath = join(tempDir, `page_${i + 1}.png`);
        const pageBuf = await pageGetters[i]!();
        await writeFile(imagePath, pageBuf);
        imagePaths.push(imagePath);
      }

      const lang = config.ocr.language === "ar" ? "ara" : "eng";

      const script = `
import json, sys
import pytesseract
from PIL import Image
import cv2
import numpy as np

paths = [] # To be replaced
results = []
for i, path in enumerate(paths):
    try:
        # Load via OpenCV for advanced preprocessing
        img_cv = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
        
        # 1. Binarization using Otsu's thresholding (best for documents, preserves diacritics)
        _, thresh = cv2.threshold(img_cv, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # 2. Denoise the binary image (removes dots/specs from old paper)
        # disabled fastNlMeansDenoising as it destroys Arabic Tashkeel (diacritics)
        
        # Convert back to PIL for pytesseract
        img = Image.fromarray(thresh)
        
        text = pytesseract.image_to_string(img, lang="${lang}")
        conf_data = pytesseract.image_to_data(img, lang="${lang}", output_type=pytesseract.Output.DICT)
        confs = [float(c) for c in conf_data["conf"] if float(c) > 0]
        avg_conf = sum(confs) / len(confs) if confs else 0.0
        results.append({"text": text.strip(), "confidence": round(avg_conf / 100, 3)})
        print(f"[tesseract] Page {i+1}/{len(paths)} done (confidence: {avg_conf:.1f}%)", file=sys.stderr, flush=True)
    except Exception as e:
        results.append({"text": "", "confidence": 0})
        print(f"[tesseract] Page {i+1} failed: {e}", file=sys.stderr, flush=True)

print(json.dumps(results))
`;

      const allResults: { text: string; confidence: number }[] = [];
      const BATCH_SIZE = 10;

      for (let i = 0; i < imagePaths.length; i += BATCH_SIZE) {
        const batchPaths = imagePaths.slice(i, i + BATCH_SIZE);
        const batchScript = script.replace(
          "paths = [] # To be replaced",
          `paths = ${JSON.stringify(batchPaths)}`,
        );

        const batchResults = await new Promise<{ text: string; confidence: number }[]>(
          (resolve, reject) => {
            const python = this.getPythonCommand();
            const proc = execFile(
              python,
              ["-c", batchScript],
              {
                timeout: 300_000, // 5 mins per batch of 10
                maxBuffer: 50 * 1024 * 1024,
                env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUNBUFFERED: "1" },
              },
              (err, stdout, stderr) => {
                if (err) {
                  reject(
                    new Error(
                      `TESSERACT_FAILED: ${err.message}\nSTDERR: ${stderr?.slice(-2000) ?? ""}`,
                    ),
                  );
                  return;
                }
                try {
                  resolve(JSON.parse(stdout.trim()));
                } catch {
                  reject(new Error(`TESSERACT_PARSE_FAILED: stdout length ${stdout.length}`));
                }
              },
            );
            proc.on("error", reject);
          },
        );
        allResults.push(...batchResults);
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
        pages.length > 0 ? pages.reduce((s, p) => s + p.confidence, 0) / pages.length : 0;

      return { text, pages, confidence, engine: "tesseract" as OcrEngineType };
    } finally {
      for (const p of imagePaths) {
        await unlink(p).catch(() => {});
      }
      await rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

export class OcrManager {
  private providers: OcrProvider[];

  constructor(config: PipelineConfig) {
    const engineTypes =
      config.ocr.providers.length > 0 ? config.ocr.providers : [config.ocr.provider];

    this.providers = engineTypes.map((type: OcrEngineType) => createOcrProvider(type));
  }

  getAvailableProviders(): OcrProvider[] {
    return this.providers;
  }

  async extractText(
    config: PipelineConfig,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<OcrEngineResult> {
    const errors: { provider: string; error: string }[] = [];

    for (const provider of this.providers) {
      const available = await provider.isAvailable(config);
      if (!available) {
        errors.push({ provider: provider.name, error: "NOT_AVAILABLE" });
        continue;
      }

      try {
        const result = await provider.extractText(config, fileBuffer, fileName, mimeType);
        if (errors.length > 0) {
          console.warn(
            `[ocr-manager] ${provider.name} succeeded after ${errors.length} failure(s)`,
          );
        }
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[ocr-manager] ${provider.name} failed:`, msg);
        errors.push({ provider: provider.name, error: msg });
      }
    }

    throw new Error(
      `ALL_OCR_PROVIDERS_FAILED: ${errors.map((e) => `${e.provider}:${e.error}`).join("; ")}`,
    );
  }

  async extractPages(
    config: PipelineConfig,
    pageGetters: (() => Promise<Buffer>)[],
    fileName: string,
  ): Promise<OcrEngineResult> {
    const errors: { provider: string; error: string }[] = [];

    for (const provider of this.providers) {
      const available = await provider.isAvailable(config);
      if (!available) {
        errors.push({ provider: provider.name, error: "NOT_AVAILABLE" });
        continue;
      }

      try {
        const result = await provider.extractPages(config, pageGetters, fileName);
        if (errors.length > 0) {
          console.warn(
            `[ocr-manager] ${provider.name} succeeded after ${errors.length} failure(s)`,
          );
        }
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[ocr-manager] ${provider.name} failed:`, msg);
        errors.push({ provider: provider.name, error: msg });
      }
    }

    throw new Error(
      `ALL_OCR_PROVIDERS_FAILED: ${errors.map((e) => `${e.provider}:${e.error}`).join("; ")}`,
    );
  }
}
