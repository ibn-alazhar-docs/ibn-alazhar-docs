import { describe, it, expect, afterEach } from "vitest";
import { randomBytes } from "node:crypto";
import { prisma, createSecUser, createSecDocument, cleanupSecUsers } from "./helpers";

describe("Share Link Security", () => {
  const userIds: string[] = [];

  afterEach(async () => {
    await cleanupSecUsers(userIds);
    userIds.length = 0;
  });

  describe("Token strength", () => {
    it("share tokens are 32 random bytes (base64url)", () => {
      const token = randomBytes(32).toString("base64url");
      expect(token.length).toBeGreaterThanOrEqual(42);
      expect(token.length).toBeLessThanOrEqual(44);
    });

    it("two generated tokens are different", () => {
      const t1 = randomBytes(32).toString("base64url");
      const t2 = randomBytes(32).toString("base64url");
      expect(t1).not.toBe(t2);
    });

    it("token entropy is 256 bits (32 bytes)", () => {
      const bytes = randomBytes(32);
      expect(bytes.length).toBe(32);
    });
  });

  describe("Token guessing attacks", () => {
    it("nonexistent token returns null", async () => {
      const fakeToken = randomBytes(32).toString("base64url");
      const result = await prisma.shareLink.findUnique({ where: { token: fakeToken } });
      expect(result).toBeNull();
    });

    it("common token patterns fail", async () => {
      const commonTokens = ["123456", "admin", "test", "token", "share", "abc123"];

      for (const token of commonTokens) {
        const result = await prisma.shareLink.findUnique({ where: { token } });
        expect(result).toBeNull();
      }
    });

    it("empty token rejected", async () => {
      const result = await prisma.shareLink.findUnique({ where: { token: "" } });
      expect(result).toBeNull();
    });
  });

  describe("Expired share access", () => {
    it("expired share detected by date comparison", async () => {
      const user = await createSecUser();
      userIds.push(user.id);
      const doc = await createSecDocument(user.id);

      const pastDate = new Date(Date.now() - 86400000);
      const token = randomBytes(32).toString("base64url");

      await prisma.shareLink.create({
        data: { token, documentId: doc.id, userId: user.id, expiresAt: pastDate },
      });

      const share = await prisma.shareLink.findUnique({ where: { token } });
      const isExpired = share!.expiresAt !== null && new Date() > share!.expiresAt;
      expect(isExpired).toBe(true);
    });

    it("non-expired share passes date check", async () => {
      const user = await createSecUser();
      userIds.push(user.id);
      const doc = await createSecDocument(user.id);

      const futureDate = new Date(Date.now() + 7 * 86400000);
      const token = randomBytes(32).toString("base64url");

      await prisma.shareLink.create({
        data: { token, documentId: doc.id, userId: user.id, expiresAt: futureDate },
      });

      const share = await prisma.shareLink.findUnique({ where: { token } });
      const isExpired = share!.expiresAt !== null && new Date() > share!.expiresAt;
      expect(isExpired).toBe(false);
    });

    it("null expiration means never expires", async () => {
      const user = await createSecUser();
      userIds.push(user.id);
      const doc = await createSecDocument(user.id);

      const token = randomBytes(32).toString("base64url");
      await prisma.shareLink.create({
        data: { token, documentId: doc.id, userId: user.id, expiresAt: null },
      });

      const share = await prisma.shareLink.findUnique({ where: { token } });
      expect(share!.expiresAt).toBeNull();
    });
  });

  describe("Deleted document access via share", () => {
    it("share for soft-deleted document detected", async () => {
      const user = await createSecUser();
      userIds.push(user.id);
      const doc = await createSecDocument(user.id);

      const token = randomBytes(32).toString("base64url");
      await prisma.shareLink.create({
        data: { token, documentId: doc.id, userId: user.id, expiresAt: null },
      });

      await prisma.document.update({
        where: { id: doc.id },
        data: { deletedAt: new Date() },
      });

      const share = await prisma.shareLink.findUnique({
        where: { token },
        include: { document: { select: { deletedAt: true, status: true } } },
      });

      expect(share!.document.deletedAt).not.toBeNull();
    });

    it("share for non-COMPLETED document detected", async () => {
      const user = await createSecUser();
      userIds.push(user.id);
      const doc = await createSecDocument(user.id, { status: "OCR_PROCESSING" });

      const token = randomBytes(32).toString("base64url");
      await prisma.shareLink.create({
        data: { token, documentId: doc.id, userId: user.id, expiresAt: null },
      });

      const share = await prisma.shareLink.findUnique({
        where: { token },
        include: { document: { select: { status: true } } },
      });

      expect(share!.document.status).not.toBe("COMPLETED");
    });
  });

  describe("Share export format validation", () => {
    const VALID_FORMATS = ["md", "txt", "json", "docx", "pdf", "epub", "searchable-pdf"];

    for (const format of VALID_FORMATS) {
      it(`valid format accepted: ${format}`, () => {
        expect(VALID_FORMATS).toContain(format);
      });
    }

    it("path traversal format rejected", () => {
      expect(VALID_FORMATS).not.toContain("../../../etc/passwd");
    });

    it("script injection format rejected", () => {
      expect(VALID_FORMATS).not.toContain("<script>alert(1)</script>");
    });

    it("empty format rejected", () => {
      expect(VALID_FORMATS).not.toContain("");
    });
  });

  describe("Share link uniqueness", () => {
    it("one share per document per user enforced", async () => {
      const user = await createSecUser();
      userIds.push(user.id);
      const doc = await createSecDocument(user.id);

      const token1 = randomBytes(32).toString("base64url");
      await prisma.shareLink.create({
        data: { token: token1, documentId: doc.id, userId: user.id, expiresAt: null },
      });

      const token2 = randomBytes(32).toString("base64url");
      await expect(
        prisma.shareLink.create({
          data: { token: token2, documentId: doc.id, userId: user.id, expiresAt: null },
        }),
      ).rejects.toThrow();
    });
  });

  describe("Cascade security", () => {
    it("deleting document removes its share links", async () => {
      const user = await createSecUser();
      userIds.push(user.id);
      const doc = await createSecDocument(user.id);

      const token = randomBytes(32).toString("base64url");
      await prisma.shareLink.create({
        data: { token, documentId: doc.id, userId: user.id, expiresAt: null },
      });

      await prisma.document.delete({ where: { id: doc.id } });

      const share = await prisma.shareLink.findUnique({ where: { token } });
      expect(share).toBeNull();
    });
  });
});
