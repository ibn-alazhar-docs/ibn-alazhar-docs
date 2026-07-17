import { describe, it, expect } from "vitest";
import { convertMarkdownToIR, generateMarkdownFromIR } from "@ibn-al-azhar-docs/pipeline";
import { isDocumentIR } from "@ibn-al-azhar-docs/shared";

/**
 * End-to-end verification of the export pipeline structure:
 * OCR markdown -> IR -> format generation, asserting that headings/lists
 * survive the round-trip (Requirement 5.1-5.8).
 */
const OCR_MARKDOWN = `## مقدمة

هذا نص **مهم** في بداية الوثيقة.

### أقسام

- العنصر الأول
- العنصر الثاني

1. الخطوة الأولى
2. الخطوة الثانية

# الخاتمة

نص ختامي.`;

describe("export pipeline (OCR -> IR -> export)", () => {
  const ir = convertMarkdownToIR(OCR_MARKDOWN, {
    ocrProvider: "gemini",
    pageCount: 1,
    language: "ar",
    confidence: 0.92,
  });

  it("produces a valid IR from OCR markdown", () => {
    expect(isDocumentIR(ir)).toBe(true);
    const headings = ir.content.filter((b) => b.type === "heading");
    expect(headings.length).toBeGreaterThanOrEqual(3);
  });

  it("preserves heading hierarchy (level 1 + level 2 + level 3)", () => {
    const levels = ir.content
      .filter((b) => b.type === "heading")
      .map((b) => (b as { level: number }).level)
      .sort();
    expect(levels).toContain(1);
    expect(levels).toContain(2);
    expect(levels).toContain(3);
  });

  it("preserves unordered and ordered lists", () => {
    const lists = ir.content.filter((b) => b.type === "list");
    expect(lists.some((l) => !(l as { ordered: boolean }).ordered)).toBe(true);
    expect(lists.some((l) => (l as { ordered: boolean }).ordered)).toBe(true);
  });

  it("keeps bold emphasis through the round trip", async () => {
    const md = (await generateMarkdownFromIR(ir)).toString("utf-8");
    expect(md).toContain("**مهم**");
  });

  it("renders non-empty, structure-preserving markdown", async () => {
    const md = (await generateMarkdownFromIR(ir)).toString("utf-8");
    expect(md.length).toBeGreaterThan(0);
    expect(md).toContain("# الخاتمة");
    expect(md).toMatch(/^- العنصر الأول/m);
    expect(md).toMatch(/^1\. الخطوة الأولى/m);
  });

  it("handles a missing-IR fallback (empty source yields empty content)", () => {
    const empty = convertMarkdownToIR("", {});
    expect(empty.content).toEqual([]);
  });
});
