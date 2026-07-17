import { describe, it, expect } from "vitest";
import { MarkdownIRConverter, convertMarkdownToIR } from "@ibn-al-azhar-docs/pipeline";
import { detectHeading, headingNode, detectList, isListMarker } from "@ibn-al-azhar-docs/pipeline";
import {
  parseInline,
  fontSizeToHeadingLevel,
  indentationOf,
  normalizeInline,
} from "@ibn-al-azhar-docs/pipeline";
import { documentIRSchema, isDocumentIR } from "@ibn-al-azhar-docs/shared";

describe("MarkdownIRConverter", () => {
  const converter = new MarkdownIRConverter();

  it("converts ATX headings to heading nodes with correct levels", () => {
    const ir = converter.convert("# العنوان الأول\n\n## عنوان فرعي\n\nنص عادي");
    expect(ir.content[0]).toMatchObject({ type: "heading", level: 1 });
    expect(ir.content[1]).toMatchObject({ type: "heading", level: 2 });
    const heading1 = ir.content[0] as { content: { content: string }[] };
    expect(heading1.content[0].content).toBe("العنوان الأول");
  });

  it("preserves paragraph text and inline emphasis", () => {
    const ir = converter.convert("هذا **نص عريض** و *مائل* في منتصف الفقرة");
    const para = ir.content[0] as { type: "paragraph"; content: unknown[] };
    expect(para.type).toBe("paragraph");
    const texts = para.content as { content: string; emphasis?: Record<string, boolean> }[];
    const bold = texts.find((t) => t.emphasis?.bold);
    const italic = texts.find((t) => t.emphasis?.italic);
    expect(bold?.content).toBe("نص عريض");
    expect(italic?.content).toBe("مائل");
  });

  it("detects unordered lists with bullet markers", () => {
    const ir = converter.convert("- العنصر الأول\n- العنصر الثاني\n- العنصر الثالث");
    const list = ir.content[0] as { type: "list"; ordered: boolean; items: unknown[] };
    expect(list.type).toBe("list");
    expect(list.ordered).toBe(false);
    expect(list.items).toHaveLength(3);
  });

  it("detects ordered lists with numeric markers", () => {
    const ir = converter.convert("1. الخطوة الأولى\n2. الخطوة الثانية");
    const list = ir.content[0] as { type: "list"; ordered: boolean; startNumber?: number };
    expect(list.ordered).toBe(true);
    expect(list.startNumber).toBe(1);
    expect(list.items).toHaveLength(2);
  });

  it("detects Arabic-ordered lists (أ. ب. ج.)", () => {
    const ir = converter.convert("أ. الخيار الأول\nب. الخيار الثاني");
    const list = ir.content[0] as { type: "list"; ordered: boolean };
    expect(list.ordered).toBe(true);
  });

  it("handles empty documents gracefully", () => {
    const ir = converter.convert("");
    expect(ir.content).toEqual([]);
    expect(isDocumentIR(ir)).toBe(true);
  });

  it("does not throw on malformed markdown", () => {
    const ir = converter.convert("### \n\n   \n- \n\nplain");
    expect(Array.isArray(ir.content)).toBe(true);
  });

  it("produces a schema-valid DocumentIR", () => {
    const ir = convertMarkdownToIR("# عنوان\n\nفقرة **عريض**\n\n- عنصر");
    expect(documentIRSchema.safeParse(ir).success).toBe(true);
  });

  it("infers RTL alignment for Arabic paragraphs", () => {
    const ir = converter.convert("هذا نص عربي طويل يحتوي على محتوى كافٍ لاختبار المحاذاة");
    const para = ir.content[0] as { alignment?: string };
    expect(para.alignment).toBe("right");
  });
});

describe("heading detection heuristics", () => {
  it("classifies font-size-based headings above 1.3x average", () => {
    const avg = 12;
    const heading = detectHeading({ text: "Big", indentation: 0, fontSize: 24 }, avg);
    expect(heading?.level).toBe(1);
  });

  it("classifies bold-weight text as heading", () => {
    const heading = detectHeading({ text: "Bold", indentation: 0, fontWeight: 700 }, 12);
    expect(heading).not.toBeNull();
  });

  it("maps font size ratio to heading level", () => {
    expect(fontSizeToHeadingLevel(24, 12)).toBe(1);
    expect(fontSizeToHeadingLevel(16, 12)).toBe(3);
  });

  it("returns null for body text", () => {
    const heading = detectHeading(
      { text: "normal", indentation: 0, fontSize: 12, fontWeight: 400 },
      12,
    );
    expect(heading).toBeNull();
  });
});

describe("list detection helpers", () => {
  it("recognizes list markers", () => {
    expect(isListMarker("• عنصر")).toBe(true);
    expect(isListMarker("1. عنصر")).toBe(true);
    expect(isListMarker("أ. عنصر")).toBe(true);
    expect(isListMarker("نص عادي")).toBe(false);
  });

  it("detects a list from raw lines", () => {
    const result = detectList(["- أ", "- ب", "- ج"]);
    expect(result?.node.items).toHaveLength(3);
    expect(result?.node.ordered).toBe(false);
  });
});

describe("inline + utils", () => {
  it("parses bold and italic emphasis", () => {
    const nodes = parseInline("نص **عريض** و *مائل*");
    const bold = nodes.find((n) => n.type === "text" && n.emphasis?.bold);
    const italic = nodes.find((n) => n.type === "text" && n.emphasis?.italic);
    expect(bold?.content).toBe("عريض");
    expect(italic?.content).toBe("مائل");
  });

  it("computes indentation in 4-space units", () => {
    expect(indentationOf("    indented")).toBe(1);
    expect(indentationOf("        deep")).toBe(2);
    expect(indentationOf("no")).toBe(0);
  });

  it("normalizes adjacent identical emphasis runs", () => {
    const merged = normalizeInline([
      { type: "text", content: "أ" },
      { type: "text", content: "ب" },
    ]);
    expect(merged).toHaveLength(1);
    expect((merged[0] as { content: string }).content).toBe("أب");
  });
});
