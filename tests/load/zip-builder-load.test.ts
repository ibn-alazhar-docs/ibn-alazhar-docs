import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { buildZipPackage, type ZipBuildDocument } from "@/core/services/export/zip-builder";
import type { ExportMetadata } from "@/core/services/export/types";

function makeMetadata(): ExportMetadata {
  return {
    source: {
      title: "Load Test Document",
      description: null,
      fileName: "test.pdf",
      originalName: "test.pdf",
      mimeType: "application/pdf",
      fileSize: 1024,
      language: "ar",
      isRtl: true,
    },
    tags: [{ name: "test", color: "#16A34A" }],
    folder: { name: "Test", path: "Test", ancestors: ["Test"] },
    ocr: { confidence: 0.9, engine: "google", pageCount: 10 },
    pipeline: {
      wordCount: 500,
      charCount: 2500,
      headingCount: 5,
      paragraphCount: 20,
      qualityScore: 0.85,
      garbageRatio: 0.01,
    },
    dates: {
      created: "2025-01-01T00:00:00Z",
      updated: "2025-06-01T00:00:00Z",
      exported: new Date().toISOString(),
    },
    export: { format: "zip", profile: "research", version: "1.0", generator: "test" },
  };
}

function makeDoc(id: string): ZipBuildDocument {
  return {
    id,
    title: `كتاب الاختبار ${id}`,
    tags: ["test"],
    folderPath: "Test Folder",
    pageCount: 10,
    metadata: makeMetadata(),
    rawText: "بسم الله الرحمن الرحيم " + "نص تجريبي ".repeat(200),
    markdown: "# عنوان\n\n" + "بسم الله الرحمن الرحيم\n\n" + "نص تجريبي للمستمد. ".repeat(200),
  };
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)]!;
}

describe("ZIP Builder Load Test", () => {
  describe("Single document ZIP", () => {
    it("build 10 single-doc ZIPs sequentially", async () => {
      const latencies: number[] = [];

      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        const buffer = await buildZipPackage({
          exportId: `exp-${i}`,
          documents: [makeDoc(`doc-${i}`)],
          profile: "research",
          includeSource: false,
        });
        latencies.push(performance.now() - start);

        expect(buffer.length).toBeGreaterThan(0);
      }

      const p50 = percentile(latencies, 50);
      const p95 = percentile(latencies, 95);

      console.log(`  10 single-doc ZIPs: p50=${p50.toFixed(0)}ms p95=${p95.toFixed(0)}ms`);

      expect(p95).toBeLessThan(500);
    });
  });

  describe("Multi-document ZIP", () => {
    it("build ZIP with 5 documents", async () => {
      const docs = Array.from({ length: 5 }, (_, i) => makeDoc(`multi-${i}`));

      const start = performance.now();
      const buffer = await buildZipPackage({
        exportId: "exp-multi",
        documents: docs,
        profile: "research",
        includeSource: false,
      });
      const elapsed = performance.now() - start;

      console.log(
        `  5-doc ZIP: ${elapsed.toFixed(0)}ms, size=${(buffer.length / 1024).toFixed(1)}KB`,
      );

      expect(elapsed).toBeLessThan(2000);

      const zip = await JSZip.loadAsync(buffer);
      expect(zip.files["manifest.json"]).toBeDefined();
      expect(zip.files["README.md"]).toBeDefined();
    });

    it("build ZIP with 20 documents", async () => {
      const docs = Array.from({ length: 20 }, (_, i) => makeDoc(`bulk-${i}`));

      const start = performance.now();
      const buffer = await buildZipPackage({
        exportId: "exp-bulk",
        documents: docs,
        profile: "research",
        includeSource: false,
      });
      const elapsed = performance.now() - start;

      console.log(
        `  20-doc ZIP: ${elapsed.toFixed(0)}ms, size=${(buffer.length / 1024).toFixed(1)}KB`,
      );

      const zip = await JSZip.loadAsync(buffer);
      const manifest = JSON.parse(await zip.files["manifest.json"].async("text"));
      expect(manifest.documentCount).toBe(20);
    });
  });

  describe("Concurrent ZIP builds", () => {
    it("5 concurrent single-doc ZIPs", async () => {
      const start = performance.now();

      const promises = Array.from({ length: 5 }, (_, i) =>
        buildZipPackage({
          exportId: `conc-${i}`,
          documents: [makeDoc(`conc-${i}`)],
          profile: "research",
          includeSource: false,
        }),
      );

      const results = await Promise.all(promises);
      const elapsed = performance.now() - start;

      console.log(`  5 concurrent ZIPs: ${elapsed.toFixed(0)}ms total`);

      expect(results.every((b) => b.length > 0)).toBe(true);
    });

    it("3 concurrent 10-doc ZIPs", async () => {
      const start = performance.now();

      const promises = Array.from({ length: 3 }, (_, batch) => {
        const docs = Array.from({ length: 10 }, (_, i) => makeDoc(`batch${batch}-${i}`));
        return buildZipPackage({
          exportId: `batch-${batch}`,
          documents: docs,
          profile: "research",
          includeSource: false,
        });
      });

      const results = await Promise.all(promises);
      const elapsed = performance.now() - start;

      console.log(`  3 concurrent 10-doc ZIPs: ${elapsed.toFixed(0)}ms total`);

      expect(results.every((b) => b.length > 0)).toBe(true);
    });
  });

  describe("ZIP with source files", () => {
    it("build ZIP with source buffer included", async () => {
      const doc = makeDoc("with-source");
      doc.sourceBuffer = Buffer.alloc(1024 * 100, "fake pdf content");
      doc.sourceFileName = "original.pdf";

      const start = performance.now();
      const buffer = await buildZipPackage({
        exportId: "exp-source",
        documents: [doc],
        profile: "archive",
        includeSource: true,
      });
      const elapsed = performance.now() - start;

      console.log(
        `  ZIP with source: ${elapsed.toFixed(0)}ms, size=${(buffer.length / 1024).toFixed(1)}KB`,
      );

      expect(elapsed).toBeLessThan(1000);
    });
  });
});
