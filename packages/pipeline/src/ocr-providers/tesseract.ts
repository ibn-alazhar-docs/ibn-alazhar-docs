import { execFile } from "child_process";
import { mkdtemp, writeFile, unlink, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import type { PipelineConfig, OcrEngineType, OcrPageResult, OcrEngineResult } from "../types";
import type { OcrProvider } from "./types";
import { getPythonCommand } from "./types";

export class TesseractOcrProvider implements OcrProvider {
  readonly name = "Tesseract OCR";
  readonly type = "tesseract" as OcrEngineType;
  private cachedAvailable: boolean | null = null;

  async isAvailable(_config: PipelineConfig): Promise<boolean> {
    if (this.cachedAvailable !== null) return this.cachedAvailable;
    try {
      await new Promise<void>((resolve, reject) => {
        const python = getPythonCommand();
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
    const { splitPdfPages } = await import("../ocr");
    let splitResult;
    try {
      splitResult = await splitPdfPages(fileBuffer, config.ocr.dpi);
    } catch (err) {
      throw new Error(
        `TESSERACT_SPLIT_FAILED: ${err instanceof Error ? err.message : String(err)}`,
      );
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
      const allowedLangs = new Set(["ara", "eng", "fra", "deu", "spa"]);
      if (!allowedLangs.has(lang)) {
        throw new Error(`TESSERACT_INVALID_LANG: Unsupported language "${lang}"`);
      }

      const script = `
import json, sys
import pytesseract
from PIL import Image
import cv2
import numpy as np

lang_arg = sys.argv[1]
paths = [] # To be replaced
results = []
for i, path in enumerate(paths):
    try:
        img_cv = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
        _, thresh = cv2.threshold(img_cv, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        img = Image.fromarray(thresh)
        text = pytesseract.image_to_string(img, lang=lang_arg)
        conf_data = pytesseract.image_to_data(img, lang=lang_arg, output_type=pytesseract.Output.DICT)
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
            const python = getPythonCommand();
            const proc = execFile(
              python,
              ["-c", batchScript, lang],
              {
                timeout: 300_000,
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
