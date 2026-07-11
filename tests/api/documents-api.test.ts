import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  createTestUser,
  cleanupTestUsers,
  createTestDocument,
  createTestFolder,
  createTestTag,
  TestUser,
  prisma,
} from "../integration/helpers/db";
import { mockSession } from "./setup";
import { createApiRequest } from "./helpers";

import { GET as getDocuments } from "@/app/api/documents/route";
import { POST as bulkMove } from "@/app/api/documents/bulk-move/route";
import { POST as bulkTag } from "@/app/api/documents/bulk-tag/route";
import { POST as bulkUntag } from "@/app/api/documents/bulk-untag/route";

import {
  GET as getDocument,
  PATCH as updateDocument,
  DELETE as deleteDocument,
} from "@/app/api/documents/[id]/route";
import { PATCH as moveDocument } from "@/app/api/documents/[id]/move/route";
import { PATCH as restoreDocument } from "@/app/api/documents/[id]/restore/route";
import {
  GET as getDocumentTags,
  POST as addTagToDocument,
  PUT as setDocumentTags,
} from "@/app/api/documents/[id]/tags/route";
import { DELETE as removeTagFromDocument } from "@/app/api/documents/[id]/tags/[tagId]/route";

describe("Documents API", () => {
  let userA: TestUser;
  let userB: TestUser;

  beforeAll(async () => {
    userA = await createTestUser();
    userB = await createTestUser();
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
  });

  describe("GET /api/documents", () => {
    it("returns documents for the user", async () => {
      const doc = await createTestDocument(userA.id, { title: "List Doc" });
      const req = createApiRequest("/api/documents");
      const res = await getDocuments(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.documents).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: doc.id, title: "List Doc" })]),
      );
    });

    it("returns 401 when unauthorized", async () => {
      mockSession.user = null as any;
      const req = createApiRequest("/api/documents");
      const res = await getDocuments(req);
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/documents/[id]", () => {
    it("returns a specific document", async () => {
      const doc = await createTestDocument(userA.id, { title: "Single Doc" });
      const req = createApiRequest(`/api/documents/${doc.id}`);
      const res = await getDocument(req, { params: Promise.resolve({ id: doc.id }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.document.id).toBe(doc.id);
    });

    it("returns 404 for non-existent document", async () => {
      const req = createApiRequest("/api/documents/non-existent");
      const res = await getDocument(req, { params: Promise.resolve({ id: "non-existent" }) });
      expect(res.status).toBe(404);
    });

    it("prevents accessing another user's document", async () => {
      const docB = await createTestDocument(userB.id);
      const req = createApiRequest(`/api/documents/${docB.id}`);
      const res = await getDocument(req, { params: Promise.resolve({ id: docB.id }) });
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/documents/[id]", () => {
    it("updates a document", async () => {
      const doc = await createTestDocument(userA.id, { title: "Old Title" });
      const req = createApiRequest(`/api/documents/${doc.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: "New Title" }),
      });
      const res = await updateDocument(req, { params: Promise.resolve({ id: doc.id }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.document.title).toBe("New Title");
    });

    it("validates input", async () => {
      const doc = await createTestDocument(userA.id);
      const req = createApiRequest(`/api/documents/${doc.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: "" }), // Invalid, too short
      });
      const res = await updateDocument(req, { params: Promise.resolve({ id: doc.id }) });
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/documents/[id]", () => {
    it("deletes a document", async () => {
      const doc = await createTestDocument(userA.id);
      const req = createApiRequest(`/api/documents/${doc.id}`, { method: "DELETE" });
      const res = await deleteDocument(req, { params: Promise.resolve({ id: doc.id }) });
      expect(res.status).toBe(200);

      const check = await prisma.document.findUnique({ where: { id: doc.id } });
      expect(check?.deletedAt).not.toBeNull();
    });
  });

  describe("PATCH /api/documents/[id]/move", () => {
    it("moves a document to a folder", async () => {
      const doc = await createTestDocument(userA.id);
      const folder = await createTestFolder(userA.id);

      const req = createApiRequest(`/api/documents/${doc.id}/move`, {
        method: "PATCH",
        body: JSON.stringify({ folderId: folder.id }),
      });
      const res = await moveDocument(req, { params: Promise.resolve({ id: doc.id }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.document.folderId).toBe(folder.id);
    });
  });

  describe("PATCH /api/documents/[id]/restore", () => {
    it("restores a deleted document", async () => {
      const doc = await createTestDocument(userA.id, { deletedAt: new Date() });
      const req = createApiRequest(`/api/documents/${doc.id}/restore`, { method: "PATCH" });
      const res = await restoreDocument(req, { params: Promise.resolve({ id: doc.id }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.document.deletedAt).toBeNull();
    });
  });

  describe("Tags endpoints", () => {
    it("GET tags for a document", async () => {
      const doc = await createTestDocument(userA.id);
      const tag = await createTestTag(userA.id);
      await prisma.tagDocument.create({ data: { documentId: doc.id, tagId: tag.id } });

      const req = createApiRequest(`/api/documents/${doc.id}/tags`);
      const res = await getDocumentTags(req, { params: Promise.resolve({ id: doc.id }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.tags).toHaveLength(1);
      expect(json.tags[0].id).toBe(tag.id);
    });

    it("POST add a tag to a document", async () => {
      const doc = await createTestDocument(userA.id);
      const tag = await createTestTag(userA.id);

      const req = createApiRequest(`/api/documents/${doc.id}/tags`, {
        method: "POST",
        body: JSON.stringify({ tagId: tag.id }),
      });
      const res = await addTagToDocument(req, { params: Promise.resolve({ id: doc.id }) });
      expect(res.status).toBe(201);
    });

    it("PUT replace tags on a document", async () => {
      const doc = await createTestDocument(userA.id);
      const tag1 = await createTestTag(userA.id);
      const tag2 = await createTestTag(userA.id);
      await prisma.tagDocument.create({ data: { documentId: doc.id, tagId: tag1.id } });

      const req = createApiRequest(`/api/documents/${doc.id}/tags`, {
        method: "PUT",
        body: JSON.stringify({ tagIds: [tag2.id] }),
      });
      const res = await setDocumentTags(req, { params: Promise.resolve({ id: doc.id }) });
      expect(res.status).toBe(200);

      const tags = await prisma.tagDocument.findMany({ where: { documentId: doc.id } });
      expect(tags).toHaveLength(1);
      expect(tags[0].tagId).toBe(tag2.id);
    });

    it("DELETE tag from document", async () => {
      const doc = await createTestDocument(userA.id);
      const tag = await createTestTag(userA.id);
      await prisma.tagDocument.create({ data: { documentId: doc.id, tagId: tag.id } });

      const req = createApiRequest(`/api/documents/${doc.id}/tags/${tag.id}`, { method: "DELETE" });
      const res = await removeTagFromDocument(req, {
        params: Promise.resolve({ id: doc.id, tagId: tag.id }),
      });
      expect(res.status).toBe(200);

      const tags = await prisma.tagDocument.findMany({ where: { documentId: doc.id } });
      expect(tags).toHaveLength(0);
    });
  });

  describe("Bulk endpoints", () => {
    it("POST bulk-move", async () => {
      const doc1 = await createTestDocument(userA.id);
      const doc2 = await createTestDocument(userA.id);
      const folder = await createTestFolder(userA.id);

      const req = createApiRequest("/api/documents/bulk-move", {
        method: "POST",
        body: JSON.stringify({ documentIds: [doc1.id, doc2.id], folderId: folder.id }),
      });
      const res = await bulkMove(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.moved).toBe(2);
    });

    it("POST bulk-tag", async () => {
      const doc1 = await createTestDocument(userA.id);
      const doc2 = await createTestDocument(userA.id);
      const tag = await createTestTag(userA.id);

      const req = createApiRequest("/api/documents/bulk-tag", {
        method: "POST",
        body: JSON.stringify({ documentIds: [doc1.id, doc2.id], tagId: tag.id }),
      });
      const res = await bulkTag(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.taggedCount).toBe(2);
    });

    it("POST bulk-untag", async () => {
      const doc1 = await createTestDocument(userA.id);
      const doc2 = await createTestDocument(userA.id);
      const tag = await createTestTag(userA.id);
      await prisma.tagDocument.create({ data: { documentId: doc1.id, tagId: tag.id } });
      await prisma.tagDocument.create({ data: { documentId: doc2.id, tagId: tag.id } });

      const req = createApiRequest("/api/documents/bulk-untag", {
        method: "POST",
        body: JSON.stringify({ documentIds: [doc1.id, doc2.id], tagId: tag.id }),
      });
      const res = await bulkUntag(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.removedCount).toBe(2);
    });
  });
});
