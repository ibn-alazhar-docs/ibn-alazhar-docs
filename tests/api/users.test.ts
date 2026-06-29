import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { mockSession } from "./setup";
import { GET as getUsers, PATCH as updateUser, DELETE as deleteUser } from "@/app/api/users/route";
import { createTestUser, cleanupTestUsers, prisma } from "../integration/helpers/db";

describe("Users API (admin)", () => {
  let admin: any;
  let userA: any;
  let userB: any;

  beforeAll(async () => {
    admin = await createTestUser({ name: "Admin", role: "ADMIN" });
    userA = await createTestUser({ name: "User A", role: "STUDENT" });
    userB = await createTestUser({ name: "User B", role: "TEACHER" });
  });

  afterAll(async () => {
    await cleanupTestUsers([admin.id, userA.id, userB.id]);
  });

  beforeEach(() => {
    mockSession.user = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: "ADMIN",
    } as any;
  });

  afterEach(async () => {
    await prisma.user.updateMany({
      where: { id: { in: [userA.id, userB.id] } },
      data: { role: "STUDENT" },
    });
  });

  describe("GET /api/users", () => {
    it("returns 401 if unauthorized", async () => {
      mockSession.user = null as any;
      const res = await getUsers();
      expect(res.status).toBe(401);
    });

    it("returns 403 if not admin", async () => {
      mockSession.user = { ...userA, role: "STUDENT" } as any;
      const res = await getUsers();
      expect(res.status).toBe(403);
    });

    it("returns paginated users for admin", async () => {
      const req = new Request("http://localhost/api/users");
      const res = await getUsers(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.users).toBeDefined();
      expect(data.pagination).toBeDefined();
      expect(data.pagination.total).toBeGreaterThanOrEqual(3);
    });

    it("respects page and limit params", async () => {
      const req = new Request("http://localhost/api/users?page=1&limit=1");
      const res = await getUsers(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.users).toHaveLength(1);
    });
  });

  describe("PATCH /api/users", () => {
    it("returns 401 if unauthorized", async () => {
      mockSession.user = null as any;
      const req = new Request("http://localhost/api/users", {
        method: "PATCH",
        body: JSON.stringify({ userId: userA.id, role: "TEACHER" }),
      });
      const res = await updateUser(req);
      expect(res.status).toBe(401);
    });

    it("returns 403 if not admin", async () => {
      mockSession.user = { ...userA, role: "STUDENT" } as any;
      const req = new Request("http://localhost/api/users", {
        method: "PATCH",
        body: JSON.stringify({ userId: userA.id, role: "TEACHER" }),
      });
      const res = await updateUser(req);
      expect(res.status).toBe(403);
    });

    it("returns 400 for invalid body", async () => {
      const req = new Request("http://localhost/api/users", {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      const res = await updateUser(req);
      expect(res.status).toBe(400);
    });

    it("updates user role", async () => {
      const req = new Request("http://localhost/api/users", {
        method: "PATCH",
        body: JSON.stringify({ userId: userA.id, role: "TEACHER" }),
      });
      const res = await updateUser(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user.role).toBe("TEACHER");
    });

    it("prevents self-role change", async () => {
      const req = new Request("http://localhost/api/users", {
        method: "PATCH",
        body: JSON.stringify({ userId: admin.id, role: "STUDENT" }),
      });
      const res = await updateUser(req);
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/users", () => {
    it("returns 401 if unauthorized", async () => {
      mockSession.user = null as any;
      const req = new Request("http://localhost/api/users", {
        method: "DELETE",
        body: JSON.stringify({ userId: userA.id }),
      });
      const res = await deleteUser(req);
      expect(res.status).toBe(401);
    });

    it("returns 403 if not admin", async () => {
      mockSession.user = { ...userA, role: "STUDENT" } as any;
      const req = new Request("http://localhost/api/users", {
        method: "DELETE",
        body: JSON.stringify({ userId: userA.id }),
      });
      const res = await deleteUser(req);
      expect(res.status).toBe(403);
    });

    it("returns 400 for missing userId", async () => {
      const req = new Request("http://localhost/api/users", {
        method: "DELETE",
        body: JSON.stringify({}),
      });
      const res = await deleteUser(req);
      expect(res.status).toBe(400);
    });

    it("soft-deletes user", async () => {
      const tempUser = await createTestUser({ name: "To Delete", role: "STUDENT" });
      const req = new Request("http://localhost/api/users", {
        method: "DELETE",
        body: JSON.stringify({ userId: tempUser.id }),
      });
      const res = await deleteUser(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      const deleted = await prisma.user.findUnique({ where: { id: tempUser.id } });
      expect(deleted?.deletedAt).not.toBeNull();

      await cleanupTestUsers([tempUser.id]);
    });

    it("prevents self-deletion", async () => {
      const req = new Request("http://localhost/api/users", {
        method: "DELETE",
        body: JSON.stringify({ userId: admin.id }),
      });
      const res = await deleteUser(req);
      expect(res.status).toBe(400);
    });
  });
});
