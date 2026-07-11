import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanArabicText, analyzeText } from "../../packages/pipeline/src/text";
import {
  generateMarkdown,
  generateTxt,
  generateJson,
  generateDocx,
  generateEpub,
  generatePdf,
} from "../../packages/pipeline/src/output";
import type { CleanedText } from "../../packages/pipeline/src/types";
import {
  estimateConfidence,
  toOcrPageResult,
  getPythonCommand,
} from "../../packages/pipeline/src/ocr-providers/types";
import { validatePdf } from "../../packages/pipeline/src/storage";
import { categorizeFailure } from "../../packages/pipeline/src/queue";
import {
  encryptToken,
  decryptToken,
  CIPHERTEXT_PREFIX,
} from "@ibn-al-azhar-docs/database/encryption";
import { loadConfig } from "../../packages/pipeline/src/config";
import {
  getDriveClient,
  ensureDriveFolder,
  uploadToDrive,
  downloadFromDrive,
} from "../../packages/pipeline/src/google-drive";
import { google } from "googleapis";
import { Readable } from "stream";
import { DistributedLockService } from "@/clients/redis/rate-limit/distributed-lock";
import { getRedisClient } from "@/clients/redis/rate-limit/redis";

// ─── text/clean.ts ──────────────────────────────────────────────────────────

describe("cleanArabicText — text/clean.ts: null byte & control chars", () => {
  it("handles null bytes without throwing", () => {
    const r = cleanArabicText("بسم\u0000الله");
    expect(typeof r).toBe("string");
  });

  it("handles object replacement char (U+FFFC)", () => {
    const r = cleanArabicText("\uFFFCبسم الله\uFFFC");
    expect(typeof r).toBe("string");
    expect(r).toContain("بسم");
  });

  it("handles zero-width non-joiner (U+200C)", () => {
    const r = cleanArabicText("بسم\u200Cالله");
    expect(typeof r).toBe("string");
    expect(r).toContain("بسم");
  });

  it("text composed entirely of control chars becomes empty or short", () => {
    const input = "\u0000\u0001\u0002\u200B\u200C\u200D\uFEFF";
    const r = cleanArabicText(input);
    expect(r.length).toBeLessThan(3);
  });
});

describe("cleanArabicText — text/clean.ts: emoji & non-Arabic scripts", () => {
  it("handles emoji in mixed Arabic text", () => {
    const r = cleanArabicText("بسم الله 📚 كتاب");
    expect(typeof r).toBe("string");
  });

  it("handles CJK characters mixed with Arabic without crashing", () => {
    const r = cleanArabicText("بسم الله 你好世界");
    expect(typeof r).toBe("string");
  });

  it("handles Devanagari mixed with Arabic without crashing", () => {
    const r = cleanArabicText("بسم الله नमस्ते");
    expect(typeof r).toBe("string");
  });
});

describe("cleanArabicText — text/clean.ts: edge options", () => {
  it("all options disabled returns normalized input", () => {
    const input = "  بسم  \n  الله  ";
    const r = cleanArabicText(input, {
      normalizeUnicode: false,
      normalizeArabic: false,
      removeTashkeel: false,
      removeTatweel: false,
      normalizeDigits: false,
      normalizeWhitespace: false,
      removeBrokenHtml: false,
      removeAsciiNoise: false,
      removeRepeatedTokens: false,
      removeGarbageSymbols: false,
      normalizePunctuation: false,
      removeIsolatedFragments: false,
      collapseRepeatedWords: false,
      reconstructLines: false,
      detectHeadings: false,
      removePageNoise: false,
      collapseRepeatedParagraphs: false,
      finalCleanup: false,
    });
    expect(r).toBe(input);
  });

  it("removeTashkeel with removeTatweel false retains tatweel", () => {
    const r = cleanArabicText("كتــاب", { removeTashkeel: true, removeTatweel: false });
    expect(r).toContain("ـ");
  });
});

describe("cleanArabicText — text/clean.ts: HTML edge cases", () => {
  it("self-closing img tag removed", () => {
    const r = cleanArabicText("بسم <img src='x'/> الله");
    expect(r).not.toContain("<img");
    expect(r).toContain("بسم");
    expect(r).toContain("الله");
  });

  it("tag with > inside attribute handled gracefully", () => {
    const r = cleanArabicText('بسم <span data-foo="a>b">الله</span>');
    expect(r).not.toContain("<span");
  });
});

describe("cleanArabicText — text/clean.ts: very long text (100k+)", () => {
  it("processes 100k characters without error", () => {
    const base = "بسم الله الرحمن الرحيم في كتاب الله العزيز ".repeat(2500);
    expect(base.length).toBeGreaterThanOrEqual(100_000);
    const r = cleanArabicText(base);
    expect(r.length).toBeGreaterThan(0);
  });

  it("processes 500k characters without error", () => {
    const base = "بسم الله الرحمن الرحيم في كتاب الله العزيز ".repeat(12000);
    expect(base.length).toBeGreaterThanOrEqual(500_000);
    const r = cleanArabicText(base);
    expect(r.length).toBeGreaterThan(0);
  });
});

describe("cleanArabicText — text/clean.ts: repeated paragraph collapse", () => {
  it("collapses paragraphs with >70% similarity", () => {
    const para = "هذا النص مكرر في المستند أكثر من مرة في نفس السياق والعبارة";
    const input = para + "\n\n" + para + "\n\n" + para;
    const r = cleanArabicText(input);
    const count = r.split("\n\n").filter(Boolean).length;
    expect(count).toBeLessThan(3);
  });

  it("keeps paragraphs with completely different content", () => {
    const a = "بسم الله الرحمن الرحيم الحمد لله رب العالمين والصلاه والسلام على سيدنا محمد.";
    const b = "الجدول الدوري للعناصر الكيميائية يحتوي على 118 عنصرا مقسمة إلى مجموعات ودورات.";
    const input = a + "\n\n" + b;
    const r = cleanArabicText(input, {
      reconstructLines: false,
      finalCleanup: false,
      normalizeWhitespace: false,
    });
    const paras = r.split(/\n{2,}/).filter(Boolean);
    expect(paras.length).toBeGreaterThanOrEqual(2);
  });
});

describe("cleanArabicText — text/clean.ts: ASCII noise edge cases", () => {
  it("line with only single ASCII chars and arabic ratio <= 0.4 preserved", () => {
    const r = cleanArabicText("hello world");
    expect(r).toContain("hello");
  });

  it("heading prefix (#) lines not treated as noise", () => {
    const r = cleanArabicText("## عنوان رئيسي");
    expect(r).toContain("##");
  });

  it("preserves lines starting with --- through noise filter", () => {
    const r = cleanArabicText("---\ntitle: test\n---\nبسم الله");
    expect(typeof r).toBe("string");
  });

  it("line with 0 non-whitespace chars after trim is passed through", () => {
    const r = cleanArabicText("   ");
    expect(typeof r).toBe("string");
  });
});

describe("cleanArabicText — text/clean.ts: garbage symbol edge cases", () => {
  it("lines with exactly 60% symbols and real content >= 3 kept", () => {
    const input = "بسم الله\nab!@#!@#!@#\nالرحمن";
    const r = cleanArabicText(input);
    expect(r).toContain("بسم");
  });

  it("pure digit lines are removed as page noise", () => {
    const input = "بسم الله\n9999999999\nالرحمن";
    const r = cleanArabicText(input);
    expect(r).not.toMatch("\n9999999999\n");
  });

  it("short lines (< 2 chars not garbage-filtered)", () => {
    const input = "بسم\na\nالرحمن";
    const r = cleanArabicText(input);
    expect(typeof r).toBe("string");
  });
});

describe("cleanArabicText — text/clean.ts: isolated fragments", () => {
  it("line with only 3 symbols removed", () => {
    const input = "بسم الله\n!@#\nالرحمن الرحيم";
    const r = cleanArabicText(input);
    expect(r).not.toContain("!@#");
  });

  it("line with bullet (-) preserved even if short", () => {
    const r = cleanArabicText("- بند");
    expect(r).toContain("-");
  });

  it("line starting with > preserved even if short", () => {
    const r = cleanArabicText("> اقتباس");
    expect(r).toContain(">");
  });
});

describe("cleanArabicText — text/clean.ts: heading detection edge cases", () => {
  it("heading with alef wasla (ٱ) treated properly", () => {
    const r = cleanArabicText("الفصل ٱول في التوحيد");
    expect(typeof r).toBe("string");
    expect(r).toContain("الفصل");
  });
});

// ─── text/analyze.ts ───────────────────────────────────────────────────────

describe("analyzeText — text/analyze.ts: boundary values", () => {
  it("only whitespace returns zero wordCount and arabicRatio", () => {
    const a = analyzeText("   \n\n  \t  ");
    expect(a.charCount).toBe(10);
    expect(a.wordCount).toBe(0);
    expect(a.arabicRatio).toBe(0);
  });

  it("exactly 250 words -> pageCount = 1", () => {
    const words = Array.from({ length: 250 }, (_, i) => "word" + i);
    const a = analyzeText(words.join(" "));
    expect(a.wordCount).toBe(250);
    expect(a.pageCount).toBe(1);
  });

  it("exactly 251 words -> pageCount = 2", () => {
    const words = Array.from({ length: 251 }, (_, i) => "word" + i);
    const a = analyzeText(words.join(" "));
    expect(a.pageCount).toBe(2);
  });

  it("knownPageCount overrides computed pageCount", () => {
    const a = analyzeText("بسم الله", 42);
    expect(a.pageCount).toBe(42);
  });

  it("knownPageCount = 0 is ignored (uses default)", () => {
    const a = analyzeText("", 0);
    expect(a.pageCount).toBe(1);
  });

  it("negative knownPageCount is ignored", () => {
    const a = analyzeText("بسم الله", -5);
    expect(a.pageCount).toBe(1);
  });

  it("garbageRatio for all-garbage lines is > 0", () => {
    const text = "xyzzyy\nabcdee\nqwerty";
    const a = analyzeText(text);
    expect(a.garbageRatio).toBeGreaterThan(0);
  });

  it("qualityScore for english text is low", () => {
    const a = analyzeText("hello world this is a test document with no arabic content at all");
    expect(a.qualityScore).toBeLessThan(50);
  });

  it("qualityScore for structured arabic text is high", () => {
    const longPara = "بسم الله الرحمن الرحيم في كتاب الله العزيز الذي أنزله على عبده ".repeat(10);
    const text = "# كتاب الله\n\n" + longPara + "\n\n## الفصل الأول\n\n" + longPara;
    const a = analyzeText(text);
    expect(a.qualityScore).toBeGreaterThanOrEqual(70);
  });

  it("qualityScore for empty text is 0", () => {
    const a = analyzeText("");
    expect(a.qualityScore).toBe(0);
  });

  it("htmlFragmentCount counts remaining HTML tags", () => {
    const a = analyzeText("بسم <b>الله</b>");
    expect(a.htmlFragmentCount).toBeGreaterThanOrEqual(1);
  });

  it("single paragraph returns paragraphCount = 1", () => {
    const a = analyzeText("بسم الله الرحمن الرحيم في كتابه العزيز");
    expect(a.paragraphCount).toBe(1);
  });

  it("no paragraph (all short lines) returns paragraphCount = 0", () => {
    const a = analyzeText("a\nb\nc");
    expect(a.paragraphCount).toBe(0);
  });

  it("charCount equals text length including whitespace", () => {
    const text = "  بسم الله  ";
    const a = analyzeText(text);
    expect(a.charCount).toBe(text.length);
  });
});

// ─── output (markdown) ─────────────────────────────────────────────────────

describe("generateMarkdown — output/markdown.ts: edge cases", () => {
  it("empty options object does not throw", () => {
    const r = generateMarkdown("بسم الله", {});
    expect(typeof r.markdown).toBe("string");
  });

  it("includeMetadata with zero word count produces no frontmatter", () => {
    const r = generateMarkdown("", { includeMetadata: true });
    expect(r.markdown).not.toContain("---");
    expect(r.markdown).toBe("");
  });

  it("text with only dashes (---) generates valid markdown", () => {
    const r = generateMarkdown("---");
    expect(typeof r.markdown).toBe("string");
  });

  it("blockquote marker > converted", () => {
    const r = generateMarkdown("> بسم الله");
    expect(r.markdown).toContain("> ");
  });

  it("text with pipe but not a table (single |) handled", () => {
    const r = generateMarkdown("بسم | الله");
    expect(r.markdown).toContain("بسم");
  });

  it("table with separator row renders correctly", () => {
    const md = "Header 1 | Header 2\n| --- | ---\nCell 1 | Cell 2";
    const r = generateMarkdown(md);
    expect(r.markdown).toContain("Header 1");
  });

  it("very long text (10k words) composes without crash", () => {
    const words = Array.from({ length: 10000 }, (_, i) => "كلمة" + i);
    const r = generateMarkdown(words.join(" "));
    expect(r.metadata.wordCount).toBeGreaterThan(9000);
  });

  it("text cleaned before markdown: removes tatweel", () => {
    const r = generateMarkdown("كتــاب");
    expect(r.markdown).not.toContain("ـ");
  });
});

// ─── output (txt) ─────────────────────────────────────────────────────────

describe("generateTxt — output/txt.ts: edge cases", () => {
  it("markdown with only frontmatter produces clean output", () => {
    const c = makeCleaned({ markdown: "---\ngenerated: 2024\n---\n" });
    const r = generateTxt(c, false);
    expect(r).not.toContain("---");
  });

  it("markdown with only bold text strips **", () => {
    const c = makeCleaned({ markdown: "**نص عريض**" });
    const r = generateTxt(c, false);
    expect(r).not.toContain("**");
  });

  it("markdown with links strips URL keeping text", () => {
    const c = makeCleaned({ markdown: "[رابط](https://example.com)" });
    const r = generateTxt(c, false);
    expect(r).toContain("رابط");
    expect(r).not.toContain("http");
  });

  it("metadata with zero confidence shows 0.0%", () => {
    const c = makeCleaned({ metadata: { ...makeCleaned().metadata, confidence: 0 } });
    const r = generateTxt(c, true);
    expect(r).toContain("0.0%");
  });

  it("metadata with 100% confidence shows 100.0%", () => {
    const c = makeCleaned({ metadata: { ...makeCleaned().metadata, confidence: 1 } });
    const r = generateTxt(c, true);
    expect(r).toContain("100.0%");
  });
});

// ─── output (json) ───────────────────────────────────────────────────────

describe("generateJson — output/json.ts: edge cases", () => {
  it("all empty strings in input", () => {
    const c = makeCleaned({ raw: "", cleaned: "", markdown: "" });
    const r = JSON.parse(generateJson(c));
    expect(r.content.raw).toBe("");
    expect(r.content.cleaned).toBe("");
    expect(r.markdown).toBe("");
  });

  it("source undefined returns 'unknown'", () => {
    const r = JSON.parse(generateJson(makeCleaned(), undefined as unknown as string));
    expect(r.source).toBe("unknown");
  });

  it("generatedAt is valid ISO timestamp", () => {
    const r = JSON.parse(generateJson(makeCleaned()));
    expect(() => new Date(r.generatedAt)).not.toThrow();
  });

  it("metadata with zero values serializes correctly", () => {
    const c = makeCleaned({
      metadata: {
        pageCount: 0,
        headingCount: 0,
        wordCount: 0,
        charCount: 0,
        confidence: 0,
        garbageRatio: 0,
        htmlFragmentCount: 0,
        paragraphCount: 0,
        qualityScore: 0,
      },
    });
    const r = JSON.parse(generateJson(c));
    expect(r.metadata.pageCount).toBe(0);
    expect(r.metadata.qualityScore).toBe(0);
  });
});

// ─── output (docx/epub/pdf) ─────────────────────────────────────────────

describe("generateDocx — output/pandoc.ts: edge cases", () => {
  it("markdown with only cleaned text fallback", async () => {
    const c = makeCleaned({ cleaned: "نص نظيف", markdown: "" });
    const buf = await generateDocx(c);
    expect(buf.length).toBeGreaterThan(0);
  });

  it("very long cleaned text", async () => {
    const c = makeCleaned({ cleaned: "نص ".repeat(5000), markdown: "نص ".repeat(5000) });
    const buf = await generateDocx(c);
    expect(buf.length).toBeGreaterThan(0);
  });
});

describe("generateEpub — output/pandoc.ts: edge cases", () => {
  it("markdown with only cleaned text fallback", async () => {
    const c = makeCleaned({ cleaned: "نص نظيف", markdown: "" });
    const buf = await generateEpub(c);
    expect(buf.length).toBeGreaterThan(0);
  });
});

describe("generatePdf — output/pdf.ts: edge cases", () => {
  it("handles fontSize 0", async () => {
    const buf = await generatePdf(makeCleaned(), { fontSize: 0 });
    expect(buf.length).toBeGreaterThan(0);
  });

  it("handles watermark with CJK chars", async () => {
    const buf = await generatePdf(makeCleaned(), { watermark: "水印テスト" });
    expect(buf.length).toBeGreaterThan(0);
  });

  it("handles markdown with only headings", async () => {
    const c = makeCleaned({ markdown: "# الأول\n\n## الثاني\n\n### الثالث" });
    const buf = await generatePdf(c);
    expect(buf.length).toBeGreaterThan(0);
  });

  it("handles empty markdown and cleaned", async () => {
    const c = makeCleaned({ cleaned: "", markdown: "" });
    const buf = await generatePdf(c);
    expect(buf.length).toBeGreaterThan(0);
  });
});

// ─── ocr-types ───────────────────────────────────────────────────────────

describe("estimateConfidence — ocr-providers/types.ts: edge cases", () => {
  it("text with ~45% arabic returns 0.7", () => {
    const t = "aaaaa bbbbb ccccc ddddd eeeee " + "السلام عليكم ورحمة الله وبركاته";
    expect(estimateConfidence(t)).toBe(0.7);
  });

  it("text with ~80% arabic returns 0.9", () => {
    const t = "abc " + "السلام عليكم ورحمة الله وبركاته وبعد فإن";
    expect(estimateConfidence(t)).toBe(0.9);
  });

  it("text with 0% arabic returns 0.5", () => {
    expect(estimateConfidence("Hello world this is english")).toBe(0.5);
  });

  it("text with 100% arabic returns 0.9", () => {
    expect(estimateConfidence("الحمد لله رب العالمين الرحمن الرحيم")).toBe(0.9);
  });
});

describe("toOcrPageResult — ocr-providers/types.ts: edge cases", () => {
  it("empty pages array returns empty array", () => {
    expect(toOcrPageResult([])).toEqual([]);
  });

  it("pages with empty text get confidence 0", () => {
    const r = toOcrPageResult([{ number: 1, text: "" }]);
    expect(r[0].confidence).toBe(0);
  });

  it("pages with only whitespace get confidence 0", () => {
    const r = toOcrPageResult([{ number: 1, text: "   " }]);
    expect(r[0].confidence).toBe(0);
  });

  it("single page returned correctly", () => {
    const r = toOcrPageResult([{ number: 42, text: "نص" }]);
    expect(r).toHaveLength(1);
    expect(r[0].number).toBe(42);
  });
});

describe("getPythonCommand — ocr-providers/types.ts: edge cases", () => {
  beforeEach(() => {
    vi.stubEnv("SURYA_PYTHON_PATH", "");
    vi.stubEnv("HOME", "/nonexistent");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("returns python3 when HOME has no .venv", () => {
    expect(getPythonCommand()).toBe("python3");
  });

  it("empty SURYA_PYTHON_PATH falls through", () => {
    vi.stubEnv("SURYA_PYTHON_PATH", "");
    expect(getPythonCommand()).toBe("python3");
  });
});

// ─── storage/validatePdf ────────────────────────────────────────────────────

describe("validatePdf — storage.ts: image magic bytes", () => {
  it("JPEG buffer without valid magic bytes => IMAGE_CORRUPT", () => {
    const buf = Buffer.from([0x00, 0x00, 0x00, ...new Array(97).fill(0)]);
    const r = validatePdf(buf, "image/jpeg", 100);
    expect(r.valid).toBe(false);
    expect(r.errorCode).toBe("IMAGE_CORRUPT");
  });

  it("PNG buffer without valid magic bytes => IMAGE_CORRUPT", () => {
    const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, ...new Array(96).fill(0)]);
    const r = validatePdf(buf, "image/png", 100);
    expect(r.valid).toBe(false);
    expect(r.errorCode).toBe("IMAGE_CORRUPT");
  });
});

describe("validatePdf — storage.ts: boundary sizes", () => {
  it("rejects buffer > 100MB even with tiny reported size", () => {
    const oversized = Buffer.alloc(101 * 1024 * 1024);
    const r = validatePdf(oversized, "application/pdf", 1);
    expect(r.valid).toBe(false);
    expect(r.errorCode).toBe("FILE_TOO_LARGE");
  });

  it("buffer exactly 19 bytes => PDF_MALFORMED", () => {
    const buf = Buffer.alloc(19);
    const r = validatePdf(buf, "application/pdf", 19);
    expect(r.valid).toBe(false);
    expect(r.errorCode).toBe("PDF_MALFORMED");
  });

  it("buffer exactly 20 bytes with valid PDF => valid", () => {
    const buf = Buffer.from("%PDF-1.4\nxxxxx%%EOF\n");
    expect(buf.length).toBe(20);
    const r = validatePdf(buf, "application/pdf", 20);
    expect(r.valid).toBe(true);
  });
});

describe("validatePdf — storage.ts: empty buffer", () => {
  it("empty buffer with valid MIME fails with PDF_MALFORMED (too small)", () => {
    const r = validatePdf(Buffer.alloc(0), "application/pdf", 0);
    expect(r.valid).toBe(false);
    expect(r.errorCode).toBe("PDF_MALFORMED");
  });
});

// ─── config ─────────────────────────────────────────────────────────────────

describe("loadConfig — config.ts: production mode & edge cases", () => {
  function withKeys(): void {
    process.env.S3_ACCESS_KEY_ID = "test-key";
    process.env.S3_SECRET_ACCESS_KEY = "test-secret";
  }

  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.S3_ACCESS_KEY_ID;
    delete process.env.MINIO_ACCESS_KEY;
    delete process.env.S3_SECRET_ACCESS_KEY;
    delete process.env.MINIO_SECRET_KEY;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllEnvs();
  });

  it("throws in production when access key is missing", () => {
    expect(() => loadConfig()).toThrow(/S3_ACCESS_KEY_ID/);
  });

  it("throws in production when secret key is missing", () => {
    delete process.env.S3_SECRET_ACCESS_KEY;
    process.env.S3_ACCESS_KEY_ID = "key";
    expect(() => loadConfig()).toThrow(/S3_SECRET_ACCESS_KEY/);
  });

  it("loads gemini api key and model from env", () => {
    withKeys();
    process.env.GEMINI_API_KEY = "test-gemini-key";
    process.env.GEMINI_MODEL = "gemini-2.0-flash";
    const c = loadConfig();
    expect(c.gemini.apiKey).toBe("test-gemini-key");
    expect(c.gemini.model).toBe("gemini-2.0-flash");
  });

  it("redis TLS enabled via rediss:// URL", () => {
    withKeys();
    process.env.REDIS_URL = "rediss://redis-host:6380";
    const c = loadConfig();
    expect(c.redis.tls).toBe(true);
  });

  it("OCR_PROVIDERS with whitespace returns default list", () => {
    withKeys();
    process.env.OCR_PROVIDERS = "  ,  , ";
    const c = loadConfig();
    expect(c.ocr.providers).toEqual(["surya", "tesseract"]);
  });

  it("OCR_CLOUD_ENABLED adds cloud providers", () => {
    withKeys();
    process.env.OCR_CLOUD_ENABLED = "true";
    const c = loadConfig();
    expect(c.ocr.providers).toContain("gemini");
  });

  it("S3_ENDPOINT with trailing slash parsed correctly", () => {
    withKeys();
    process.env.S3_ENDPOINT = "http://minio-host/";
    const c = loadConfig();
    expect(c.minio.endpoint).toBe("minio-host");
  });
});

// ─── encryption ────────────────────────────────────────────────────────────

describe("encryption — encryption.ts: edge inputs", () => {
  const SECRET = "0".repeat(64);
  const ORIGINAL = process.env.TOKEN_ENCRYPTION_KEY;

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.TOKEN_ENCRYPTION_KEY;
    else process.env.TOKEN_ENCRYPTION_KEY = ORIGINAL;
  });

  it("encrypts empty string", () => {
    process.env.TOKEN_ENCRYPTION_KEY = SECRET;
    const c = encryptToken("");
    expect(c).not.toBe("");
    expect(c.startsWith(CIPHERTEXT_PREFIX)).toBe(true);
    expect(decryptToken(c)).toBe("");
  });

  it("encrypts unicode token", () => {
    process.env.TOKEN_ENCRYPTION_KEY = SECRET;
    const t = "عبد الرحمن日本語";
    const c = encryptToken(t);
    expect(decryptToken(c)).toBe(t);
  });

  it("encrypts very long token (100k chars)", () => {
    process.env.TOKEN_ENCRYPTION_KEY = SECRET;
    const t = "a".repeat(100000);
    const c = encryptToken(t);
    expect(c.length).toBeGreaterThan(0);
    expect(decryptToken(c)).toBe(t);
  });

  it("encrypts token with special characters", () => {
    process.env.TOKEN_ENCRYPTION_KEY = SECRET;
    const t = '{"access":"ya29.a0\\n\\x00secret"}';
    const c = encryptToken(t);
    expect(decryptToken(c)).toBe(t);
  });

  it("key derived via SHA-256 for arbitrary length key", () => {
    process.env.TOKEN_ENCRYPTION_KEY = "any-arbitrary-length-key-that-is-not-32-or-64";
    const t = "token123";
    const c = encryptToken(t);
    expect(c.startsWith(CIPHERTEXT_PREFIX)).toBe(true);
    expect(decryptToken(c)).toBe(t);
  });

  it("ciphertext with invalid base64 content returns as-is", () => {
    process.env.TOKEN_ENCRYPTION_KEY = SECRET;
    const bad = CIPHERTEXT_PREFIX + "!!!not-base64!!!";
    expect(decryptToken(bad)).toBe(bad);
  });

  it("tampered IV/TAG in ciphertext returns as-is", () => {
    process.env.TOKEN_ENCRYPTION_KEY = SECRET;
    const c = encryptToken("secret");
    const chars = c.split("");
    chars[10] = chars[10] === "a" ? "b" : "a";
    const tampered = chars.join("");
    expect(decryptToken(tampered)).toBe(tampered);
  });

  it("key removed after encryption returns ciphertext as-is", () => {
    process.env.TOKEN_ENCRYPTION_KEY = SECRET;
    const c = encryptToken("secret");
    delete process.env.TOKEN_ENCRYPTION_KEY;
    expect(decryptToken(c)).toBe(c);
  });

  it("multiple round trips preserve value", () => {
    process.env.TOKEN_ENCRYPTION_KEY = SECRET;
    const t = "round-trip-token";
    const c1 = encryptToken(t);
    const d1 = decryptToken(c1);
    const c2 = encryptToken(d1);
    const d2 = decryptToken(c2);
    expect(d2).toBe(t);
  });
});

// ─── google-drive ───────────────────────────────────────────────────────────

vi.mock("googleapis", () => {
  const mOAuth2 = { setCredentials: vi.fn() };
  const mOAuth2Client = vi.fn(() => mOAuth2);
  const mFiles = { list: vi.fn(), create: vi.fn(), get: vi.fn(), delete: vi.fn() };
  const mDrive = { files: mFiles };
  return { google: { auth: { OAuth2: mOAuth2Client }, drive: vi.fn(() => mDrive) } };
});

describe("Google Drive — drive service: failure paths", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ensureDriveFolder: api timeout rejects", async () => {
    const mockDrive = {
      files: { list: vi.fn().mockRejectedValue(new Error("timeout")), create: vi.fn() },
    } as any;
    await expect(ensureDriveFolder(mockDrive, "test")).rejects.toThrow("timeout");
  });

  it("ensureDriveFolder: folder name with single quotes handled", async () => {
    const mockDrive = {
      files: {
        list: vi.fn().mockResolvedValue({ data: { files: [] } }),
        create: vi.fn().mockResolvedValue({ data: { id: "new_id" } }),
      },
    } as any;
    const id = await ensureDriveFolder(mockDrive, "Ibn Al-Azhar's Docs");
    expect(id).toBe("new_id");
  });

  it("ensureDriveFolder: list returns null data files", async () => {
    const mockDrive = {
      files: {
        list: vi.fn().mockResolvedValue({ data: { files: null } }),
        create: vi.fn().mockResolvedValue({ data: { id: "created" } }),
      },
    } as any;
    const id = await ensureDriveFolder(mockDrive, "test");
    expect(id).toBe("created");
  });

  it("uploadToDrive: empty buffer uploads successfully", async () => {
    const mockDrive = {
      files: { create: vi.fn().mockResolvedValue({ data: { id: "file_id" } }) },
    } as any;
    const id = await uploadToDrive(mockDrive, "empty.txt", "text/plain", Buffer.alloc(0));
    expect(id).toBe("file_id");
  });

  it("downloadFromDrive: empty response yields empty buffer", async () => {
    const mockStream = new Readable({
      read() {
        this.push(null);
      },
    });
    const mockDrive = { files: { get: vi.fn().mockResolvedValue({ data: mockStream }) } } as any;
    const buf = await downloadFromDrive(mockDrive, "file_id");
    expect(buf.length).toBe(0);
  });

  it("downloadFromDrive: response larger than 100MB fails", async () => {
    const mockStream = new Readable({
      read() {
        this.push(Buffer.alloc(60 * 1024 * 1024));
        this.push(Buffer.alloc(60 * 1024 * 1024));
        this.push(null);
      },
    });
    const mockDrive = { files: { get: vi.fn().mockResolvedValue({ data: mockStream }) } } as any;
    await expect(downloadFromDrive(mockDrive, "big_file")).rejects.toThrow("File too large");
  });

  it("downloadFromDrive: stream error propagates", async () => {
    const mockStream = new Readable({
      read() {
        this.destroy(new Error("NETWORK_ERROR"));
      },
    });
    const mockDrive = { files: { get: vi.fn().mockResolvedValue({ data: mockStream }) } } as any;
    await expect(downloadFromDrive(mockDrive, "file_id")).rejects.toThrow("NETWORK_ERROR");
  });

  it("uploadToDrive: 403 from create propagates", async () => {
    const mockDrive = {
      files: { create: vi.fn().mockRejectedValue(new Error("403: quotaExceeded")) },
    } as any;
    await expect(
      uploadToDrive(mockDrive, "test.pdf", "application/pdf", Buffer.alloc(100)),
    ).rejects.toThrow("403");
  });

  it("uploadToDrive: null fileId returned", async () => {
    const mockDrive = {
      files: { create: vi.fn().mockResolvedValue({ data: { id: null } }) },
    } as any;
    const id = await uploadToDrive(
      mockDrive,
      "test.txt",
      "text/plain",
      Buffer.alloc(10),
      "folder_123",
    );
    expect(id).toBeNull();
  });
});

// ─── distributed-lock ───────────────────────────────────────────────────────

vi.mock("@/clients/redis/rate-limit/redis", () => {
  const mockRedis = { set: vi.fn(), eval: vi.fn() };
  return { getRedisClient: vi.fn().mockResolvedValue(mockRedis) };
});

describe("DistributedLockService — lock edge cases", () => {
  let mockRedis: any;

  beforeEach(() => {
    const fresh = { set: vi.fn(), eval: vi.fn() };
    mockRedis = fresh;
    vi.mocked(getRedisClient).mockResolvedValue(fresh);
    (DistributedLockService as any).localLocks.clear();
  });

  it("acquire with 0 TTL succeeds but expires immediately", async () => {
    mockRedis.set.mockResolvedValue("OK");
    const first = await DistributedLockService.acquire("ttl-zero", 0);
    expect(first.acquired).toBe(true);

    mockRedis.set.mockResolvedValue("OK");
    const second = await DistributedLockService.acquire("ttl-zero", 100);
    expect(second.acquired).toBe(true);
  });

  it("double acquire (same key, Redis) returns false on second", async () => {
    mockRedis.set.mockResolvedValue("OK");
    const first = await DistributedLockService.acquire("dup", 5000);
    expect(first.acquired).toBe(true);

    mockRedis.set.mockResolvedValue(null);
    const second = await DistributedLockService.acquire("dup", 5000);
    expect(second.acquired).toBe(false);
  });

  it("release with empty token returns false early", async () => {
    const r = await DistributedLockService.release("any-key", "");
    expect(r).toBe(false);
  });

  it("release key that was never locked returns false", async () => {
    mockRedis.eval.mockResolvedValue(0);
    const r = await DistributedLockService.release("never-locked", "some-token");
    expect(r).toBe(false);
  });

  it("in-memory lock expires and can be re-acquired", async () => {
    vi.mocked(getRedisClient).mockResolvedValue(null as any);
    mockRedis = null as any;
    const first = await DistributedLockService.acquire("mem-expire", 10);
    expect(first.acquired).toBe(true);

    await new Promise((r) => setTimeout(r, 50));

    const second = await DistributedLockService.acquire("mem-expire", 100);
    expect(second.acquired).toBe(true);
  });

  it("in-memory lock: second acquire while locked fails", async () => {
    vi.mocked(getRedisClient).mockResolvedValue(null as any);
    mockRedis = null as any;
    const first = await DistributedLockService.acquire("concurrent", 5000);
    expect(first.acquired).toBe(true);

    const second = await DistributedLockService.acquire("concurrent", 5000);
    expect(second.acquired).toBe(false);
  });

  it("Redis acquire -> Redis release (token matches)", async () => {
    mockRedis.set.mockResolvedValue("OK");
    mockRedis.eval.mockResolvedValue(1);

    const result = await DistributedLockService.acquire("full-cycle", 5000);
    expect(result.acquired).toBe(true);

    const released = await DistributedLockService.release("full-cycle", result.token);
    expect(released).toBe(true);
  });

  it("Redis acquire -> Redis release (token mismatch)", async () => {
    mockRedis.set.mockResolvedValue("OK");
    mockRedis.eval.mockResolvedValue(0);

    await DistributedLockService.acquire("mismatch", 5000);
    const released = await DistributedLockService.release("mismatch", "wrong-token");
    expect(released).toBe(false);
  });

  it("release after lock expiry (key gone) returns false", async () => {
    mockRedis.eval.mockResolvedValue(0);
    const r = await DistributedLockService.release("expired-key", "any-token");
    expect(r).toBe(false);
  });
});

// ─── queue/categorizeFailure ────────────────────────────────────────────────

describe("categorizeFailure — queue/categorize.ts: missed codes & ordering", () => {
  it("PDF_INVALID returns permanent PDF_INVALID", () => {
    expect(categorizeFailure(new Error("PDF_INVALID"))).toEqual({
      category: "permanent",
      code: "PDF_INVALID",
    });
  });

  it("PDF_EXCEEDS_MAX_PAGES returns permanent", () => {
    expect(categorizeFailure(new Error("PDF_EXCEEDS_MAX_PAGES: 3000 > 2000"))).toEqual({
      category: "permanent",
      code: "PDF_EXCEEDS_MAX_PAGES",
    });
  });

  it("PDF_RENDER_FAILED returns permanent", () => {
    expect(categorizeFailure(new Error("PDF_RENDER_FAILED: OOM"))).toEqual({
      category: "permanent",
      code: "PDF_RENDER_FAILED",
    });
  });

  it("minio (lowercase) returns STORAGE_ERROR", () => {
    expect(categorizeFailure(new Error("minio bucket not found"))).toEqual({
      category: "transient",
      code: "STORAGE_ERROR",
    });
  });

  it("ENETUNREACH maps to UNKNOWN_ERROR", () => {
    expect(categorizeFailure(new Error("ENETUNREACH"))).toEqual({
      category: "transient",
      code: "UNKNOWN_ERROR",
    });
  });

  it("JOB_TIMEOUT returns fatal when no transient keywords present", () => {
    expect(categorizeFailure(new Error("JOB_TIMEOUT processing page 5"))).toEqual({
      category: "fatal",
      code: "JOB_TIMEOUT",
    });
  });

  it("JOB_ABORTED returns fatal when no transient keywords present", () => {
    expect(categorizeFailure(new Error("JOB_ABORTED by user"))).toEqual({
      category: "fatal",
      code: "JOB_ABORTED",
    });
  });

  it("empty message returns transient UNKNOWN_ERROR", () => {
    expect(categorizeFailure(new Error(""))).toEqual({
      category: "transient",
      code: "UNKNOWN_ERROR",
    });
  });

  it("error message with only symbols returns UNKNOWN_ERROR", () => {
    expect(categorizeFailure(new Error("!@#$%^&*()"))).toEqual({
      category: "transient",
      code: "UNKNOWN_ERROR",
    });
  });

  it("exact match '429' alone returns RATE_LIMITED", () => {
    expect(categorizeFailure(new Error("429"))).toEqual({
      category: "transient",
      code: "RATE_LIMITED",
    });
  });

  it("rateLimit + PDF_ENCRYPTED: PDF_ENCRYPTED checked first (permanent > transient)", () => {
    expect(categorizeFailure(new Error("PDF_ENCRYPTED: rateLimit"))).toEqual({
      category: "permanent",
      code: "PDF_ENCRYPTED",
    });
  });
});

// ─── helper ──────────────────────────────────────────────────────────────

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
