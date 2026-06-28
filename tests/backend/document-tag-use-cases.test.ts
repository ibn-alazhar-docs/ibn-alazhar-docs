import { describe, it, expect, vi, beforeEach } from "vitest";
import { DocumentTagUseCases } from "@/core/use-cases/document-tag.use-cases";
import type { IDocumentRepository } from "@/domain/repositories/document.repository.interface";
import type { ITagRepository } from "@/domain/repositories/tag.repository.interface";
import type { ITagDocumentRepository } from "@/domain/repositories/tag-document.repository.interface";
import { NotFoundError, AppError } from "@/lib/errors";

function makeDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: "doc-1",
    userId: "user-1",
    title: "Test",
    deletedAt: null,
    ...overrides,
  };
}

function makeTag(overrides: Record<string, unknown> = {}) {
  return {
    id: "tag-1",
    name: "Important",
    color: "#16A34A",
    ...overrides,
  };
}

describe("DocumentTagUseCases", () => {
  let documentRepo: {
    findDocumentById: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  let tagRepo: {
    findTagById: ReturnType<typeof vi.fn>;
    findManyTagsByIds: ReturnType<typeof vi.fn>;
    findManyTagDocuments: ReturnType<typeof vi.fn>;
    createManyTagDocuments: ReturnType<typeof vi.fn>;
    deleteManyTagDocuments: ReturnType<typeof vi.fn>;
  };
  let tagDocRepo: {
    transaction: ReturnType<typeof vi.fn>;
  };
  let useCases: DocumentTagUseCases;

  beforeEach(() => {
    documentRepo = {
      findDocumentById: vi.fn(),
      findMany: vi.fn(),
    };
    tagRepo = {
      findTagById: vi.fn(),
      findManyTagsByIds: vi.fn(),
      findManyTagDocuments: vi.fn(),
      createManyTagDocuments: vi.fn(),
      deleteManyTagDocuments: vi.fn(),
    };
    tagDocRepo = {
      transaction: vi.fn((fn) => fn({ tagDocument: { deleteMany: vi.fn(), createMany: vi.fn() } })),
    };
    useCases = new DocumentTagUseCases(
      documentRepo as unknown as IDocumentRepository,
      tagRepo as unknown as ITagRepository,
      tagDocRepo as unknown as ITagDocumentRepository,
    );
  });

  describe("getDocumentTags", () => {
    it("returns tags for a document", async () => {
      documentRepo.findDocumentById.mockResolvedValue({
        tags: [{ tag: { id: "t1", name: "A", color: "#000" } }],
      });

      const result = await useCases.getDocumentTags("doc-1", "user-1");

      expect(result).toEqual([{ id: "t1", name: "A", color: "#000" }]);
    });

    it("throws NotFoundError when document not found", async () => {
      documentRepo.findDocumentById.mockResolvedValue(null);

      await expect(useCases.getDocumentTags("missing", "user-1")).rejects.toThrow(NotFoundError);
    });
  });

  describe("addTagToDocument", () => {
    it("adds a tag to a document", async () => {
      documentRepo.findDocumentById.mockResolvedValue(makeDoc());
      tagRepo.findTagById.mockResolvedValue(makeTag());
      tagRepo.findManyTagDocuments.mockResolvedValue([]);
      tagRepo.createManyTagDocuments.mockResolvedValue({ count: 1 });

      const result = await useCases.addTagToDocument("doc-1", "tag-1", "user-1", "STUDENT");

      expect(result).toEqual(expect.objectContaining({ id: "tag-1" }));
    });

    it("throws when document not found", async () => {
      documentRepo.findDocumentById.mockResolvedValue(null);

      await expect(
        useCases.addTagToDocument("missing", "tag-1", "user-1", "STUDENT"),
      ).rejects.toThrow(NotFoundError);
    });

    it("throws when tag not found", async () => {
      documentRepo.findDocumentById.mockResolvedValue(makeDoc());
      tagRepo.findTagById.mockResolvedValue(null);

      await expect(
        useCases.addTagToDocument("doc-1", "missing", "user-1", "STUDENT"),
      ).rejects.toThrow(AppError);
    });

    it("throws CONFLICT when tag already assigned", async () => {
      documentRepo.findDocumentById.mockResolvedValue(makeDoc());
      tagRepo.findTagById.mockResolvedValue(makeTag());
      tagRepo.findManyTagDocuments.mockResolvedValue([{ documentId: "doc-1" }]);

      await expect(
        useCases.addTagToDocument("doc-1", "tag-1", "user-1", "STUDENT"),
      ).rejects.toThrow(AppError);
    });
  });

  describe("setDocumentTags", () => {
    it("replaces all document tags", async () => {
      documentRepo.findDocumentById.mockResolvedValue(makeDoc());
      tagRepo.findManyTagsByIds.mockResolvedValue([makeTag()]);
      tagDocRepo.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          tagDocument: { deleteMany: vi.fn().mockResolvedValue({}), createMany: vi.fn() },
        };
        return fn(tx);
      });

      const result = await useCases.setDocumentTags("doc-1", ["tag-1"], "user-1", "STUDENT");

      expect(result).toBe(1);
    });

    it("clears all tags when empty array passed", async () => {
      documentRepo.findDocumentById.mockResolvedValue(makeDoc());
      tagDocRepo.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          tagDocument: { deleteMany: vi.fn().mockResolvedValue({}), createMany: vi.fn() },
        };
        return fn(tx);
      });

      const result = await useCases.setDocumentTags("doc-1", [], "user-1", "STUDENT");

      expect(result).toBe(0);
    });

    it("throws when some tags not found", async () => {
      documentRepo.findDocumentById.mockResolvedValue(makeDoc());
      tagRepo.findManyTagsByIds.mockResolvedValue([]);

      await expect(
        useCases.setDocumentTags("doc-1", ["missing"], "user-1", "STUDENT"),
      ).rejects.toThrow(AppError);
    });
  });

  describe("removeTagFromDocument", () => {
    it("removes a tag from a document", async () => {
      documentRepo.findDocumentById.mockResolvedValue(makeDoc());
      tagRepo.findTagById.mockResolvedValue(makeTag());
      tagRepo.deleteManyTagDocuments.mockResolvedValue({ count: 1 });

      const result = await useCases.removeTagFromDocument("doc-1", "tag-1", "user-1", "STUDENT");

      expect(result).toBe(true);
    });

    it("throws when tag not assigned", async () => {
      documentRepo.findDocumentById.mockResolvedValue(makeDoc());
      tagRepo.findTagById.mockResolvedValue(makeTag());
      tagRepo.deleteManyTagDocuments.mockResolvedValue({ count: 0 });

      await expect(
        useCases.removeTagFromDocument("doc-1", "tag-1", "user-1", "STUDENT"),
      ).rejects.toThrow(AppError);
    });
  });

  describe("bulkTagDocuments", () => {
    it("tags multiple documents, skipping already-tagged ones", async () => {
      tagRepo.findTagById.mockResolvedValue(makeTag());
      documentRepo.findMany.mockResolvedValue([{ id: "doc-1" }, { id: "doc-2" }]);
      tagRepo.findManyTagDocuments.mockResolvedValue([{ documentId: "doc-1" }]);
      tagRepo.createManyTagDocuments.mockResolvedValue({ count: 1 });

      const result = await useCases.bulkTagDocuments(
        ["doc-1", "doc-2"],
        "tag-1",
        "user-1",
        "STUDENT",
      );

      expect(result.taggedCount).toBe(1);
      expect(result.skippedCount).toBe(1);
    });

    it("throws when some documents not found", async () => {
      tagRepo.findTagById.mockResolvedValue(makeTag());
      documentRepo.findMany.mockResolvedValue([{ id: "doc-1" }]);

      await expect(
        useCases.bulkTagDocuments(["doc-1", "doc-2"], "tag-1", "user-1", "STUDENT"),
      ).rejects.toThrow(AppError);
    });
  });

  describe("bulkUntagDocuments", () => {
    it("untags multiple documents", async () => {
      tagRepo.findTagById.mockResolvedValue(makeTag());
      documentRepo.findMany.mockResolvedValue([{ id: "doc-1" }, { id: "doc-2" }]);
      tagRepo.deleteManyTagDocuments.mockResolvedValue({ count: 2 });

      const result = await useCases.bulkUntagDocuments(
        ["doc-1", "doc-2"],
        "tag-1",
        "user-1",
        "STUDENT",
      );

      expect(result).toBe(2);
    });
  });
});
