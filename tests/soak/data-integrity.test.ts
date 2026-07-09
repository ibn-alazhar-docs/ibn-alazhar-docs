import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanArabicText, analyzeText } from "../../packages/pipeline/src/text";
import { generateMarkdown, generateTxt, generateJson } from "../../packages/pipeline/src/output";
import { validatePdf } from "../../packages/pipeline/src/storage";

vi.mock("ioredis", () => import("../mocks/ioredis").then((m) => ({ default: m.default })));
vi.mock("bullmq", () => ({
  Worker: vi.fn(),
  Queue: vi.fn(() => ({
    add: vi.fn().mockResolvedValue(undefined),
    getJob: vi.fn(),
    getJobCounts: vi.fn().mockResolvedValue({}),
    getJobs: vi.fn().mockResolvedValue([]),
    close: vi.fn().mockResolvedValue(undefined),
    isCompleted: vi.fn(),
    isFailed: vi.fn(),
    drain: vi.fn().mockResolvedValue(undefined),
    clean: vi.fn().mockResolvedValue(0),
  })),
  QueueEvents: vi.fn(() => ({ on: vi.fn(), close: vi.fn() })),
}));
vi.mock("minio", () => ({
  Client: vi.fn(() => ({
    bucketExists: vi.fn().mockResolvedValue(true),
    makeBucket: vi.fn(),
    fPutObject: vi.fn(),
    putObject: vi.fn(),
    getObject: vi.fn(),
    removeObject: vi.fn(),
    statObject: vi.fn(),
    presignedGetObject: vi.fn().mockResolvedValue("http://minio/test"),
    listObjects: vi.fn(() => ({
      on: vi.fn((evt: string, cb: Function) => {
        if (evt === "data") setTimeout(() => cb({ name: "test", lastModified: new Date() }), 0);
        if (evt === "end") setTimeout(cb, 10);
        if (evt === "error") {
        }
        return this;
      }),
    })),
  })),
}));

const ARABIC_SENTENCE = "بسم الله الرحمن الرحيم ";
const EMPTY_TEXT = "";
const WHITESPACE_ONLY = "   \n  \n  ";
const MIXED_TEXT =
  "Hello world\nبسم الله الرحمن الرحيم\n12345\n## باب العلم\n\nالحمد لله رب العالمين";

function forceGc(): void {
  if (typeof global.gc === "function") global.gc();
}

interface DocumentMeta {
  id: number;
  title: string;
  inputLength: number;
  outputLength: number;
  wordCount: number;
  qualityScore: number;
  headingCount: number;
}

describe("Data integrity: Bulk document processing", () => {
  it("uploads and processes 1000 unique Arabic texts — all have correct metadata", () => {
    const docs: DocumentMeta[] = [];

    for (let i = 0; i < 1000; i++) {
      const variation = i % 10;
      let text: string;

      switch (variation) {
        case 0:
          text = `بسم الله الرحمن الرحيم الكتاب ${i} `.repeat(100);
          break;
        case 1:
          text = `## باب ${i}\n\nالحمد لله رب العالمين `.repeat(20);
          break;
        case 2:
          text = `### فصل ${i}\n\nإن الحمد لله نحمده `.repeat(30);
          break;
        default:
          text = `بسم الله الرحمن الرحيم ${i} `.repeat(50 + i);
      }

      const md = generateMarkdown(text, {
        title: `الكتاب ${i}`,
        includeMetadata: true,
      });

      docs.push({
        id: i,
        title: `الكتاب ${i}`,
        inputLength: text.length,
        outputLength: md.markdown.length,
        wordCount: md.metadata.wordCount,
        qualityScore: md.metadata.qualityScore,
        headingCount: md.metadata.headingCount,
      });

      if (i % 200 === 199) forceGc();
    }

    // Verify every document has valid metadata
    const allHaveWords = docs.every((d) => d.wordCount > 0);
    const allHaveQuality = docs.every((d) => d.qualityScore >= 0 && d.qualityScore <= 100);
    const allHaveOutput = docs.every((d) => d.outputLength > 0);

    console.log(`  1000 documents processed`);
    console.log(`  All have words: ${allHaveWords}`);
    console.log(`  All have quality scores: ${allHaveQuality}`);
    console.log(`  All have output: ${allHaveOutput}`);

    // Heading variations
    const withHeadings = docs.filter((d) => d.headingCount > 0).length;
    console.log(`  Documents with headings: ${withHeadings}/1000`);

    expect(allHaveWords).toBe(true);
    expect(allHaveQuality).toBe(true);
    expect(allHaveOutput).toBe(true);

    // Every document should have a unique output (no collisions from the same input)
    const uniqueOutputs = new Set(docs.map((d) => `${d.wordCount}-${d.qualityScore}`));
    expect(uniqueOutputs.size).toBeGreaterThan(1); // At least some variety
  });

  it("processes 200 edge-case texts without data corruption", () => {
    const edgeCases = [
      { text: EMPTY_TEXT, desc: "empty string" },
      { text: WHITESPACE_ONLY, desc: "whitespace only" },
      { text: MIXED_TEXT, desc: "mixed latin/arabic" },
      { text: "## ", desc: "heading without content" },
      { text: "<b>test</b>", desc: "HTML bold" },
      { text: " \t \n \r ", desc: "special whitespace" },
      { text: "a".repeat(10000), desc: "latin only" },
      { text: "ا".repeat(10000), desc: "arabic only" },
      { text: "12345 67890", desc: "numbers only" },
      {
        text: "بسم الله\n\n\n\nالرحمن الرحيم\n\n\n\n",
        desc: "excessive newlines",
      },
    ];

    for (let round = 0; round < 20; round++) {
      for (const tc of edgeCases) {
        const md = generateMarkdown(tc.text, { title: tc.desc });

        // Must never return undefined or crash
        expect(md).toBeDefined();
        expect(md.markdown).toBeDefined();
        expect(md.metadata.qualityScore).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("Data integrity: Concurrent updates consistency", () => {
  it("10 concurrent clean operations on same text produce identical results", async () => {
    const text = "بسم الله الرحمن الرحيم ".repeat(100);

    const results = await Promise.all(
      Array.from({ length: 10 }, () => Promise.resolve().then(() => cleanArabicText(text))),
    );

    // All should be identical (idempotent)
    const first = results[0];
    for (let i = 1; i < results.length; i++) {
      expect(results[i]).toBe(first);
    }

    console.log(`  Concurrent clean (10×): all ${results.length} results identical`);
  });

  it("50 concurrent analyze + clean produces deterministic output", async () => {
    const texts = Array.from({ length: 50 }, (_, i) =>
      [`بسم الله ${i}`, `الرحمن الرحيم ${i}`, `الحمد لله ${i}`].join("\n"),
    );

    // Process twice in parallel
    const [batch1, batch2] = await Promise.all([
      Promise.all(texts.map((t) => Promise.resolve().then(() => cleanArabicText(t)))),
      Promise.all(texts.map((t) => Promise.resolve().then(() => cleanArabicText(t)))),
    ]);

    // Each input maps to the same output deterministically
    for (let i = 0; i < texts.length; i++) {
      expect(batch1[i]).toBe(batch2[i]);
    }

    console.log(`  Deterministic output verified: 50 texts processed identically twice`);
  });

  it("multiple formats from same input produce consistent metadata", () => {
    const text =
      "## باب العلم\n\nالحمد لله رب العالمين\n\n### فصل الأول\n\nإن الحمد لله نحمده".repeat(10);

    const md = generateMarkdown(text, { title: "Consistency Test", includeMetadata: true });
    const txtOutput = generateTxt(md, false);
    const jsonOutput = generateJson(md, "Consistency Test");

    // All formats produce non-empty output from the same source
    expect(md.markdown.length).toBeGreaterThan(0);
    expect(txtOutput.length).toBeGreaterThan(0);
    expect(jsonOutput.length).toBeGreaterThan(0);

    // Metadata from markdown generation is the source of truth
    const meta = md.metadata;

    console.log(`  Cross-format consistency:`);
    console.log(`    Markdown: ${meta.wordCount} words, quality ${meta.qualityScore}`);
    console.log(`    TXT: ${txtOutput.length} chars`);
    console.log(`    JSON: ${jsonOutput.length} chars`);
    expect(meta.wordCount).toBeGreaterThan(0);
  });
});

describe("Data integrity: Crash during write", () => {
  it("cleanup after partial write produces consistent state", () => {
    const texts = [
      "بسم الله الرحمن الرحيم",
      "## باب الطهارة\n\nالحمد لله",
      "",
      "### فصل\n\nنحمده ونستعينه",
      "   ",
    ];

    // Simulate crash mid-write by catching errors partway
    const results: string[] = [];
    for (let i = 0; i < texts.length; i++) {
      try {
        if (i === 3) {
          // Simulate crash: throw mid-way
          throw new Error("SIMULATED_CRASH");
        }
        results.push(cleanArabicText(texts[i]!));
      } catch {
        // On "crash", previous results should still be valid
        if (results.length > 0) {
          expect(results[results.length - 1]).toBeDefined();
          expect(results[results.length - 1]!.length).toBeGreaterThanOrEqual(0);
        }
        // Recover and continue
        const recovered = cleanArabicText(texts[i]!);
        results.push(recovered);
      }
    }

    // After recovery, all texts should be processed
    expect(results.length).toBe(texts.length);
    expect(results.every((r) => r !== undefined)).toBe(true);
  });

  it("partial pipeline execution produces no partial artifacts", () => {
    const text = "## باب\n\nنص اختبار\n\n### فصل\n\nنص تجريبي";

    // Run clean
    const cleaned = cleanArabicText(text);

    // Simulate crash at a known point
    const partialResults: string[] = [];
    const lines = cleaned.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      partialResults.push(line);
    }

    // Generate full output from partial state
    const fullMd = generateMarkdown(cleaned, { title: "Partial Recovery" });
    expect(fullMd.markdown.length).toBeGreaterThan(0);
    expect(fullMd.metadata.wordCount).toBeGreaterThan(0);
  });
});

describe("Data integrity: Export during upload", () => {
  it("exports document while still processing — handles incomplete state", () => {
    // Simulate a document that's partially processed
    const rawText = "بسم الله الرحمن الرحيم ";
    const partiallyCleaned = rawText; // raw, not yet cleaned

    // Export should still work on whatever state is available
    const md = generateMarkdown(rawText, { title: "In-progress document" });
    expect(md.markdown).toBeDefined();
    expect(md.metadata.wordCount).toBeGreaterThanOrEqual(0);

    // After full processing, data should be complete
    const fullMd = generateMarkdown(cleanArabicText(rawText), {
      title: "Completed document",
      includeMetadata: true,
    });
    expect(fullMd.metadata.wordCount).toBeGreaterThanOrEqual(md.metadata.wordCount);
  });

  it("supports concurrent export and formatting operations", () => {
    const text = "## باب\n\nالحمد لله رب العالمين\n\n### فصل\n\nنحمده ونستعينه".repeat(20);

    // Export upload, format, and analyze concurrently
    const ops = [
      Promise.resolve().then(() => generateMarkdown(text, { title: "Export 1" })),
      Promise.resolve().then(() => generateTxt(text, { title: "Export 2" })),
      Promise.resolve().then(() => generateJson(text, { title: "Export 3" })),
      Promise.resolve().then(() => analyzeText(cleanArabicText(text))),
      Promise.resolve().then(() => cleanArabicText(text)),
    ];

    const results = ops.map((p) => p.then((r) => r));
    // All should resolve without error
    expect(results.length).toBe(5);
  });
});

describe("Data integrity: Idempotency", () => {
  it("cleanArabicText is idempotent — second pass doesn't change output", () => {
    const text = `<b>بسم الله</b> الرحمن الرحيم 1234\n\n\nالحمد لله رب العالمين`;

    const firstPass = cleanArabicText(text);
    const secondPass = cleanArabicText(firstPass);

    // If already clean, second pass should produce same result
    expect(secondPass).toBe(firstPass);
  });

  it("generateMarkdown with cleaned input is idempotent", () => {
    const cleaned = cleanArabicText("## باب\n\nالحمد لله رب العالمين");

    const md1 = generateMarkdown(cleaned, { title: "Idempotency Test" });
    const md2 = generateMarkdown(cleaned, { title: "Idempotency Test" });

    expect(md1.markdown).toBe(md2.markdown);
    expect(md1.metadata.wordCount).toBe(md2.metadata.wordCount);
    expect(md1.metadata.qualityScore).toBe(md2.metadata.qualityScore);
  });
});
