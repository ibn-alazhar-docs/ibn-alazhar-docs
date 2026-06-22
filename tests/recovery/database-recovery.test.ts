import "dotenv/config";
import { describe, it, expect, afterEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";

const prisma = new PrismaClient();

function uid(): string {
  return `rec_${Date.now()}_${randomBytes(4).toString("hex")}`;
}

describe("Database Failure Recovery", () => {
  const userIds: string[] = [];

  afterEach(async () => {
    await prisma.shareLink.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
    await prisma.tagDocument
      .deleteMany({ where: { tag: { userId: { in: userIds } } } })
      .catch(() => {});
    await prisma.tag.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
    await prisma.conversionJob.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
    await prisma.document.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
    await prisma.folder
      .updateMany({ where: { userId: { in: userIds } }, data: { parentId: null } })
      .catch(() => {});
    await prisma.folder.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {});
    userIds.length = 0;
  });

  describe("Unique constraint violation recovery", () => {
    it("connection remains usable after duplicate email insert", async () => {
      const id = uid();
      await prisma.user.create({
        data: { id, email: `${id}@rec.ibn`, name: "User", passwordHash: "hash" },
      });
      userIds.push(id);

      let caughtError = false;
      try {
        await prisma.user.create({
          data: { id: uid(), email: `${id}@rec.ibn`, name: "Duplicate", passwordHash: "hash" },
        });
      } catch {
        caughtError = true;
      }
      expect(caughtError).toBe(true);

      const users = await prisma.user.findMany({
        where: { email: `${id}@rec.ibn` },
      });
      expect(users).toHaveLength(1);
    });

    it("connection remains usable after duplicate tag name insert", async () => {
      const userId = uid();
      await prisma.user.create({
        data: { id: userId, email: `${userId}@rec.ibn`, name: "User", passwordHash: "hash" },
      });
      userIds.push(userId);

      await prisma.tag.create({
        data: { id: uid(), userId, name: "same-name" },
      });

      let caughtError = false;
      try {
        await prisma.tag.create({
          data: { id: uid(), userId, name: "same-name" },
        });
      } catch {
        caughtError = true;
      }
      expect(caughtError).toBe(true);

      const tags = await prisma.tag.findMany({ where: { userId } });
      expect(tags).toHaveLength(1);
    });

    it("connection remains usable after duplicate tag-document insert", async () => {
      const userId = uid();
      await prisma.user.create({
        data: { id: userId, email: `${userId}@rec.ibn`, name: "User", passwordHash: "hash" },
      });
      userIds.push(userId);

      const tagId = uid();
      const docId = uid();
      await prisma.tag.create({ data: { id: tagId, userId, name: "tag" } });
      await prisma.document.create({
        data: {
          id: docId,
          userId,
          title: "Doc",
          fileName: "d.pdf",
          originalName: "d.pdf",
          mimeType: "application/pdf",
          fileSize: 1024,
          storageKey: `rec/${userId}/${docId}.pdf`,
        },
      });

      await prisma.tagDocument.create({ data: { tagId, documentId: docId } });

      let caughtError = false;
      try {
        await prisma.tagDocument.create({ data: { tagId, documentId: docId } });
      } catch {
        caughtError = true;
      }
      expect(caughtError).toBe(true);

      const count = await prisma.tagDocument.count({ where: { tagId } });
      expect(count).toBe(1);
    });
  });

  describe("Soft delete and restore cycle", () => {
    it("document survives delete → restore cycle with data intact", async () => {
      const userId = uid();
      await prisma.user.create({
        data: { id: userId, email: `${userId}@rec.ibn`, name: "User", passwordHash: "hash" },
      });
      userIds.push(userId);

      const docId = uid();
      await prisma.document.create({
        data: {
          id: docId,
          userId,
          title: "Recovery Test",
          fileName: "r.pdf",
          originalName: "r.pdf",
          mimeType: "application/pdf",
          fileSize: 2048,
          storageKey: `rec/${userId}/${docId}.pdf`,
          status: "COMPLETED",
        },
      });

      await prisma.document.update({
        where: { id: docId },
        data: { deletedAt: new Date() },
      });

      const deleted = await prisma.document.findFirst({
        where: { id: docId, deletedAt: null },
      });
      expect(deleted).toBeNull();

      await prisma.document.update({
        where: { id: docId },
        data: { deletedAt: null },
      });

      const restored = await prisma.document.findUnique({ where: { id: docId } });
      expect(restored).not.toBeNull();
      expect(restored!.title).toBe("Recovery Test");
      expect(restored!.fileSize.toString()).toBe("2048");
      expect(restored!.deletedAt).toBeNull();
    });

    it("folder with children survives cascade delete → restore", async () => {
      const userId = uid();
      await prisma.user.create({
        data: { id: userId, email: `${userId}@rec.ibn`, name: "User", passwordHash: "hash" },
      });
      userIds.push(userId);

      const parentId = uid();
      const childId = uid();
      await prisma.folder.create({ data: { id: parentId, userId, name: "Parent" } });
      await prisma.folder.create({ data: { id: childId, userId, name: "Child", parentId } });

      await prisma.folder.updateMany({
        where: { id: { in: [parentId, childId] } },
        data: { deletedAt: new Date() },
      });

      const activeFolders = await prisma.folder.findMany({
        where: { userId, deletedAt: null },
      });
      expect(activeFolders).toHaveLength(0);

      await prisma.folder.update({ where: { id: parentId }, data: { deletedAt: null } });
      await prisma.folder.update({ where: { id: childId }, data: { deletedAt: null } });

      const restored = await prisma.folder.findMany({
        where: { userId, deletedAt: null },
      });
      expect(restored).toHaveLength(2);
    });
  });

  describe("Concurrent write conflict recovery", () => {
    it("two concurrent updates to same document — last write wins", async () => {
      const userId = uid();
      await prisma.user.create({
        data: { id: userId, email: `${userId}@rec.ibn`, name: "User", passwordHash: "hash" },
      });
      userIds.push(userId);

      const docId = uid();
      await prisma.document.create({
        data: {
          id: docId,
          userId,
          title: "Original",
          fileName: "c.pdf",
          originalName: "c.pdf",
          mimeType: "application/pdf",
          fileSize: 1024,
          storageKey: `rec/${userId}/${docId}.pdf`,
        },
      });

      await Promise.all([
        prisma.document.update({ where: { id: docId }, data: { title: "Update A" } }),
        prisma.document.update({ where: { id: docId }, data: { title: "Update B" } }),
      ]);

      const doc = await prisma.document.findUnique({ where: { id: docId } });
      expect(["Update A", "Update B"]).toContain(doc!.title);
    });
  });

  describe("Transaction rollback", () => {
    it("failed transaction does not partially commit", async () => {
      const userId = uid();
      await prisma.user.create({
        data: { id: userId, email: `${userId}@rec.ibn`, name: "User", passwordHash: "hash" },
      });
      userIds.push(userId);

      let caughtError = false;
      try {
        await prisma.$transaction(async (tx) => {
          await tx.document.create({
            data: {
              id: uid(),
              userId,
              title: "TX Doc",
              fileName: "tx.pdf",
              originalName: "tx.pdf",
              mimeType: "application/pdf",
              fileSize: 1024,
              storageKey: `rec/${userId}/tx-${Date.now()}.pdf`,
            },
          });

          throw new Error("Simulated failure — rollback everything");
        });
      } catch {
        caughtError = true;
      }
      expect(caughtError).toBe(true);

      const docs = await prisma.document.findMany({
        where: { userId, title: "TX Doc" },
      });
      expect(docs).toHaveLength(0);
    });
  });

  describe("Connection pool recovery", () => {
    it("rapid sequential queries after error still work", async () => {
      const userId = uid();
      await prisma.user.create({
        data: { id: userId, email: `${userId}@rec.ibn`, name: "User", passwordHash: "hash" },
      });
      userIds.push(userId);

      try {
        await prisma.document.findUnique({ where: { id: "nonexistent" } });
        await prisma.$queryRawUnsafe("SELECT * FROM nonexistent_table_xyz");
      } catch {
        // expected
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user).not.toBeNull();

      const count = await prisma.document.count({ where: { userId } });
      expect(count).toBe(0);
    });

    it("50 concurrent queries after transient error", async () => {
      const userId = uid();
      await prisma.user.create({
        data: { id: userId, email: `${userId}@rec.ibn`, name: "User", passwordHash: "hash" },
      });
      userIds.push(userId);

      try {
        await prisma.$queryRawUnsafe("INVALID SQL SYNTAX HERE");
      } catch {
        // expected
      }

      const results = await Promise.all(
        Array.from({ length: 50 }, () =>
          prisma.user.count({ where: { id: userId } }).catch(() => -1),
        ),
      );

      const errors = results.filter((r) => r === -1).length;
      expect(errors).toBe(0);
    });
  });
});
