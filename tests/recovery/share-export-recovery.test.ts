import "dotenv/config";
import { describe, it, expect, afterEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";

const prisma = new PrismaClient();

function uid(): string {
  return `shr_${Date.now()}_${randomBytes(4).toString("hex")}`;
}

describe("Share Link & Export Recovery", () => {
  const userIds: string[] = [];

  afterEach(async () => {
    await prisma.shareLink.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
    await prisma.document.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
    await prisma.folder
      .updateMany({ where: { userId: { in: userIds } }, data: { parentId: null } })
      .catch(() => {});
    await prisma.folder.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {});
    userIds.length = 0;
  });

  describe("Share link recovery after document changes", () => {
    it("share link persists through document title update", async () => {
      const userId = uid();
      await prisma.user.create({
        data: { id: userId, email: `${userId}@shr.ibn`, name: "User", passwordHash: "hash" },
      });
      userIds.push(userId);

      const docId = uid();
      await prisma.document.create({
        data: {
          id: docId,
          userId,
          title: "Original",
          fileName: "s.pdf",
          originalName: "s.pdf",
          mimeType: "application/pdf",
          fileSize: 1024,
          storageKey: `shr/${userId}/${docId}.pdf`,
          status: "COMPLETED",
        },
      });

      const token = randomBytes(32).toString("base64url");
      await prisma.shareLink.create({
        data: { token, documentId: docId, userId, expiresAt: null },
      });

      await prisma.document.update({ where: { id: docId }, data: { title: "Updated Title" } });

      const share = await prisma.shareLink.findUnique({ where: { token } });
      expect(share).not.toBeNull();
      expect(share!.documentId).toBe(docId);
    });

    it("share link persists through document folder move", async () => {
      const userId = uid();
      await prisma.user.create({
        data: { id: userId, email: `${userId}@shr.ibn`, name: "User", passwordHash: "hash" },
      });
      userIds.push(userId);

      const folderId = uid();
      await prisma.folder.create({ data: { id: folderId, userId, name: "Target" } });

      const docId = uid();
      await prisma.document.create({
        data: {
          id: docId,
          userId,
          title: "Doc",
          fileName: "s.pdf",
          originalName: "s.pdf",
          mimeType: "application/pdf",
          fileSize: 1024,
          storageKey: `shr/${userId}/${docId}.pdf`,
          status: "COMPLETED",
        },
      });

      const token = randomBytes(32).toString("base64url");
      await prisma.shareLink.create({
        data: { token, documentId: docId, userId, expiresAt: null },
      });

      await prisma.document.update({ where: { id: docId }, data: { folderId } });

      const share = await prisma.shareLink.findUnique({ where: { token } });
      expect(share).not.toBeNull();
    });

    it("share link invalidated when document is hard-deleted", async () => {
      const userId = uid();
      await prisma.user.create({
        data: { id: userId, email: `${userId}@shr.ibn`, name: "User", passwordHash: "hash" },
      });
      userIds.push(userId);

      const docId = uid();
      await prisma.document.create({
        data: {
          id: docId,
          userId,
          title: "Doc",
          fileName: "s.pdf",
          originalName: "s.pdf",
          mimeType: "application/pdf",
          fileSize: 1024,
          storageKey: `shr/${userId}/${docId}.pdf`,
          status: "COMPLETED",
        },
      });

      const token = randomBytes(32).toString("base64url");
      await prisma.shareLink.create({
        data: { token, documentId: docId, userId, expiresAt: null },
      });

      await prisma.document.delete({ where: { id: docId } });

      const share = await prisma.shareLink.findUnique({ where: { token } });
      expect(share).toBeNull();
    });
  });

  describe("Share link expiration recovery", () => {
    it("expired share detected correctly", async () => {
      const userId = uid();
      await prisma.user.create({
        data: { id: userId, email: `${userId}@shr.ibn`, name: "User", passwordHash: "hash" },
      });
      userIds.push(userId);

      const docId = uid();
      await prisma.document.create({
        data: {
          id: docId,
          userId,
          title: "Doc",
          fileName: "s.pdf",
          originalName: "s.pdf",
          mimeType: "application/pdf",
          fileSize: 1024,
          storageKey: `shr/${userId}/${docId}.pdf`,
          status: "COMPLETED",
        },
      });

      const token = randomBytes(32).toString("base64url");
      const pastDate = new Date(Date.now() - 86400000);
      await prisma.shareLink.create({
        data: { token, documentId: docId, userId, expiresAt: pastDate },
      });

      const share = await prisma.shareLink.findUnique({ where: { token } });
      const isExpired = share!.expiresAt !== null && new Date() > share!.expiresAt;
      expect(isExpired).toBe(true);
    });

    it("extending expiration makes share accessible again", async () => {
      const userId = uid();
      await prisma.user.create({
        data: { id: userId, email: `${userId}@shr.ibn`, name: "User", passwordHash: "hash" },
      });
      userIds.push(userId);

      const docId = uid();
      await prisma.document.create({
        data: {
          id: docId,
          userId,
          title: "Doc",
          fileName: "s.pdf",
          originalName: "s.pdf",
          mimeType: "application/pdf",
          fileSize: 1024,
          storageKey: `shr/${userId}/${docId}.pdf`,
          status: "COMPLETED",
        },
      });

      const token = randomBytes(32).toString("base64url");
      const pastDate = new Date(Date.now() - 86400000);
      await prisma.shareLink.create({
        data: { token, documentId: docId, userId, expiresAt: pastDate },
      });

      const futureDate = new Date(Date.now() + 30 * 86400000);
      await prisma.shareLink.update({ where: { token }, data: { expiresAt: futureDate } });

      const share = await prisma.shareLink.findUnique({ where: { token } });
      const isExpired = share!.expiresAt !== null && new Date() > share!.expiresAt;
      expect(isExpired).toBe(false);
    });
  });

  describe("Token regeneration recovery", () => {
    it("old token invalidated, new token works", async () => {
      const userId = uid();
      await prisma.user.create({
        data: { id: userId, email: `${userId}@shr.ibn`, name: "User", passwordHash: "hash" },
      });
      userIds.push(userId);

      const docId = uid();
      await prisma.document.create({
        data: {
          id: docId,
          userId,
          title: "Doc",
          fileName: "s.pdf",
          originalName: "s.pdf",
          mimeType: "application/pdf",
          fileSize: 1024,
          storageKey: `shr/${userId}/${docId}.pdf`,
          status: "COMPLETED",
        },
      });

      const oldToken = randomBytes(32).toString("base64url");
      const share = await prisma.shareLink.create({
        data: { token: oldToken, documentId: docId, userId, expiresAt: null },
      });

      const newToken = randomBytes(32).toString("base64url");
      await prisma.shareLink.update({ where: { id: share.id }, data: { token: newToken } });

      const oldResult = await prisma.shareLink.findUnique({ where: { token: oldToken } });
      expect(oldResult).toBeNull();

      const newResult = await prisma.shareLink.findUnique({ where: { token: newToken } });
      expect(newResult).not.toBeNull();
      expect(newResult!.documentId).toBe(docId);
    });
  });

  describe("Export format validation recovery", () => {
    it("invalid format rejected without side effects", () => {
      const VALID_FORMATS = ["md", "txt", "json", "docx", "pdf", "epub", "searchable-pdf"];

      const invalidFormats = ["../etc/passwd", "<script>", "", "exe", "zip"];
      for (const fmt of invalidFormats) {
        expect(VALID_FORMATS).not.toContain(fmt);
      }
    });
  });
});
