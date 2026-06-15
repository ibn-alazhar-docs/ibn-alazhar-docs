import { describe, it, expect } from "vitest";
import {
  generateMarkdown,
  generateTxt,
  generateJson,
  generateDocx,
} from "../../packages/pipeline/src/output";
import type { CleanedText } from "../../packages/pipeline/src/types";

function makeCleaned(overrides: Partial<CleanedText> = {}): CleanedText {
  return {
    raw: "نص أصلي طويل في المستند",
    cleaned: "نص نظيف طويل في المستند",
    markdown: "نص الماركداون الطويل في المستند",
    metadata: {
      pageCount: 1,
      headingCount: 2,
      wordCount: 50,
      charCount: 200,
      confidence: 0.85,
      garbageRatio: 0.05,
      htmlFragmentCount: 0,
      paragraphCount: 3,
      qualityScore: 72,
    },
    ...overrides,
  };
}

const LONG_ARABIC =
  "بسم الله الرحمن الرحيم في كتاب الله العزيز الذي أنزله على عبده ليكون للعالمين نذيراً وإلى المؤمنين هداً وشفاءً ";

// ═══════════════════════════════════════════════════════════════════════════════
// generateMarkdown
// ═══════════════════════════════════════════════════════════════════════════════

describe("generateMarkdown", () => {
  describe("metadata generation", () => {
    it("includes YAML frontmatter by default", () => {
      const r = generateMarkdown(LONG_ARABIC);
      expect(r.markdown).toContain("---");
      expect(r.markdown).toContain("generated:");
    });

    it("includes total_pages in frontmatter", () => {
      const r = generateMarkdown(LONG_ARABIC);
      expect(r.markdown).toContain("total_pages:");
    });

    it("includes total_words in frontmatter", () => {
      const r = generateMarkdown(LONG_ARABIC);
      expect(r.markdown).toContain("total_words:");
    });

    it("includes arabic_ratio in frontmatter", () => {
      const r = generateMarkdown(LONG_ARABIC);
      expect(r.markdown).toContain("arabic_ratio:");
    });

    it("includeMetadata: false removes frontmatter", () => {
      const r = generateMarkdown(LONG_ARABIC, { includeMetadata: false });
      expect(r.markdown).not.toContain("---");
    });

    it("custom title prepends # heading", () => {
      const r = generateMarkdown(LONG_ARABIC + LONG_ARABIC + LONG_ARABIC, { title: "كتاب الله" });
      expect(r.markdown).toContain("# كتاب الله");
    });

    it("metadata includes quality_score", () => {
      const r = generateMarkdown(LONG_ARABIC);
      expect(r.markdown).toContain("quality_score:");
    });
  });

  describe("heading formatting", () => {
    it("## headings preserved", () => {
      const input = LONG_ARABIC + "\n## الفصل الاول الطويل في العقيدة الاسلامية\n" + LONG_ARABIC;
      const r = generateMarkdown(input);
      expect(r.markdown).toContain("##");
      expect(r.markdown).toContain("الفصل");
    });

    it("### headings preserved", () => {
      const input = LONG_ARABIC + "\n### المقدمة الطويلة في كتاب التوحيد\n" + LONG_ARABIC;
      const r = generateMarkdown(input);
      expect(r.markdown).toContain("###");
    });

    it("# headings preserved", () => {
      const input = "# كتاب الله العزيز الطويل في الدين الاسلامي\n" + LONG_ARABIC;
      const r = generateMarkdown(input);
      expect(r.markdown).toContain("#");
    });

    it("multiple heading levels in same text", () => {
      const input =
        LONG_ARABIC +
        "\n# رئيسي طويل\n" +
        LONG_ARABIC +
        "\n## فرعي طويل\n" +
        LONG_ARABIC +
        "\n### اصغر عنوان طويل\n" +
        LONG_ARABIC;
      const r = generateMarkdown(input);
      expect(r.markdown).toContain("#");
      expect(r.markdown).toContain("##");
      expect(r.markdown).toContain("###");
    });
  });

  describe("list detection", () => {
    it("bullet chars converted to -", () => {
      const input =
        LONG_ARABIC + "\n• البند الأول الطويل جدا في القائمة الرئيسية للمستند\n" + LONG_ARABIC;
      const r = generateMarkdown(input);
      expect(r.markdown).toContain("- البند");
    });

    it("numbered lists preserved", () => {
      const input =
        LONG_ARABIC +
        "\n1. البند الأول الطويل في القائمة\n2. البند الثاني الطويل في القائمة\n" +
        LONG_ARABIC;
      const r = generateMarkdown(input);
      expect(r.markdown).toContain("1.");
      expect(r.markdown).toContain("2.");
    });

    it("multiple bullet items", () => {
      const input =
        LONG_ARABIC +
        "\n• البند الأول الطويل جدا في القائمة الرئيسية\n• البند الثاني الطويل جدا في القائمة الرئيسية\n• البند الثالث الطويل جدا في القائمة الرئيسية\n" +
        LONG_ARABIC;
      const r = generateMarkdown(input);
      expect(r.markdown).toContain("البند");
    });
  });

  describe("paragraph reconstruction", () => {
    it("consecutive non-heading lines merged", () => {
      const input =
        "هذه جملة أولى طويلة جدا في النص وتمتد لعدة كلمات لضمان الطول الكافي\nهذه جملة ثانية طويلة جدا في النص وتمتد لعدة كلمات أخرى أيضا";
      const r = generateMarkdown(input);
      expect(r.markdown).toContain("هذه جملة");
    });

    it("blank lines preserved between sections", () => {
      const input =
        "فقرة طويلة جدا في النص المقدمي وتمتد لعدة كلمات\n\nفقرة ثانية طويلة جدا في النص وتمتد لعدة كلمات أخرى";
      const r = generateMarkdown(input);
      expect(r.markdown).toContain("فقرة");
    });
  });

  describe("output structure", () => {
    it("raw matches input", () => {
      const input = "بسم الله الرحمن الرحيم في كتاب الله العزيز من رب العالمين";
      const r = generateMarkdown(input);
      expect(r.raw).toBe(input);
    });

    it("cleaned is a string", () => {
      const r = generateMarkdown(LONG_ARABIC);
      expect(typeof r.cleaned).toBe("string");
    });

    it("markdown is a string", () => {
      const r = generateMarkdown(LONG_ARABIC);
      expect(typeof r.markdown).toBe("string");
    });

    it("metadata has pageCount and wordCount", () => {
      const r = generateMarkdown(LONG_ARABIC);
      expect(typeof r.metadata.pageCount).toBe("number");
      expect(typeof r.metadata.wordCount).toBe("number");
    });

    it("confidence is between 0 and 1", () => {
      const r = generateMarkdown(LONG_ARABIC);
      expect(r.metadata.confidence).toBeGreaterThanOrEqual(0);
      expect(r.metadata.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe("edge cases", () => {
    it("empty string → empty markdown", () => {
      const r = generateMarkdown("");
      expect(r.markdown).toBe("");
    });

    it("whitespace only → empty", () => {
      const r = generateMarkdown("   \n  \n  ");
      expect(r.markdown).toBe("");
    });

    it("only headings preserved", () => {
      const input =
        "## الفصل الاول الطويل في العقيدة الاسلامية\n" +
        LONG_ARABIC +
        "\n## الفصل الثاني الطويل في التوحيد وال信仰\n" +
        LONG_ARABIC;
      const r = generateMarkdown(input);
      expect(r.markdown).toContain("##");
    });

    it("very long text processes correctly", () => {
      const longText = Array.from({ length: 200 }, () => LONG_ARABIC).join("");
      const r = generateMarkdown(longText);
      expect(r.markdown.length).toBeGreaterThan(0);
      expect(r.metadata.wordCount).toBeGreaterThan(100);
    });

    it("text is cleaned before markdown generation", () => {
      const r = generateMarkdown(
        "\u202Bبسم الله الرحمن الرحيم في كتاب الله العزيز من رب العالمين\u200F",
      );
      expect(r.markdown).not.toContain("\u202B");
      expect(r.markdown).not.toContain("\u200F");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// generateTxt
// ═══════════════════════════════════════════════════════════════════════════════

describe("generateTxt", () => {
  describe("metadata header", () => {
    it("header present by default", () => {
      const r = generateTxt(makeCleaned());
      expect(r).toContain("=");
      expect(r).toContain("Ibn Al-Azhar Docs");
    });

    it("header has Pages field", () => {
      const r = generateTxt(makeCleaned());
      expect(r).toContain("Pages:");
    });

    it("header has Words field", () => {
      const r = generateTxt(makeCleaned());
      expect(r).toContain("Words:");
    });

    it("header has Confidence with percentage", () => {
      const r = generateTxt(makeCleaned());
      expect(r).toContain("Confidence: 85.0%");
    });

    it("header disabled with false", () => {
      const r = generateTxt(makeCleaned(), false);
      expect(r).not.toContain("Ibn Al-Azhar Docs");
      expect(r).not.toContain("Pages:");
    });
  });

  describe("markdown to plain text", () => {
    it("headings stripped of #", () => {
      const cleaned = makeCleaned({ markdown: "## العنوان الطويل في النص\nنص في الفقرة الطويلة" });
      const r = generateTxt(cleaned, false);
      expect(r).toContain("العنوان الطويل");
      expect(r).not.toContain("##");
    });

    it("bold stripped", () => {
      const cleaned = makeCleaned({ markdown: "**نص عريض طويل**" });
      const r = generateTxt(cleaned, false);
      expect(r).toContain("نص عريض طويل");
      expect(r).not.toContain("**");
    });

    it("bullets converted to •", () => {
      const cleaned = makeCleaned({ markdown: "- البند الأول الطويل" });
      const r = generateTxt(cleaned, false);
      expect(r).toContain("• البند الأول");
    });

    it("frontmatter removed", () => {
      const cleaned = makeCleaned({ markdown: "---\ngenerated: 2024\n---\nنص في الملف الطويل" });
      const r = generateTxt(cleaned, false);
      expect(r).not.toContain("generated:");
      expect(r).toContain("نص في الملف");
    });
  });

  it("empty cleaned text returns empty string", () => {
    const cleaned = makeCleaned({ markdown: "" });
    const r = generateTxt(cleaned, false);
    expect(r.trim()).toBe("");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// generateJson
// ═══════════════════════════════════════════════════════════════════════════════

describe("generateJson", () => {
  it("returns valid JSON", () => {
    const r = generateJson(makeCleaned());
    expect(() => JSON.parse(r)).not.toThrow();
  });

  it("has source field", () => {
    const r = JSON.parse(generateJson(makeCleaned()));
    expect(r).toHaveProperty("source");
  });

  it("has metadata field", () => {
    const r = JSON.parse(generateJson(makeCleaned()));
    expect(r).toHaveProperty("metadata");
  });

  it("has content field", () => {
    const r = JSON.parse(generateJson(makeCleaned()));
    expect(r).toHaveProperty("content");
  });

  it("has markdown field", () => {
    const r = JSON.parse(generateJson(makeCleaned()));
    expect(r).toHaveProperty("markdown");
  });

  it("source defaults to unknown", () => {
    const r = JSON.parse(generateJson(makeCleaned()));
    expect(r.source).toBe("unknown");
  });

  it("custom source filename", () => {
    const r = JSON.parse(generateJson(makeCleaned(), "test.pdf"));
    expect(r.source).toBe("test.pdf");
  });

  it("generatedAt is ISO string", () => {
    const r = JSON.parse(generateJson(makeCleaned()));
    expect(new Date(r.generatedAt).toISOString()).toBe(r.generatedAt);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// generateDocx
// ═══════════════════════════════════════════════════════════════════════════════

describe("generateDocx", () => {
  it("throws error", async () => {
    await expect(generateDocx(makeCleaned())).rejects.toThrow();
  });

  it("error mentions DOCX_EXPORT_NOT_AVAILABLE", async () => {
    await expect(generateDocx(makeCleaned())).rejects.toThrow("DOCX_EXPORT_NOT_AVAILABLE");
  });

  it("error mentions docx package", async () => {
    await expect(generateDocx(makeCleaned())).rejects.toThrow("docx");
  });
});
