import { describe, it, expect, vi, beforeEach } from "vitest";
import { TagUseCases } from "@/core/use-cases/tag.use-cases";
import type { ITagRepository } from "@/domain/repositories/tag.repository.interface";
import type { ITagDocumentRepository } from "@/domain/repositories/tag-document.repository.interface";
import { NotFoundError, ConflictError, ValidationError } from "@/lib/errors";
import type { AuthSession } from "@/lib/auth-guards";

function makeSession(overrides: Record<string, unknown> = {}): AuthSession {
  return {
    user: { id: "user-1", role: "STUDENT", name: "Test", email: "test@test.com" },
    ...overrides,
  } as AuthSession;
}

function makeTag(overrides: Record<string, unknown> = {}) {
  return {
    id: "tag-1",
    userId: "user-1",
    name: "Important",
    color: "#16A34A",
    createdAt: new Date(),
    _count: { documents: 0 },
    ...overrides,
  };
}

describe("TagUseCases", () => {
  let tagRepo: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    transaction: ReturnType<typeof vi.fn>;
  };
  let tagDocRepo: {
    findMany: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
  };
  let useCases: TagUseCases;

  beforeEach(() => {
    tagRepo = {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      transaction: vi.fn(),
    };
    tagDocRepo = {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    };
    useCases = new TagUseCases(
      tagRepo as unknown as ITagRepository,
      tagDocRepo as unknown as ITagDocumentRepository,
    );
  });

  describe("getTags", () => {
    it("returns tags for regular user", async () => {
      tagRepo.findMany.mockResolvedValue([makeTag()]);

      const result = await useCases.getTags(makeSession());

      expect(tagRepo.findMany).toHaveBeenCalledWith({ userId: "user-1" });
      expect(result).toHaveLength(1);
    });

    it("returns all tags for admin", async () => {
      tagRepo.findMany.mockResolvedValue([]);

      await useCases.getTags(makeSession({ user: { id: "admin-1", role: "ADMIN" } }));

      expect(tagRepo.findMany).toHaveBeenCalledWith({});
    });
  });

  describe("getTagById", () => {
    it("returns a tag by id", async () => {
      tagRepo.findFirst.mockResolvedValue(makeTag());

      const result = await useCases.getTagById("tag-1", makeSession());

      expect(result.id).toBe("tag-1");
    });

    it("throws NotFoundError when tag not found", async () => {
      tagRepo.findFirst.mockResolvedValue(null);

      await expect(useCases.getTagById("missing", makeSession())).rejects.toThrow(NotFoundError);
    });
  });

  describe("createTag", () => {
    it("creates a tag with default color", async () => {
      tagRepo.count.mockResolvedValue(0);
      tagRepo.findFirst.mockResolvedValue(null);
      tagRepo.create.mockResolvedValue(makeTag());

      const result = await useCases.createTag("New Tag", undefined, makeSession());

      expect(tagRepo.create).toHaveBeenCalledWith(expect.objectContaining({ name: "New Tag" }));
    });

    it("throws when max tags reached", async () => {
      tagRepo.count.mockResolvedValue(50);

      await expect(useCases.createTag("X", undefined, makeSession())).rejects.toThrow(
        ValidationError,
      );
    });

    it("throws ConflictError when tag name exists", async () => {
      tagRepo.count.mockResolvedValue(0);
      tagRepo.findFirst.mockResolvedValue(makeTag());

      await expect(useCases.createTag("Important", undefined, makeSession())).rejects.toThrow(
        ConflictError,
      );
    });
  });

  describe("updateTag", () => {
    it("updates tag name and color", async () => {
      tagRepo.findFirst.mockResolvedValueOnce(makeTag()).mockResolvedValueOnce(null);
      tagRepo.update.mockResolvedValue(makeTag({ name: "Updated" }));

      const result = await useCases.updateTag(
        "tag-1",
        { name: "Updated", color: "#FF0000" },
        makeSession(),
      );

      expect(result.name).toBe("Updated");
    });

    it("throws NotFoundError when tag not found", async () => {
      tagRepo.findFirst.mockResolvedValue(null);

      await expect(useCases.updateTag("missing", { name: "X" }, makeSession())).rejects.toThrow(
        NotFoundError,
      );
    });

    it("throws ConflictError when new name already exists", async () => {
      tagRepo.findFirst
        .mockResolvedValueOnce(makeTag())
        .mockResolvedValueOnce(makeTag({ id: "other" }));

      await expect(
        useCases.updateTag("tag-1", { name: "Existing" }, makeSession()),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("deleteTag", () => {
    it("deletes tag and its associations", async () => {
      tagRepo.findFirst.mockResolvedValue(makeTag());
      tagRepo.delete.mockResolvedValue(undefined);
      tagDocRepo.deleteMany.mockResolvedValue({ count: 0 });

      await useCases.deleteTag("tag-1", makeSession());

      expect(tagRepo.delete).toHaveBeenCalledWith("tag-1");
      expect(tagDocRepo.deleteMany).toHaveBeenCalledWith({ tagId: "tag-1" });
    });

    it("throws NotFoundError when tag not found", async () => {
      tagRepo.findFirst.mockResolvedValue(null);

      await expect(useCases.deleteTag("missing", makeSession())).rejects.toThrow(NotFoundError);
    });
  });

  describe("mergeTags", () => {
    it("merges source tag into target tag", async () => {
      tagRepo.findFirst
        .mockResolvedValueOnce(makeTag({ id: "source" }))
        .mockResolvedValueOnce(makeTag({ id: "target" }));
      tagDocRepo.findMany
        .mockResolvedValueOnce([{ documentId: "d1" }, { documentId: "d2" }])
        .mockResolvedValueOnce([{ documentId: "d1" }]);
      tagRepo.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          tagDocument: { createMany: vi.fn(), deleteMany: vi.fn() },
          tag: { delete: vi.fn() },
        };
        return fn(tx);
      });

      const result = await useCases.mergeTags("source", "target", makeSession());

      expect(result.affectedDocuments).toBe(1);
    });

    it("throws when merging tag with itself", async () => {
      await expect(useCases.mergeTags("tag-1", "tag-1", makeSession())).rejects.toThrow(
        ValidationError,
      );
    });

    it("throws when source tag not found", async () => {
      tagRepo.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(makeTag());

      await expect(useCases.mergeTags("missing", "target", makeSession())).rejects.toThrow(
        NotFoundError,
      );
    });

    it("throws when target tag not found", async () => {
      tagRepo.findFirst.mockResolvedValueOnce(makeTag()).mockResolvedValueOnce(null);

      await expect(useCases.mergeTags("source", "missing", makeSession())).rejects.toThrow(
        NotFoundError,
      );
    });
  });
});
