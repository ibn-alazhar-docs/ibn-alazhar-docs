import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanArabicText, analyzeText } from "../../packages/pipeline/src/text";
import { generateMarkdown, generateTxt, generateJson } from "../../packages/pipeline/src/output";
import type { CleanedText, OcrEngineResult } from "../../packages/pipeline/src/types";
import { OcrManager, createOcrProvider } from "../../packages/pipeline/src/ocr-provider";
import { loadConfig } from "../../packages/pipeline/src/config";
import { randomBytes } from "node:crypto";

vi.mock("ioredis", () => ({
  default: class MockRedis {
    on() {}
    get() {}
    set() {}
    del() {}
  },
}));

vi.mock("minio", () => ({
  Client: class MockMinio {
    putObject() {}
    getObject() {}
    bucketExists() {}
    makeBucket() {}
  },
}));

vi.mock("@googleapis/drive", () => ({
  drive: () => ({
    files: {
      create: async () => ({ data: { id: "mock-file-id" } }),
      export: async () => ({ data: "نص تجريبي من Google Drive OCR\n\fصفحة ثانية" }),
      delete: async () => {},
    },
  }),
}));

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class MockGenAI {
    getGenerativeModel() {
      return {
        generateContent: async () => ({
          response: { text: () => "نص تجريبي من Gemini\n===PAGE_BREAK===\nصفحة ثانية" },
        }),
      };
    }
  },
}));

const PDF_BUFFER = Buffer.from("%PDF-1.4 mock pdf content");
const ARABIC_PDF_TEXT =
  "بسم الله الرحمن الرحيم\n## الفصل الأول\nالحمد لله رب العالمين والصلاة والسلام على رسول الله\nهذا كتاب التوحيد وهو من أهم كتب العقيدة";

const MIXED_TEXT =
  "بسم الله الرحمن الرحيم\n## Chapter 1: Introduction\nThis book covers Islamic jurisprudence (الفقه الإسلامي)\nand its principles (أصول الفقه)\nThe author is Imam Abu Hanifa (أبو حنيفة)";

describe("Full Pipeline Flow: Upload → OCR → Clean → Markdown → Export", () => {
  describe("PDF upload → OCR → cleanup flow", () => {
    it("simulates PDF upload and produces OCR result", async () => {
      const config = loadConfig();
      const manager = new OcrManager(config);
      const providers = manager.getAvailableProviders();

      expect(providers.length).toBeGreaterThan(0);
      expect(providers[0].name).toBeDefined();
      expect(providers[0].type).toBeDefined();
    });

    it("tesseract mock returns Arabic text via extractPages", async () => {
      process.env.MOCK_OCR = "true";
      const provider = createOcrProvider("tesseract");
      const config = loadConfig();

      const result = await provider.extractPages(
        config,
        [async () => Buffer.from("fake-page-1")],
        "test.pdf",
      );
      expect(result.text).toBeTruthy();
      expect(result.text.length).toBeGreaterThan(0);
      expect(result.engine).toBe("tesseract");
      expect(result.confidence).toBeGreaterThan(0);

      delete process.env.MOCK_OCR;
    });

    it("gemini OCR returns structured result via extractPages", async () => {
      process.env.MOCK_OCR = "true";
      const provider = createOcrProvider("gemini");
      const config = loadConfig();

      const result = await provider.extractPages(
        config,
        [async () => Buffer.from("fake-page-1")],
        "test.pdf",
      );
      expect(result.text).toBeTruthy();
      expect(result.pages.length).toBe(1);
      expect(result.engine).toBe("gemini");
    });

    it("gemini OCR returns result when mock enabled", async () => {
      process.env.MOCK_OCR = "true";
      const provider = createOcrProvider("gemini");
      const config = loadConfig();

      const result = await provider.extractPages(
        config,
        [async () => Buffer.from("fake-page-1")],
        "test.pdf",
      );
      expect(result.text).toBeTruthy();
      expect(result.engine).toBe("gemini");
      expect(result.pages.length).toBe(1);
      expect(result.pages[0].text).toContain("صفحة");

      delete process.env.MOCK_OCR;
    });
  });

  describe("OCR → Text Cleanup", () => {
    it("cleans raw OCR output and preserves Arabic content", () => {
      const rawOcr =
        "\u202Bبسم الله الرحمن الرحيم\u200F\n<b>هذا نص</b>\n<br>\n## التوحيد\n123\n- 5 -\n&&&&&";
      const cleaned = cleanArabicText(rawOcr);

      expect(cleaned).not.toContain("\u202B");
      expect(cleaned).not.toContain("\u200F");
      expect(cleaned).not.toContain("<b>");
      expect(cleaned).not.toContain("<br>");
      expect(cleaned).not.toContain("&&&&&");
      expect(cleaned).toContain("بسم الله");
      expect(cleaned).toContain("التوحيد");
    });

    it("handles repeated word artifacts from OCR", () => {
      const raw = "بسم بسم بسم بسم الله الله الله الله";
      const cleaned = cleanArabicText(raw);
      expect(cleaned).not.toContain("بسم بسم بسم بسم");
      expect(cleaned).toContain("الله");
    });

    it("cleans mixed Arabic/English and preserves both", () => {
      const cleaned = cleanArabicText(MIXED_TEXT);
      expect(cleaned).toContain("Chapter 1");
      expect(cleaned).toContain("الفقه");
      expect(cleaned).toContain("ابو حن");
    });

    it("OCR exclamation artifacts are removed from Arabic text", () => {
      const cleaned = cleanArabicText("الله!!أكبر!!");
      expect(cleaned).not.toMatch(/[\u0600-\u06FF]![\u0600-\u06FF]/);
      expect(cleaned).toContain("الله");
    });
  });

  describe("Cleanup → Markdown Generation", () => {
    it("generates valid markdown from cleaned Arabic text", () => {
      const result = generateMarkdown(ARABIC_PDF_TEXT, {
        title: "كتاب التوحيد",
        includeMetadata: true,
        pageCount: 3,
      });

      expect(result.markdown.length).toBeGreaterThan(0);
      expect(result.markdown).toContain("##");
      expect(result.metadata.wordCount).toBeGreaterThan(0);
      expect(result.metadata.headingCount).toBeGreaterThanOrEqual(1);
      expect(result.metadata.qualityScore).toBeGreaterThan(0);
    });

    it("includes metadata frontmatter when requested", () => {
      const result = generateMarkdown(ARABIC_PDF_TEXT, {
        includeMetadata: true,
        pageCount: 3,
      });

      expect(result.markdown).toContain("---");
      expect(result.markdown).toContain("total_words:");
      expect(result.markdown).toContain("quality_score:");
    });

    it("metadata frontmatter omitted when not requested", () => {
      const result = generateMarkdown(ARABIC_PDF_TEXT, { includeMetadata: false });
      expect(result.markdown).not.toContain("---");
    });

    it("generated markdown has raw, cleaned, and metadata fields", () => {
      const result = generateMarkdown(ARABIC_PDF_TEXT);
      expect(result.raw).toBe(ARABIC_PDF_TEXT);
      expect(result.cleaned).toBeTruthy();
      expect(result.cleaned).not.toBe(ARABIC_PDF_TEXT);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.pageCount).toBeGreaterThanOrEqual(1);
    });

    it("analyzeText on cleaned output matches generateMarkdown metadata", () => {
      const result = generateMarkdown(ARABIC_PDF_TEXT, { pageCount: 3 });
      const analysis = analyzeText(result.cleaned, result.metadata.pageCount);

      expect(analysis.wordCount).toBe(result.metadata.wordCount);
      expect(analysis.headingCount).toBe(result.metadata.headingCount);
      expect(analysis.arabicRatio).toBeCloseTo(result.metadata.confidence, 1);
    });

    it("empty text produces empty markdown gracefully", () => {
      const result = generateMarkdown("");
      expect(result.markdown).toBe("");
      expect(result.metadata.wordCount).toBe(0);
    });
  });

  describe("Markdown → Export Formats", () => {
    let cleanedText: CleanedText;

    beforeEach(() => {
      cleanedText = generateMarkdown(ARABIC_PDF_TEXT, {
        title: "كتاب التوحيد",
        includeMetadata: true,
        pageCount: 3,
      });
    });

    it("generates TXT export without markdown headings", () => {
      const txt = generateTxt(cleanedText, false);
      expect(txt).not.toContain("##");
      expect(txt).toContain("بسم الله");
      expect(txt).toContain("التوحيد");
    });

    it("TXT with metadata includes header fields", () => {
      const txt = generateTxt(cleanedText, true);
      expect(txt).toContain("Ibn Al-Azhar Docs");
      expect(txt).toContain("Pages:");
      expect(txt).toContain("Words:");
    });

    it("generates valid JSON export", () => {
      const json = generateJson(cleanedText, "test-book.pdf");
      const parsed = JSON.parse(json);

      expect(parsed).toHaveProperty("source");
      expect(parsed).toHaveProperty("content");
      expect(parsed).toHaveProperty("metadata");
      expect(parsed.source).toBe("test-book.pdf");
      expect(parsed.content.raw).toBe(ARABIC_PDF_TEXT);
    });

    it("JSON export includes valid timestamp", () => {
      const json = generateJson(cleanedText);
      const parsed = JSON.parse(json);
      const date = new Date(parsed.generatedAt);
      expect(date.toISOString()).toBe(parsed.generatedAt);
    });

    it("TXT and JSON contain same core Arabic content", () => {
      const txt = generateTxt(cleanedText, false);
      const parsed = JSON.parse(generateJson(cleanedText));
      expect(txt).toContain("بسم الله");
      expect(parsed.content.raw).toContain("بسم الله");
    });
  });

  describe("Mixed Arabic/English content pipeline", () => {
    it("processes mixed language text through all stages", () => {
      const cleaned = cleanArabicText(MIXED_TEXT);
      expect(cleaned).toContain("Chapter");
      expect(cleaned).toContain("الفقه");

      const result = generateMarkdown(cleaned, {
        title: "Mixed Content",
        pageCount: 2,
      });

      expect(result.markdown).toContain("الفقه");
      expect(result.metadata.wordCount).toBeGreaterThan(0);
    });

    it("quality score reflects mixed content ratio", () => {
      const result = generateMarkdown(MIXED_TEXT, { pageCount: 2 });
      expect(result.metadata.confidence).toBeGreaterThan(0);
      expect(result.metadata.garbageRatio).toBeDefined();
    });
  });

  describe("Multiple document types pipeline compatibility", () => {
    const RAW_OCR_TABLE = `
## جدول المحتويات
| الفصل | الموضوع | الصفحة |
|-------|---------|--------|
| الأول | التوحيد | 1 |
| الثاني | الفقه | 25 |
`;

    const RAW_OCR_WITH_HTML = `
<div class="page">متن الكتاب</div>
<p>هذا هو الفصل الأول <b>المهم</b></p>
<span style="color:red">هامش</span>
`;

    it("OCR with tables produces clean markdown tables", () => {
      const result = generateMarkdown(RAW_OCR_TABLE);
      expect(result.markdown).toContain("|");
      expect(result.markdown).toContain("التوحيد");
      expect(result.markdown).toContain("الفقه");
    });

    it("OCR with HTML tags produces clean markdown without HTML", () => {
      const result = generateMarkdown(RAW_OCR_WITH_HTML);
      expect(result.markdown).not.toContain("<div");
      expect(result.markdown).not.toContain("<p>");
      expect(result.markdown).not.toContain("<b>");
      expect(result.markdown).toContain("متن الكتاب");
      expect(result.markdown).toContain("الفصل");
    });

    it("analyzeText accurately reports characteristics", () => {
      const rawSample =
        "## الباب الأول\nهذا نص عربي طويل يحتوي على عدة كلمات وجمل مفيدة\n## الباب الثاني\nوهذا باب آخر به محتوى مختلف";
      const analysis = analyzeText(rawSample, 2);

      expect(analysis.headingCount).toBe(2);
      expect(analysis.level2HeadingCount).toBe(2);
      expect(analysis.wordCount).toBeGreaterThan(10);
      expect(analysis.arabicRatio).toBeGreaterThan(0.5);
      expect(analysis.qualityScore).toBeGreaterThan(0);
      expect(analysis.pageCount).toBe(2);
    });
  });
});
