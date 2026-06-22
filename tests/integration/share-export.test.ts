import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { randomBytes } from "node:crypto";
import { prisma, createTestUser, createTestDocument, cleanupTestUsers } from "./helpers/db";

describe("Share → Export Integration", () => {
  let userA: { id: string };
  const userIds: string[] = [];

  beforeEach(async () => {
    userA = await createTestUser({ name: "Share User" });
    userIds.push(userA.id);
  });

  afterEach(async () => {
    await cleanupTestUsers(userIds);
    userIds.length = 0;
  });

  describe("Share link creation", () => {
    it("create share link for completed document", async () => {
      const doc = await createTestDocument(userA.id, { status: "COMPLETED" });
      const token = randomBytes(32).toString("base64url");

      const share = await prisma.shareLink.create({
        data: {
          token,
          documentId: doc.id,
          userId: userA.id,
          expiresAt: null,
        },
      });

      expect(share.token).toBe(token);
      expect(share.documentId).toBe(doc.id);
    });

    it("share link includes document title", async () => {
      const doc = await createTestDocument(userA.id, { title: "Shared Book" });
      const token = randomBytes(32).toString("base64url");

      const share = await prisma.shareLink.create({
        data: { token, documentId: doc.id, userId: userA.id, expiresAt: null },
        include: { document: { select: { title: true } } },
      });

      expect(share.document.title).toBe("Shared Book");
    });

    it("one share link per document per user (unique constraint)", async () => {
      const doc = await createTestDocument(userA.id);
      const token1 = randomBytes(32).toString("base64url");

      await prisma.shareLink.create({
        data: { token: token1, documentId: doc.id, userId: userA.id, expiresAt: null },
      });

      const token2 = randomBytes(32).toString("base64url");
      await expect(
        prisma.shareLink.create({
          data: { token: token2, documentId: doc.id, userId: userA.id, expiresAt: null },
        }),
      ).rejects.toThrow();
    });
  });

  describe("Share link access validation", () => {
    it("valid token finds the share", async () => {
      const doc = await createTestDocument(userA.id, { status: "COMPLETED" });
      const token = randomBytes(32).toString("base64url");

      await prisma.shareLink.create({
        data: { token, documentId: doc.id, userId: userA.id, expiresAt: null },
      });

      const found = await prisma.shareLink.findUnique({
        where: { token },
        include: { document: true },
      });

      expect(found).not.toBeNull();
      expect(found!.document.status).toBe("COMPLETED");
    });

    it("invalid token returns null", async () => {
      const found = await prisma.shareLink.findUnique({
        where: { token: "nonexistent-token" },
      });

      expect(found).toBeNull();
    });

    it("expired share link detected", async () => {
      const doc = await createTestDocument(userA.id);
      const token = randomBytes(32).toString("base64url");
      const pastDate = new Date(Date.now() - 86400000);

      await prisma.shareLink.create({
        data: { token, documentId: doc.id, userId: userA.id, expiresAt: pastDate },
      });

      const share = await prisma.shareLink.findUnique({ where: { token } });
      expect(share!.expiresAt).not.toBeNull();
      expect(new Date() > share!.expiresAt!).toBe(true);
    });

    it("non-expired share link passes check", async () => {
      const doc = await createTestDocument(userA.id);
      const token = randomBytes(32).toString("base64url");
      const futureDate = new Date(Date.now() + 7 * 86400000);

      await prisma.shareLink.create({
        data: { token, documentId: doc.id, userId: userA.id, expiresAt: futureDate },
      });

      const share = await prisma.shareLink.findUnique({ where: { token } });
      expect(new Date() > share!.expiresAt!).toBe(false);
    });

    it("null expiresAt means never expires", async () => {
      const doc = await createTestDocument(userA.id);
      const token = randomBytes(32).toString("base64url");

      await prisma.shareLink.create({
        data: { token, documentId: doc.id, userId: userA.id, expiresAt: null },
      });

      const share = await prisma.shareLink.findUnique({ where: { token } });
      expect(share!.expiresAt).toBeNull();
    });
  });

  describe("Share → deleted document", () => {
    it("accessing share for deleted document detects deletion", async () => {
      const doc = await createTestDocument(userA.id);
      const token = randomBytes(32).toString("base64url");

      await prisma.shareLink.create({
        data: { token, documentId: doc.id, userId: userA.id, expiresAt: null },
      });

      await prisma.document.update({
        where: { id: doc.id },
        data: { deletedAt: new Date() },
      });

      const share = await prisma.shareLink.findUnique({
        where: { token },
        include: { document: { select: { deletedAt: true } } },
      });

      expect(share!.document.deletedAt).not.toBeNull();
    });
  });

  describe("Share link regeneration", () => {
    it("regenerating token creates new token for same document", async () => {
      const doc = await createTestDocument(userA.id);
      const token1 = randomBytes(32).toString("base64url");

      const share = await prisma.shareLink.create({
        data: { token: token1, documentId: doc.id, userId: userA.id, expiresAt: null },
      });

      const token2 = randomBytes(32).toString("base64url");
      const updated = await prisma.shareLink.update({
        where: { id: share.id },
        data: { token: token2 },
      });

      expect(updated.token).toBe(token2);
      expect(updated.token).not.toBe(token1);
      expect(updated.documentId).toBe(doc.id);

      const oldToken = await prisma.shareLink.findUnique({ where: { token: token1 } });
      expect(oldToken).toBeNull();
    });
  });

  describe("Share link deletion", () => {
    it("deleting share link removes it from database", async () => {
      const doc = await createTestDocument(userA.id);
      const token = randomBytes(32).toString("base64url");

      await prisma.shareLink.create({
        data: { token, documentId: doc.id, userId: userA.id, expiresAt: null },
      });

      await prisma.shareLink.deleteMany({
        where: { documentId: doc.id, userId: userA.id },
      });

      const found = await prisma.shareLink.findUnique({ where: { token } });
      expect(found).toBeNull();
    });
  });

  describe("Cascade: document deletion removes share link", () => {
    it("deleting document cascades to share link", async () => {
      const doc = await createTestDocument(userA.id);
      const token = randomBytes(32).toString("base64url");

      await prisma.shareLink.create({
        data: { token, documentId: doc.id, userId: userA.id, expiresAt: null },
      });

      await prisma.document.delete({ where: { id: doc.id } });

      const found = await prisma.shareLink.findUnique({ where: { token } });
      expect(found).toBeNull();
    });
  });
});
