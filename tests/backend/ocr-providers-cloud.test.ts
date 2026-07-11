import { describe, it, expect } from "vitest";
import { parseGoogleExportResult } from "../../packages/pipeline/src/ocr-providers/google";
import { splitGeminiBatchPages } from "../../packages/pipeline/src/ocr-providers/gemini";

/* ── Google Drive OCR result parser (pure) ── */

describe("parseGoogleExportResult", () => {
  it("splits text on form-feed into pages", () => {
    const r = parseGoogleExportResult("صفحة واحدة\fصفحة اثنان");
    expect(r.engine).toBe("google");
    expect(r.pages).toHaveLength(2);
    expect(r.pages[0]!.text).toBe("صفحة واحدة");
    expect(r.pages[1]!.text).toBe("صفحة اثنان");
    expect(r.text).toContain("صفحة واحدة");
  });

  it("handles a single page with no form-feed", () => {
    const r = parseGoogleExportResult("نص واحد فقط");
    expect(r.pages).toHaveLength(1);
    expect(r.pages[0]!.text).toBe("نص واحد فقط");
  });

  it("filters out empty segments from consecutive form-feeds", () => {
    const r = parseGoogleExportResult("ص1\f\fص3");
    expect(r.pages).toHaveLength(2);
    expect(r.pages[0]!.text).toBe("ص1");
    expect(r.pages[1]!.text).toBe("ص3");
  });

  it("trims whitespace from each segment", () => {
    const r = parseGoogleExportResult("   ص1   \f   ص2   ");
    expect(r.pages[0]!.text).toBe("ص1");
    expect(r.pages[1]!.text).toBe("ص2");
  });
});

/* ── Gemini batch page-break parser (pure) ── */

describe("splitGeminiBatchPages", () => {
  it("splits batch output on the PAGE_BREAK separator", () => {
    const pages = splitGeminiBatchPages("نص الصفحة الأولى===PAGE_BREAK===نص الصفحة الثانية", 0, 2);
    expect(pages).toHaveLength(2);
    expect(pages[0]!.text).toBe("نص الصفحة الأولى");
    expect(pages[1]!.text).toBe("نص الصفحة الثانية");
    expect(pages[0]!.number).toBe(1);
    expect(pages[1]!.number).toBe(2);
  });

  it("fills missing pages with empty string when batch has fewer breaks", () => {
    const pages = splitGeminiBatchPages("فقرة واحدة فقط", 0, 2);
    expect(pages).toHaveLength(2);
    expect(pages[0]!.text).toBe("فقرة واحدة فقط");
    expect(pages[1]!.text).toBe("");
  });

  it("uses correct page numbering with non-zero start index", () => {
    const pages = splitGeminiBatchPages("ص3===PAGE_BREAK===ص4", 2, 2);
    expect(pages[0]!.number).toBe(3);
    expect(pages[1]!.number).toBe(4);
  });

  it("trims whitespace around each segment", () => {
    const pages = splitGeminiBatchPages("  أ  ===PAGE_BREAK===  ب  ", 0, 2);
    expect(pages[0]!.text).toBe("أ");
    expect(pages[1]!.text).toBe("ب");
  });

  it("returns expected count of pages even if more separators exist", () => {
    const pages = splitGeminiBatchPages("أ===PAGE_BREAK===ب===PAGE_BREAK===ج", 0, 2);
    expect(pages).toHaveLength(2);
    expect(pages[0]!.text).toBe("أ");
    expect(pages[1]!.text).toBe("ب");
  });
});
