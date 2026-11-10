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
    // Mirrors the Python worker output: one { lines, needs_retry } entry per page.
    mockExec(
      JSON.stringify([
        { lines: [{ text: "صفحة واحدة", confidence: 0.92 }], needs_retry: false },
        { lines: [{ text: "صفحة اثنان", confidence: 0.88 }], needs_retry: false },
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
    const twoPages = JSON.stringify([
      { lines: [{ text: "نص موجود", confidence: 0.9 }], needs_retry: false },
      { lines: [], needs_retry: true },
    ]);
    const retryEmpty = JSON.stringify([{ lines: [], needs_retry: true }]);
    // execFile is called for the isAvailable probe, the first-pass batch,
    // and the low-confidence retry pass. Return the single-page empty
    // shape on the 3rd+ call (retry) so the retry does not "improve"
    // page 2 with page 1's text from a static 2-page mock.
    let calls = 0;
    (
      execFile as unknown as {
        mockImplementation: (
          fn: (cmd: string, args: string[], opts: unknown, cb: ExecCb) => { on: () => void },
        ) => void;
      }
    ).mockImplementation((_cmd, _args, _opts, cb: ExecCb) => {
      calls += 1;
      cb(null, calls >= 3 ? retryEmpty : twoPages, "");
      return { on: () => {} };
    });

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

  it("threads surya ocr_with_boxes polygons into layout.lines (pixel space of the page image)", async () => {
    mockExec(
      JSON.stringify([
        {
          lines: [
            { text: "السطر الأول", confidence: 0.9, bbox: [80, 200, 600, 250] },
            { text: "السطر الثاني", confidence: 0.85, bbox: [60, 400, 780, 460] },
          ],
          needs_retry: false,
        },
      ]),
    );

    const provider = new SuryaOcrProvider();
    const result = await provider.extractPages(
      baseConfig,
      [() => Promise.resolve(buffer)],
      "doc.pdf",
    );

    expect(result.pages[0]!.layout).toBeDefined();
    expect(result.pages[0]!.layout!.lines).toEqual([
      { text: "السطر الأول", bbox: [80, 200, 600, 250] },
      { text: "السطر الثاني", bbox: [60, 400, 780, 460] },
    ]);
  });

  it("omits layout when no line carries a bbox — geometry is never invented", async () => {
    mockExec(
      JSON.stringify([
        {
          lines: [
            { text: "بلا صندوق", confidence: 0.9, bbox: null },
            { text: "كذلك", confidence: 0.8 },
          ],
          needs_retry: false,
        },
      ]),
    );

    const provider = new SuryaOcrProvider();
    const result = await provider.extractPages(
      baseConfig,
      [() => Promise.resolve(buffer)],
      "doc.pdf",
    );

    expect(result.pages[0]!.text).toBe("بلا صندوق\nكذلك");
    expect(result.pages[0]!.layout).toBeUndefined();
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

  it("threads image_to_data word boxes into per-line layout.lines", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MOCK_OCR", "");
    mockExec(
      JSON.stringify([
        {
          text: "سطران متتابعون",
          confidence: 0.83,
          lines: [
            { text: "سطران", bbox: [700, 120, 900, 160] },
            { text: "متتابعون", bbox: [640, 200, 900, 240] },
          ],
        },
      ]),
    );

    const provider = new TesseractOcrProvider();
    const result = await provider.extractPages(
      baseConfig,
      [() => Promise.resolve(buffer)],
      "doc.pdf",
    );

    expect(result.pages[0]!.layout!.lines).toEqual([
      { text: "سطران", bbox: [700, 120, 900, 160] },
      { text: "متتابعون", bbox: [640, 200, 900, 240] },
    ]);
    vi.unstubAllEnvs();
  });

  it("keeps results without a lines key parseable (no layout, no throw)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MOCK_OCR", "");
    mockExec(JSON.stringify([{ text: "نص قديم", confidence: 0.7 }]));

    const provider = new TesseractOcrProvider();
    const result = await provider.extractPages(
      baseConfig,
      [() => Promise.resolve(buffer)],
      "doc.pdf",
    );

    expect(result.pages[0]!.text).toBe("نص قديم");
    expect(result.pages[0]!.layout).toBeUndefined();
    vi.unstubAllEnvs();
  });
});
