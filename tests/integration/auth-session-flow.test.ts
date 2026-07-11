import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { prisma, createTestUser, createTestDocument, cleanupTestUsers } from "./helpers/db";
import { RegistrationUseCases } from "../../apps/web/src/core/services/registration.use-cases";
import { PasswordResetUseCases } from "../../apps/web/src/core/services/password-reset.use-cases";
import { UserUseCases } from "../../apps/web/src/core/services/user.use-cases";
import { NotFoundError, ValidationError } from "../../apps/web/src/shared/errors";

vi.mock("@/lib/email/send", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/shared/logger", () => ({
  logger: { child: () => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn() }) },
}));

vi.mock("ioredis", () => ({
  default: class MockRedis {
    on() {}
    get() {
      return null;
    }
    set() {}
    del() {}
  },
}));

vi.mock("minio", () => ({
  Client: class MockMinio {
    putObject() {}
    getObject() {}
    bucketExists() {}
    makeBucket() {}
  },
}));

async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

async function createSession(userId: string, expiresInHours = 24) {
  const sessionToken = createHash("sha256")
    .update(userId + Date.now())
    .digest("hex");
  const expires = new Date();
  expires.setHours(expires.getHours() + expiresInHours);
  return prisma.session.create({
    data: { sessionToken, userId, expires },
  });
}

describe("Auth Session Lifecycle", () => {
  let user: { id: string; email: string; role: string };
  const userIds: string[] = [];

  afterEach(async () => {
    await cleanupTestUsers(userIds);
    userIds.length = 0;
  });

  describe("Registration flow", () => {
    let regUseCases: RegistrationUseCases;
    let mockUserRepo: { findByEmail: any; create: any };
    let mockVerificationRepo: { create: any };

    beforeEach(() => {
      const users: any[] = [];
      mockUserRepo = {
        findByEmail: vi.fn(async (email: string) => users.find((u) => u.email === email) || null),
        create: vi.fn(async (data: any) => {
          const newUser = { id: `user_${Date.now()}`, ...data };
          users.push(newUser);
          userIds.push(newUser.id);
          return newUser;
        }),
      };
      mockVerificationRepo = {
        create: vi.fn().mockResolvedValue({}),
      };
      regUseCases = new RegistrationUseCases(mockUserRepo as any, mockVerificationRepo as any);
    });

    it("registers a new user successfully", async () => {
      const result = await regUseCases.register("Test User", "test@example.com", "Password123!");
      expect(result.email).toBe("test@example.com");
      expect(result.name).toBe("Test User");
    });

    it("normalizes email to lowercase", async () => {
      const result = await regUseCases.register(
        "Case Test",
        "UPPERCASE@Example.com",
        "Password123!",
      );
      expect(result.email).toBe("uppercase@example.com");
    });

    it("rejects duplicate email registration", async () => {
      await regUseCases.register("User1", "dupe@example.com", "Password123!");
      await expect(
        regUseCases.register("User2", "dupe@example.com", "Password123!"),
      ).rejects.toThrow(/مسجل مسبقاً/);
    });

    it("assigns STUDENT role by default", async () => {
      const result = await regUseCases.register("Student", "student@example.com", "Password123!");
      expect(result.role).toBe("STUDENT");
    });

    it("issues verification token on registration", async () => {
      await regUseCases.register("Verified", "verify@example.com", "Password123!");
      expect(mockVerificationRepo.create).toHaveBeenCalled();
      const call = mockVerificationRepo.create.mock.calls[0][0];
      expect(call.identifier).toBe("verify@example.com");
      expect(call.token).toBeTruthy();
    });
  });

  describe("Password reset flow", () => {
    let resetUseCases: PasswordResetUseCases;
    let mockUserRepo: { findByEmail: any; findFirst: any; create: any; updateByEmail: any };
    let mockVerificationRepo: {
      create: any;
      deleteByIdentifier: any;
      findByIdentifierAndToken: any;
      deleteByIdentifierAndToken: any;
    };

    beforeEach(() => {
      const storedTokens: any[] = [];
      const storedUsers: any[] = [];

      mockUserRepo = {
        findByEmail: vi.fn(
          async (email: string) => storedUsers.find((u) => u.email === email) || null,
        ),
        findFirst: vi.fn(async (args: any) => {
          const u = storedUsers.find((u) => u.email === args.where.email);
          return u ? { id: u.id, email: u.email } : null;
        }),
        create: vi.fn(async (data: any) => {
          const u = { id: `user_${Date.now()}`, ...data };
          storedUsers.push(u);
          return u;
        }),
        updateByEmail: vi.fn().mockResolvedValue({}),
      };

      mockVerificationRepo = {
        create: vi.fn(async (data: any) => {
          storedTokens.push(data);
          return data;
        }),
        deleteByIdentifier: vi.fn().mockResolvedValue({}),
        findByIdentifierAndToken: vi.fn(async (identifier: string, token: string) => {
          const found = storedTokens.find(
            (t) => t.identifier === identifier && t.token === token && t.expires > new Date(),
          );
          return found || null;
        }),
        deleteByIdentifierAndToken: vi.fn(async (id: string, t: string) => {
          const idx = storedTokens.findIndex((s) => s.identifier === id && s.token === t);
          if (idx >= 0) storedTokens.splice(idx, 1);
        }),
      };

      resetUseCases = new PasswordResetUseCases(mockUserRepo as any, mockVerificationRepo as any);
    });

    it("forgotPassword creates reset token for existing user", async () => {
      await mockUserRepo.create({ email: "reset@example.com", name: "Reset User" });

      const result = await resetUseCases.forgotPassword("reset@example.com");
      expect(result.success).toBe(true);
      expect(result.token).toBeTruthy();
    });

    it("forgotPassword returns success even for non-existent user (no enum)", async () => {
      const result = await resetUseCases.forgotPassword("nonexistent@example.com");
      expect(result.success).toBe(true);
      expect(result.token).toBeUndefined();
    });

    it("resetPassword with valid token updates password", async () => {
      await mockUserRepo.create({ email: "validreset@example.com", name: "Valid" });
      await resetUseCases.forgotPassword("validreset@example.com");
      const tokenResult = await resetUseCases.forgotPassword("validreset@example.com");

      const result = await resetUseCases.resetPassword(
        "validreset@example.com",
        tokenResult.token!,
        "NewPass123!",
      );
      expect(result.success).toBe(true);
      expect(mockUserRepo.updateByEmail).toHaveBeenCalledWith("validreset@example.com", {
        passwordHash: expect.any(String),
        failedLoginAttempts: 0,
        lockedAt: null,
      });
    });

    it("resetPassword with expired token throws ValidationError", async () => {
      await mockUserRepo.create({ email: "expired@example.com", name: "Expired" });

      mockVerificationRepo.findByIdentifierAndToken = vi.fn().mockResolvedValue({
        identifier: "expired@example.com",
        token: "expired-token",
        expires: new Date(Date.now() - 3600000),
      });

      await expect(
        resetUseCases.resetPassword("expired@example.com", "expired-token", "NewPass123!"),
      ).rejects.toThrow(ValidationError);
    });

    it("resetPassword with invalid token throws ValidationError", async () => {
      await mockUserRepo.create({ email: "invalid@example.com", name: "Invalid" });

      await expect(
        resetUseCases.resetPassword("invalid@example.com", "bad-token", "NewPass123!"),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("Session lifecycle (create → verify → expire)", () => {
    it("creates a valid session for a user", async () => {
      const u = await createTestUser({ name: "Session User" });
      userIds.push(u.id);

      const session = await createSession(u.id);
      expect(session.sessionToken).toBeTruthy();
      expect(session.userId).toBe(u.id);
      expect(session.expires.getTime()).toBeGreaterThan(Date.now());
    });

    it("session can be verified by token lookup", async () => {
      const u = await createTestUser({ name: "Session Verify" });
      userIds.push(u.id);

      const session = await createSession(u.id);
      const found = await prisma.session.findUnique({
        where: { sessionToken: session.sessionToken },
        include: { user: { select: { id: true, email: true, role: true } } },
      });

      expect(found).not.toBeNull();
      expect(found!.user.id).toBe(u.id);
      expect(found!.user.role).toBe("STUDENT");
    });

    it("expired session is detectable", async () => {
      const u = await createTestUser({ name: "Session Expire" });
      userIds.push(u.id);

      const session = await createSession(u.id, -1);
      const found = await prisma.session.findUnique({
        where: { sessionToken: session.sessionToken },
      });
      expect(found!.expires.getTime()).toBeLessThan(Date.now());
    });

    it("deleting session logs user out", async () => {
      const u = await createTestUser({ name: "Session Logout" });
      userIds.push(u.id);

      const session = await createSession(u.id);
      await prisma.session.delete({ where: { id: session.id } });

      const found = await prisma.session.findUnique({
        where: { sessionToken: session.sessionToken },
      });
      expect(found).toBeNull();
    });
  });

  describe("Role-based access via UserUseCases", () => {
    let userUseCases: UserUseCases;
    let mockUserRepo: any;

    beforeEach(() => {
      const users: any[] = [];
      mockUserRepo = {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        findFirst: vi.fn().mockResolvedValue(null),
        updateRole: vi.fn().mockResolvedValue({}),
        softDelete: vi.fn().mockResolvedValue({}),
      };
      userUseCases = new UserUseCases(mockUserRepo);
    });

    it("admin cannot change own role", async () => {
      await expect(userUseCases.updateUserRole("admin-1", "TEACHER", "admin-1")).rejects.toThrow(
        ValidationError,
      );
    });

    it("admin can change another user's role", async () => {
      mockUserRepo.findFirst = vi.fn().mockResolvedValue({ id: "user-2" });
      mockUserRepo.updateRole = vi.fn().mockResolvedValue({ id: "user-2", role: "TEACHER" });

      const result = await userUseCases.updateUserRole("user-2", "TEACHER", "admin-1");
      expect(result).toBeDefined();
    });

    it("admin cannot delete own account", async () => {
      await expect(userUseCases.deleteUser("admin-1", "admin-1")).rejects.toThrow(ValidationError);
    });

    it("getUsers returns paginated results", async () => {
      mockUserRepo.findMany = vi.fn().mockResolvedValue([
        {
          id: "1",
          name: "User 1",
          email: "u1@test.com",
          role: "STUDENT",
          createdAt: new Date(),
          _count: { documents: 0 },
        },
      ]);
      mockUserRepo.count = vi.fn().mockResolvedValue(1);

      const result = await userUseCases.getUsers(1, 10);
      expect(result.users).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
    });
  });

  describe("Access control: STUDENT vs TEACHER vs ADMIN", () => {
    it("creates user with STUDENT role by default", async () => {
      const u = await createTestUser({ name: "Default Role User" });
      userIds.push(u.id);
      expect(u.role).toBe("STUDENT");
    });

    it("creates user with TEACHER role when specified", async () => {
      const u = await createTestUser({ name: "Teacher User", role: "TEACHER" });
      userIds.push(u.id);
      expect(u.role).toBe("TEACHER");
    });

    it("creates user with ADMIN role when specified", async () => {
      const u = await createTestUser({ name: "Admin User", role: "ADMIN" });
      userIds.push(u.id);
      expect(u.role).toBe("ADMIN");
    });

    it("password is hashed (not stored as plaintext)", async () => {
      const u = await createTestUser({ name: "Hash Check" });
      userIds.push(u.id);

      const stored = await prisma.user.findUnique({ where: { id: u.id } });
      expect(stored!.passwordHash).not.toBe("Test@123456");
      expect(stored!.passwordHash).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});
