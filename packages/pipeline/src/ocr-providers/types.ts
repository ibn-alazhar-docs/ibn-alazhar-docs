import type { PipelineConfig, OcrEngineType, OcrPageResult, OcrEngineResult } from "../types";
import { accessSync, constants } from "node:fs";
import { join } from "node:path";

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

export function estimateConfidence(text: string): number {
  const arabic = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
  const total = text.replace(/\s/g, "").length;
  if (total === 0) return 0;
  const ratio = arabic / total;
  if (ratio > 0.7) return 0.9;
  if (ratio > 0.4) return 0.7;
  return 0.5;
}

export function toOcrPageResult(pages: { number: number; text: string }[]): OcrPageResult[] {
  return pages.map((p) => ({
    number: p.number,
    text: p.text,
    confidence: estimateConfidence(p.text),
  }));
}

export function getPythonCommand(): string {
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
