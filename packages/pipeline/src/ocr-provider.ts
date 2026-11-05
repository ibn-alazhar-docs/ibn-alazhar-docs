import type { PipelineConfig, OcrEngineType, OcrEngineResult } from "./types";
import { logger as baseLogger } from "@ibn-al-azhar-docs/shared";

const logger = baseLogger.child({ module: "ocr-provider" });
import { GoogleDriveOcrProvider } from "./ocr-providers/google";
import { SuryaOcrProvider } from "./ocr-providers/surya";
import { GeminiOcrProvider } from "./ocr-providers/gemini";
import { TesseractOcrProvider } from "./ocr-providers/tesseract";

export type { OcrProvider } from "./ocr-providers/types";
export { estimateConfidence, getPythonCommand } from "./ocr-providers/types";
export { GoogleDriveOcrProvider } from "./ocr-providers/google";
export { SuryaOcrProvider } from "./ocr-providers/surya";
export { GeminiOcrProvider } from "./ocr-providers/gemini";
export { TesseractOcrProvider } from "./ocr-providers/tesseract";

import {
  createProviderHealth,
  sortProvidersByHealth,
  recordProviderSuccess,
  recordProviderFailure,
} from "./provider-health";

export {
  createProviderHealth,
  getOrCreateRecord,
  recordProviderSuccess,
  recordProviderFailure,
  getProviderState,
  scoreProvider,
  sortProvidersByHealth,
  type ProviderHealth,
  type ProviderHealthRecord,
  type ProviderHealthOptions,
} from "./provider-health";

export function createOcrProvider(type: OcrEngineType) {
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

/**
 * ترتيب سلسلة OCR الكامل (docs/IMPLEMENTATION_OCR_CHAIN.md).
 * الخطوة الأولى دائمًا direct pdf-parse (document-router)، هنا نحسم ترتيب
 * المزوّدات فقط: محلي (tesseract/surya) أولًا ثم سحابي (gemini/google) —
 * مع تثبيت tesseract قبل gemini حين يجتمعان، حتى لو كتب المستخدم
 * OCR_PROVIDERS=gemini,tesseract. لا يحذف ولا يضيف مزوّدًا، يعيد الترتيب فقط.
 */
export const LOCAL_OCR_ENGINES: readonly OcrEngineType[] = ["tesseract", "surya"];
export const CLOUD_OCR_ENGINES: readonly OcrEngineType[] = ["gemini", "google"];

export function resolveOcrChainOrder(config: PipelineConfig): OcrEngineType[] {
  const raw = config.ocr.providers.length > 0 ? [...config.ocr.providers] : [config.ocr.provider];
  const local = LOCAL_OCR_ENGINES.filter((e) => raw.includes(e));
  const cloud = CLOUD_OCR_ENGINES.filter((e) => raw.includes(e));
  // صون ترتيب التدوير الأصلي داخل كل فئة، مع تثبيت tesseract قبل gemini عند الالتباس
  const orderedLocal = [
    ...new Set([...local, ...raw.filter((e) => LOCAL_OCR_ENGINES.includes(e))]),
  ];
  const orderedCloud = [
    ...new Set([...raw.filter((e) => CLOUD_OCR_ENGINES.includes(e)), ...cloud]),
  ];
  // tesseract أول المحليّين دومًا (السلسلة: Tesseract → Gemini)
  orderedLocal.sort((a, b) => {
    const rank = (e: OcrEngineType) => (e === "tesseract" ? 0 : e === "surya" ? 1 : 2);
    return rank(a) - rank(b);
  });
  // gemini أول السحابيّين؟ لا: google قبله إن وُجد بنفس ترتيبه الأصلي — نحافظ عليه.
  const result = [...orderedLocal, ...orderedCloud];
  // إن وُجد مزوّد غير معروف (مستقبليًا)، إلحاقه بالنهاية بدل إسقاطه.
  for (const e of raw) if (!result.includes(e)) result.push(e);
  return result;
}

/**
 * خطوات السلسلة ونصوصها للوثائق/السجلات: direct → tesseract → gemini(keypool).
 */
export function buildOcrChain(config: PipelineConfig): string[] {
  const order = resolveOcrChainOrder(config);
  const steps = ["direct-pdf-parse"];
  for (const e of order) {
    if (e === "gemini") {
      steps.push("gemini-keypool(chunk 10→6 بعد فشل QA)");
    } else {
      steps.push(e);
    }
  }
  return steps;
}

// DATA-FLOW / DATA-RESIDENCY CONTRACT:
//   - LOCAL engines (surya, tesseract): run on-prem; document bytes never leave our servers.
//   - CLOUD engines (gemini, google): upload pages to the vendor (Google uploads to Google
//     Drive with drive.file scope, then deletes). These are non-default and only run when
//     explicitly configured via OCR_PROVIDERS or OCR_CLOUD_ENABLED=true.
// Providers are attempted strictly in the configured order (see config.ts: local-first by
//   default). A cloud provider is therefore only reached AFTER every preceding local provider
//   is unavailable or fails — never as the default path.
export class OcrManager {
  private providers: InstanceType<
    | typeof GoogleDriveOcrProvider
    | typeof SuryaOcrProvider
    | typeof GeminiOcrProvider
    | typeof TesseractOcrProvider
  >[];
  private health: ReturnType<typeof createProviderHealth>;
  private adaptive: boolean;

  constructor(config: PipelineConfig) {
    // ترتيب السلسلة الموحّد: محلي (tesseract→surya) قبل سحابي (gemini→google).
    const engineTypes = resolveOcrChainOrder(config);

    this.adaptive = config.ocr.adaptiveProviderSelection !== false;
    this.health = createProviderHealth();

    if (this.adaptive) {
      this.providers = sortProvidersByHealth(this.health, engineTypes).map((type: OcrEngineType) =>
        createOcrProvider(type),
      );
    } else {
      this.providers = engineTypes.map((type: OcrEngineType) => createOcrProvider(type));
    }
  }

  getAvailableProviders() {
    return this.providers;
  }

  getHealth() {
    return this.health;
  }

  isAdaptive() {
    return this.adaptive;
  }

  private async tryExtract(
    config: PipelineConfig,
    mode: "text" | "pages",
    ...args: [Buffer, string, string] | [(() => Promise<Buffer>)[], string]
  ): Promise<OcrEngineResult> {
    const errors: { provider: string; error: string }[] = [];

    for (const provider of this.providers) {
      const available = await provider.isAvailable(config);
      if (!available) {
        errors.push({ provider: provider.name, error: "NOT_AVAILABLE" });
        continue;
      }

      const started = Date.now();
      try {
        const result =
          mode === "text"
            ? await provider.extractText(config, ...(args as [Buffer, string, string]))
            : await provider.extractPages(config, ...(args as [(() => Promise<Buffer>)[], string]));

        if (this.adaptive) {
          recordProviderSuccess(this.health, provider.type, Date.now() - started);
        }

        if (errors.length > 0) {
          logger.warn(`${provider.name} succeeded after ${errors.length} failure(s)`);
        }
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);

        if (this.adaptive) {
          recordProviderFailure(this.health, provider.type, msg, Date.now() - started);
        }

        logger.warn(`${provider.name} failed: ${msg}`);
        errors.push({ provider: provider.name, error: msg });

        // If adaptive, re-sort after failure (بنفس ترتيب السلسلة ونفس الاستثناءات)
        if (this.adaptive) {
          const engineTypes = resolveOcrChainOrder(config);
          this.providers = sortProvidersByHealth(this.health, engineTypes).map(
            (type: OcrEngineType) => createOcrProvider(type),
          );
        }
      }
    }

    throw new Error(
      `ALL_OCR_PROVIDERS_FAILED: ${errors.map((e) => `${e.provider}:${e.error}`).join("; ")}`,
    );
  }

  async extractText(
    config: PipelineConfig,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<OcrEngineResult> {
    return this.tryExtract(config, "text", fileBuffer, fileName, mimeType);
  }

  async extractPages(
    config: PipelineConfig,
    pageGetters: (() => Promise<Buffer>)[],
    fileName: string,
  ): Promise<OcrEngineResult> {
    return this.tryExtract(config, "pages", pageGetters, fileName);
  }
}
