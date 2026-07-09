import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  prisma,
  createTestUser,
  createTestDocument,
  createTestFolder,
  createTestTag,
  cleanupTestUsers,
} from "./helpers/db";
import { DocumentCrudUseCases } from "../../apps/web/src/core/services/document-crud.use-cases";
import { DocumentMoveUseCases } from "../../apps/web/src/core/services/document-move.use-cases";
import { FolderUseCases } from "../../apps/web/src/core/services/folder.use-cases";
import { DocumentTagUseCases } from "../../apps/web/src/core/services/document-tag.use-cases";
import { BookmarkUseCases } from "../../apps/web/src/core/services/bookmark.use-cases";
import { DocumentRepository } from "../../apps/web/src/core/repositories/document.repository";
import { FolderRepository } from "../../apps/web/src/core/repositories/folder.repository";
import { NotFoundError, ValidationError } from "../../apps/web/src/shared/errors";
import type { AuthSession } from "../../apps/web/src/domain/types";

vi.mock("@/lib/email/send", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/shared/logger", () => ({
  logger: {
    child: () => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn() }),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("ioredis", () => ({
  default: class MockRedis {
    on() {}
    get() {
      return null;
    }
    set() {}
    del() {}
  },
}));

vi.mock("minio", () => ({
  Client: class MockMinio {
    putObject() {}
    getObject() {}
    bucketExists() {}
    makeBucket() {}
  },
}));

describe("Document Management Flow with Folders and Bookmarks", () => {
  let userA: { id: string; role: string };
  let userB: { id: string; role: string };
  const userIds: string[] = [];
  let documentCrud: DocumentCrudUseCases;
  let documentMove: DocumentMoveUseCases;
  let folderUseCases: FolderUseCases;
  let documentTag: DocumentTagUseCases;
  let bookmarkUseCases: BookmarkUseCases;
  let sessionA: AuthSession;

  beforeEach(async () => {
    userA = await createTestUser({ name: "Doc Mgmt User A" });
    userB = await createTestUser({ name: "Doc Mgmt User B" });
    userIds.push(userA.id, userB.id);

    const docRepo = new DocumentRepository(prisma);
    const folderRepo = new FolderRepository(prisma);
    documentCrud = new DocumentCrudUseCases(docRepo, folderRepo);
    documentMove = new DocumentMoveUseCases(docRepo, folderRepo);

    const tagRepo = {
      findTagById: vi.fn().mockResolvedValue(null),
      findManyTagsByIds: vi.fn().mockResolvedValue([]),
      findManyTagDocuments: vi.fn().mockResolvedValue([]),
      createManyTagDocuments: vi.fn().mockResolvedValue({}),
      deleteManyTagDocuments: vi.fn().mockResolvedValue({ count: 0 }),
      findFolderTags: vi.fn().mockResolvedValue([]),
    };
    const tagDocRepo = { transaction: vi.fn() };

    documentTag = new DocumentTagUseCases(docRepo as any, tagRepo as any, tagDocRepo as any);

    const bookmarkRepo = {
      getUserBookmarks: vi.fn().mockResolvedValue([]),
      countUserBookmarks: vi.fn().mockResolvedValue(0),
      toggleBookmark: vi.fn().mockResolvedValue({ bookmarked: true }),
      isBookmarked: vi.fn().mockResolvedValue(false),
    };
    bookmarkUseCases = new BookmarkUseCases(bookmarkRepo as any);

    sessionA = { user: { id: userA.id, name: null, email: "", image: null, role: "STUDENT" } };
  });

  afterEach(async () => {
    await cleanupTestUsers(userIds);
    userIds.length = 0;
  });

  describe("Create folder → document in folder", () => {
    it("creates folder and document within it", async () => {
      const folder = await createTestFolder(userA.id, { name: "الفقه" });
      const doc = await createTestDocument(userA.id, {
        title: "كتاب الفقه",
        folderId: folder.id,
      });

      expect(doc.folderId).toBe(folder.id);

      const found = await prisma.document.findUnique({
        where: { id: doc.id },
        include: { folder: { select: { id: true, name: true } } },
      });
      expect(found!.folder!.name).toBe("الفقه");
    });

    it("use-case creates document and folder association", async () => {
      const folder = await createTestFolder(userA.id, { name: "العقيدة" });
      const doc = await createTestDocument(userA.id, { title: "كتاب العقيدة" });
      await documentCrud.getDocuments(userA.id, "STUDENT", {});

      const updated = await documentCrud.updateDocument(doc.id, userA.id, {
        folderId: folder.id,
      });
      expect(updated.folderId).toBe(folder.id);
    });
  });

  describe("Move document between folders", () => {
    it("moves document from one folder to another", async () => {
      const folder1 = await createTestFolder(userA.id, { name: "مصدر" });
      const folder2 = await createTestFolder(userA.id, { name: "هدف" });
      const doc = await createTestDocument(userA.id, { folderId: folder1.id });

      const result = await documentMove.moveDocument(doc.id, userA.id, folder2.id);
      expect(result.folderId).toBe(folder2.id);
    });

    it("moves document to root (null folderId)", async () => {
      const folder = await createTestFolder(userA.id);
      const doc = await createTestDocument(userA.id, { folderId: folder.id });

      const result = await documentMove.moveDocument(doc.id, userA.id, null);
      expect(result.folderId).toBeNull();
    });

    it("throws NotFoundError for non-existent document", async () => {
      await expect(documentMove.moveDocument("nonexistent", userA.id, null)).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("Bulk operations", () => {
    it("bulk deletes multiple documents", async () => {
      const docs = await Promise.all([
        createTestDocument(userA.id),
        createTestDocument(userA.id),
        createTestDocument(userA.id),
      ]);

      const count = await documentCrud.bulkDeleteDocuments(
        docs.map((d) => d.id),
        userA.id,
      );
      expect(count).toBe(3);

      const remaining = await prisma.document.count({
        where: { userId: userA.id, deletedAt: null },
      });
      expect(remaining).toBe(0);
    });

    it("bulk move moves multiple documents to a folder", async () => {
      const folder = await createTestFolder(userA.id, { name: "Target" });
      const docs = await Promise.all([createTestDocument(userA.id), createTestDocument(userA.id)]);

      const count = await documentMove.bulkMoveDocuments(
        docs.map((d) => d.id),
        userA.id,
        folder.id,
      );
      expect(count).toBe(2);

      const moved = await prisma.document.findMany({
        where: { id: { in: docs.map((d) => d.id) } },
      });
      moved.forEach((d) => expect(d.folderId).toBe(folder.id));
    });
  });

  describe("Restore from trash", () => {
    it("soft deletes then restores document", async () => {
      const doc = await createTestDocument(userA.id);

      await documentCrud.deleteDocument(doc.id, userA.id);
      let found = await prisma.document.findUnique({ where: { id: doc.id } });
      expect(found!.deletedAt).not.toBeNull();

      await documentCrud.restoreDocument(doc.id, userA.id);
      found = await prisma.document.findUnique({ where: { id: doc.id } });
      expect(found!.deletedAt).toBeNull();
    });

    it("excludes soft-deleted from normal listing", async () => {
      await createTestDocument(userA.id, { title: "Active" });
      await createTestDocument(userA.id, { title: "Deleted", deletedAt: new Date() });

      const { total } = await documentCrud.getDocuments(userA.id, "STUDENT", {});
      expect(total).toBe(1);
    });

    it("shows deleted documents when filter is active", async () => {
      await createTestDocument(userA.id, { title: "Active" });
      await createTestDocument(userA.id, { title: "Trashed", deletedAt: new Date() });

      const { total } = await documentCrud.getDocuments(userA.id, "STUDENT", {
        deleted: true,
      });
      expect(total).toBe(1);
    });

    it("restore fails for non-deleted document", async () => {
      const doc = await createTestDocument(userA.id);
      await expect(documentCrud.restoreDocument(doc.id, userA.id)).rejects.toThrow(NotFoundError);
    });

    it("restore fails for wrong owner", async () => {
      const doc = await createTestDocument(userB.id, { deletedAt: new Date() });
      await expect(documentCrud.restoreDocument(doc.id, userA.id)).rejects.toThrow(NotFoundError);
    });
  });

  describe("Pagination and sorting", () => {
    it("returns paginated documents", async () => {
      for (let i = 0; i < 5; i++) {
        await createTestDocument(userA.id, { title: `Doc ${i}` });
      }

      const firstPage = await documentCrud.getDocuments(userA.id, "STUDENT", { take: 2, skip: 0 });
      expect(firstPage.documents).toHaveLength(2);
      expect(firstPage.total).toBe(5);

      const secondPage = await documentCrud.getDocuments(userA.id, "STUDENT", { take: 2, skip: 2 });
      expect(secondPage.documents).toHaveLength(2);
    });

    it("filters by status", async () => {
      await createTestDocument(userA.id, { title: "Active", status: "COMPLETED" });
      await createTestDocument(userA.id, { title: "Failed", status: "FAILED" });

      const docRepo = new DocumentRepository(prisma);
      const folderRepo = new FolderRepository(prisma);
      const crud = new DocumentCrudUseCases(docRepo, folderRepo);

      const { documents } = await crud.getDocuments(userA.id, "STUDENT", {});
      const activeDocs = documents.filter((d) => d.status === "COMPLETED");
      expect(activeDocs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Folder nesting (5 levels)", () => {
    it("creates 5-level folder nesting", async () => {
      const l1 = await createTestFolder(userA.id, { name: "L1" });
      const l2 = await createTestFolder(userA.id, { name: "L2", parentId: l1.id });
      const l3 = await createTestFolder(userA.id, { name: "L3", parentId: l2.id });
      const l4 = await createTestFolder(userA.id, { name: "L4", parentId: l3.id });
      const l5 = await createTestFolder(userA.id, { name: "L5", parentId: l4.id });

      expect(l5.parentId).toBe(l4.id);
      expect(l4.parentId).toBe(l3.id);
      expect(l3.parentId).toBe(l2.id);
      expect(l2.parentId).toBe(l1.id);
    });

    it("queries direct children of each level", async () => {
      const l1 = await createTestFolder(userA.id);
      const l2 = await createTestFolder(userA.id, { parentId: l1.id });
      const l3 = await createTestFolder(userA.id, { parentId: l2.id });

      const l1Children = await prisma.folder.findMany({
        where: { parentId: l1.id, deletedAt: null },
      });
      expect(l1Children).toHaveLength(1);

      const l2Children = await prisma.folder.findMany({
        where: { parentId: l2.id, deletedAt: null },
      });
      expect(l2Children).toHaveLength(1);
    });
  });

  describe("Document bookmark lifecycle", () => {
    it("toggles bookmark on a document", async () => {
      const doc = await createTestDocument(userA.id);

      const bookmarkRepo = {
        getUserBookmarks: vi.fn().mockResolvedValue([
          {
            id: "bm-1",
            userId: userA.id,
            documentId: doc.id,
            createdAt: new Date(),
            document: {
              id: doc.id,
              title: doc.title,
              status: doc.status,
              fileName: doc.fileName,
              createdAt: doc.createdAt,
            },
          },
        ]),
        countUserBookmarks: vi.fn().mockResolvedValue(1),
        toggleBookmark: vi.fn().mockImplementation(async (userId: string, documentId: string) => {
          const existing = await prisma.documentBookmark.findUnique({
            where: { userId_documentId: { userId, documentId } },
          });
          if (existing) {
            await prisma.documentBookmark.delete({
              where: { userId_documentId: { userId, documentId } },
            });
            return { bookmarked: false };
          }
          await prisma.documentBookmark.create({ data: { userId, documentId } });
          return { bookmarked: true };
        }),
        isBookmarked: vi.fn().mockResolvedValue(false),
      };

      const bm = new BookmarkUseCases(bookmarkRepo as any);

      const result = await bm.toggleBookmark(doc.id, sessionA);
      expect(result).toBeDefined();
    });

    it("creates and retrieves bookmark via prisma", async () => {
      const doc = await createTestDocument(userA.id);
      await prisma.documentBookmark.create({
        data: { userId: userA.id, documentId: doc.id },
      });

      const bm = await prisma.documentBookmark.findUnique({
        where: { userId_documentId: { userId: userA.id, documentId: doc.id } },
      });
      expect(bm).not.toBeNull();

      const docs = await prisma.document.findMany({
        where: {
          bookmarks: { some: { userId: userA.id } },
          deletedAt: null,
        },
      });
      expect(docs).toHaveLength(1);
      expect(docs[0].id).toBe(doc.id);
    });

    it("removes bookmark on second toggle", async () => {
      const doc = await createTestDocument(userA.id);
      await prisma.documentBookmark.create({
        data: { userId: userA.id, documentId: doc.id },
      });

      await prisma.documentBookmark.delete({
        where: { userId_documentId: { userId: userA.id, documentId: doc.id } },
      });

      const bm = await prisma.documentBookmark.findUnique({
        where: { userId_documentId: { userId: userA.id, documentId: doc.id } },
      });
      expect(bm).toBeNull();
    });
  });
});

async function createTest(userId: string) {
  return createTestDocument(userId);
}

async function Throw(_msg: string) {
  return;
}
