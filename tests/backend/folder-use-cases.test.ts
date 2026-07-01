import { describe, it, expect, vi, beforeEach } from "vitest";
import { FolderUseCases } from "@/core/use-cases/folder.use-cases";
import type { IFolderRepository } from "@/domain/repositories/folder.repository.interface";
import type { ITagRepository } from "@/domain/repositories/tag.repository.interface";
import { NotFoundError, AppError } from "@/lib/shared/errors";

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

describe("FolderUseCases", () => {
  let folderRepo: {
    findById: ReturnType<typeof vi.fn>;
    findWithDeleted: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    getMaxOrder: ReturnType<typeof vi.fn>;
    transaction: ReturnType<typeof vi.fn>;
    restore: ReturnType<typeof vi.fn>;
    getDescendantIds: ReturnType<typeof vi.fn>;
    getAncestorDepth: ReturnType<typeof vi.fn>;
  };
  let tagRepo: {
    findFolderTags: ReturnType<typeof vi.fn>;
  };
  let useCases: FolderUseCases;

  beforeEach(() => {
    folderRepo = {
      findById: vi.fn(),
      findWithDeleted: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      getMaxOrder: vi.fn(),
      transaction: vi.fn(),
      restore: vi.fn(),
      getDescendantIds: vi.fn(),
      getAncestorDepth: vi.fn(),
    };
    tagRepo = { findFolderTags: vi.fn() };
    useCases = new FolderUseCases(
      folderRepo as unknown as IFolderRepository,
      tagRepo as unknown as ITagRepository,
    );
  });

  describe("createFolder", () => {
    it("creates a root folder with order 1 when no folders exist", async () => {
      folderRepo.getMaxOrder.mockResolvedValue(0);
      folderRepo.create.mockResolvedValue(makeFolder({ name: "New" }));

      const result = await useCases.createFolder("user-1", { name: "New" });

      expect(result).toEqual(expect.objectContaining({ name: "New" }));
      expect(folderRepo.create).toHaveBeenCalledWith(expect.objectContaining({ order: 1 }));
    });

    it("creates a child folder with correct parentId", async () => {
      folderRepo.findById.mockResolvedValue(makeFolder({ id: "parent-1" }));
      folderRepo.getMaxOrder.mockResolvedValue(0);
      folderRepo.create.mockResolvedValue(makeFolder({ parentId: "parent-1" }));

      const result = await useCases.createFolder("user-1", {
        name: "Child",
        parentId: "parent-1",
      });

      expect(folderRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ parentId: "parent-1" }),
      );
    });

    it("throws NotFoundError when parent does not exist", async () => {
      folderRepo.findById.mockResolvedValue(null);

      await expect(
        useCases.createFolder("user-1", { name: "Child", parentId: "missing" }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("getFolderById", () => {
    it("returns folder with counts", async () => {
      folderRepo.findById.mockResolvedValue(makeFolder());

      const result = await useCases.getFolderById("folder-1", "user-1");

      expect(result).toEqual(expect.objectContaining({ id: "folder-1" }));
    });

    it("throws NotFoundError when folder not found", async () => {
      folderRepo.findById.mockResolvedValue(null);

      await expect(useCases.getFolderById("missing", "user-1")).rejects.toThrow(NotFoundError);
    });
  });

  describe("renameFolder", () => {
    it("renames a folder", async () => {
      folderRepo.findById.mockResolvedValue(makeFolder());
      folderRepo.update.mockResolvedValue(makeFolder({ name: "Renamed" }));

      const result = await useCases.renameFolder("folder-1", "user-1", "Renamed");

      expect(result.name).toBe("Renamed");
    });

    it("throws NotFoundError when folder not found", async () => {
      folderRepo.findById.mockResolvedValue(null);

      await expect(useCases.renameFolder("missing", "user-1", "X")).rejects.toThrow(NotFoundError);
    });
  });

  describe("deleteFolder", () => {
    it("soft-deletes folder and its descendants, unlinks documents", async () => {
      folderRepo.findById.mockResolvedValue(makeFolder());
      folderRepo.getDescendantIds.mockResolvedValue(["folder-1", "child-1"]);
      const tx = {
        folder: { updateMany: vi.fn() },
        document: { updateMany: vi.fn() },
      };
      folderRepo.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(tx),
      );

      await useCases.deleteFolder("folder-1", "user-1");

      expect(tx.folder.updateMany).toHaveBeenCalled();
      expect(tx.document.updateMany).toHaveBeenCalled();
    });

    it("throws NotFoundError when folder not found", async () => {
      folderRepo.findById.mockResolvedValue(null);

      await expect(useCases.deleteFolder("missing", "user-1")).rejects.toThrow(NotFoundError);
    });
  });

  describe("moveFolder", () => {
    it("throws when trying to move folder into itself", async () => {
      folderRepo.findById.mockResolvedValue(makeFolder());

      await expect(useCases.moveFolder("folder-1", "user-1", "folder-1")).rejects.toThrow(AppError);
    });

    it("throws when target folder not found", async () => {
      folderRepo.findById.mockResolvedValueOnce(makeFolder()).mockResolvedValueOnce(null);

      await expect(useCases.moveFolder("folder-1", "user-1", "missing")).rejects.toThrow(AppError);
    });

    it("detects circular reference", async () => {
      const folderA = makeFolder({ id: "a", parentId: null });
      const folderB = makeFolder({ id: "b", parentId: "a" });
      folderRepo.findById.mockResolvedValueOnce(folderA).mockResolvedValueOnce(folderB);
      folderRepo.getDescendantIds.mockResolvedValue(["a", "b"]);

      await expect(useCases.moveFolder("a", "user-1", "b")).rejects.toThrow(AppError);
    });

    it("moves folder to new parent", async () => {
      const folder = makeFolder({ id: "a" });
      const parent = makeFolder({ id: "b" });
      folderRepo.findById.mockResolvedValueOnce(folder).mockResolvedValueOnce(parent);
      folderRepo.getDescendantIds.mockResolvedValue(["a"]);
      folderRepo.getAncestorDepth.mockResolvedValue(0);
      folderRepo.findMany.mockResolvedValue([folder, parent]);
      folderRepo.update.mockResolvedValue({ ...folder, parentId: "b" });

      const result = await useCases.moveFolder("a", "user-1", "b");

      expect(folderRepo.update).toHaveBeenCalledWith("a", "user-1", { parentId: "b" });
    });
  });

  describe("restoreFolder", () => {
    it("restores a soft-deleted folder", async () => {
      folderRepo.findWithDeleted.mockResolvedValue(makeFolder({ deletedAt: new Date() }));
      folderRepo.restore.mockResolvedValue(makeFolder({ deletedAt: null }));

      const result = await useCases.restoreFolder("folder-1", "user-1");

      expect(result.deletedAt).toBeNull();
    });

    it("throws NotFoundError when folder not found", async () => {
      folderRepo.findWithDeleted.mockResolvedValue(null);

      await expect(useCases.restoreFolder("missing", "user-1")).rejects.toThrow(NotFoundError);
    });

    it("throws when parent is deleted", async () => {
      folderRepo.findWithDeleted
        .mockResolvedValueOnce(
          makeFolder({ id: "child", parentId: "parent-1", deletedAt: new Date() }),
        )
        .mockResolvedValueOnce(null);

      await expect(useCases.restoreFolder("child", "user-1")).rejects.toThrow(AppError);
    });
  });

  describe("getFolderTree", () => {
    it("returns tree structure and target folder", async () => {
      folderRepo.findById.mockResolvedValue(makeFolder());
      folderRepo.findMany.mockResolvedValue([makeFolder()]);

      const result = await useCases.getFolderTree("folder-1", "user-1");

      expect(result.tree).toBeDefined();
      expect(result.targetFolder).toBeDefined();
    });

    it("throws NotFoundError when folder not found", async () => {
      folderRepo.findById.mockResolvedValue(null);

      await expect(useCases.getFolderTree("missing", "user-1")).rejects.toThrow(NotFoundError);
    });
  });

  describe("getFolderTags", () => {
    it("returns tags sorted by count descending", async () => {
      tagRepo.findFolderTags.mockResolvedValue([
        { id: "t1", name: "A", color: "#000", _count: { documents: 5 } },
        { id: "t2", name: "B", color: "#111", _count: { documents: 10 } },
      ]);

      const result = await useCases.getFolderTags("folder-1", "user-1", "STUDENT");

      expect(result[0].count).toBe(10);
      expect(result[1].count).toBe(5);
    });
  });
});
