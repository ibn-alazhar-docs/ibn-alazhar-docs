import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/middleware/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: () => Promise.resolve(data),
    })),
  },
}));

import {
  requireAuth,
  requireRole,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/middleware/auth-guards";
import { auth } from "@/middleware/auth";

const mockedAuth = vi.mocked(auth);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireAuth", () => {
  it("returns session when user exists", async () => {
    const session = { user: { id: "1", name: "Test", role: "ADMIN" } };
    mockedAuth.mockResolvedValue(session as never);
    const result = await requireAuth();
    expect(result).toEqual(session);
  });

  it("throws NEXT_REDIRECT when session is null", async () => {
    mockedAuth.mockResolvedValue(null as never);
    await expect(requireAuth()).rejects.toThrow("NEXT_REDIRECT");
  });

  it("throws NEXT_REDIRECT when user is missing", async () => {
    mockedAuth.mockResolvedValue({ user: undefined } as never);
    await expect(requireAuth()).rejects.toThrow("NEXT_REDIRECT");
  });

  it("returns full session shape with role", async () => {
    const session = { user: { id: "2", name: "Admin", role: "ADMIN" } };
    mockedAuth.mockResolvedValue(session as never);
    const result = await requireAuth();
    expect(result.user.role).toBe("ADMIN");
  });
});

describe("requireRole", () => {
  it("returns session when role matches", async () => {
    const session = { user: { id: "1", name: "A", role: "ADMIN" } };
    mockedAuth.mockResolvedValue(session as never);
    const result = await requireRole("ADMIN");
    expect(result).toEqual(session);
  });

  it("throws FORBIDDEN error message when role does not match", async () => {
    const session = { user: { id: "1", name: "A", role: "STUDENT" } };
    mockedAuth.mockResolvedValue(session as never);
    await expect(requireRole("ADMIN")).rejects.toThrow("ليس لديك صلاحية للوصول");
  });

  it("handles ADMIN role correctly", async () => {
    const session = { user: { id: "1", name: "A", role: "ADMIN" } };
    mockedAuth.mockResolvedValue(session as never);
    const result = await requireRole("ADMIN");
    expect(result.user.role).toBe("ADMIN");
  });

  it("handles STUDENT role correctly", async () => {
    const session = { user: { id: "2", name: "B", role: "STUDENT" } };
    mockedAuth.mockResolvedValue(session as never);
    const result = await requireRole("STUDENT");
    expect(result.user.role).toBe("STUDENT");
  });
});

describe("unauthorizedResponse", () => {
  it("returns status 401", async () => {
    const res = unauthorizedResponse();
    expect(res.status).toBe(401);
  });

  it("has default Arabic message", async () => {
    const res = unauthorizedResponse();
    const body = await res.json();
    expect(body.error.message).toBe("يجب تسجيل الدخول");
  });

  it("accepts custom message", async () => {
    const res = unauthorizedResponse("Custom auth error");
    const body = await res.json();
    expect(body.error.message).toBe("Custom auth error");
  });

  it("JSON body has UNAUTHORIZED code", async () => {
    const res = unauthorizedResponse();
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});

describe("forbiddenResponse", () => {
  it("returns status 403", async () => {
    const res = forbiddenResponse();
    expect(res.status).toBe(403);
  });

  it("has default Arabic message", async () => {
    const res = forbiddenResponse();
    const body = await res.json();
    expect(body.error.message).toBe("ليس لديك صلاحية للوصول");
  });

  it("accepts custom message", async () => {
    const res = forbiddenResponse("No access");
    const body = await res.json();
    expect(body.error.message).toBe("No access");
  });

  it("JSON body has FORBIDDEN code", async () => {
    const res = forbiddenResponse();
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });
});
