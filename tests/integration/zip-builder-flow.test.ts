import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { buildZipPackage, type ZipBuildDocument } from "@/lib/export/zip-builder";
import type { ExportMetadata, ExportProfile } from "@/lib/export/types";

function makeMetadata(overrides: Partial<ExportMetadata> = {}): ExportMetadata {
  return {
    source: {
      title: "Test Document",
      description: null,
      fileName: "test.pdf",
      originalName: "test.pdf",
      mimeType: "application/pdf",
      fileSize: 1024,
      language: "ar",
      isRtl: true,
    },
    tags: [],
    folder: null,
    ocr: { confidence: 0.85, engine: "google", pageCount: 5 },
    pipeline: {
      wordCount: 200,
      charCount: 1000,
      headingCount: 3,
      paragraphCount: 10,
      qualityScore: 0.8,
      garbageRatio: 0.02,
    },
    dates: {
      created: "2025-01-01T00:00:00.000Z",
      updated: "2025-06-01T00:00:00.000Z",
      exported: new Date().toISOString(),
    },
    export: {
      format: "zip",
      profile: "research",
      version: "1.0",
      generator: "ibn-al-azhar-docs/v1",
    },
    ...overrides,
  };
}

function makeDoc(overrides: Partial<ZipBuildDocument> = {}): ZipBuildDocument {
  return {
    id: "doc-1",
    title: "كتاب التوحيد",
    tags: ["تفسير", "عقيدة"],
    folderPath: "علوم شرعية",
    pageCount: 10,
    metadata: makeMetadata(),
    rawText: "بسم الله الرحمن الرحيم هذا نص تجريبي للمستند",
    markdown: "# كتاب التوحيد\n\nبسم الله الرحمن الرحيم\n\nهذا نص تجريبي للمستند",
    ...overrides,
  };
}

describe("Multi-document → ZIP: ZIP builder integration", () => {
  describe("single document", () => {
    it("produces a valid ZIP buffer", async () => {
      const buffer = await buildZipPackage({
        exportId: "export-1",
        documents: [makeDoc()],
        profile: "research",
        includeSource: false,
      });

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);

      const zip = await JSZip.loadAsync(buffer);
      expect(Object.keys(zip.files).length).toBeGreaterThan(0);
    });

    it("research profile includes md and json files", async () => {
      const buffer = await buildZipPackage({
        exportId: "export-1",
        documents: [makeDoc()],
        profile: "research",
        includeSource: false,
      });

      const zip = await JSZip.loadAsync(buffer);
      const fileNames = Object.keys(zip.files);

      expect(fileNames.some((f) => f.endsWith(".md"))).toBe(true);
      expect(fileNames.some((f) => f.endsWith("_metadata.json"))).toBe(true);
    });

    it("plain profile includes only txt", async () => {
      const buffer = await buildZipPackage({
        exportId: "export-1",
        documents: [makeDoc()],
        profile: "plain",
        includeSource: false,
      });

      const zip = await JSZip.loadAsync(buffer);
      const fileNames = Object.keys(zip.files);

      expect(fileNames.some((f) => f.endsWith(".txt"))).toBe(true);
      expect(fileNames.some((f) => f.endsWith(".md"))).toBe(false);
    });

    it("manifest.json always present", async () => {
      const buffer = await buildZipPackage({
        exportId: "export-1",
        documents: [makeDoc()],
        profile: "research",
        includeSource: false,
      });

      const zip = await JSZip.loadAsync(buffer);
      expect(zip.files["manifest.json"]).toBeDefined();

      const manifest = JSON.parse(await zip.files["manifest.json"].async("text"));
      expect(manifest.exportId).toBe("export-1");
      expect(manifest.documentCount).toBe(1);
      expect(manifest.profile).toBe("research");
    });
  });

  describe("multiple documents", () => {
    it("includes README.md for multi-doc exports", async () => {
      const docs = [
        makeDoc({ id: "doc-1", title: "كتاب التوحيد" }),
        makeDoc({ id: "doc-2", title: "كتاب الفقه" }),
      ];

      const buffer = await buildZipPackage({
        exportId: "export-2",
        documents: docs,
        profile: "research",
        includeSource: false,
      });

      const zip = await JSZip.loadAsync(buffer);
      expect(zip.files["README.md"]).toBeDefined();
    });

    it("manifest lists all documents", async () => {
      const docs = [
        makeDoc({ id: "doc-1", title: "كتاب التوحيد" }),
        makeDoc({ id: "doc-2", title: "كتاب الفقه" }),
        makeDoc({ id: "doc-3", title: "كتاب السيرة" }),
      ];

      const buffer = await buildZipPackage({
        exportId: "export-3",
        documents: docs,
        profile: "research",
        includeSource: false,
      });

      const zip = await JSZip.loadAsync(buffer);
      const manifest = JSON.parse(await zip.files["manifest.json"].async("text"));
      expect(manifest.documentCount).toBe(3);
      expect(manifest.documents).toHaveLength(3);
    });

    it("folder prefix applied to multi-doc exports", async () => {
      const docs = [
        makeDoc({ id: "doc-1", title: "كتاب 1", folderPath: "علوم شرعية" }),
        makeDoc({ id: "doc-2", title: "كتاب 2", folderPath: "لغة عربية" }),
      ];

      const buffer = await buildZipPackage({
        exportId: "export-4",
        documents: docs,
        profile: "research",
        includeSource: false,
      });

      const zip = await JSZip.loadAsync(buffer);
      const fileNames = Object.keys(zip.files);
      expect(fileNames.some((f) => f.startsWith("علوم_شرعية/"))).toBe(true);
      expect(fileNames.some((f) => f.startsWith("لغة_عربية/"))).toBe(true);
    });
  });

  describe("source file inclusion", () => {
    it("source buffer included when includeSource is true", async () => {
      const sourceBuffer = Buffer.from("fake pdf content");
      const doc = makeDoc({
        sourceBuffer,
        sourceFileName: "original.pdf",
      });

      const buffer = await buildZipPackage({
        exportId: "export-5",
        documents: [doc],
        profile: "archive",
        includeSource: true,
      });

      const zip = await JSZip.loadAsync(buffer);
      const fileNames = Object.keys(zip.files);
      expect(fileNames.some((f) => f.includes("source/"))).toBe(true);
      expect(fileNames.some((f) => f.includes("original.pdf"))).toBe(true);
    });

    it("source not included when includeSource is false", async () => {
      const doc = makeDoc({
        sourceBuffer: Buffer.from("fake pdf"),
        sourceFileName: "original.pdf",
      });

      const buffer = await buildZipPackage({
        exportId: "export-6",
        documents: [doc],
        profile: "research",
        includeSource: false,
      });

      const zip = await JSZip.loadAsync(buffer);
      const fileNames = Object.keys(zip.files);
      expect(fileNames.some((f) => f.includes("original.pdf"))).toBe(false);
    });
  });

  describe("manifest integrity", () => {
    it("totalSize matches sum of file sizes", async () => {
      const docs = [makeDoc({ id: "d1" }), makeDoc({ id: "d2" })];

      const buffer = await buildZipPackage({
        exportId: "export-7",
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

    it("each document file listed in manifest matches ZIP contents", async () => {
      const doc = makeDoc({ id: "doc-verify" });

      const buffer = await buildZipPackage({
        exportId: "export-8",
        documents: [doc],
        profile: "research",
        includeSource: false,
      });

      const zip = await JSZip.loadAsync(buffer);
      const manifest = JSON.parse(await zip.files["manifest.json"].async("text"));

      for (const manifestDoc of manifest.documents) {
        for (const file of manifestDoc.files) {
          expect(zip.files[file.path]).toBeDefined();
        }
      }
    });
  });
});
