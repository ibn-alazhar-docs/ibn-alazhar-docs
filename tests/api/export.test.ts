import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { POST as exportPost } from "@/app/api/export/route";
import { POST as batchExportPost } from "@/app/api/export/batch/route";
import { POST as folderExportPost } from "@/app/api/export/folder/route";
import { POST as tagExportPost } from "@/app/api/export/tag/route";
import { createApiRequest } from "./helpers";
import { mockSession } from "./setup";
import {
  createTestUser,
  createTestDocument,
  createTestFolder,
  createTestTag,
  cleanupTestUsers,
  prisma,
} from "../integration/helpers/db";

// Mock the pipeline functions to avoid MinIO calls
vi.mock("@ibn-al-azhar-docs/pipeline", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    fileExists: vi.fn().mockResolvedValue(true),
    downloadFile: vi
      .fn()
      .mockResolvedValue(Buffer.from(JSON.stringify({ text: "dummy ocr text" }))),
  };
});

// Mock zip-builder to avoid complex zip generation in tests
vi.mock("@/lib/export/zip-builder", () => ({
  buildZipPackage: vi.fn().mockResolvedValue(Buffer.from("dummy zip content")),
}));

describe("Export API Routes", () => {
  let userA: any;
  let userB: any;
  let docA1: any;
  let docB1: any;
  let folderA: any;
  let tagA: any;

  beforeAll(async () => {
    userA = await createTestUser({ name: "User A" });
    userB = await createTestUser({ name: "User B" });

    folderA = await createTestFolder(userA.id, { name: "Folder A" });
    tagA = await createTestTag(userA.id, { name: "Tag A" });

    docA1 = await createTestDocument(userA.id, {
      title: "Doc A1",
      folderId: folderA.id,
    });

    docB1 = await createTestDocument(userB.id, { title: "Doc B1" });

    await prisma.tagDocument.create({
      data: {
        tagId: tagA.id,
        documentId: docA1.id,
      },
    });
  });

  afterAll(async () => {
    await cleanupTestUsers([userA.id, userB.id]);
  });

  beforeEach(() => {
    mockSession.user = {
      id: userA.id,
      name: userA.name,
      email: userA.email,
      role: userA.role,
    } as any;
    vi.clearAllMocks();
  });

  describe("POST /api/export", () => {
    it("should return 401 if unauthorized", async () => {
      mockSession.user = null as any;
      const req = createApiRequest("/api/export", {
        method: "POST",
        body: JSON.stringify({
          documentId: docA1.id,
          format: "md",
          profile: "research",
          includeSource: false,
        }),
      });
      const res = await exportPost(req);
      expect(res.status).toBe(401);
    });

    it("should return 400 for invalid input", async () => {
      const req = createApiRequest("/api/export", {
        method: "POST",
        body: JSON.stringify({ format: "md" }), // missing documentId, profile, etc.
      });
      const res = await exportPost(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 404 for document not owned by user", async () => {
      const req = createApiRequest("/api/export", {
        method: "POST",
        body: JSON.stringify({
          documentId: docB1.id,
          format: "md",
          profile: "research",
          includeSource: false,
        }),
      });
      const res = await exportPost(req);
      expect(res.status).toBe(404);
    });

    it("should return 200 and file for valid request (pdf)", async () => {
      const req = createApiRequest("/api/export", {
        method: "POST",
        body: JSON.stringify({
          documentId: docA1.id,
          format: "md",
          profile: "research",
          includeSource: false,
        }),
      });
      const res = await exportPost(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");
      expect(res.headers.get("Content-Disposition")).toContain("attachment; filename=");
    });

    it("should return 200 and zip file for valid request (zip)", async () => {
      const req = createApiRequest("/api/export", {
        method: "POST",
        body: JSON.stringify({
          documentId: docA1.id,
          format: "zip",
          profile: "research",
          includeSource: true,
        }),
      });
      const res = await exportPost(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/zip");
    });
  });

  describe("POST /api/export/batch", () => {
    it("should return 401 if unauthorized", async () => {
      mockSession.user = null as any;
      const req = createApiRequest("/api/export/batch", {
        method: "POST",
        body: JSON.stringify({
          documentIds: [docA1.id],
          format: "zip",
          profile: "research",
          includeSource: false,
        }),
      });
      const res = await batchExportPost(req);
      expect(res.status).toBe(401);
    });

    it("should return 400 for invalid input", async () => {
      const req = createApiRequest("/api/export/batch", {
        method: "POST",
        body: JSON.stringify({ documentIds: "not-an-array", format: "zip" }),
      });
      const res = await batchExportPost(req);
      expect(res.status).toBe(400);
    });

    it("should return 404 if a document is not owned by user", async () => {
      const req = createApiRequest("/api/export/batch", {
        method: "POST",
        body: JSON.stringify({
          documentIds: [docA1.id, docB1.id],
          format: "zip",
          profile: "research",
          includeSource: false,
        }),
      });
      const res = await batchExportPost(req);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toContain("Missing documents");
    });

    it("should return 400 if format is not zip", async () => {
      const req = createApiRequest("/api/export/batch", {
        method: "POST",
        body: JSON.stringify({
          documentIds: [docA1.id],
          format: "md",
          profile: "research",
          includeSource: false,
        }),
      });
      const res = await batchExportPost(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.message).toContain("requires ZIP");
    });

    it("should return 200 and zip file for valid batch export", async () => {
      const req = createApiRequest("/api/export/batch", {
        method: "POST",
        body: JSON.stringify({
          documentIds: [docA1.id],
          format: "zip",
          profile: "research",
          includeSource: true,
        }),
      });
      const res = await batchExportPost(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/zip");
    });
  });

  describe("POST /api/export/folder", () => {
    it("should return 401 if unauthorized", async () => {
      mockSession.user = null as any;
      const req = createApiRequest("/api/export/folder", {
        method: "POST",
        body: JSON.stringify({
          folderId: folderA.id,
          format: "zip",
          profile: "research",
          includeSource: false,
          recursive: false,
        }),
      });
      const res = await folderExportPost(req);
      expect(res.status).toBe(401);
    });

    it("should return 404 for folder not owned by user", async () => {
      mockSession.user = {
        id: userB.id,
        name: userB.name,
        email: userB.email,
        role: userB.role,
      } as any;
      const req = createApiRequest("/api/export/folder", {
        method: "POST",
        body: JSON.stringify({
          folderId: folderA.id,
          format: "zip",
          profile: "research",
          includeSource: false,
          recursive: false,
        }),
      });
      const res = await folderExportPost(req);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error.message).toBe("Folder not found");
    });

    it("should return 400 if format is not zip", async () => {
      const req = createApiRequest("/api/export/folder", {
        method: "POST",
        body: JSON.stringify({
          folderId: folderA.id,
          format: "md",
          profile: "research",
          includeSource: false,
          recursive: false,
        }),
      });
      const res = await folderExportPost(req);
      expect(res.status).toBe(400);
    });

    it("should return 200 and zip file for valid folder export", async () => {
      const req = createApiRequest("/api/export/folder", {
        method: "POST",
        body: JSON.stringify({
          folderId: folderA.id,
          format: "zip",
          profile: "research",
          includeSource: false,
          recursive: true,
        }),
      });
      const res = await folderExportPost(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/zip");
    });
  });

  describe("POST /api/export/tag", () => {
    it("should return 401 if unauthorized", async () => {
      mockSession.user = null as any;
      const req = createApiRequest("/api/export/tag", {
        method: "POST",
        body: JSON.stringify({
          tagId: tagA.id,
          format: "zip",
          profile: "research",
          includeSource: false,
        }),
      });
      const res = await tagExportPost(req);
      expect(res.status).toBe(401);
    });

    it("should return 404 for tag not owned by user", async () => {
      mockSession.user = {
        id: userB.id,
        name: userB.name,
        email: userB.email,
        role: userB.role,
      } as any;
      const req = createApiRequest("/api/export/tag", {
        method: "POST",
        body: JSON.stringify({
          tagId: tagA.id,
          format: "zip",
          profile: "research",
          includeSource: false,
        }),
      });
      const res = await tagExportPost(req);
      expect(res.status).toBe(404);
    });

    it("should return 400 if format is not zip", async () => {
      const req = createApiRequest("/api/export/tag", {
        method: "POST",
        body: JSON.stringify({
          tagId: tagA.id,
          format: "md",
          profile: "research",
          includeSource: false,
        }),
      });
      const res = await tagExportPost(req);
      expect(res.status).toBe(400);
    });

    it("should return 200 and zip file for valid tag export", async () => {
      const req = createApiRequest("/api/export/tag", {
        method: "POST",
        body: JSON.stringify({
          tagId: tagA.id,
          format: "zip",
          profile: "research",
          includeSource: false,
        }),
      });
      const res = await tagExportPost(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/zip");
    });
  });
});
