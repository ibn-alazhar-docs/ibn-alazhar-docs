import { describe, it, expect } from "vitest";
import { decideRoute } from "../../packages/pipeline/src/document-router";
import { resolveOcrChainOrder, buildOcrChain } from "../../packages/pipeline/src/ocr-provider";
import {
  shouldRetryChunkOnQaFailure,
  runQaOnResult,
  runOcrChain,
} from "../../packages/pipeline/src/ocr-chain";
import {
  GEMINI_DEFAULT_CHUNK_SIZE,
  GEMINI_RETRY_CHUNK_SIZE,
  retryChunkSizeOnQaFailure,
  isChunkQaFailed,
} from "../../packages/pipeline/src/ocr-providers/gemini";
import { evaluateQaGates } from "../../packages/pipeline/src/qa-gates";

const pdfTextCls = {
  type: "pdf-text" as const,
  hasEmbeddedText: true,
  pageCount: 2,
  confidence: 0.95,
};
const pdfScanCls = {
  type: "pdf-scan" as const,
  hasEmbeddedText: false,
  pageCount: 5,
  confidence: 0.85,
};

function mockConfig(overrides: Record<string, unknown> = {}): any {
  return {
    ocr: {
      dpi: 300,
      language: "ar",
      maxRetries: 3,
      provider: "surya",
      providers: ["surya", "tesseract"],
      minConfidence: 0,
      adaptiveProviderSelection: false,
      cloudOcrDailyBudget: -1,
      preprocess: {
        mode: "auto",
        minDpi: 300,
        targetDpi: 400,
        upscale: 1,
        deskew: true,
        clahe: true,
        denoise: true,
        shadow: true,
        border: false,
        perspective: false,
        binarize: false,
        sauvola: false,
        sharpen: false,
      },
      ...overrides,
    },
    gemini: {
      apiKey: "k",
      model: "gemini-2.0-flash",
      modelFallbacks: [],
      nativeChunkSize: 10,
    },
  };
}

describe("OCR chain — document-router decideRoute (direct pdf-parse)", () => {
  it("pdf-scan → ocr (no native text)", () => {
    const d = decideRoute(pdfScanCls);
    expect(d.route).toBe("ocr");
  });

  it("healthy native text → native (no OCR)", () => {
    const page = "كلمة ".repeat(60); // ~60 words/page, >50 chars
    const text = `${page}\n===PAGE_BREAK===\n${page}`;
    const d = decideRoute(pdfTextCls, { text, pageCount: 2 });
    expect(d.route).toBe("native");
    expect(d.pageCoverage).toBeCloseTo(1);
  });

  it("low coverage (<60% pages) → ocr", () => {
    const text = "نص قصير"; // one short chunk for 2 pages → coverage 0%
    const d = decideRoute(pdfTextCls, { text, pageCount: 2 });
    expect(d.route).toBe("ocr");
  });
});

describe("OCR chain — order (Tesseract → Gemini keypool)", () => {
  it("local before cloud, tesseract before gemini", () => {
    const order = resolveOcrChainOrder(mockConfig({ providers: ["gemini", "tesseract"] }));
    expect(order).toEqual(["tesseract", "gemini"]);
  });

  it("keeps surya+tesseract local order", () => {
    const order = resolveOcrChainOrder(mockConfig({ providers: ["surya", "tesseract"] }));
    expect(order[0]).toBe("tesseract");
    expect(order).toContain("surya");
  });

  it("buildOcrChain starts with direct-pdf-parse", () => {
    const chain = buildOcrChain(mockConfig({ providers: ["tesseract", "gemini"] }));
    expect(chain[0]).toBe("direct-pdf-parse");
    expect(chain.join(" ")).toContain("gemini-keypool");
  });
});

describe("OCR chain — QA retry chunk 6", () => {
  it("chunk sizes: 10 standard, 6 on QA failure", () => {
    expect(GEMINI_DEFAULT_CHUNK_SIZE).toBe(10);
    expect(GEMINI_RETRY_CHUNK_SIZE).toBe(6);
    expect(retryChunkSizeOnQaFailure(10)).toBe(6);
    expect(retryChunkSizeOnQaFailure(6)).toBe(6);
  });

  it("isChunkQaFailed on empty and short text", () => {
    expect(isChunkQaFailed("", 5)).toBe(true);
    expect(isChunkQaFailed("قصير", 10)).toBe(true);
    expect(isChunkQaFailed("كلمة ".repeat(600), 2)).toBe(false);
  });

  it("shouldRetryChunkOnQaFailure: only OCR gemini, once, not native/local", () => {
    expect(
      shouldRetryChunkOnQaFailure({ pass: false } as any, { route: "ocr", engine: "gemini" }),
    ).toBe(true);
    expect(
      shouldRetryChunkOnQaFailure({ pass: false } as any, { route: "native", engine: "gemini" }),
    ).toBe(false);
    expect(
      shouldRetryChunkOnQaFailure({ pass: false } as any, { route: "ocr", engine: "tesseract" }),
    ).toBe(false);
    expect(
      shouldRetryChunkOnQaFailure({ pass: true } as any, { route: "ocr", engine: "gemini" }),
    ).toBe(false);
  });

  it("runQaOnResult + evaluateQaGates sanity", () => {
    const ok = evaluateQaGates({
      md: "عنوان\n" + "كلمة ".repeat(400),
      raw: "كلمة ".repeat(400),
      inputPages: 1,
      outputPages: 1,
    });
    expect(ok.exitCode).toBeDefined();
    const r = runQaOnResult(
      {
        text: "كلمة ".repeat(400),
        pages: [{ number: 1, text: "كلمة ".repeat(400), confidence: 1 }],
        confidence: 1,
        engine: "gemini",
      },
      1,
    );
    expect(r.inputPages).toBe(1);
  });

  it("runOcrChain with native text short-circuits without providers", async () => {
    const out = await runOcrChain(mockConfig(), {
      fileBuffer: Buffer.alloc(0),
      fileName: "a.pdf",
      mimeType: "application/pdf",
      nativeText: "نص أصلي ".repeat(100),
      skipOcr: true,
    });
    expect(out.route).toBe("native");
    expect(out.retried).toBe(false);
    expect(out.chain[0]).toBe("direct-pdf-parse");
  });
});
