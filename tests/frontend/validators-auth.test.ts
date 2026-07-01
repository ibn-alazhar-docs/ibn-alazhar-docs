import { describe, it, expect } from "vitest";
import {
  loginSchema,
  registerSchema,
  profileUpdateSchema,
  adminUserUpdateSchema,
} from "@/lib/shared/validators/auth";

describe("loginSchema", () => {
  it("valid input passes", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "Password1" });
    expect(result.success).toBe(true);
  });

  it("empty email fails", () => {
    const result = loginSchema.safeParse({ email: "", password: "Password1" });
    expect(result.success).toBe(false);
  });

  it("invalid email format fails", () => {
    const result = loginSchema.safeParse({ email: "not-email", password: "Password1" });
    expect(result.success).toBe(false);
  });

  it("empty password fails", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "" });
    expect(result.success).toBe(false);
  });

  it("password shorter than 8 chars fails", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "Ab1" });
    expect(result.success).toBe(false);
  });

  it("password exactly 8 chars passes", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "Abcdefg1" });
    expect(result.success).toBe(true);
  });

  it("missing email fails", () => {
    const result = loginSchema.safeParse({ password: "Password1" });
    expect(result.success).toBe(false);
  });

  it("missing password fails", () => {
    const result = loginSchema.safeParse({ email: "user@example.com" });
    expect(result.success).toBe(false);
  });
});

describe("registerSchema", () => {
  const validInput = {
    name: "أحمد",
    email: "ahmed@example.com",
    password: "SecurePass1",
    confirmPassword: "SecurePass1",
  };

  it("valid input passes", () => {
    const result = registerSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("short name (< 2 chars) fails", () => {
    const result = registerSchema.safeParse({ ...validInput, name: "أ" });
    expect(result.success).toBe(false);
  });

  it("long name (> 100 chars) fails", () => {
    const result = registerSchema.safeParse({ ...validInput, name: "أ".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("empty name fails", () => {
    const result = registerSchema.safeParse({ ...validInput, name: "" });
    expect(result.success).toBe(false);
  });

  it("invalid email fails", () => {
    const result = registerSchema.safeParse({ ...validInput, email: "not-email" });
    expect(result.success).toBe(false);
  });

  it("password without uppercase fails", () => {
    const result = registerSchema.safeParse({
      ...validInput,
      password: "securepass1",
      confirmPassword: "securepass1",
    });
    expect(result.success).toBe(false);
  });

  it("password without lowercase fails", () => {
    const result = registerSchema.safeParse({
      ...validInput,
      password: "SECUREPASS1",
      confirmPassword: "SECUREPASS1",
    });
    expect(result.success).toBe(false);
  });

  it("password without digit fails", () => {
    const result = registerSchema.safeParse({
      ...validInput,
      password: "SecurePass",
      confirmPassword: "SecurePass",
    });
    expect(result.success).toBe(false);
  });

  it("password too short fails", () => {
    const result = registerSchema.safeParse({
      ...validInput,
      password: "Ab1",
      confirmPassword: "Ab1",
    });
    expect(result.success).toBe(false);
  });

  it("password too long (> 128) fails", () => {
    const longPass = "A1" + "a".repeat(127);
    const result = registerSchema.safeParse({
      ...validInput,
      password: longPass,
      confirmPassword: longPass,
    });
    expect(result.success).toBe(false);
  });

  it("mismatched confirmPassword fails", () => {
    const result = registerSchema.safeParse({ ...validInput, confirmPassword: "DifferentPass1" });
    expect(result.success).toBe(false);
  });

  it("empty confirmPassword fails", () => {
    const result = registerSchema.safeParse({ ...validInput, confirmPassword: "" });
    expect(result.success).toBe(false);
  });
});

describe("profileUpdateSchema", () => {
  it("valid name passes", () => {
    const result = profileUpdateSchema.safeParse({ name: "أحمد محمد" });
    expect(result.success).toBe(true);
  });

  it("short name fails", () => {
    const result = profileUpdateSchema.safeParse({ name: "أ" });
    expect(result.success).toBe(false);
  });

  it("long name fails", () => {
    const result = profileUpdateSchema.safeParse({ name: "أ".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("name is trimmed", () => {
    const result = profileUpdateSchema.parse({ name: "  أحمد  " });
    expect(result.name).toBe("أحمد");
  });

  it("empty name fails", () => {
    const result = profileUpdateSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });
});

describe("adminUserUpdateSchema", () => {
  it("valid input passes", () => {
    const result = adminUserUpdateSchema.safeParse({ userId: "user-1", role: "ADMIN" });
    expect(result.success).toBe(true);
  });

  it("STUDENT role passes", () => {
    const result = adminUserUpdateSchema.safeParse({ userId: "user-1", role: "STUDENT" });
    expect(result.success).toBe(true);
  });

  it("TEACHER role passes", () => {
    const result = adminUserUpdateSchema.safeParse({ userId: "user-1", role: "TEACHER" });
    expect(result.success).toBe(true);
  });

  it("invalid role fails", () => {
    const result = adminUserUpdateSchema.safeParse({ userId: "user-1", role: "SUPERADMIN" });
    expect(result.success).toBe(false);
  });

  it("empty userId fails", () => {
    const result = adminUserUpdateSchema.safeParse({ userId: "", role: "ADMIN" });
    expect(result.success).toBe(false);
  });

  it("missing userId fails", () => {
    const result = adminUserUpdateSchema.safeParse({ role: "ADMIN" });
    expect(result.success).toBe(false);
  });
});
