import { describe, it, expect } from "vitest";
import { cleanArabicText, analyzeText } from "../../packages/pipeline/src/text";
import { generateMarkdown, generateTxt, generateJson } from "../../packages/pipeline/src/output";
import type { CleanedText } from "../../packages/pipeline/src/types";

describe("Pipeline Failure Recovery", () => {
  describe("Malformed input recovery", () => {
    it("completely empty input produces valid output", () => {
      const result = generateMarkdown("");
      expect(result.markdown).toBe("");
      expect(result.metadata.wordCount).toBe(0);
      expect(result.metadata.pageCount).toBe(1);
    });

    it("null bytes in input handled gracefully", () => {
      const input = "بسم\u0000الله\u0000الرحمن";
      const result = cleanArabicText(input);
      expect(typeof result).toBe("string");
    });

    it("mixed encoding garbage produces valid output", () => {
      const input = "\xFF\xFE\xFD بسم الله \x00\x01\x02 الرحمن \x80\x81\x82";
      const result = cleanArabicText(input);
      expect(result).toContain("بسم الله");
    });

    it("only HTML tags with no text content", () => {
      const input = "<div><p><b></b></p><span></span></div>";
      const result = generateMarkdown(input);
      expect(typeof result.markdown).toBe("string");
    });

    it("long single line (10K chars) handled gracefully", () => {
      const input = "بسم ".repeat(2500);
      const result = generateMarkdown(input);
      expect(typeof result.markdown).toBe("string");
      expect(result.metadata.wordCount).toBeGreaterThanOrEqual(0);
    });

    it("only page numbers and noise", () => {
      const input = "123\n- 5 -\nصفحة 10\n[42]\n•••••••";
      const result = generateMarkdown(input);
      expect(typeof result.markdown).toBe("string");
    });
  });

  describe("Export format recovery", () => {
    let cleaned: CleanedText;

    cleaned = generateMarkdown("بسم الله الرحمن الرحيم");

    it("TXT export handles empty markdown", () => {
      const emptyCleaned: CleanedText = {
        raw: "",
        cleaned: "",
        markdown: "",
        metadata: {
          pageCount: 1,
          headingCount: 0,
          wordCount: 0,
          charCount: 0,
          confidence: 0,
          garbageRatio: 0,
          htmlFragmentCount: 0,
          paragraphCount: 0,
          qualityScore: 0,
        },
      };
      const txt = generateTxt(emptyCleaned, false);
      expect(txt.trim()).toBe("");
    });

    it("JSON export handles empty metadata gracefully", () => {
      const emptyCleaned: CleanedText = {
        raw: "",
        cleaned: "",
        markdown: "",
        metadata: {
          pageCount: 1,
          headingCount: 0,
          wordCount: 0,
          charCount: 0,
          confidence: 0,
          garbageRatio: 0,
          htmlFragmentCount: 0,
          paragraphCount: 0,
          qualityScore: 0,
        },
      };
      const json = generateJson(emptyCleaned);
      const parsed = JSON.parse(json);
      expect(parsed.metadata.wordCount).toBe(0);
    });

    it("TXT export strips nested markdown correctly", () => {
      const md: CleanedText = {
        raw: "test",
        cleaned: "test",
        markdown: "## عنوان\n\n**bold text**\n\n- item 1\n- item 2\n\n[link](http://example.com)",
        metadata: {
          pageCount: 1,
          headingCount: 1,
          wordCount: 10,
          charCount: 50,
          confidence: 0.9,
          garbageRatio: 0,
          htmlFragmentCount: 0,
          paragraphCount: 1,
          qualityScore: 80,
        },
      };
      const txt = generateTxt(md, false);
      expect(txt).not.toContain("##");
      expect(txt).not.toContain("**");
      expect(txt).not.toContain("[link]");
      expect(txt).toContain("عنوان");
      expect(txt).toContain("bold text");
    });
  });

  describe("Metadata consistency after failures", () => {
    it("quality score stays in 0-100 range for any input", () => {
      const inputs = [
        "",
        "word",
        "بسم",
        Array(1000).fill("كلمة").join(" "),
        "!@#$%^&*()".repeat(100),
        "<html>".repeat(100),
      ];

      for (const input of inputs) {
        const result = generateMarkdown(input);
        expect(result.metadata.qualityScore).toBeGreaterThanOrEqual(0);
        expect(result.metadata.qualityScore).toBeLessThanOrEqual(100);
      }
    });

    it("confidence stays in 0-1 range for any input", () => {
      const inputs = [
        "pure english text here",
        "بسم الله الرحمن الرحيم",
        "mixed text بسم الله here",
        "",
      ];

      for (const input of inputs) {
        const result = generateMarkdown(input);
        expect(result.metadata.confidence).toBeGreaterThanOrEqual(0);
        expect(result.metadata.confidence).toBeLessThanOrEqual(1);
      }
    });

    it("word count is non-negative for any input", () => {
      const inputs = ["", "   ", "\n\n\n", "<br><br>"];

      for (const input of inputs) {
        const result = generateMarkdown(input);
        expect(result.metadata.wordCount).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("Idempotency", () => {
    it("cleaning same text twice produces same result", () => {
      const input = "\u202Bبسم الله الرحمن الرحيم\u200F <b>text</b>";
      const first = cleanArabicText(input);
      const second = cleanArabicText(first);
      expect(first).toBe(second);
    });

    it("generateMarkdown on already-cleaned text is stable", () => {
      const input = "## الفصل الاول\n\nبسم الله الرحمن الرحيم\n\nهذا نص تجريبي";
      const first = generateMarkdown(input);
      const second = generateMarkdown(first.cleaned);
      expect(first.markdown).toBe(second.markdown);
    });
  });
});
