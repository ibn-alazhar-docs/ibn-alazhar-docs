import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:child_process", () => {
  const execFile = vi.fn();
  return { execFile };
});

import { execFile } from "node:child_process";
import { SuryaOcrProvider } from "../../packages/pipeline/src/ocr-providers/surya";
import { TesseractOcrProvider } from "../../packages/pipeline/src/ocr-providers/tesseract";

type ExecCb = (err: Error | null, stdout: string, stderr: string) => void;

function mockExec(stdout: string, err: Error | null = null, stderr = ""): void {
  (
    execFile as unknown as {
      mockImplementation: (
        fn: (cmd: string, args: string[], opts: unknown, cb: ExecCb) => { on: () => void },
      ) => void;
    }
  ).mockImplementation((_cmd, _args, _opts, cb: ExecCb) => {
    cb(err, stdout, stderr);
    return { on: () => {} };
  });
}

const baseConfig = {
  ocr: {
    dpi: 300,
    language: "ar",
    maxRetries: 3,
    provider: "surya" as const,
    providers: [] as string[],
  },
} as any;

const buffer = Buffer.from("fake-png-bytes");

describe("SuryaOcrProvider.extractPages — page alignment & errors", () => {
  beforeEach(() => vi.clearAllMocks());

  it("aligns OCR results to input page order (hardened result assembly)", async () => {
    // two pages; note runSuryaBatch returns a list-of-lists (one per page)
    mockExec(
      JSON.stringify([
        [{ text: "صفحة واحدة", confidence: 0.92 }],
        [{ text: "صفحة اثنان", confidence: 0.88 }],
      ]),
    );

    const provider = new SuryaOcrProvider();
    const getters = [() => Promise.resolve(buffer), () => Promise.resolve(buffer)];
    const result = await provider.extractPages(baseConfig, getters, "doc.pdf");

    expect(result.engine).toBe("surya");
    expect(result.pages).toHaveLength(2);
    expect(result.pages[0]).toMatchObject({ number: 1, text: "صفحة واحدة" });
    expect(result.pages[1]).toMatchObject({ number: 2, text: "صفحة اثنان" });
  });

  it("flags pages that produced no text as pageErrors", async () => {
    mockExec(JSON.stringify([[{ text: "نص موجود", confidence: 0.9 }], []]));

    const provider = new SuryaOcrProvider();
    const result = await provider.extractPages(
      baseConfig,
      [() => Promise.resolve(buffer), () => Promise.resolve(buffer)],
      "doc.pdf",
    );

    expect(result.pages[1]!.text).toBe("");
    expect(result.pageErrors).toEqual([{ page: 2, error: "NO_TEXT" }]);
  });

  it("throws SURYA_EXECUTION_FAILED on malformed JSON", async () => {
    mockExec("not json");
    const provider = new SuryaOcrProvider();
    await expect(
      provider.extractPages(baseConfig, [() => Promise.resolve(buffer)], "doc.pdf"),
    ).rejects.toThrow(/SURYA_PARSE_FAILED|SURYA_EXECUTION_FAILED/);
  });
});

describe("TesseractOcrProvider.extractPages — real path (mocked exec)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("parses OCR JSON and joins non-empty pages", async () => {
    // NODE_ENV is "test" in vitest which would hit the mock path; force real path.
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MOCK_OCR", "");
    mockExec(
      JSON.stringify([
        { text: "السطر الأول", confidence: 0.91 },
        { text: "السطر الثاني", confidence: 0.88 },
      ]),
    );

    const provider = new TesseractOcrProvider();
    const result = await provider.extractPages(
      baseConfig,
      [() => Promise.resolve(buffer), () => Promise.resolve(buffer)],
      "doc.pdf",
    );

    expect(result.engine).toBe("tesseract");
    expect(result.pages).toHaveLength(2);
    expect(result.confidence).toBeCloseTo((0.91 + 0.88) / 2, 2);
    vi.unstubAllEnvs();
  });

  it("returns mock Arabic output when MOCK_OCR=true", async () => {
    vi.stubEnv("MOCK_OCR", "true");
    const provider = new TesseractOcrProvider();
    const result = await provider.extractPages(
      baseConfig,
      [() => Promise.resolve(buffer)],
      "doc.pdf",
    );
    expect(result.engine).toBe("tesseract");
    expect(result.pages[0]!.confidence).toBe(0.99);
    vi.unstubAllEnvs();
  });
});
