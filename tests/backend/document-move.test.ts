import { describe, it, expect, vi, beforeEach } from "vitest";
import { DocumentMoveUseCases } from "@/core/services/document-move.use-cases";
import type { IDocumentRepository } from "@/domain/repositories/document.repository.interface";
import type { IFolderRepository } from "@/domain/repositories/folder.repository.interface";
import { NotFoundError, AppError } from "@/lib/shared/errors";

function makeDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: "doc-1",
    userId: "user-1",
    title: "Test",
    fileSize: BigInt(1024),
    folderId: null,
    ...overrides,
  };
}

function makeFolder(overrides: Record<string, unknown> = {}) {
  return {
    id: "folder-1",
    userId: "user-1",
    name: "Folder",
    ...overrides,
  };
}

describe("DocumentMoveUseCases", () => {
  let documentRepo: {
    findDocumentById: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  let folderRepo: {
    findById: ReturnType<typeof vi.fn>;
  };
  let useCases: DocumentMoveUseCases;

  beforeEach(() => {
    documentRepo = {
      findDocumentById: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    };
    folderRepo = { findById: vi.fn() };
    useCases = new DocumentMoveUseCases(
      documentRepo as unknown as IDocumentRepository,
      folderRepo as unknown as IFolderRepository,
    );
  });

  describe("moveDocument", () => {
    it("moves document to a folder", async () => {
      documentRepo.findDocumentById.mockResolvedValue(makeDoc());
      folderRepo.findById.mockResolvedValue(makeFolder());
      documentRepo.update.mockResolvedValue(makeDoc({ folderId: "folder-1" }));

      const result = await useCases.moveDocument("doc-1", "user-1", "folder-1");

      expect(result.folderId).toBe("folder-1");
    });

    it("moves document to root (folderId null)", async () => {
      documentRepo.findDocumentById.mockResolvedValue(makeDoc({ folderId: "folder-1" }));
      documentRepo.update.mockResolvedValue(makeDoc({ folderId: null }));

      const result = await useCases.moveDocument("doc-1", "user-1", null);

      expect(result.folderId).toBeNull();
    });

    it("throws NotFoundError when document not found", async () => {
      documentRepo.findDocumentById.mockResolvedValue(null);

      await expect(useCases.moveDocument("missing", "user-1", null)).rejects.toThrow(NotFoundError);
    });

    it("throws when folder not found", async () => {
      documentRepo.findDocumentById.mockResolvedValue(makeDoc());
      folderRepo.findById.mockResolvedValue(null);

      await expect(useCases.moveDocument("doc-1", "user-1", "missing")).rejects.toThrow(AppError);
    });
  });

  describe("bulkMoveDocuments", () => {
    it("moves multiple documents to a folder", async () => {
      documentRepo.findMany.mockResolvedValue([{ id: "d1" }, { id: "d2" }]);
      folderRepo.findById.mockResolvedValue(makeFolder());
      documentRepo.updateMany.mockResolvedValue({ count: 2 });

      const result = await useCases.bulkMoveDocuments(["d1", "d2"], "user-1", "folder-1");

      expect(result).toBe(2);
    });

    it("throws when some documents not found", async () => {
      documentRepo.findMany.mockResolvedValue([{ id: "d1" }]);

      await expect(useCases.bulkMoveDocuments(["d1", "d2"], "user-1", null)).rejects.toThrow(
        AppError,
      );
    });

    it("throws when target folder not found", async () => {
      documentRepo.findMany.mockResolvedValue([{ id: "d1" }]);
      folderRepo.findById.mockResolvedValue(null);

      await expect(useCases.bulkMoveDocuments(["d1"], "user-1", "missing")).rejects.toThrow(
        AppError,
      );
    });
  });
});
