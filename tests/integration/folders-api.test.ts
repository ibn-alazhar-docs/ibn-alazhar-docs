import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createApiRequest } from "./helpers";
import { GET as getFolders, POST as createFolder } from "@/app/api/folders/route";
import {
  GET as getFolder,
  PATCH as renameFolder,
  DELETE as deleteFolder,
} from "@/app/api/folders/[id]/route";
import {
  createTestUser,
  cleanupTestUsers,
  createTestFolder,
  TestUser,
} from "../integration/helpers/db";
import { mockSession } from "./setup";

describe("Folders API", () => {
  let userA: TestUser;
  let userB: TestUser;

  beforeEach(async () => {
    userA = await createTestUser({ name: "User A" });
    userB = await createTestUser({ name: "User B" });

    // Set default session to userA
    mockSession.user = {
      id: userA.id,
      name: userA.name,
      email: userA.email,
      role: userA.role,
    } as any;
  });

  afterEach(async () => {
    await cleanupTestUsers([userA.id, userB.id]);
  });

  describe("GET /api/folders", () => {
    it("should return folders for authenticated user", async () => {
      await createTestFolder(userA.id, { name: "Folder A" });
      await createTestFolder(userB.id, { name: "Folder B" });

      const request = createApiRequest("/api/folders");
      const response = await getFolders(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.folders).toHaveLength(1);
      expect(data.folders[0].name).toBe("Folder A");
    });

    it("should return 401 if unauthorized", async () => {
      mockSession.user = null as any;
      const request = createApiRequest("/api/folders");
      const response = await getFolders(request);
      expect(response.status).toBe(401);
    });

    it("should return folders with a specific parentId", async () => {
      const parent = await createTestFolder(userA.id, { name: "Parent" });
      await createTestFolder(userA.id, { name: "Child 1", parentId: parent.id });
      await createTestFolder(userA.id, { name: "Child 2", parentId: parent.id });

      const request = createApiRequest(`/api/folders?parentId=${parent.id}`);
      const response = await getFolders(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.folders).toHaveLength(2);
      expect(data.folders[0].parentId).toBe(parent.id);
    });
  });

  describe("POST /api/folders", () => {
    it("should create a folder", async () => {
      const request = createApiRequest("/api/folders", {
        method: "POST",
        body: JSON.stringify({ name: "New Folder", color: "#16A34A" }),
      });
      const response = await createFolder(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.folder.name).toBe("New Folder");
      expect(data.folder.color).toBe("#16A34A");
    });

    it("should return 400 for validation errors", async () => {
      const request = createApiRequest("/api/folders", {
        method: "POST",
        body: JSON.stringify({ name: "" }), // empty name
      });
      const response = await createFolder(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 404 if parent folder does not exist", async () => {
      const request = createApiRequest("/api/folders", {
        method: "POST",
        body: JSON.stringify({ name: "Child", parentId: "non-existent-id" }),
      });
      const response = await createFolder(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error.code).toBe("NOT_FOUND");
    });

    it("should return 401 if unauthorized", async () => {
      mockSession.user = null as any;
      const request = createApiRequest("/api/folders", {
        method: "POST",
        body: JSON.stringify({ name: "New Folder" }),
      });
      const response = await createFolder(request);
      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/folders/[id]", () => {
    it("should return a folder", async () => {
      const folder = await createTestFolder(userA.id, { name: "Folder A" });

      const request = createApiRequest(`/api/folders/${folder.id}`);
      const response = await getFolder(request, { params: Promise.resolve({ id: folder.id }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.folder.name).toBe("Folder A");
    });

    it("should return 404 if folder not found or belongs to another user", async () => {
      const folder = await createTestFolder(userB.id, { name: "Folder B" });

      const request = createApiRequest(`/api/folders/${folder.id}`);
      const response = await getFolder(request, { params: Promise.resolve({ id: folder.id }) });

      expect(response.status).toBe(404);
    });

    it("should return 401 if unauthorized", async () => {
      mockSession.user = null as any;
      const folder = await createTestFolder(userA.id, { name: "Folder A" });
      const request = createApiRequest(`/api/folders/${folder.id}`);
      const response = await getFolder(request, { params: Promise.resolve({ id: folder.id }) });
      expect(response.status).toBe(401);
    });
  });

  describe("PATCH /api/folders/[id]", () => {
    it("should rename a folder", async () => {
      const folder = await createTestFolder(userA.id, { name: "Old Name" });

      const request = createApiRequest(`/api/folders/${folder.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "New Name" }),
      });
      const response = await renameFolder(request, { params: Promise.resolve({ id: folder.id }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.folder.name).toBe("New Name");
    });

    it("should return 404 if trying to rename another user's folder", async () => {
      const folder = await createTestFolder(userB.id, { name: "User B Folder" });

      const request = createApiRequest(`/api/folders/${folder.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "Hacked" }),
      });
      const response = await renameFolder(request, { params: Promise.resolve({ id: folder.id }) });

      expect(response.status).toBe(404);
    });

    it("should return 400 for validation errors", async () => {
      const folder = await createTestFolder(userA.id, { name: "Old Name" });

      const request = createApiRequest(`/api/folders/${folder.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "" }),
      });
      const response = await renameFolder(request, { params: Promise.resolve({ id: folder.id }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 401 if unauthorized", async () => {
      mockSession.user = null as any;
      const folder = await createTestFolder(userA.id, { name: "Old Name" });
      const request = createApiRequest(`/api/folders/${folder.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "New Name" }),
      });
      const response = await renameFolder(request, { params: Promise.resolve({ id: folder.id }) });
      expect(response.status).toBe(401);
    });
  });

  describe("DELETE /api/folders/[id]", () => {
    it("should delete a folder", async () => {
      const folder = await createTestFolder(userA.id, { name: "To Delete" });

      const request = createApiRequest(`/api/folders/${folder.id}`, {
        method: "DELETE",
      });
      const response = await deleteFolder(request, { params: Promise.resolve({ id: folder.id }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe("حُذف المجلد");
    });

    it("should return 404 if trying to delete another user's folder", async () => {
      const folder = await createTestFolder(userB.id, { name: "User B Folder" });

      const request = createApiRequest(`/api/folders/${folder.id}`, {
        method: "DELETE",
      });
      const response = await deleteFolder(request, { params: Promise.resolve({ id: folder.id }) });

      expect(response.status).toBe(404);
    });

    it("should return 401 if unauthorized", async () => {
      mockSession.user = null as any;
      const folder = await createTestFolder(userA.id, { name: "To Delete" });
      const request = createApiRequest(`/api/folders/${folder.id}`, {
        method: "DELETE",
      });
      const response = await deleteFolder(request, { params: Promise.resolve({ id: folder.id }) });
      expect(response.status).toBe(401);
    });
  });
});
