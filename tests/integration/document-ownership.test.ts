import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma, createTestUser, createTestDocument, cleanupTestUsers } from "./helpers/db";

describe("Document CRUD + Ownership Boundaries", () => {
  let userA: { id: string };
  let userB: { id: string };
  let admin: { id: string };
  const userIds: string[] = [];

  beforeEach(async () => {
    userA = await createTestUser({ name: "User A" });
    userB = await createTestUser({ name: "User B" });
    admin = await createTestUser({ name: "Admin", role: "ADMIN" });
    userIds.push(userA.id, userB.id, admin.id);
  });

  afterEach(async () => {
    await cleanupTestUsers(userIds);
    userIds.length = 0;
  });

  describe("CRUD", () => {
    it("user can create and read their own document", async () => {
      const doc = await createTestDocument(userA.id, { title: "My Book" });

      const found = await prisma.document.findFirst({
        where: { id: doc.id, userId: userA.id, deletedAt: null },
      });

      expect(found).not.toBeNull();
      expect(found!.title).toBe("My Book");
    });

    it("user can update their own document", async () => {
      const doc = await createTestDocument(userA.id);

      const updated = await prisma.document.update({
        where: { id: doc.id },
        data: { title: "Updated Title" },
      });

      expect(updated.title).toBe("Updated Title");
    });

    it("soft delete sets deletedAt", async () => {
      const doc = await createTestDocument(userA.id);

      await prisma.document.update({
        where: { id: doc.id },
        data: { deletedAt: new Date() },
      });

      const found = await prisma.document.findFirst({
        where: { id: doc.id, deletedAt: null },
      });
      expect(found).toBeNull();

      const deleted = await prisma.document.findUnique({ where: { id: doc.id } });
      expect(deleted!.deletedAt).not.toBeNull();
    });

    it("restore clears deletedAt", async () => {
      const doc = await createTestDocument(userA.id);
      await prisma.document.update({ where: { id: doc.id }, data: { deletedAt: new Date() } });

      await prisma.document.update({ where: { id: doc.id }, data: { deletedAt: null } });

      const found = await prisma.document.findFirst({
        where: { id: doc.id, deletedAt: null },
      });
      expect(found).not.toBeNull();
    });
  });

  describe("Ownership boundaries", () => {
    it("user B cannot see user A's document via scoped query", async () => {
      await createTestDocument(userA.id, { title: "Private Doc" });

      const docsForB = await prisma.document.findMany({
        where: { userId: userB.id, deletedAt: null },
      });

      expect(docsForB).toHaveLength(0);
    });

    it("scoped findFirst returns null for wrong owner", async () => {
      const doc = await createTestDocument(userA.id);

      const found = await prisma.document.findFirst({
        where: { id: doc.id, userId: userB.id, deletedAt: null },
      });

      expect(found).toBeNull();
    });

    it("admin can see all documents (no userId filter)", async () => {
      await createTestDocument(userA.id);
      await createTestDocument(userB.id);

      const allDocs = await prisma.document.findMany({
        where: { deletedAt: null },
      });

      expect(allDocs.length).toBeGreaterThanOrEqual(2);
    });

    it("user A sees only their own documents in list", async () => {
      await createTestDocument(userA.id, { title: "A Doc 1" });
      await createTestDocument(userA.id, { title: "A Doc 2" });
      await createTestDocument(userB.id, { title: "B Doc 1" });

      const aDocs = await prisma.document.findMany({
        where: { userId: userA.id, deletedAt: null },
      });

      expect(aDocs).toHaveLength(2);
      expect(aDocs.every((d) => d.userId === userA.id)).toBe(true);
    });

    it("soft-deleted docs excluded from user's list", async () => {
      const doc = await createTestDocument(userA.id);
      await prisma.document.update({ where: { id: doc.id }, data: { deletedAt: new Date() } });

      const docs = await prisma.document.findMany({
        where: { userId: userA.id, deletedAt: null },
      });

      expect(docs).toHaveLength(0);
    });
  });

  describe("Document status transitions", () => {
    it("document starts as UPLOADED", async () => {
      const doc = await createTestDocument(userA.id, { status: "UPLOADED" });
      expect(doc.status).toBe("UPLOADED");
    });

    it("status can transition through pipeline stages", async () => {
      const doc = await createTestDocument(userA.id, { status: "UPLOADED" });

      const stages = [
        "VALIDATING",
        "SPLITTING",
        "OCR_PROCESSING",
        "CLEANING",
        "GENERATING",
        "COMPLETED",
      ];

      for (const stage of stages) {
        const updated = await prisma.document.update({
          where: { id: doc.id },
          data: { status: stage as "UPLOADED" },
        });
        expect(updated.status).toBe(stage);
      }
    });

    it("failed status is terminal-safe (can be set from any stage)", async () => {
      const doc = await createTestDocument(userA.id, { status: "OCR_PROCESSING" });

      const failed = await prisma.document.update({
        where: { id: doc.id },
        data: { status: "FAILED" },
      });

      expect(failed.status).toBe("FAILED");
    });
  });

  describe("Cascade behavior", () => {
    it("deleting user cascades to their documents", async () => {
      const tempUser = await createTestUser({ name: "Temp" });
      const doc = await createTestDocument(tempUser.id);

      await prisma.user.delete({ where: { id: tempUser.id } });

      const found = await prisma.document.findUnique({ where: { id: doc.id } });
      expect(found).toBeNull();

      userIds.push(tempUser.id);
    });
  });
});
