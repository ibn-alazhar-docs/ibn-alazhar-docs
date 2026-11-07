import {
  classifyDocument,
  convertHtmlTablesToMarkdown,
  decideRoute,
  diacritizeArabic,
  extractNativePdfText,
  generateDocx,
  generateJson,
  generateMarkdown,
  generateTxt,
  loadConfig,
  runOcrChain,
  transcribeAudio,
  type CleanedText,
  type DocumentClassification,
  type OcrRouteDecision,
} from "@ibn-al-azhar-docs/pipeline";
import { logger } from "@/shared/logger";
import type { GuestCleanedText, GuestJobResult } from "@/domain/guest-tools";
import type { GuestInputMime } from "./guest-input-validation";

/**
 * Guest processing — the pipeline, used directly and statelessly.
 *
 * No Document row, no ConversionJob, no queue enqueue, no user id: the chain is
 * the documented one (docs/IMPLEMENTATION_OCR_CHAIN.md) — direct native text
 * first (free), OCR chain second (local providers before cloud) — followed by
 * the same Arabic cleaning/markdown the authenticated path uses. When nothing in
 * the chain can run, the job FAILS with a code; the guest never receives a
 * simulated result (docs/MERGE_PLAN.md — graceful degradation).
 */

export interface GuestProcessInput {
  bytes: Uint8Array;
  mimeType: GuestInputMime;
  fileName: string;
  pageCount: number;
  classification: DocumentClassification | null;
  toolId?: string;
  lang?: "ar" | "en";
  onProgress?: (progress: number) => void;
}

export class GuestProcessingError extends Error {
  readonly code: string;
  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "GuestProcessingError";
    this.code = code;
  }
}

/**
 * Thrown by the caller's `onProgress` when the job record has already left the
 * active state (deadline sweep or user DELETE). It is a cancellation signal, not
 * a failure, so it must never be relabeled as an OCR outage on its way out.
 */
export class GuestAbandonedError extends Error {
  readonly jobId: string;
  constructor(jobId: string) {
    super(`Guest job ${jobId} was cancelled before it finished`);
    this.name = "GuestAbandonedError";
    this.jobId = jobId;
  }
}

/**
 * Native text layer first (free), then the OCR chain — same order as the split
 * stage (workers/ocr-worker/src/stages/split.ts): direct extraction is preferred,
 * and only when `decideRoute` rejects the text layer does the job go through
 * `runOcrChain` (local providers before cloud, QA gate, chunk-6 retry).
 */
async function extractText(
  input: GuestProcessInput,
): Promise<{ text: string; engine: string; route: "native" | "ocr"; confidence: number }> {
  const config = loadConfig();
  const fileBuffer = Buffer.from(input.bytes);

  let decision: OcrRouteDecision | null = null;
  if (input.mimeType === "application/pdf") {
    input.onProgress?.(15);
    const classification =
      input.classification ?? (await classifyDocument(fileBuffer, input.mimeType, input.fileName));
    const native =
      classification.type === "pdf-text" && classification.hasEmbeddedText
        ? await extractNativePdfText(fileBuffer).catch((err: unknown) => {
            logger.warn(err, "Guest native text extraction failed — falling back to OCR chain");
            return null;
          })
        : null;
    decision = decideRoute(
      classification,
      native ? { text: native.text, pageCount: native.pageCount } : undefined,
    );
    if (decision.route === "native" && decision.nativeText) {
      input.onProgress?.(70);
      return {
        text: decision.nativeText,
        engine: "native",
        route: "native",
        confidence: decision.classification.confidence,
      };
    }
  }

  input.onProgress?.(35);
  try {
    const chain = await runOcrChain(config, {
      fileBuffer,
      fileName: input.fileName,
      mimeType: input.mimeType,
      nativeText: decision?.nativeText,
      skipOcr: false,
    });
    input.onProgress?.(75);
    return {
      text: chain.result.text,
      engine: chain.result.engine,
      route: chain.route,
      confidence: chain.result.confidence,
    };
  } catch (err) {
    if (err instanceof GuestAbandonedError) throw err;
    // Every provider unavailable/failed => the tool is down for this job, not broken.
    logger.warn(err, "Guest OCR chain failed");
    throw new GuestProcessingError("OCR_UNAVAILABLE", "خدمة الاستخراج غير متاحة حاليًا", {
      cause: err,
    });
  }
}

/** Structural mirror of the pipeline CleanedText stored on the job record. */
function toGuestCleanedText(cleaned: CleanedText): GuestCleanedText {
  return {
    raw: cleaned.raw,
    cleaned: cleaned.cleaned,
    markdown: cleaned.markdown,
    metadata: { ...cleaned.metadata },
  };
}

function fromGuestCleanedText(guest: GuestCleanedText): CleanedText {
  return {
    raw: guest.raw,
    cleaned: guest.cleaned,
    markdown: guest.markdown,
    metadata: { ...guest.metadata },
  };
}

async function extractTranscriptionText(
  input: GuestProcessInput,
): Promise<{ text: string; engine: string; route: "native" | "ocr"; confidence: number }> {
  input.onProgress?.(35);
  const fileBuffer = Buffer.from(input.bytes);
  try {
    const text = await transcribeAudio(fileBuffer, input.mimeType, input.lang ?? "ar");
    input.onProgress?.(75);
    return { text, engine: "gemini-transcription", route: "ocr", confidence: 1 };
  } catch (err) {
    if (err instanceof GuestAbandonedError) throw err;
    if (err instanceof GuestProcessingError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("GEMINI_API_KEY_MISSING")) {
      throw new GuestProcessingError(
        "GEMINI_API_KEY_MISSING",
        "مفتاح Gemini غير متوفر — خدمة التفريغ الصوتي غير مفعّلة حاليًا",
        { cause: err },
      );
    }
    logger.warn(err, "Guest transcription failed");
    throw new GuestProcessingError(
      "TRANSCRIPTION_UNAVAILABLE",
      "خدمة التفريغ الصوتي غير متاحة حاليًا",
      {
        cause: err,
      },
    );
  }
}

export async function processGuestText(text: string): Promise<GuestJobResult> {
  const normalized = (text ?? "").trimEnd();
  if (!normalized) {
    throw new GuestProcessingError("MISSING_TEXT", "لم يُقدَّم أي نص للتشكيل");
  }
  try {
    // ملاحظة MOCK: في MOCK_OCR يتولى النتيجة النص كما هو (لا تشكيل) ويُوسم gemini — مقبول اختباريًا فقط.
    const diacritized = await diacritizeArabic(normalized);
    const cleaned = generateMarkdown(diacritized, {
      pageCount: 1,
      confidence: 1,
      includeMetadata: false,
    });
    return { cleanedText: toGuestCleanedText(cleaned), route: "native", engine: "gemini" };
  } catch (err) {
    if (err instanceof GuestAbandonedError) throw err;
    if (err instanceof GuestProcessingError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("GEMINI_API_KEY_MISSING")) {
      throw new GuestProcessingError(
        "GEMINI_API_KEY_MISSING",
        "مفتاح Gemini غير متوفر — خدمة التشكيل غير مفعّلة حاليًا",
        { cause: err },
      );
    }
    logger.warn(err, "Guest diacritize failed");
    throw new GuestProcessingError("DIACRITIZE_UNAVAILABLE", "خدمة التشكيل غير متاحة حاليًا", {
      cause: err,
    });
  }
}

export async function processGuestInput(input: GuestProcessInput): Promise<GuestJobResult> {
  // الأدوات النصية/الصوتية: رفض الصوت المُرسل لأداة OCR/PDF صراحةً (لا تمرير صامت للتفريغ)
  if (
    (input.toolId === "ocr" || input.toolId === "pdf-to-word") &&
    input.mimeType.startsWith("audio/")
  ) {
    throw new GuestProcessingError(
      "UNSUPPORTED_TYPE",
      "نوع الملف غير مدعوم لهذه الأداة — الصوت للتفريغ فقط",
    );
  }
  // فرع transcription: عبر toolId صراحةً، أو fallback عبر mime الصوت
  // (يغطي الحالة التي لم يُمرَّر فيها toolId بعد من guest-jobs.service).
  const isTranscription = input.toolId === "transcription" || input.mimeType.startsWith("audio/");
  const extracted = isTranscription
    ? await extractTranscriptionText(input)
    : await extractText(input);
  input.onProgress?.(88);

  // Same cleaning/markdown path as authenticated exports (generateTextFormat).
  const cleaned = generateMarkdown(extracted.text, {
    pageCount: input.pageCount,
    confidence: extracted.confidence,
    includeMetadata: false,
  });

  input.onProgress?.(95);
  logger.info(
    { engine: extracted.engine, route: extracted.route, pages: input.pageCount },
    "Guest job processed",
  );

  return {
    cleanedText: toGuestCleanedText(cleaned),
    route: extracted.route,
    engine: extracted.engine,
  };
}

/** TXT rendering — delegated to the pipeline, never hand-rolled here. */
export function renderGuestTxt(result: GuestJobResult): string {
  return generateTxt(fromGuestCleanedText(result.cleanedText));
}

/** JSON rendering — delegated to the pipeline. */
export function renderGuestJson(result: GuestJobResult, sourceFileName?: string): string {
  return generateJson(fromGuestCleanedText(result.cleanedText), sourceFileName ?? "guest-upload");
}

/**
 * DOCX for guests: the pipeline's existing export path (`output/pandoc` via the
 * same HTML-table preprocessing as `output/docx-generator.ts`'s DocxGenerator).
 * The IR-driven `generateDocxFromIR` needs a DocumentIR built by the Gemini IR
 * converter, which is not available to an account-less guest job — so the guest
 * goes through the pandoc generator directly, exactly like the authenticated
 * DOCX export in `core/services/export.use-cases.ts`. No hand-rolled DOCX.
 */
export async function renderGuestDocx(result: GuestJobResult): Promise<Uint8Array> {
  const cleaned = fromGuestCleanedText(result.cleanedText);
  const markdown = convertHtmlTablesToMarkdown(cleaned.markdown || cleaned.cleaned);
  try {
    const buffer = await generateDocx({ markdown, cleaned: markdown });
    return new Uint8Array(buffer);
  } catch (err) {
    throw new GuestProcessingError("DOCX_UNAVAILABLE", "تنزيل DOCX غير متاح حاليًا", {
      cause: err,
    });
  }
}

export function guestFailureFromError(err: unknown): { code: string; message: string } {
  if (err instanceof GuestProcessingError) {
    return { code: err.code, message: err.message };
  }
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("GEMINI_API_KEY_MISSING")) {
    return {
      code: "GEMINI_API_KEY_MISSING",
      message: "مفتاح Gemini غير متوفر — خدمة التفريغ الصوتي غير مفعّلة حاليًا",
    };
  }
  if (message.includes("ALL_OCR_PROVIDERS_FAILED") || message.includes("API Key is missing")) {
    return { code: "OCR_UNAVAILABLE", message: "خدمة الاستخراج غير متاحة حاليًا" };
  }
  return { code: "PROCESSING_FAILED", message: "تعذّرت معالجة الملف" };
}
