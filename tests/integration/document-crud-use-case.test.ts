import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  prisma,
  createTestUser,
  createTestDocument,
  createTestFolder,
  cleanupTestUsers,
} from "./helpers/db";
import { DocumentCrudUseCases } from "../../apps/web/src/core/services/document-crud.use-cases";
import { DocumentRepository } from "../../apps/web/src/core/repositories/document.repository";
import { FolderRepository } from "../../apps/web/src/core/repositories/folder.repository";
import { NotFoundError } from "../../apps/web/src/lib/shared/errors";

describe("DocumentCrudUseCases (use-case level)", () => {
  let userA: { id: string; role: string };
  let userB: { id: string; role: string };
  const userIds: string[] = [];

  let documentCrud: DocumentCrudUseCases;

  beforeEach(async () => {
    userA = await createTestUser({ name: "UseCase User A" });
    userB = await createTestUser({ name: "UseCase User B" });
    userIds.push(userA.id, userB.id);

    const docRepo = new DocumentRepository(prisma);
    const folderRepo = new FolderRepository(prisma);
    documentCrud = new DocumentCrudUseCases(docRepo, folderRepo);
  });

  afterEach(async () => {
    await cleanupTestUsers(userIds);
    userIds.length = 0;
  });

  describe("getDocuments", () => {
    it("returns only user's documents via use-case", async () => {
      await createTestDocument(userA.id, { title: "A Doc" });
      await createTestDocument(userB.id, { title: "B Doc" });

      const { documents, total } = await documentCrud.getDocuments(userA.id, "STUDENT", {});

      expect(total).toBe(1);
      expect(documents).toHaveLength(1);
      expect(documents[0].title).toBe("A Doc");
    });

    it("admin sees all documents via use-case", async () => {
      await createTestDocument(userA.id);
      await createTestDocument(userB.id);

      const { total } = await documentCrud.getDocuments(userA.id, "ADMIN", {});
      expect(total).toBeGreaterThanOrEqual(2);
    });

    it("excludes soft-deleted documents", async () => {
      await createTestDocument(userA.id, { title: "Active" });
      await createTestDocument(userA.id, { title: "Deleted", deletedAt: new Date() });

      const { total } = await documentCrud.getDocuments(userA.id, "STUDENT", {});
      expect(total).toBe(1);
    });

    it("shows soft-deleted documents when deleted=true", async () => {
      await createTestDocument(userA.id, { title: "Active" });
      await createTestDocument(userA.id, { title: "Deleted", deletedAt: new Date() });

      const { total } = await documentCrud.getDocuments(userA.id, "STUDENT", { deleted: true });
      expect(total).toBe(1);
    });

    it("filters by folderId", async () => {
      const folder = await createTestFolder(userA.id);
      await createTestDocument(userA.id, { title: "In Folder", folderId: folder.id });
      await createTestDocument(userA.id, { title: "No Folder" });

      const { total } = await documentCrud.getDocuments(userA.id, "STUDENT", {
        folderId: folder.id,
      });
      expect(total).toBe(1);
    });

    it("filters by root folder (folderId=root)", async () => {
      await createTestDocument(userA.id, { title: "Root Doc" });
      const folder = await createTestFolder(userA.id);
      await createTestDocument(userA.id, { title: "Folder Doc", folderId: folder.id });

      const { total } = await documentCrud.getDocuments(userA.id, "STUDENT", { folderId: "root" });
      expect(total).toBe(1);
    });
  });

  describe("getDocumentById", () => {
    it("returns document by ID via use-case", async () => {
      const doc = await createTestDocument(userA.id, { title: "Find Me" });

      const found = await documentCrud.getDocumentById(doc.id, userA.id);
      expect(found.title).toBe("Find Me");
    });

    it("throws NotFoundError for wrong owner", async () => {
      const doc = await createTestDocument(userA.id);

      await expect(documentCrud.getDocumentById(doc.id, userB.id)).rejects.toThrow(NotFoundError);
    });

    it("throws NotFoundError for non-existent ID", async () => {
      await expect(documentCrud.getDocumentById("nonexistent", userA.id)).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("updateDocument", () => {
    it("updates title via use-case", async () => {
      const doc = await createTestDocument(userA.id, { title: "Old Title" });

      const updated = await documentCrud.updateDocument(doc.id, userA.id, { title: "New Title" });
      expect(updated.title).toBe("New Title");
    });

    it("updates description via use-case", async () => {
      const doc = await createTestDocument(userA.id);

      const updated = await documentCrud.updateDocument(doc.id, userA.id, {
        description: "New desc",
      });
      expect(updated.description).toBe("New desc");
    });

    it("moves document to folder via use-case", async () => {
      const doc = await createTestDocument(userA.id);
      const folder = await createTestFolder(userA.id);

      const updated = await documentCrud.updateDocument(doc.id, userA.id, { folderId: folder.id });
      expect(updated.folderId).toBe(folder.id);
    });

    it("throws NotFoundError for wrong owner", async () => {
      const doc = await createTestDocument(userA.id);

      await expect(
        documentCrud.updateDocument(doc.id, userB.id, { title: "Hacked" }),
      ).rejects.toThrow(NotFoundError);
    });

    it("does not change fields not provided", async () => {
      const doc = await createTestDocument(userA.id, { title: "Original" });

      const updated = await documentCrud.updateDocument(doc.id, userA.id, {});
      expect(updated.title).toBe("Original");
    });
  });

  describe("deleteDocument (soft delete)", () => {
    it("soft deletes via use-case", async () => {
      const doc = await createTestDocument(userA.id);

      await documentCrud.deleteDocument(doc.id, userA.id);

      const found = await prisma.document.findUnique({ where: { id: doc.id } });
      expect(found!.deletedAt).not.toBeNull();
    });

    it("throws NotFoundError for wrong owner", async () => {
      const doc = await createTestDocument(userA.id);

      await expect(documentCrud.deleteDocument(doc.id, userB.id)).rejects.toThrow(NotFoundError);
    });

    it("deleted doc excluded from list", async () => {
      const doc = await createTestDocument(userA.id);
      await documentCrud.deleteDocument(doc.id, userA.id);

      const { total } = await documentCrud.getDocuments(userA.id, "STUDENT", {});
      expect(total).toBe(0);
    });
  });

  describe("restoreDocument", () => {
    it("restores soft-deleted document via use-case", async () => {
      const doc = await createTestDocument(userA.id, { deletedAt: new Date() });

      const restored = await documentCrud.restoreDocument(doc.id, userA.id);
      expect(restored.deletedAt).toBeNull();
    });

    it("throws NotFoundError for non-deleted document", async () => {
      const doc = await createTestDocument(userA.id);

      await expect(documentCrud.restoreDocument(doc.id, userA.id)).rejects.toThrow(NotFoundError);
    });

    it("throws NotFoundError for wrong owner", async () => {
      const doc = await createTestDocument(userA.id, { deletedAt: new Date() });

      await expect(documentCrud.restoreDocument(doc.id, userB.id)).rejects.toThrow(NotFoundError);
    });
  });
});
