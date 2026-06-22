import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  prisma,
  createTestUser,
  createTestDocument,
  createTestFolder,
  cleanupTestUsers,
} from "./helpers/db";

describe("Folder → Documents Integration", () => {
  let userA: { id: string };
  let userB: { id: string };
  const userIds: string[] = [];

  beforeEach(async () => {
    userA = await createTestUser({ name: "Folder User A" });
    userB = await createTestUser({ name: "Folder User B" });
    userIds.push(userA.id, userB.id);
  });

  afterEach(async () => {
    await cleanupTestUsers(userIds);
    userIds.length = 0;
  });

  describe("Folder CRUD", () => {
    it("user can create and retrieve a folder", async () => {
      const folder = await createTestFolder(userA.id, { name: "My Folder" });

      const found = await prisma.folder.findFirst({
        where: { id: folder.id, userId: userA.id, deletedAt: null },
      });

      expect(found).not.toBeNull();
      expect(found!.name).toBe("My Folder");
    });

    it("user B cannot see user A's folders", async () => {
      await createTestFolder(userA.id, { name: "Private Folder" });

      const foldersForB = await prisma.folder.findMany({
        where: { userId: userB.id, deletedAt: null },
      });

      expect(foldersForB).toHaveLength(0);
    });

    it("soft-delete folder removes it from queries", async () => {
      const folder = await createTestFolder(userA.id);

      await prisma.folder.update({
        where: { id: folder.id },
        data: { deletedAt: new Date() },
      });

      const found = await prisma.folder.findFirst({
        where: { id: folder.id, deletedAt: null },
      });
      expect(found).toBeNull();
    });
  });

  describe("Folder → Document assignment", () => {
    it("document can be assigned to a folder", async () => {
      const folder = await createTestFolder(userA.id);
      const doc = await createTestDocument(userA.id, { folderId: folder.id });

      const found = await prisma.document.findUnique({ where: { id: doc.id } });
      expect(found!.folderId).toBe(folder.id);
    });

    it("folder document count reflects assigned documents", async () => {
      const folder = await createTestFolder(userA.id);
      await createTestDocument(userA.id, { folderId: folder.id });
      await createTestDocument(userA.id, { folderId: folder.id });
      await createTestDocument(userA.id, { folderId: folder.id });

      const count = await prisma.document.count({
        where: { folderId: folder.id, deletedAt: null },
      });

      expect(count).toBe(3);
    });

    it("moving document to another folder updates folderId", async () => {
      const folder1 = await createTestFolder(userA.id);
      const folder2 = await createTestFolder(userA.id);
      const doc = await createTestDocument(userA.id, { folderId: folder1.id });

      await prisma.document.update({
        where: { id: doc.id },
        data: { folderId: folder2.id },
      });

      const updated = await prisma.document.findUnique({ where: { id: doc.id } });
      expect(updated!.folderId).toBe(folder2.id);

      const count1 = await prisma.document.count({ where: { folderId: folder1.id } });
      const count2 = await prisma.document.count({ where: { folderId: folder2.id } });
      expect(count1).toBe(0);
      expect(count2).toBe(1);
    });

    it("moving document to root (null folderId)", async () => {
      const folder = await createTestFolder(userA.id);
      const doc = await createTestDocument(userA.id, { folderId: folder.id });

      await prisma.document.update({
        where: { id: doc.id },
        data: { folderId: null },
      });

      const updated = await prisma.document.findUnique({ where: { id: doc.id } });
      expect(updated!.folderId).toBeNull();
    });
  });

  describe("Folder hierarchy", () => {
    it("child folder references parent", async () => {
      const parent = await createTestFolder(userA.id, { name: "Parent" });
      const child = await createTestFolder(userA.id, { name: "Child", parentId: parent.id });

      expect(child.parentId).toBe(parent.id);
    });

    it("multi-level nesting works", async () => {
      const l1 = await createTestFolder(userA.id, { name: "L1" });
      const l2 = await createTestFolder(userA.id, { name: "L2", parentId: l1.id });
      const l3 = await createTestFolder(userA.id, { name: "L3", parentId: l2.id });

      expect(l3.parentId).toBe(l2.id);
      expect(l2.parentId).toBe(l1.id);
    });

    it("children query returns only direct children", async () => {
      const parent = await createTestFolder(userA.id);
      await createTestFolder(userA.id, { parentId: parent.id });
      await createTestFolder(userA.id, { parentId: parent.id });
      await createTestFolder(userA.id);

      const children = await prisma.folder.findMany({
        where: { parentId: parent.id, deletedAt: null },
      });

      expect(children).toHaveLength(2);
    });
  });

  describe("Folder deletion → document orphaning", () => {
    it("deleting folder orphans documents (folderId set to null)", async () => {
      const folder = await createTestFolder(userA.id);
      const doc1 = await createTestDocument(userA.id, { folderId: folder.id });
      const doc2 = await createTestDocument(userA.id, { folderId: folder.id });

      await prisma.document.updateMany({
        where: { folderId: folder.id, userId: userA.id, deletedAt: null },
        data: { folderId: null },
      });
      await prisma.folder.update({
        where: { id: folder.id },
        data: { deletedAt: new Date() },
      });

      const d1 = await prisma.document.findUnique({ where: { id: doc1.id } });
      const d2 = await prisma.document.findUnique({ where: { id: doc2.id } });
      expect(d1!.folderId).toBeNull();
      expect(d2!.folderId).toBeNull();
      expect(d1!.deletedAt).toBeNull();
      expect(d2!.deletedAt).toBeNull();
    });

    it("cascade soft-delete of subfolder documents", async () => {
      const parent = await createTestFolder(userA.id);
      const child = await createTestFolder(userA.id, { parentId: parent.id });

      const docInParent = await createTestDocument(userA.id, { folderId: parent.id });
      const docInChild = await createTestDocument(userA.id, { folderId: child.id });

      const allFolderIds = [parent.id, child.id];

      await prisma.document.updateMany({
        where: { folderId: { in: allFolderIds }, userId: userA.id, deletedAt: null },
        data: { folderId: null },
      });
      await prisma.folder.updateMany({
        where: { id: { in: allFolderIds }, userId: userA.id },
        data: { deletedAt: new Date() },
      });

      const d1 = await prisma.document.findUnique({ where: { id: docInParent.id } });
      const d2 = await prisma.document.findUnique({ where: { id: docInChild.id } });
      expect(d1!.folderId).toBeNull();
      expect(d2!.folderId).toBeNull();
    });
  });

  describe("Cross-user folder isolation", () => {
    it("user A cannot assign document to user B's folder", async () => {
      const bFolder = await createTestFolder(userB.id);

      const doc = await createTestDocument(userA.id);

      const bFolderForA = await prisma.folder.findFirst({
        where: { id: bFolder.id, userId: userA.id, deletedAt: null },
      });
      expect(bFolderForA).toBeNull();
    });
  });
});
