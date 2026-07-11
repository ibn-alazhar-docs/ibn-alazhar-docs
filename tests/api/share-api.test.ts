import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { mockSession } from "./setup";
import { createApiRequest } from "./helpers";
import {
  POST as createDocumentShare,
  GET as getDocumentShare,
  DELETE as deleteDocumentShare,
} from "@/app/api/documents/[id]/share/route";
import { GET as getPublicShare } from "@/app/api/share/[token]/route";
import {
  createTestUser,
  cleanupTestUsers,
  createTestDocument,
  prisma,
} from "../integration/helpers/db";

describe("Share API", () => {
  let userA: any;
  let userB: any;
  let docA: any;
  let docA_NotReady: any;

  beforeAll(async () => {
    userA = await createTestUser();
    userB = await createTestUser();

    docA = await createTestDocument(userA.id, { status: "COMPLETED" });
    docA_NotReady = await createTestDocument(userA.id, { status: "OCR_PROCESSING" });
  });

  afterAll(async () => {
    await cleanupTestUsers([userA.id, userB.id]);
  });

  afterEach(async () => {
    await prisma.shareLink.deleteMany({
      where: { userId: { in: [userA.id, userB.id] } },
    });
  });

  beforeEach(() => {
    mockSession.user = {
      id: userA.id,
      name: userA.name,
      email: userA.email,
      role: userA.role,
    } as any;
  });

  describe("POST /api/documents/[id]/share", () => {
    it("should create a share link for a completed document", async () => {
      const req = createApiRequest(`/api/documents/${docA.id}/share`, {
        method: "POST",
        body: JSON.stringify({}),
      });

      const res = await createDocumentShare(req, { params: Promise.resolve({ id: docA.id }) });
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data).toHaveProperty("shareId");
      expect(data).toHaveProperty("token");
      expect(data).toHaveProperty("url");
    });

    it("should fail to create share link if unauthorized", async () => {
      mockSession.user = null as any;

      const req = createApiRequest(`/api/documents/${docA.id}/share`, {
        method: "POST",
        body: JSON.stringify({}),
      });

      const res = await createDocumentShare(req, { params: Promise.resolve({ id: docA.id }) });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error.code).toBe("UNAUTHORIZED");
    });

    it("should fail to create share link if user doesn't own document", async () => {
      mockSession.user = {
        id: userB.id,
        name: userB.name,
        email: userB.email,
        role: userB.role,
      } as any;

      const req = createApiRequest(`/api/documents/${docA.id}/share`, {
        method: "POST",
        body: JSON.stringify({}),
      });

      const res = await createDocumentShare(req, { params: Promise.resolve({ id: docA.id }) });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error.code).toBe("NOT_FOUND");
    });

    it("should fail to create share link if document is not ready", async () => {
      const req = createApiRequest(`/api/documents/${docA_NotReady.id}/share`, {
        method: "POST",
        body: JSON.stringify({}),
      });

      const res = await createDocumentShare(req, {
        params: Promise.resolve({ id: docA_NotReady.id }),
      });
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.error.code).toBe("VALIDATION_ERROR");
      expect(data.error.message).toBe("الملف غير جاهز للمشاركة بعد");
    });

    it("should reject invalid expiration date", async () => {
      const req = createApiRequest(`/api/documents/${docA.id}/share`, {
        method: "POST",
        body: JSON.stringify({ expiration: "invalid-date" }),
      });

      const res = await createDocumentShare(req, { params: Promise.resolve({ id: docA.id }) });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /api/documents/[id]/share", () => {
    it("should return shared: false if no share link exists", async () => {
      const freshDoc = await createTestDocument(userA.id);

      const req = createApiRequest(`/api/documents/${freshDoc.id}/share`, { method: "GET" });
      const res = await getDocumentShare(req, { params: Promise.resolve({ id: freshDoc.id }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.shared).toBe(false);
    });

    it("should return share info if share link exists", async () => {
      const share = await prisma.shareLink.create({
        data: {
          documentId: docA.id,
          userId: userA.id,
          token: "test-token-1",
        },
      });

      const req = createApiRequest(`/api/documents/${docA.id}/share`, { method: "GET" });
      const res = await getDocumentShare(req, { params: Promise.resolve({ id: docA.id }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.shared).toBe(true);
      expect(data.token).toBe(share.token);
    });

    it("should fail if unauthorized", async () => {
      mockSession.user = null as any;

      const req = createApiRequest(`/api/documents/${docA.id}/share`, { method: "GET" });
      const res = await getDocumentShare(req, { params: Promise.resolve({ id: docA.id }) });

      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /api/documents/[id]/share", () => {
    it("should delete existing share link", async () => {
      const freshDoc = await createTestDocument(userA.id, { status: "COMPLETED" });
      await prisma.shareLink.create({
        data: { documentId: freshDoc.id, userId: userA.id, token: "test-token-2" },
      });

      const req = createApiRequest(`/api/documents/${freshDoc.id}/share`, { method: "DELETE" });
      const res = await deleteDocumentShare(req, { params: Promise.resolve({ id: freshDoc.id }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);

      const check = await prisma.shareLink.findFirst({
        where: { documentId: freshDoc.id, deletedAt: null },
      });
      expect(check).toBeNull();
    });

    it("should fail to delete if no share link exists", async () => {
      const freshDoc = await createTestDocument(userA.id);

      const req = createApiRequest(`/api/documents/${freshDoc.id}/share`, { method: "DELETE" });
      const res = await deleteDocumentShare(req, { params: Promise.resolve({ id: freshDoc.id }) });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error.code).toBe("NOT_FOUND");
    });
  });

  describe("GET /api/share/[token] (Public)", () => {
    it("should return document details for valid token", async () => {
      const share = await prisma.shareLink.create({
        data: { documentId: docA.id, userId: userA.id, token: "test-token-3" },
      });

      const req = createApiRequest(`/api/share/${share.token}`, { method: "GET" });
      const res = await getPublicShare(req, { params: Promise.resolve({ token: share.token }) });
      const data = await res.json();
      console.log("SHARE DATA:", data);

      expect(res.status).toBe(200);
      expect(data.document.id).toBe(docA.id);
      expect(data.document.title).toBe(docA.title);
      expect(data.content).toBeDefined();
    });

    it("should return 404 for non-existent token", async () => {
      const req = createApiRequest(`/api/share/invalid-token`, { method: "GET" });
      const res = await getPublicShare(req, {
        params: Promise.resolve({ token: "invalid-token" }),
      });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error.code).toBe("NOT_FOUND");
    });

    it("should return 410 for expired token", async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const share = await prisma.shareLink.create({
        data: { documentId: docA.id, userId: userA.id, expiresAt: pastDate, token: "test-token-4" },
      });

      const req = createApiRequest(`/api/share/${share.token}`, { method: "GET" });
      const res = await getPublicShare(req, { params: Promise.resolve({ token: share.token }) });
      const data = await res.json();

      expect(res.status).toBe(410);
      expect(data.error.code).toBe("EXPIRED");
    });

    it("should return 404 if document is deleted", async () => {
      const delDoc = await createTestDocument(userA.id, {
        status: "COMPLETED",
        deletedAt: new Date(),
      });
      const share = await prisma.shareLink.create({
        data: { documentId: delDoc.id, userId: userA.id, token: "test-token-5" },
      });

      const req = createApiRequest(`/api/share/${share.token}`, { method: "GET" });
      const res = await getPublicShare(req, { params: Promise.resolve({ token: share.token }) });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error.message).toBe("Document deleted");
    });

    it("should return 404 if document is not completed", async () => {
      const notReadyDoc = await createTestDocument(userA.id, { status: "OCR_PROCESSING" });
      const share = await prisma.shareLink.create({
        data: { documentId: notReadyDoc.id, userId: userA.id, token: "test-token-6" },
      });

      const req = createApiRequest(`/api/share/${share.token}`, { method: "GET" });
      const res = await getPublicShare(req, { params: Promise.resolve({ token: share.token }) });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error.message).toBe("Document not ready");
    });
  });
});
