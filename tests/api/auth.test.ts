import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { POST } from "@/app/api/auth/register/route";
import { createApiRequest } from "./helpers";
import { cleanupTestUsers, createTestUser, prisma } from "../integration/helpers/db";

describe("Auth API - /api/auth/register", () => {
  const createdUserIds: string[] = [];

  const validPassword = "Password123";
  const validRegisterData = {
    name: "Test User",
    email: "newuser_register_test@example.com",
    password: validPassword,
    confirmPassword: validPassword,
  };

  afterAll(async () => {
    // Delete any users created during the tests
    await cleanupTestUsers(createdUserIds);
  });

  describe("POST /api/auth/register", () => {
    it("should successfully register a new user", async () => {
      const request = createApiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(validRegisterData),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.message).toBe("تم إنشاء الحساب بنجاح");
      expect(data.userId).toBeDefined();

      createdUserIds.push(data.userId);

      // Verify user in db
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
      });
      expect(user).toBeDefined();
      expect(user?.email).toBe(validRegisterData.email.toLowerCase());
      expect(user?.name).toBe(validRegisterData.name);
      expect(user?.role).toBe("STUDENT");
    });

    it("should return validation error for missing fields", async () => {
      const request = createApiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return validation error for invalid email", async () => {
      const request = createApiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          ...validRegisterData,
          email: "not-an-email",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return validation error for weak password", async () => {
      const request = createApiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          ...validRegisterData,
          password: "weak",
          confirmPassword: "weak",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return validation error for mismatched passwords", async () => {
      const request = createApiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          ...validRegisterData,
          password: "Password123",
          confirmPassword: "Password124",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return conflict if email already exists", async () => {
      // Create a test user first
      const existingUser = await createTestUser();
      createdUserIds.push(existingUser.id);

      const request = createApiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          ...validRegisterData,
          email: existingUser.email,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(409);

      const data = await response.json();
      expect(data.error.code).toBe("EMAIL_EXISTS");
    });

    it("should reactivate account if email belongs to a deleted user", async () => {
      // Create user and mark as deleted
      const deletedUser = await createTestUser();
      createdUserIds.push(deletedUser.id);

      await prisma.user.update({
        where: { id: deletedUser.id },
        data: { deletedAt: new Date() },
      });

      const request = createApiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          ...validRegisterData,
          email: deletedUser.email,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.message).toBe("تم إعادة تنشيط الحساب بنجاح");
      expect(data.userId).toBe(deletedUser.id);

      // Verify user is no longer deleted
      const updatedUser = await prisma.user.findUnique({
        where: { id: deletedUser.id },
      });
      expect(updatedUser?.deletedAt).toBeNull();
    });
  });
});
