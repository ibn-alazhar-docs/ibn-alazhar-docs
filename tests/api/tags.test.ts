import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { mockSession } from "./setup";
import { GET as getTags, POST as createTag } from "@/app/api/tags/route";
import { GET as getTag, PATCH as updateTag, DELETE as deleteTag } from "@/app/api/tags/[id]/route";
import { MAX_TAGS_PER_USER } from "@/lib/validators/tag";
import { createApiRequest } from "./helpers";
import { createTestUser, cleanupTestUsers, createTestTag, prisma } from "../integration/helpers/db";

describe("Tags API", () => {
  let userA: any;
  let userB: any;
  let admin: any;

  beforeAll(async () => {
    userA = await createTestUser({ name: "User A", role: "STUDENT" });
    userB = await createTestUser({ name: "User B", role: "STUDENT" });
    admin = await createTestUser({ name: "Admin", role: "ADMIN" });
  });

  afterAll(async () => {
    await cleanupTestUsers([userA.id, userB.id, admin.id]);
  });

  beforeEach(() => {
    mockSession.user = {
      id: userA.id,
      name: userA.name,
      email: userA.email,
      role: userA.role,
    } as any;
  });

  afterEach(async () => {
    await prisma.tag.deleteMany({
      where: { userId: { in: [userA.id, userB.id, admin.id] } },
    });
  });

  describe("GET /api/tags", () => {
    it("should return 401 if unauthorized", async () => {
      mockSession.user = null as any;
      const res = await getTags();
      expect(res.status).toBe(401);
    });

    it("should return user's tags", async () => {
      await createTestTag(userA.id, { name: "Tag A1" });
      await createTestTag(userB.id, { name: "Tag B1" });

      const res = await getTags();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.tags).toHaveLength(1);
      expect(data.tags[0].name).toBe("Tag A1");
    });

    it("should return all tags for ADMIN", async () => {
      await createTestTag(userA.id, { name: "Tag A1" });
      await createTestTag(userB.id, { name: "Tag B1" });

      mockSession.user = {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      } as any;
      const res = await getTags();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.tags.length).toBeGreaterThanOrEqual(2);
      const tagNames = data.tags.map((t: any) => t.name);
      expect(tagNames).toContain("Tag A1");
      expect(tagNames).toContain("Tag B1");
    });
  });

  describe("POST /api/tags", () => {
    it("should return 401 if unauthorized", async () => {
      mockSession.user = null as any;
      const req = createApiRequest("/api/tags", {
        method: "POST",
        body: JSON.stringify({ name: "New Tag" }),
      });
      const res = await createTag(req);
      expect(res.status).toBe(401);
    });

    it("should create a tag", async () => {
      const req = createApiRequest("/api/tags", {
        method: "POST",
        body: JSON.stringify({ name: "New Tag", color: "#FF0000" }),
      });
      const res = await createTag(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.tag.name).toBe("New Tag");
      expect(data.tag.color).toBe("#FF0000");
      expect(data.tag.userId).toBe(userA.id);
    });

    it("should return 400 for invalid data", async () => {
      const req = createApiRequest("/api/tags", {
        method: "POST",
        body: JSON.stringify({ name: "" }),
      });
      const res = await createTag(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 409 if tag name already exists for user", async () => {
      await createTestTag(userA.id, { name: "Duplicate Tag" });
      const req = createApiRequest("/api/tags", {
        method: "POST",
        body: JSON.stringify({ name: "Duplicate Tag" }),
      });
      const res = await createTag(req);
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error.code).toBe("CONFLICT");
    });

    it(`should return 400 if user exceeds max tags (${MAX_TAGS_PER_USER})`, async () => {
      const tagsToCreate = Array.from({ length: MAX_TAGS_PER_USER }).map((_, i) => ({
        userId: userA.id,
        name: `Max Tag ${i}`,
        color: "#16A34A",
      }));
      await prisma.tag.createMany({ data: tagsToCreate });

      const req = createApiRequest("/api/tags", {
        method: "POST",
        body: JSON.stringify({ name: "One more" }),
      });
      const res = await createTag(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.message).toMatch(/الحد الأقصى/);
    });
  });

  describe("GET /api/tags/[id]", () => {
    it("should return 401 if unauthorized", async () => {
      mockSession.user = null as any;
      const req = createApiRequest("/api/tags/123");
      const res = await getTag(req, { params: Promise.resolve({ id: "123" }) });
      expect(res.status).toBe(401);
    });

    it("should return a tag if owned by user", async () => {
      const tag = await createTestTag(userA.id, { name: "My Tag" });
      const req = createApiRequest(`/api/tags/${tag.id}`);
      const res = await getTag(req, { params: Promise.resolve({ id: tag.id }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.tag.id).toBe(tag.id);
      expect(data.tag.name).toBe("My Tag");
    });

    it("should return 404 if tag owned by another user", async () => {
      const tag = await createTestTag(userB.id, { name: "Other Tag" });
      const req = createApiRequest(`/api/tags/${tag.id}`);
      const res = await getTag(req, { params: Promise.resolve({ id: tag.id }) });
      expect(res.status).toBe(404);
    });

    it("should return 200 for ADMIN even if owned by another user", async () => {
      mockSession.user = {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      } as any;
      const tag = await createTestTag(userB.id, { name: "Admin Read Tag" });
      const req = createApiRequest(`/api/tags/${tag.id}`);
      const res = await getTag(req, { params: Promise.resolve({ id: tag.id }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.tag.id).toBe(tag.id);
    });
  });

  describe("PATCH /api/tags/[id]", () => {
    it("should return 401 if unauthorized", async () => {
      mockSession.user = null as any;
      const req = createApiRequest("/api/tags/123", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      });
      const res = await updateTag(req, { params: Promise.resolve({ id: "123" }) });
      expect(res.status).toBe(401);
    });

    it("should update a tag if owned by user", async () => {
      const tag = await createTestTag(userA.id, { name: "Old Name" });
      const req = createApiRequest(`/api/tags/${tag.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "New Name", color: "#16A34A" }),
      });
      const res = await updateTag(req, { params: Promise.resolve({ id: tag.id }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.tag.name).toBe("New Name");
      expect(data.tag.color).toBe("#16A34A");
    });

    it("should return 404 if trying to update someone else's tag", async () => {
      const tag = await createTestTag(userB.id, { name: "Other Tag Update" });
      const req = createApiRequest(`/api/tags/${tag.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "Hacked" }),
      });
      const res = await updateTag(req, { params: Promise.resolve({ id: tag.id }) });
      expect(res.status).toBe(404);
    });

    it("should return 409 if new name already exists for user", async () => {
      await createTestTag(userA.id, { name: "Existing Name" });
      const tag = await createTestTag(userA.id, { name: "Another Name" });
      const req = createApiRequest(`/api/tags/${tag.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "Existing Name" }),
      });
      const res = await updateTag(req, { params: Promise.resolve({ id: tag.id }) });
      expect(res.status).toBe(409);
    });
  });

  describe("DELETE /api/tags/[id]", () => {
    it("should return 401 if unauthorized", async () => {
      mockSession.user = null as any;
      const req = createApiRequest("/api/tags/123", { method: "DELETE" });
      const res = await deleteTag(req, { params: Promise.resolve({ id: "123" }) });
      expect(res.status).toBe(401);
    });

    it("should delete a tag if owned by user", async () => {
      const tag = await createTestTag(userA.id, { name: "Delete Me" });
      const req = createApiRequest(`/api/tags/${tag.id}`, { method: "DELETE" });
      const res = await deleteTag(req, { params: Promise.resolve({ id: tag.id }) });
      expect(res.status).toBe(200);

      const dbTag = await prisma.tag.findUnique({ where: { id: tag.id } });
      expect(dbTag).toBeNull();
    });

    it("should return 404 if trying to delete someone else's tag", async () => {
      const tag = await createTestTag(userB.id, { name: "Other Tag Delete" });
      const req = createApiRequest(`/api/tags/${tag.id}`, { method: "DELETE" });
      const res = await deleteTag(req, { params: Promise.resolve({ id: tag.id }) });
      expect(res.status).toBe(404);

      const dbTag = await prisma.tag.findUnique({ where: { id: tag.id } });
      expect(dbTag).not.toBeNull();
    });
  });
});
