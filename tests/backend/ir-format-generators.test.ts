import { describe, it, expect } from "vitest";
import type { DocumentIR } from "@ibn-al-azhar-docs/shared";
import {
  MarkdownGenerator,
  TxtGenerator,
  JsonGenerator,
  generateMarkdownFromIR,
  generateTxtFromIR,
  generateJsonFromIR,
} from "@ibn-al-azhar-docs/pipeline";

const sampleIR: DocumentIR = {
  version: "1.0",
  metadata: {
    ocrProvider: "gemini",
    pageCount: 1,
    language: "ar",
    confidence: 0.95,
    processedAt: "2024-01-15T10:30:00Z",
  },
  content: [
    {
      type: "heading",
      level: 1,
      content: [{ type: "text", content: "عنوان الوثيقة" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", content: "هذه فقرة عادية مع " },
        { type: "text", content: "نص مهم", emphasis: { bold: true } },
        { type: "text", content: " في المنتصف." },
      ],
    },
    {
      type: "list",
      ordered: false,
      items: [
        { content: [{ type: "text", content: "العنصر الأول" }] },
        { content: [{ type: "text", content: "العنصر الثاني" }] },
      ],
    },
    {
      type: "list",
      ordered: true,
      startNumber: 1,
      items: [
        { content: [{ type: "text", content: "الخطوة الأولى" }] },
        { content: [{ type: "text", content: "الخطوة الثانية" }] },
      ],
    },
  ],
};

describe("MarkdownGenerator (from IR)", () => {
  it("converts headings to ATX syntax", async () => {
    const md = (await generateMarkdownFromIR(sampleIR)).toString("utf-8");
    expect(md).toContain("# عنوان الوثيقة");
  });

  it("preserves bold emphasis", async () => {
    const md = (await generateMarkdownFromIR(sampleIR)).toString("utf-8");
    expect(md).toContain("**نص مهم**");
  });

  it("converts unordered lists to markdown bullets", async () => {
    const md = (await generateMarkdownFromIR(sampleIR)).toString("utf-8");
    expect(md).toMatch(/^- العنصر الأول/m);
    expect(md).toMatch(/^- العنصر الثاني/m);
  });

  it("converts ordered lists with start numbers", async () => {
    const md = (await generateMarkdownFromIR(sampleIR)).toString("utf-8");
    expect(md).toMatch(/^1\. الخطوة الأولى/m);
    expect(md).toMatch(/^2\. الخطوة الثانية/m);
  });

  it("exposes correct mime type and extension", () => {
    const gen = new MarkdownGenerator();
    expect(gen.getMimeType()).toBe("text/markdown");
    expect(gen.getExtension()).toBe(".md");
  });
});

describe("TxtGenerator (from IR)", () => {
  it("keeps heading markers in semantic plain text", () => {
    const txt = generateTxtFromIR(sampleIR).toString("utf-8");
    expect(txt).toContain("# عنوان الوثيقة");
  });

  it("uses bullet markers for unordered lists", () => {
    const txt = generateTxtFromIR(sampleIR).toString("utf-8");
    expect(txt).toContain("• العنصر الأول");
  });

  it("does not add markdown emphasis syntax", () => {
    const txt = generateTxtFromIR(sampleIR).toString("utf-8");
    expect(txt).not.toContain("**");
  });
});

describe("JsonGenerator (from IR)", () => {
  it("emits a parseable JSON with full structure", () => {
    const json = generateJsonFromIR(sampleIR, { sourceFileName: "doc.pdf" }).toString("utf-8");
    const parsed = JSON.parse(json);
    expect(parsed.irVersion).toBe("1.0");
    expect(parsed.metadata.ocrProvider).toBe("gemini");
    expect(parsed.content).toHaveLength(4);
    expect(parsed.source).toBe("doc.pdf");
  });

  it("includes embedded markdown when provided", () => {
    const json = generateJsonFromIR(sampleIR, { markdown: "# x" }).toString("utf-8");
    expect(JSON.parse(json).markdown).toBe("# x");
  });
});
