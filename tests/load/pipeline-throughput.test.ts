import { describe, it, expect } from "vitest";
import { cleanArabicText, analyzeText } from "../../packages/pipeline/src/text";
import { generateMarkdown } from "../../packages/pipeline/src/output";

const SAMPLE_TEXT = `
\u202Bبسم الله الرحمن الرحيم\u200F
<br>
## الفصل الاول في التوحيد
<b>الحمد لله</b> رب العالمين والصلاة والسلام على <i>رسول الله</i>
محمد بن عبدالله صلى الله عليه وسلم

### المقدمة
إن هذا الكتاب يتناول موضوع التوحيد وهو أهم ما في الاسلام
وقد قسمناه الى عدة فصول ومباحث

## الفصل الثاني في الفقه
<b>المبحث الاول</b> في الطهارة
الطهارة لغة النظافة وشرعا إزالة الحدث أو الخبث
`;

const LONG_TEXT = Array.from({ length: 20 }, () => SAMPLE_TEXT).join("\n");

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)]!;
}

describe("Pipeline Throughput Load Test", () => {
  describe("cleanArabicText throughput", () => {
    it("process 100 short texts", () => {
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        cleanArabicText(SAMPLE_TEXT);
      }
      const elapsed = performance.now() - start;
      const opsPerSec = (100 / elapsed) * 1000;

      console.log(
        `  100 cleanArabicText: ${elapsed.toFixed(0)}ms total, ${opsPerSec.toFixed(0)} ops/sec`,
      );

      expect(opsPerSec).toBeGreaterThan(50);
    });

    it("process 50 long texts", () => {
      const start = performance.now();
      for (let i = 0; i < 50; i++) {
        cleanArabicText(LONG_TEXT);
      }
      const elapsed = performance.now() - start;
      const opsPerSec = (50 / elapsed) * 1000;

      console.log(
        `  50 long cleanArabicText: ${elapsed.toFixed(0)}ms total, ${opsPerSec.toFixed(0)} ops/sec`,
      );

      expect(opsPerSec).toBeGreaterThan(5);
    });
  });

  describe("analyzeText throughput", () => {
    it("analyze 100 texts", () => {
      const cleaned = cleanArabicText(SAMPLE_TEXT);
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        analyzeText(cleaned);
      }
      const elapsed = performance.now() - start;
      const opsPerSec = (100 / elapsed) * 1000;

      console.log(
        `  100 analyzeText: ${elapsed.toFixed(0)}ms total, ${opsPerSec.toFixed(0)} ops/sec`,
      );

      expect(opsPerSec).toBeGreaterThan(100);
    });
  });

  describe("generateMarkdown throughput", () => {
    it("generate 20 markdown documents", () => {
      const start = performance.now();
      const results: { wordCount: number; quality: number }[] = [];

      for (let i = 0; i < 20; i++) {
        const r = generateMarkdown(SAMPLE_TEXT, { title: `كتاب ${i}` });
        results.push({
          wordCount: r.metadata.wordCount,
          quality: r.metadata.qualityScore,
        });
      }

      const elapsed = performance.now() - start;
      const opsPerSec = (20 / elapsed) * 1000;

      console.log(
        `  20 generateMarkdown: ${elapsed.toFixed(0)}ms total, ${opsPerSec.toFixed(1)} ops/sec`,
      );
      console.log(
        `  avg words: ${(results.reduce((s, r) => s + r.wordCount, 0) / results.length).toFixed(0)}`,
      );

      expect(opsPerSec).toBeGreaterThan(5);
      expect(results.every((r) => r.wordCount > 0)).toBe(true);
    });

    it("generate 5 long markdown documents", () => {
      const start = performance.now();

      for (let i = 0; i < 5; i++) {
        generateMarkdown(LONG_TEXT, { title: `كتاب طويل ${i}`, includeMetadata: true });
      }

      const elapsed = performance.now() - start;
      const opsPerSec = (5 / elapsed) * 1000;

      console.log(
        `  5 long generateMarkdown: ${elapsed.toFixed(0)}ms total, ${opsPerSec.toFixed(1)} ops/sec`,
      );

      expect(opsPerSec).toBeGreaterThan(1);
    });
  });

  describe("Concurrent pipeline processing", () => {
    it("10 concurrent full pipeline runs", async () => {
      const start = performance.now();

      const promises = Array.from({ length: 10 }, () =>
        Promise.resolve().then(() => {
          const r = generateMarkdown(SAMPLE_TEXT, { title: "Concurrent" });
          return r.metadata;
        }),
      );

      const results = await Promise.all(promises);
      const elapsed = performance.now() - start;

      console.log(`  10 concurrent pipeline: ${elapsed.toFixed(0)}ms total`);

      expect(results.every((r) => r.wordCount > 0)).toBe(true);
    });

    it("50 concurrent text clean operations", async () => {
      const start = performance.now();

      const promises = Array.from({ length: 50 }, () =>
        Promise.resolve().then(() => cleanArabicText(SAMPLE_TEXT)),
      );

      const results = await Promise.all(promises);
      const elapsed = performance.now() - start;

      console.log(`  50 concurrent clean: ${elapsed.toFixed(0)}ms total`);

      expect(results.every((r) => r.length > 0)).toBe(true);
    });
  });
});
