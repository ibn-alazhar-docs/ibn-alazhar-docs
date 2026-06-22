import { describe, it, expect } from "vitest";
import { buildZipPackage, type ZipBuildDocument } from "@/lib/export/zip-builder";
import type { ExportMetadata } from "@/lib/export/types";
import JSZip from "jszip";

function makeMetadata(): ExportMetadata {
  return {
    source: {
      title: "Recovery Doc",
      description: null,
      fileName: "t.pdf",
      originalName: "t.pdf",
      mimeType: "application/pdf",
      fileSize: 1024,
      language: "ar",
      isRtl: true,
    },
    tags: [],
    folder: null,
    ocr: { confidence: 0.9, engine: "google", pageCount: 1 },
    pipeline: {
      wordCount: 10,
      charCount: 50,
      headingCount: 0,
      paragraphCount: 1,
      qualityScore: 80,
      garbageRatio: 0,
    },
    dates: {
      created: "2025-01-01T00:00:00Z",
      updated: "2025-01-01T00:00:00Z",
      exported: new Date().toISOString(),
    },
    export: { format: "zip", profile: "research", version: "1.0", generator: "test" },
  };
}

function makeDoc(id: string, overrides: Partial<ZipBuildDocument> = {}): ZipBuildDocument {
  return {
    id,
    title: `Recovery ${id}`,
    tags: [],
    folderPath: "",
    pageCount: 1,
    metadata: makeMetadata(),
    rawText: "بسم الله",
    markdown: "# Recovery\n\nبسم الله",
    ...overrides,
  };
}

describe("ZIP Builder Recovery", () => {
  describe("Empty document list", () => {
    it("handles empty document array gracefully", async () => {
      const buffer = await buildZipPackage({
        exportId: "empty",
        documents: [],
        profile: "research",
        includeSource: false,
      });

      const zip = await JSZip.loadAsync(buffer);
      expect(zip.files["manifest.json"]).toBeDefined();

      const manifest = JSON.parse(await zip.files["manifest.json"].async("text"));
      expect(manifest.documentCount).toBe(0);
    });
  });

  describe("Documents with empty content", () => {
    it("handles empty markdown gracefully", async () => {
      const doc = makeDoc("empty-md", { markdown: "", rawText: "" });

      const buffer = await buildZipPackage({
        exportId: "empty-content",
        documents: [doc],
        profile: "research",
        includeSource: false,
      });

      expect(buffer.length).toBeGreaterThan(0);

      const zip = await JSZip.loadAsync(buffer);
      const manifest = JSON.parse(await zip.files["manifest.json"].async("text"));
      expect(manifest.documentCount).toBe(1);
    });
  });

  describe("Large batch recovery", () => {
    it("50-document batch completes without error", async () => {
      const docs = Array.from({ length: 50 }, (_, i) => makeDoc(`batch-${i}`));

      const start = performance.now();
      const buffer = await buildZipPackage({
        exportId: "large-batch",
        documents: docs,
        profile: "research",
        includeSource: false,
      });
      const elapsed = performance.now() - start;

      console.log(
        `  50-doc ZIP: ${elapsed.toFixed(0)}ms, size=${(buffer.length / 1024).toFixed(1)}KB`,
      );

      const zip = await JSZip.loadAsync(buffer);
      const manifest = JSON.parse(await zip.files["manifest.json"].async("text"));
      expect(manifest.documentCount).toBe(50);

      for (const doc of manifest.documents) {
        for (const file of doc.files) {
          expect(zip.files[file.path]).toBeDefined();
        }
      }
    });
  });

  describe("Special characters in titles", () => {
    it("handles unicode titles in ZIP paths", async () => {
      const doc = makeDoc("unicode", { title: "كتاب التفسير — المجلد الأول" });

      const buffer = await buildZipPackage({
        exportId: "unicode",
        documents: [doc],
        profile: "research",
        includeSource: false,
      });

      const zip = await JSZip.loadAsync(buffer);
      const manifest = JSON.parse(await zip.files["manifest.json"].async("text"));
      expect(manifest.documents[0].title).toBe("كتاب التفسير — المجلد الأول");
    });

    it("handles special characters in filenames", async () => {
      const doc = makeDoc("special", {
        title: 'file<>:"|?*.pdf',
      });

      const buffer = await buildZipPackage({
        exportId: "special",
        documents: [doc],
        profile: "research",
        includeSource: false,
      });

      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe("Source buffer recovery", () => {
    it("missing source buffer handled when includeSource is true", async () => {
      const doc = makeDoc("no-source", { sourceBuffer: undefined, sourceFileName: undefined });

      const buffer = await buildZipPackage({
        exportId: "no-source",
        documents: [doc],
        profile: "archive",
        includeSource: true,
      });

      expect(buffer.length).toBeGreaterThan(0);

      const zip = await JSZip.loadAsync(buffer);
      const fileNames = Object.keys(zip.files);
      expect(fileNames.some((f) => f.includes("source/"))).toBe(false);
    });
  });

  describe("Manifest integrity after failures", () => {
    it("totalSize matches actual file sizes", async () => {
      const docs = [makeDoc("a"), makeDoc("b"), makeDoc("c")];

      const buffer = await buildZipPackage({
        exportId: "integrity",
        documents: docs,
        profile: "research",
        includeSource: false,
      });

      const zip = await JSZip.loadAsync(buffer);
      const manifest = JSON.parse(await zip.files["manifest.json"].async("text"));

      const computedSize = manifest.documents.reduce(
        (sum: number, doc: { files: { size: number }[] }) =>
          sum + doc.files.reduce((s: number, f: { size: number }) => s + f.size, 0),
        0,
      );

      expect(manifest.totalSize).toBe(computedSize);
    });

    it("all manifest file paths exist in ZIP", async () => {
      const docs = Array.from({ length: 5 }, (_, i) => makeDoc(`verify-${i}`));

      const buffer = await buildZipPackage({
        exportId: "verify",
        documents: docs,
        profile: "research",
        includeSource: false,
      });

      const zip = await JSZip.loadAsync(buffer);
      const manifest = JSON.parse(await zip.files["manifest.json"].async("text"));

      let fileCount = 0;
      for (const doc of manifest.documents) {
        for (const file of doc.files) {
          expect(zip.files[file.path]).toBeDefined();
          fileCount++;
        }
      }
      expect(fileCount).toBeGreaterThan(0);
    });
  });
});
