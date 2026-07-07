import { describe, it, expect, vi, beforeEach } from "vitest";
import { DocumentCrudUseCases } from "@/core/services/document-crud.use-cases";
import type { IDocumentRepository } from "@/domain/repositories/document.repository.interface";
import type { IFolderRepository } from "@/domain/repositories/folder.repository.interface";
import { NotFoundError, AppError } from "@/lib/shared/errors";

function makeDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: "doc-1",
    userId: "user-1",
    title: "Test Document",
    description: null,
    fileName: "test.pdf",
    originalName: "test.pdf",
    mimeType: "application/pdf",
    fileSize: BigInt(1024),
    storageKey: "uploads/user-1/test.pdf",
    folderId: null,
    status: "COMPLETED",
    deletedAt: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  };
}

function makeFolder(overrides: Record<string, unknown> = {}) {
  return {
    id: "folder-1",
    userId: "user-1",
    name: "Test Folder",
    parentId: null,
    color: null,
    icon: null,
    order: 1,
    deletedAt: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  };
}

describe("DocumentCrudUseCases", () => {
  let documentRepo: {
    findMany: ReturnType<typeof vi.fn>;
    findDocumentById: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateSearchVector: ReturnType<typeof vi.fn>;
  };
  let folderRepo: {
    findById: ReturnType<typeof vi.fn>;
  };
  let useCases: DocumentCrudUseCases;

  beforeEach(() => {
    documentRepo = {
      findMany: vi.fn(),
      findDocumentById: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateSearchVector: vi.fn(),
    };
    folderRepo = { findById: vi.fn() };
    useCases = new DocumentCrudUseCases(
      documentRepo as unknown as IDocumentRepository,
      folderRepo as unknown as IFolderRepository,
    );
  });

  describe("getDocuments", () => {
    it("returns documents with count for regular user", async () => {
      const docs = [makeDoc()];
      documentRepo.findMany.mockResolvedValue(docs);
      documentRepo.count.mockResolvedValue(1);

      const result = await useCases.getDocuments("user-1", "STUDENT", {});

      expect(result).toEqual({ documents: docs, total: 1 });
      expect(documentRepo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: "user-1", deletedAt: null }),
        }),
      );
    });

    it("returns all documents for admin without userId filter", async () => {
      documentRepo.findMany.mockResolvedValue([]);
      documentRepo.count.mockResolvedValue(0);

      await useCases.getDocuments("admin-1", "ADMIN", {});

      expect(documentRepo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ userId: expect.anything() }),
        }),
      );
    });

    it("filters by deleted documents", async () => {
      documentRepo.findMany.mockResolvedValue([]);
      documentRepo.count.mockResolvedValue(0);

      await useCases.getDocuments("user-1", "STUDENT", { deleted: true });

      expect(documentRepo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: { not: null } }),
        }),
      );
    });

    it("filters by folderId", async () => {
      documentRepo.findMany.mockResolvedValue([]);
      documentRepo.count.mockResolvedValue(0);

      await useCases.getDocuments("user-1", "STUDENT", { folderId: "folder-1" });

      expect(documentRepo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ folderId: "folder-1" }),
        }),
      );
    });

    it("resolves 'root' folderId to null", async () => {
      documentRepo.findMany.mockResolvedValue([]);
      documentRepo.count.mockResolvedValue(0);

      await useCases.getDocuments("user-1", "STUDENT", { folderId: "root" });

      expect(documentRepo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ folderId: null }),
        }),
      );
    });
  });

  describe("getDocumentById", () => {
    it("returns document with fileSize as number", async () => {
      const doc = makeDoc();
      documentRepo.findDocumentById.mockResolvedValue(doc);

      const result = await useCases.getDocumentById("doc-1", "user-1");

      expect(result.fileSize).toBe(1024);
    });

    it("throws NotFoundError when document does not exist", async () => {
      documentRepo.findDocumentById.mockResolvedValue(null);

      await expect(useCases.getDocumentById("missing", "user-1")).rejects.toThrow(NotFoundError);
    });
  });

  describe("updateDocument", () => {
    it("updates title and triggers search vector update", async () => {
      const doc = makeDoc();
      const updated = makeDoc({ title: "Updated" });
      documentRepo.findDocumentById.mockResolvedValue(doc);
      documentRepo.update.mockResolvedValue(updated);
      documentRepo.updateSearchVector.mockResolvedValue(undefined);

      const result = await useCases.updateDocument("doc-1", "user-1", { title: "Updated" });

      expect(result.title).toBe("Updated");
      expect(documentRepo.updateSearchVector).toHaveBeenCalledWith("doc-1", "Updated", null);
    });

    it("validates folder exists when setting folderId", async () => {
      const doc = makeDoc();
      documentRepo.findDocumentById.mockResolvedValue(doc);
      folderRepo.findById.mockResolvedValue(null);

      await expect(
        useCases.updateDocument("doc-1", "user-1", { folderId: "missing-folder" }),
      ).rejects.toThrow(AppError);
    });

    it("allows setting folderId to null", async () => {
      const doc = makeDoc({ folderId: "folder-1" });
      const updated = makeDoc({ folderId: null });
      documentRepo.findDocumentById.mockResolvedValue(doc);
      documentRepo.update.mockResolvedValue(updated);

      const result = await useCases.updateDocument("doc-1", "user-1", { folderId: null });

      expect(result.folderId).toBeNull();
    });

    it("throws NotFoundError when document does not exist", async () => {
      documentRepo.findDocumentById.mockResolvedValue(null);

      await expect(useCases.updateDocument("missing", "user-1", { title: "X" })).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("deleteDocument", () => {
    it("soft-deletes an existing document", async () => {
      documentRepo.findDocumentById.mockResolvedValue(makeDoc());
      documentRepo.update.mockResolvedValue(makeDoc({ deletedAt: new Date() }));

      await useCases.deleteDocument("doc-1", "user-1");

      expect(documentRepo.update).toHaveBeenCalledWith("doc-1", "user-1", {
        deletedAt: expect.any(Date),
      }, undefined);
    });

    it("throws NotFoundError when document does not exist", async () => {
      documentRepo.findDocumentById.mockResolvedValue(null);

      await expect(useCases.deleteDocument("missing", "user-1")).rejects.toThrow(NotFoundError);
    });
  });

  describe("restoreDocument", () => {
    it("restores a soft-deleted document", async () => {
      documentRepo.findMany.mockResolvedValue([makeDoc({ deletedAt: new Date() })]);
      const restored = makeDoc({ deletedAt: null });
      documentRepo.update.mockResolvedValue(restored);

      const result = await useCases.restoreDocument("doc-1", "user-1");

      expect(result.deletedAt).toBeNull();
    });

    it("throws NotFoundError when deleted document not found", async () => {
      documentRepo.findMany.mockResolvedValue([]);

      await expect(useCases.restoreDocument("missing", "user-1")).rejects.toThrow(NotFoundError);
    });
  });
});
