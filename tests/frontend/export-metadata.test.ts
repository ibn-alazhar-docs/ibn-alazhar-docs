import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  resolveDocumentForExport,
  resolveTagsForExport,
  resolveFolderForExport,
  resolveOcrData,
  resolvePipelineData,
  buildExportMetadata,
} from "../../apps/web/src/lib/export/metadata";
import { prisma } from "../../apps/web/src/lib/prisma";
import type { ExportProfile } from "../../apps/web/src/lib/export/types";

vi.mock("../../apps/web/src/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
    document: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    tagDocument: {
      findMany: vi.fn(),
    },
    folder: {
      findUnique: vi.fn(),
    },
    conversionJob: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("../../apps/web/src/lib/auth-guards", () => ({
  ownedWhere: vi.fn((where) => where),
}));

describe("Export Metadata Helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("resolveDocumentForExport", () => {
    it("throws if document not found", async () => {
      vi.mocked(prisma.document.findFirst).mockResolvedValueOnce(null);
      await expect(resolveDocumentForExport("doc1", { user: { id: "u1" } } as any)).rejects.toThrow(
        "Document not found: doc1",
      );
    });

    it("returns mapped document data", async () => {
      const mockDoc = {
        id: "doc1",
        title: "Test Doc",
        description: "Desc",
        fileName: "test.pdf",
        originalName: "test.pdf",
        mimeType: "application/pdf",
        fileSize: 1024n,
        pageCount: 5,
        outputFormats: ["pdf", "md"],
        language: "ara",
        isRtl: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-02"),
      } as any;
      vi.mocked(prisma.document.findFirst).mockResolvedValueOnce(mockDoc);

      const result = await resolveDocumentForExport("doc1", { user: { id: "u1" } } as any);
      expect(result.id).toBe("doc1");
      expect(result.fileSize).toBe(1024);
      expect(result.pageCount).toBe(5);
    });
  });

  describe("resolveTagsForExport", () => {
    it("returns mapped tags", async () => {
      vi.mocked(prisma.tagDocument.findMany).mockResolvedValueOnce([
        { tag: { name: "Tag1", color: "#f00" } },
        { tag: { name: "Tag2", color: "#0f0" } },
      ] as any);

      const result = await resolveTagsForExport("doc1");
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Tag1");
    });
  });

  describe("resolveFolderForExport", () => {
    it("returns null for null folderId", async () => {
      expect(await resolveFolderForExport(null)).toBeNull();
    });

    it("resolves folder path and ancestors", async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
        { id: "f1", name: "Root", parentId: null },
        { id: "f2", name: "Parent", parentId: "f1" },
        { id: "f3", name: "Child", parentId: "f2" },
      ]);

      const result = await resolveFolderForExport("f3");
      expect(result?.name).toBe("Child");
      expect(result?.ancestors).toEqual(["Root", "Parent", "Child"]);
      expect(result?.path).toBe("Root / Parent / Child");
    });
  });

  describe("resolveOcrData", () => {
    it("returns mapped OCR data with default progress", async () => {
      vi.mocked(prisma.conversionJob.findFirst).mockResolvedValueOnce(null);
      const result = await resolveOcrData("doc1");
      expect(result.confidence).toBe(0);
      expect(result.engine).toBe("unknown");
    });

    it("maps job progress to confidence", async () => {
      vi.mocked(prisma.conversionJob.findFirst).mockResolvedValueOnce({
        progress: 85,
        sourceFormat: "tesseract",
      } as any);
      const result = await resolveOcrData("doc1");
      expect(result.confidence).toBe(0.85);
      expect(result.engine).toBe("tesseract");
    });
  });

  describe("resolvePipelineData", () => {
    it("returns default pipeline data", async () => {
      vi.mocked(prisma.document.findUnique).mockResolvedValueOnce({ pageCount: 10 } as any);
      const result = await resolvePipelineData("doc1");
      expect(result.pageCount).toBe(10);
      expect(result.qualityScore).toBe(0.8);
    });
  });

  describe("buildExportMetadata", () => {
    it("builds the complete metadata payload", async () => {
      const doc = {
        id: "1",
        title: "T",
        description: null,
        fileName: "f",
        originalName: "o",
        mimeType: "m",
        fileSize: 10,
        pageCount: 1,
        outputFormats: [],
        language: "ara",
        isRtl: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-02"),
      };
      const tags = [{ name: "T1", color: "red" }];
      const folder = { name: "F1", path: "F1", ancestors: ["F1"] };
      const ocr = { confidence: 0.9, engine: "e", pageCount: 1 };
      const pipeline = {
        wordCount: 10,
        charCount: 100,
        headingCount: 1,
        paragraphCount: 2,
        qualityScore: 0.9,
        garbageRatio: 0,
        pageCount: 1,
      };
      const profile: ExportProfile = "markdown_only";

      const result = await buildExportMetadata(doc, tags, folder, ocr, pipeline, profile);

      expect(result.source.title).toBe("T");
      expect(result.tags[0].name).toBe("T1");
      expect(result.folder?.name).toBe("F1");
      expect(result.ocr.confidence).toBe(0.9);
      expect(result.export.format).toBe("zip");
      expect(result.export.profile).toBe("markdown_only");
    });
  });
});
