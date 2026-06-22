import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createApiRequest } from "./helpers";
import { GET as searchGet } from "@/app/api/search/route";
import { GET as suggestGet } from "@/app/api/search/suggest/route";
import {
  createTestUser,
  createTestDocument,
  createTestFolder,
  cleanupTestUsers,
  TestUser,
} from "../integration/helpers/db";
import { mockSession } from "./setup";

describe("Search API", () => {
  let userA: TestUser;
  let userB: TestUser;
  let adminUser: TestUser;

  beforeAll(async () => {
    userA = await createTestUser({ name: "User A", role: "STUDENT" });
    userB = await createTestUser({ name: "User B", role: "STUDENT" });
    adminUser = await createTestUser({ name: "Admin", role: "ADMIN" });

    // Documents for User A
    await createTestDocument(userA.id, { title: "Biology 101 Notes" });
    await createTestDocument(userA.id, { title: "Chemistry Basics" });
    const folderA = await createTestFolder(userA.id, { name: "Science Folder" });
    await createTestDocument(userA.id, { title: "Physics Intro", folderId: folderA.id });

    // Documents for User B
    await createTestDocument(userB.id, { title: "Biology Advanced" });
  });

  afterAll(async () => {
    await cleanupTestUsers([userA.id, userB.id, adminUser.id]);
  });

  beforeEach(() => {
    mockSession.user = {
      id: userA.id,
      name: userA.name,
      email: userA.email,
      role: userA.role,
    } as any;
  });

  describe("GET /api/search", () => {
    it("should return unauthorized if not logged in", async () => {
      mockSession.user = null as any;
      const req = createApiRequest("http://localhost/api/search?q=test", "GET");
      const res = await searchGet(req);
      expect(res.status).toBe(401);
    });

    it("should return validation error if query is too short", async () => {
      const req = createApiRequest("http://localhost/api/search?q=a", "GET");
      const res = await searchGet(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

    it("should successfully search documents by title", async () => {
      const req = createApiRequest("http://localhost/api/search?q=Biology", "GET");
      const res = await searchGet(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      // User A only has Biology 101 Notes
      expect(data.results.some((r: any) => r.title === "Biology 101 Notes")).toBe(true);
      expect(data.results.some((r: any) => r.title === "Biology Advanced")).toBe(false);
    });

    it("should respect ownership (user cannot see other users' documents)", async () => {
      const req = createApiRequest("http://localhost/api/search?q=Advanced", "GET");
      const res = await searchGet(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.results).toHaveLength(0);
    });

    it("should allow admin to search all documents", async () => {
      mockSession.user = {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
      } as any;
      const req = createApiRequest("http://localhost/api/search?q=Biology", "GET");
      const res = await searchGet(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.results.some((r: any) => r.title === "Biology 101 Notes")).toBe(true);
      expect(data.results.some((r: any) => r.title === "Biology Advanced")).toBe(true);
    });

    it("should filter by folder type", async () => {
      mockSession.user = {
        id: userA.id,
        name: userA.name,
        email: userA.email,
        role: userA.role,
      } as any;
      const req = createApiRequest("http://localhost/api/search?q=Science&type=folder", "GET");
      const res = await searchGet(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.results.some((r: any) => r.title === "Physics Intro")).toBe(true);
    });
  });

  describe("GET /api/search/suggest", () => {
    it("should return unauthorized if not logged in", async () => {
      mockSession.user = null as any;
      const req = createApiRequest("http://localhost/api/search/suggest?q=test", "GET");
      const res = await suggestGet(req);
      expect(res.status).toBe(401);
    });

    it("should return empty array if query is too short", async () => {
      mockSession.user = {
        id: userA.id,
        name: userA.name,
        email: userA.email,
        role: userA.role,
      } as any;
      const req = createApiRequest("http://localhost/api/search/suggest?q=a", "GET");
      const res = await suggestGet(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.suggestions).toEqual([]);
    });

    it("should return suggestions for matching documents", async () => {
      const req = createApiRequest("http://localhost/api/search/suggest?q=Biolog", "GET");
      const res = await suggestGet(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.suggestions).toBeInstanceOf(Array);
      expect(data.suggestions.some((s: any) => s.text === "Biology 101 Notes")).toBe(true);
    });

    it("should respect ownership for suggestions", async () => {
      const req = createApiRequest("http://localhost/api/search/suggest?q=Advanced", "GET");
      const res = await suggestGet(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.suggestions.some((s: any) => s.text === "Biology Advanced")).toBe(false);
    });
  });
});
