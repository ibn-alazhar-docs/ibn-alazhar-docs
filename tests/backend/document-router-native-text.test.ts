/**
 * Native (no-OCR) PDF text path — the module contract with the PyMuPDF helper.
 *
 * Guard for a P0 that was invisible from the unit suite: PyMuPDF ≥ 1.28 prints
 * `warning: The \`fitz\` API is deprecated…` to **stdout** the moment `fitz` is
 * imported. The helper used to `print(json)` its payload and the TypeScript side
 * did `JSON.parse(result.stdout)`, so the parse threw on every PDF, the free text
 * layer was declared unavailable, and each text PDF was billed to cloud OCR.
 *
 * The helper now writes its payload to a file passed on the command line, so no
 * library chatter can corrupt it. These tests fake `execFile` to reproduce exactly
 * that noisy-stdout condition without needing a PDF or a Python install.
 */

import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  /** What the fake helper writes to its output file, set per test. */
  payload: null as unknown,
  /** Every execFile invocation: argv plus the Python source that produced it. */
  calls: [] as { args: string[]; script: string }[],
}));

vi.mock("node:child_process", async () => {
  const { readFileSync, writeFileSync } = await import("node:fs");
  return {
    execFile: (
      _cmd: string,
      args: string[],
      _opts: unknown,
      cb: (err: Error | null, stdout: string, stderr: string) => void,
    ) => {
      const script = readFileSync(args[0]!, "utf-8");
      state.calls.push({ args, script });
      writeFileSync(args[2]!, JSON.stringify(state.payload), "utf-8");
      // stdout carries only the library warnings — the payload is never printed.
      cb(
        null,
        "warning: The `fitz` API is deprecated and will be removed in future.\n" +
          "warning: MuPDF: some fonts could not be loaded\n",
        "",
      );
      return { on: () => undefined };
    },
  };
});

async function loadRouter() {
  return import("../../packages/pipeline/src/document-router");
}

describe("extractNativePdfText — payload survives noisy stdout", () => {
  it("returns the page text the helper wrote to its output file", async () => {
    state.payload = { pages: [{ number: 1, text: "نصٌّ أصليٌّ من الطبقة" }], pageCount: 1 };
    state.calls = [];
    const { extractNativePdfText } = await loadRouter();

    const result = await extractNativePdfText(Buffer.from("%PDF-1.4 dummy"));

    expect(result.pageCount).toBe(1);
    expect(result.text).toContain("نصٌّ أصليٌّ من الطبقة");
    expect(result.confidence).toBe(0.95);
  });

  it("passes the output path as an argument and never prints the JSON payload", async () => {
    state.payload = { pages: [{ number: 1, text: "صفحة" }], pageCount: 1 };
    state.calls = [];
    const { extractNativePdfText } = await loadRouter();

    await extractNativePdfText(Buffer.from("%PDF-1.4 dummy"), 500);

    const script = state.calls[0]!.script;
    expect(script).toContain("import pymupdf as fitz"); // modern name first
    expect(script).toContain("import fitz"); // older installs still work
    expect(script).not.toMatch(/print\(json/); // the corruption, pinned away
    expect(state.calls[0]!.args[2]).toMatch(/native_text\.json$/);
    expect(state.calls[0]!.args[3]).toBe("500");
  });

  it("fails with a coded error when the helper reports one", async () => {
    state.payload = { error: "no such file" };
    state.calls = [];
    const { extractNativePdfText } = await loadRouter();

    await expect(extractNativePdfText(Buffer.from("%PDF-1.4 dummy"))).rejects.toThrow(
      /PDF_NATIVE_TEXT_FAILED/,
    );
  });
});

describe("classifyDocument — PDF branch reads the file payload, not stdout", () => {
  it("reports a text-native PDF from the recorded page count and text length", async () => {
    state.payload = { pages: 6, text_len: 12000 };
    state.calls = [];
    const { classifyDocument } = await loadRouter();

    const classification = await classifyDocument(
      Buffer.from("%PDF-1.4 dummy"),
      "application/pdf",
      "kitab.pdf",
    );

    expect(classification).toMatchObject({
      type: "pdf-text",
      hasEmbeddedText: true,
      pageCount: 6,
    });
    expect(state.calls[0]!.script).toContain("import pymupdf as fitz");
  });

  it("degrades to pdf-scan when the helper reports an error", async () => {
    state.payload = { error: "document is not a PDF" };
    state.calls = [];
    const { classifyDocument } = await loadRouter();

    const classification = await classifyDocument(
      Buffer.from("%PDF-1.4 dummy"),
      "application/pdf",
      "kitab.pdf",
    );

    expect(classification.type).toBe("pdf-scan");
    expect(classification.hasEmbeddedText).toBe(false);
  });
});

describe("isGarbageLine — measured on characters, not on Arabic share", () => {
  it("does not call Latin prose garbage", async () => {
    const { isGarbageLine } = await import("../../packages/pipeline/src/text/constants");
    expect(
      isGarbageLine("The committee reviewed the report on Azhari methodology and found it sound."),
    ).toBe(false);
  });

  it("keeps fully vowelled Arabic prose, marks and all", async () => {
    const { isGarbageLine } = await import("../../packages/pipeline/src/text/constants");
    expect(isGarbageLine("إِنَّآ أَعْطَيْنَٰكَ ٱلْكَوْثَرَ فَصَلِّ لِرَبِّكَ وَٱنْحَرْ")).toBe(
      false,
    );
  });

  it("flags scan-artifact symbol runs", async () => {
    const { isGarbageLine } = await import("../../packages/pipeline/src/text/constants");
    expect(isGarbageLine("■■■■◆◆◇◇○○△△▽▽■■■■◆◆◇◇")).toBe(true);
  });
});

/**
 * عينات حقيقية القياس: مُستخرَجة بـ PyMuPDF 1.28.2 من ملفَّي اختبار أُنتجا لهذا
 * الغرض — الأول بـ Word-style shaping (presentation forms بالرصف البصري)، والثاني
 * بخريطة ToUnicode مكسورة. النسب الموثقة: 97.9% متشكّل، و52 تحكّمي/ألف حرف.
 */
const CLEAN_PAGE = [
  "الحمد لله رب العالمين والصلاة والسلام على أشرف المرسلين محمد وعلى آله وصحبه أجمعين",
  "أما بعد فإن كتاب معاني الآثار للإمام أبي منصور الماتريدي من أحسن كتب شرح المعاني",
  "وقد ذكر المحقق في الحاشية الأولى أن الرواية صحيحة والإسناد متصل وهذا لا يخفى على أحد",
  "ثم قال وفي الصفحة الخامسة والعشرين من الطبعة الأولى عبارة ناقصة وقد أكملها الناشر",
].join(" ");

// get_text("words") على ملف بالرصف البصري — الكلمات معكوس ترتيبها ومتشكّلة.
const VISUAL_ORDER_PAGE =
  "ﻣﻦ ﺍﻟﻄﺒﻌﺔ ﺍﻷﻭﻟﻰ25 ﻓﻲ ﺍﻟﺼﻔﺤﺔ01 ﻨﺺ ...... ﻣﺤﻤﻮﻝ ﻋﻠﻰ ﺍﻟﻈﺎﻫﺮ. ١ ﺍﻧﻈﺮ ﺍﻟﻤﺒﺤﺚ " +
  "ﻗﺎﻝ ﺍﻟﻤﺆﻟﻒ ﺭﺣﻤﻪ ﺍﻟﻠﻪ ﻓﻲ ﻛﺘﺎﺑﻪ ﻣﻌﺎﻧﻲ ﺍﻵﺛﺎﺭ " +
  "ﻭﻫﺬا ﺣﻜﻢٌ ﺻﺤﻴﺢٌ ﻻ ﺧﻔﺎﺀَ ﻓﻴﻪ ".repeat(3);

// نفس الملف بحروفه الأصلية لكن بخريطة ترميز مكسورة: حروف C0 داخل النص.
const BROKEN_CMAP_PAGE =
  "قال\u0012المؤلف\u000e في\u0015 كتاب «معاني\u0010 الآثار»\u0012 إن\u0000 النص\u0015 محمول\u000e على\u0012 الظاهر " +
  "وهذا\u0000 حكم\u0012 صحيح\u0015 من\u000e الكتاب " +
  "وهذا\u0000 فصل\u0012 آخر\u0015 من\u000e البحث ".repeat(3);

describe("native text fidelity gates — scrambled or mis-decoded layers are refused", () => {
  async function gates() {
    return import("../../packages/pipeline/src/qa-gates");
  }

  it("measures shaping forms on a visual-order layer and zero on a clean one", async () => {
    const { shapedGlyphRate, NATIVE_SHAPED_GLYPH_MAX_PCT } = await gates();
    expect(shapedGlyphRate(VISUAL_ORDER_PAGE)).toBeGreaterThanOrEqual(NATIVE_SHAPED_GLYPH_MAX_PCT);
    expect(shapedGlyphRate(CLEAN_PAGE)).toBe(0);
  });

  it("does not count the religious ligature or tashkeel as shaping", async () => {
    const { shapedGlyphRate } = await gates();
    expect(shapedGlyphRate("﴿ إِنَّآ أَعْطَيْنَٰكَ ٱلْكَوْثَرَ ﴾ ﷲ صلى الله عليه وسلم")).toBe(0);
  });

  it("measures stray control characters on a broken ToUnicode layer", async () => {
    const { controlCharRate, NATIVE_CONTROL_MAX_PER_K } = await gates();
    expect(controlCharRate(BROKEN_CMAP_PAGE)).toBeGreaterThanOrEqual(NATIVE_CONTROL_MAX_PER_K);
    expect(controlCharRate(CLEAN_PAGE)).toBe(0);
  });

  it("routes a visual-order layer to OCR instead of shipping reversed words", async () => {
    const { decideRoute } = await loadRouter();
    const decision = decideRoute(
      { type: "pdf-text", hasEmbeddedText: true, pageCount: 1, confidence: 0.95 },
      { text: VISUAL_ORDER_PAGE, pageCount: 1 },
    );
    expect(decision.route).toBe("ocr");
    expect(decision.reason).toContain("الترتيب البصري المعكوس");
  });

  it("routes a mis-decoded layer to OCR instead of shipping control characters", async () => {
    const { decideRoute } = await loadRouter();
    const decision = decideRoute(
      { type: "pdf-text", hasEmbeddedText: true, pageCount: 1, confidence: 0.95 },
      { text: BROKEN_CMAP_PAGE, pageCount: 1 },
    );
    expect(decision.route).toBe("ocr");
    expect(decision.reason).toContain("ترميز مكسور");
  });

  it("keeps a clean layer on the free native path and reports both signals as zero", async () => {
    const { decideRoute } = await loadRouter();
    const decision = decideRoute(
      { type: "pdf-text", hasEmbeddedText: true, pageCount: 1, confidence: 0.95 },
      { text: CLEAN_PAGE, pageCount: 1 },
    );
    expect(decision.route).toBe("native");
    expect(decision.shapedGlyphPct).toBe(0);
    expect(decision.controlCharsPerK).toBe(0);
  });
});
