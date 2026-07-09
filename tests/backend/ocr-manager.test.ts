import { describe, it, expect, vi } from "vitest";

const ocrCtl = vi.hoisted(() => ({
  surya: {
    available: true,
    text: { text: "s", pages: [], confidence: 0.9, engine: "surya" } as any,
    err: null as any,
  },
  tesseract: {
    available: true,
    text: { text: "t", pages: [], confidence: 0.9, engine: "tesseract" } as any,
    err: null as any,
  },
  google: {
    available: true,
    text: { text: "g", pages: [], confidence: 0.9, engine: "google" } as any,
    err: null as any,
  },
  gemini: {
    available: true,
    text: { text: "m", pages: [], confidence: 0.9, engine: "gemini" } as any,
    err: null as any,
  },
}));

function makeFake(name: string, type: string, slot: any) {
  return class {
    name = name;
    type = type;
    async isAvailable() {
      return slot.available;
    }
    async extractText() {
      if (slot.err) throw slot.err;
      return slot.text;
    }
    async extractPages() {
      if (slot.err) throw slot.err;
      return slot.text;
    }
  };
}

vi.mock("../../packages/pipeline/src/ocr-providers/surya", () => ({
  SuryaOcrProvider: makeFake("Surya OCR", "surya", ocrCtl.surya),
}));
vi.mock("../../packages/pipeline/src/ocr-providers/tesseract", () => ({
  TesseractOcrProvider: makeFake("Tesseract OCR", "tesseract", ocrCtl.tesseract),
}));
vi.mock("../../packages/pipeline/src/ocr-providers/google", () => ({
  GoogleDriveOcrProvider: makeFake("Google Drive OCR", "google", ocrCtl.google),
}));
vi.mock("../../packages/pipeline/src/ocr-providers/gemini", () => ({
  GeminiOcrProvider: makeFake("Gemini OCR", "gemini", ocrCtl.gemini),
}));

import { OcrManager, createOcrProvider } from "../../packages/pipeline/src/ocr-provider";

const gConfig = {
  google: { serviceAccountEmail: "a@b.com", privateKey: "key" },
  gemini: { apiKey: "abc", model: "gemini-2.5-flash" },
  ocr: {
    dpi: 300,
    language: "ar",
    maxRetries: 3,
    provider: "surya" as const,
    providers: [] as string[],
  },
} as any;

describe("OcrManager — provider availability & failover", () => {
  beforeEach(() => {
    ocrCtl.surya.available = true;
    ocrCtl.surya.err = null;
    ocrCtl.tesseract.available = true;
    ocrCtl.tesseract.err = null;
    ocrCtl.google.available = true;
    ocrCtl.google.err = null;
    ocrCtl.gemini.available = true;
    ocrCtl.gemini.err = null;
  });

  it("skips unavailable providers and uses the next available one", async () => {
    ocrCtl.surya.available = false;
    const mgr = new OcrManager({
      ...gConfig,
      ocr: { ...gConfig.ocr, providers: ["surya", "tesseract"] },
    });
    const res = await mgr.extractText(gConfig, Buffer.from("x"), "f", "application/pdf");
    expect(res.engine).toBe("tesseract");
  });

  it("falls back to the next provider when the first throws", async () => {
    ocrCtl.surya.err = new Error("boom");
    const mgr = new OcrManager({
      ...gConfig,
      ocr: { ...gConfig.ocr, providers: ["surya", "tesseract"] },
    });
    const res = await mgr.extractText(gConfig, Buffer.from("x"), "f", "application/pdf");
    expect(res.engine).toBe("tesseract");
  });

  it("throws ALL_OCR_PROVIDERS_FAILED when every provider fails", async () => {
    ocrCtl.surya.err = new Error("surya down");
    ocrCtl.tesseract.err = new Error("tesseract down");
    const mgr = new OcrManager({
      ...gConfig,
      ocr: { ...gConfig.ocr, providers: ["surya", "tesseract"] },
    });
    await expect(
      mgr.extractText(gConfig, Buffer.from("x"), "f", "application/pdf"),
    ).rejects.toThrow(/ALL_OCR_PROVIDERS_FAILED/);
  });

  it("createOcrProvider instantiates the requested engine", () => {
    expect(createOcrProvider("gemini").type).toBe("gemini");
    expect(createOcrProvider("google").type).toBe("google");
  });
});
