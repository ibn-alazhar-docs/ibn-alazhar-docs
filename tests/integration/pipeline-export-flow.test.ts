import { describe, it, expect } from "vitest";
import { generateMarkdown, generateTxt, generateJson } from "../../packages/pipeline/src/output";
import type { CleanedText } from "../../packages/pipeline/src/types";

const ARABIC_BOOK = `
\u202Bكتاب التوحيد\u200F
## الفصل الاول في التوحيد
بسم الله الرحمن الرحيم الحمد لله رب العالمين
والصلاة والسلام على أشرف الأنبياء والمرسلين
أما بعد فإن التوحيد هو أساس الدين وأصله الذي بعث الله به الرسل

## الفصل الثاني في العباده
ومن انواع العباده الصلاة والزكاة والصيام والحج
وهي أركان الاسلام الخمسه بعد الشهادتين

### الخاتمة
نسأل الله أن ينفع بهذا الكتاب وأن يجعله خالصا لوجهه الكريم
`;

describe("Cleanup → Markdown → Export: Export pipeline flow", () => {
  let cleanedText: CleanedText;

  cleanedText = generateMarkdown(ARABIC_BOOK, {
    title: "كتاب التوحيد",
    includeMetadata: true,
    pageCount: 3,
  });

  describe("Markdown → TXT", () => {
    it("TXT export strips markdown headings", () => {
      const txt = generateTxt(cleanedText, false);
      expect(txt).not.toContain("##");
      expect(txt).not.toContain("###");
      expect(txt).toContain("التوحيد");
    });

    it("TXT with metadata header includes correct fields", () => {
      const txt = generateTxt(cleanedText, true);
      expect(txt).toContain("Ibn Al-Azhar Docs");
      expect(txt).toContain("Pages:");
      expect(txt).toContain("Words:");
      expect(txt).toContain("Confidence:");
    });

    it("TXT without metadata has no header", () => {
      const txt = generateTxt(cleanedText, false);
      expect(txt).not.toContain("Ibn Al-Azhar Docs");
      expect(txt).not.toContain("Pages:");
    });

    it("TXT content preserves Arabic text", () => {
      const txt = generateTxt(cleanedText, false);
      expect(txt).toContain("بسم الله");
      expect(txt).toContain("الرحمن");
    });
  });

  describe("Markdown → JSON", () => {
    it("JSON export is valid JSON", () => {
      const json = generateJson(cleanedText);
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it("JSON contains all expected top-level keys", () => {
      const parsed = JSON.parse(generateJson(cleanedText, "test-book.pdf"));
      expect(parsed).toHaveProperty("source");
      expect(parsed).toHaveProperty("generatedAt");
      expect(parsed).toHaveProperty("metadata");
      expect(parsed).toHaveProperty("content");
      expect(parsed).toHaveProperty("markdown");
    });

    it("JSON source field matches input", () => {
      const parsed = JSON.parse(generateJson(cleanedText, "book.pdf"));
      expect(parsed.source).toBe("book.pdf");
    });

    it("JSON content.raw matches original input", () => {
      const parsed = JSON.parse(generateJson(cleanedText));
      expect(parsed.content.raw).toBe(cleanedText.raw);
    });

    it("JSON metadata matches cleaned text metadata", () => {
      const parsed = JSON.parse(generateJson(cleanedText));
      expect(parsed.metadata.pageCount).toBe(cleanedText.metadata.pageCount);
      expect(parsed.metadata.wordCount).toBe(cleanedText.metadata.wordCount);
      expect(parsed.metadata.confidence).toBe(cleanedText.metadata.confidence);
    });

    it("JSON generatedAt is a valid ISO timestamp", () => {
      const parsed = JSON.parse(generateJson(cleanedText));
      const date = new Date(parsed.generatedAt);
      expect(date.toISOString()).toBe(parsed.generatedAt);
    });
  });

  describe("Cross-format consistency", () => {
    it("TXT and JSON contain the same core Arabic content", () => {
      const txt = generateTxt(cleanedText, false);
      const parsed = JSON.parse(generateJson(cleanedText));

      expect(txt).toContain("بسم الله");
      expect(parsed.content.raw).toContain("بسم الله");
    });

    it("Markdown frontmatter present when requested", () => {
      expect(cleanedText.markdown).toContain("---");
      expect(cleanedText.markdown).toContain("total_words:");
      expect(cleanedText.markdown).toContain("quality_score:");
    });
  });
});
