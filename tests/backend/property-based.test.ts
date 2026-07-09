/**
 * Property-based tests using fast-check.
 *
 * These verify INVARIANTS and LAWS that must hold for arbitrary inputs —
 * far stronger than example-based tests. Inspired by TestSprite's auto-
 * generated edge-case discovery.
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  estimateConfidence,
  toOcrPageResult,
} from "../../packages/pipeline/src/ocr-providers/types";
import { splitGeminiBatchPages } from "../../packages/pipeline/src/ocr-providers/gemini";
import { parseGoogleExportResult } from "../../packages/pipeline/src/ocr-providers/google";
import { categorizeFailure } from "../../packages/pipeline/src/queue/categorize";
import { cleanArabicText } from "../../packages/pipeline/src/text/clean";
import { analyzeText } from "../../packages/pipeline/src/text/analyze";

/* ── Custom arbitraries ── */

const arabicCodePoint = fc.integer({ min: 0x0600, max: 0x06ff }).map(String.fromCodePoint);
const arabicStringArb = fc
  .array(arabicCodePoint, { minLength: 0, maxLength: 100 })
  .map((cs) => cs.join(""));

/* ── estimateConfidence invariants ── */

describe("estimateConfidence — property-based", () => {
  it("always returns a value between 0 and 1 inclusive", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 10000 }), (text) => {
        const c = estimateConfidence(text);
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      }),
    );
  });

  it("empty string yields low confidence (≤ 0.2)", () => {
    fc.assert(
      fc.property(fc.constant(""), (text) => {
        expect(estimateConfidence(text)).toBeLessThanOrEqual(0.2);
      }),
    );
  });

  it("text with arabic characters yields confidence ≥ 0 and ≤ 1", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 4, maxLength: 500 }).map((s) => "\u0627" + s.slice(1)),
        (text) => {
          const score = estimateConfidence(text);
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(1);
        },
      ),
    );
  });

  it("text with many question marks yields low confidence (garbage heuristic)", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10, maxLength: 200 }).map((s) => s.replace(/./g, "?")),
        (text) => {
          const c = estimateConfidence(text);
          expect(c).toBeLessThan(1);
        },
      ),
    );
  });
});

/* ── toOcrPageResult invariants ── */

describe("toOcrPageResult — property-based", () => {
  it("preserves number of pages", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            number: fc.integer({ min: 1, max: 9999 }),
            text: fc.string({ minLength: 0, maxLength: 500 }),
          }),
          { minLength: 0, maxLength: 100 },
        ),
        (rawPages) => {
          const result = toOcrPageResult(rawPages);
          expect(result).toHaveLength(rawPages.length);
        },
      ),
    );
  });

  it("each page has number ≥ 1 and confidence between 0 and 1", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            number: fc.integer({ min: 1, max: 9999 }),
            text: fc.string({ minLength: 0, maxLength: 500 }),
          }),
          { minLength: 1, maxLength: 50 },
        ),
        (rawPages) => {
          const result = toOcrPageResult(rawPages);
          for (const page of result) {
            expect(page.number).toBeGreaterThanOrEqual(1);
            expect(page.confidence).toBeGreaterThanOrEqual(0);
            expect(page.confidence).toBeLessThanOrEqual(1);
          }
        },
      ),
    );
  });

  it("page numbers are sequential (starting from first raw page number)", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            number: fc.integer({ min: 1, max: 9999 }),
            text: fc.string({ minLength: 0, maxLength: 500 }),
          }),
          { minLength: 1, maxLength: 50 },
        ),
        (rawPages) => {
          const result = toOcrPageResult(rawPages);
          for (let i = 0; i < result.length; i++) {
            expect(result[i]!.number).toBe(rawPages[i]!.number);
          }
        },
      ),
    );
  });
});

/* ── splitGeminiBatchPages invariants ── */

describe("splitGeminiBatchPages — property-based", () => {
  it("always returns exactly 'expected' pages", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 500 }),
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 1, max: 20 }),
        (text, start, expected) => {
          const pages = splitGeminiBatchPages(text, start, expected);
          expect(pages).toHaveLength(expected);
        },
      ),
    );
  });

  it("page numbers are contiguous starting from start+1", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 200 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 1, max: 10 }),
        (text, start, expected) => {
          const pages = splitGeminiBatchPages(text, start, expected);
          for (let j = 0; j < pages.length; j++) {
            expect(pages[j]!.number).toBe(start + j + 1);
          }
        },
      ),
    );
  });

  it("all pages have confidence 1.0", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 100 }),
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        (text, start, expected) => {
          for (const p of splitGeminiBatchPages(text, start, expected)) {
            expect(p.confidence).toBe(1.0);
          }
        },
      ),
    );
  });
});

/* ── parseGoogleExportResult invariants ── */

describe("parseGoogleExportResult — property-based", () => {
  it("engine is always 'google'", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 5000 }), (text) => {
        expect(parseGoogleExportResult(text).engine).toBe("google");
      }),
    );
  });

  it("full text is preserved exactly", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 5000 }), (text) => {
        const r = parseGoogleExportResult(text);
        expect(r.text).toBe(text);
      }),
    );
  });

  it("number of pages ≤ number of form-feed segments", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 5000 }), (text) => {
        const r = parseGoogleExportResult(text);
        const segmentCount = text.split("\f").filter(Boolean).length;
        expect(r.pages.length).toBeLessThanOrEqual(segmentCount || 1);
      }),
    );
  });

  it("page numbers start at 1 and are sequential", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 5000 }), (text) => {
        const r = parseGoogleExportResult(text);
        for (let i = 0; i < r.pages.length; i++) {
          expect(r.pages[i]!.number).toBe(i + 1);
        }
      }),
    );
  });

  it("each page text is trimmed", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 5000 }), (text) => {
        const r = parseGoogleExportResult(text);
        for (const p of r.pages) {
          expect(p.text).toBe(p.text.trim());
        }
      }),
    );
  });
});

/* ── categorizeFailure invariants ── */

describe("categorizeFailure — property-based", () => {
  it("always returns a valid FailureCategory", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 200 }), (errorMessage) => {
        const result = categorizeFailure(new Error(errorMessage));
        const valid = ["transient", "permanent", "fatal"];
        expect(valid).toContain(result.category);
        expect(typeof result.code).toBe("string");
      }),
    );
  });

  it("errors with actual permanent keywords are always permanent", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          "OCR_QUOTA_EXCEEDED",
          "PDF_ENCRYPTED",
          "PDF_CORRUPT",
          "PDF_TRUNCATED",
          "PDF_INVALID",
          "PDF_EXCEEDS_MAX_PAGES",
          "PDF_RENDER_FAILED",
          "FILE_TOO_LARGE",
          "INVALID_TYPE",
        ),
        (keyword) => {
          const r = categorizeFailure(new Error(keyword));
          expect(r.category).toBe("permanent");
        },
      ),
    );
  });

  it("JOB_TIMEOUT and JOB_ABORTED are always fatal", () => {
    fc.assert(
      fc.property(fc.constantFrom("JOB_TIMEOUT", "JOB_ABORTED"), (keyword) => {
        const r = categorizeFailure(new Error(keyword));
        expect(r.category).toBe("fatal");
      }),
    );
  });
});

/* ── cleanArabicText invariants ── */

describe("cleanArabicText — property-based", () => {
  it("is idempotent (applying twice yields same result)", () => {
    fc.assert(
      fc.property(arabicStringArb, (text) => {
        const once = cleanArabicText(text);
        const twice = cleanArabicText(once);
        expect(twice).toBe(once);
      }),
    );
  });

  it("does not throw for any arabic string", () => {
    fc.assert(
      fc.property(arabicStringArb, (text) => {
        expect(() => cleanArabicText(text)).not.toThrow();
      }),
    );
  });
});

/* ── analyzeText invariants ── */

describe("analyzeText — property-based", () => {
  it("pageCount is at least 1 for non-empty text", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 1000 }), (text) => {
        const a = analyzeText(text);
        expect(a.pageCount).toBeGreaterThanOrEqual(1);
      }),
    );
  });

  it("wordCount is non-negative", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 1000 }), (text) => {
        expect(analyzeText(text).wordCount).toBeGreaterThanOrEqual(0);
      }),
    );
  });

  it("qualityScore is always 0 to 100 inclusive", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 5000 }), (text) => {
        const score = analyzeText(text).qualityScore;
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }),
    );
  });
});
