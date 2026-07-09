import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import bcrypt from "bcryptjs";
import { mockSession } from "./setup";
import { PATCH as updateProfile, DELETE as deleteProfile } from "@/app/api/profile/route";
import { createTestUser, cleanupTestUsers, prisma } from "../integration/helpers/db";

vi.mock("@/clients/redis", () => ({
  checkUserRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  rateLimitResponse: vi
    .fn()
    .mockReturnValue(
      new Response(JSON.stringify({ error: { code: "RATE_LIMITED" } }), { status: 429 }),
    ),
  cleanupExpiredEntries: vi.fn(),
}));

describe("Profile API", () => {
  let userA: any;

  beforeAll(async () => {
    userA = await createTestUser({ name: "User A", role: "STUDENT" });
  });

  afterAll(async () => {
    await cleanupTestUsers([userA.id]);
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

  describe("PATCH /api/profile", () => {
    it("returns 401 if unauthorized", async () => {
      mockSession.user = null as any;
      const req = new Request("http://localhost/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ name: "New Name" }),
      });
      const res = await updateProfile(req);
      expect(res.status).toBe(401);
    });

    it("returns 400 for empty name", async () => {
      const req = new Request("http://localhost/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ name: "" }),
      });
      const res = await updateProfile(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 for name too short", async () => {
      const req = new Request("http://localhost/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ name: "A" }),
      });
      const res = await updateProfile(req);
      expect(res.status).toBe(400);
    });

    it("updates the user name", async () => {
      const req = new Request("http://localhost/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated Name" }),
      });
      const res = await updateProfile(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user.name).toBe("Updated Name");
    });
  });

  describe("DELETE /api/profile", () => {
    it("returns 401 if unauthorized", async () => {
      mockSession.user = null as any;
      const req = new Request("http://localhost/api/profile", {
        method: "DELETE",
        body: JSON.stringify({ password: "Test@123456" }),
      });
      const res = await deleteProfile(req);
      expect(res.status).toBe(401);
    });

    it("returns 400 for missing password", async () => {
      const req = new Request("http://localhost/api/profile", {
        method: "DELETE",
        body: JSON.stringify({}),
      });
      const res = await deleteProfile(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 401 for wrong password", async () => {
      const req = new Request("http://localhost/api/profile", {
        method: "DELETE",
        body: JSON.stringify({ password: "WrongPass123!" }),
      });
      const res = await deleteProfile(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error.code).toBe("UNAUTHORIZED");
    });

    it("soft-deletes user account", async () => {
      const password = "ValidPass123!";
      const hash = await bcrypt.hash(password, 10);
      const id = `profile_test_${Date.now()}`;
      await prisma.user.create({
        data: {
          id,
          email: `${id}@test.ibn`,
          name: "Delete Me",
          role: "STUDENT",
          passwordHash: hash,
        },
      });
      mockSession.user = {
        id,
        name: "Delete Me",
        email: `${id}@test.ibn`,
        role: "STUDENT",
      } as any;

      const req = new Request("http://localhost/api/profile", {
        method: "DELETE",
        body: JSON.stringify({ password }),
      });
      const res = await deleteProfile(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      const user = await prisma.user.findUnique({ where: { id } });
      expect(user?.deletedAt).not.toBeNull();

      await prisma.user.delete({ where: { id } });
    });
  });
});
