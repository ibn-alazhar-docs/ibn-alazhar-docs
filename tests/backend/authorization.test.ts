vi.unmock("@/middleware/auth-guards");
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks must be declared before importing the modules under test ---
vi.mock("@/middleware/auth", () => ({ auth: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    const e = new Error("NEXT_REDIRECT");
    (e as unknown as { digest: string }).digest = `redirect;${url}`;
    throw e;
  }),
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

import { isAdminRole, canViewUsers, ROLE } from "@/domain/auth";
import { ownedWhere } from "@/core/authorization";
import {
  requireAuth,
  requireRole,
  withAuth,
  withAdminAuth,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/middleware/auth-guards";
import { auth } from "@/middleware/auth";
import type { AuthSession } from "@/domain/types";

const studentSession: AuthSession = {
  user: { id: "u1", email: "s@x.com", name: "S", role: "STUDENT", image: null },
  expires: new Date(Date.now() + 1e9).toISOString(),
};
const adminSession: AuthSession = { ...studentSession, user: { ...studentSession.user, role: "ADMIN" } };

function setAuth(session: unknown) {
  auth.mockReturnValue(session as never);
}

describe("Authorization primitives (domain/auth)", () => {
  it("isAdminRole true only for ADMIN", () => {
    expect(isAdminRole(ROLE.ADMIN)).toBe(true);
    expect(isAdminRole(ROLE.STUDENT)).toBe(false);
    expect(isAdminRole(ROLE.TEACHER)).toBe(false);
  });

  it("canViewUsers includes ADMIN and TEACHER", () => {
    expect(canViewUsers(ROLE.ADMIN)).toBe(true);
    expect(canViewUsers(ROLE.TEACHER)).toBe(true);
    expect(canViewUsers(ROLE.STUDENT)).toBe(false);
  });
});

describe("ownedWhere (scoping)", () => {
  it("scopes non-admin queries by userId", () => {
    const where = ownedWhere({ status: "READY" }, studentSession);
    expect(where).toMatchObject({ status: "READY", userId: "u1", deletedAt: null });
  });

  it("does NOT scope admin queries by userId", () => {
    const where = ownedWhere({ status: "READY" }, adminSession);
    expect(where).toMatchObject({ status: "READY", deletedAt: null });
    expect(where).not.toHaveProperty("userId");
  });

  it("respects a custom userId field name", () => {
    const where = ownedWhere({ active: true }, studentSession, "ownerId");
    expect(where).toMatchObject({ ownerId: "u1" });
  });

  it("does not override an explicit deletedAt filter", () => {
    const where = ownedWhere({ deletedAt: { not: null } }, studentSession);
    expect(where.deletedAt).toEqual({ not: null });
  });

  it("preserves baseWhere for admin", () => {
    const where = ownedWhere({ a: 1, b: 2 }, adminSession);
    expect(where).toMatchObject({ a: 1, b: 2, deletedAt: null });
  });
});

describe("Auth guards (middleware/auth-guards)", () => {
  beforeEach(() => {
    auth.mockReset();
  });

  it("requireAuth returns the session when authenticated", async () => {
    setAuth(studentSession);
    await expect(requireAuth()).resolves.toEqual(studentSession);
  });

  it("requireAuth redirects when there is no session", async () => {
    setAuth(null);
    await expect(requireAuth()).rejects.toThrow();
  });

  it("requireRole throws ForbiddenError for a non-matching role", async () => {
    setAuth(studentSession);
    await expect(requireRole(ROLE.ADMIN)).rejects.toThrow();
  });

  it("requireRole resolves for a matching role", async () => {
    setAuth(adminSession);
    await expect(requireRole(ROLE.ADMIN)).resolves.toEqual(adminSession);
  });

  it("unauthorizedResponse returns 401 with UNAUTHORIZED code", () => {
    const res = unauthorizedResponse() as unknown as { status: number; json: () => Promise<{ error: { code: string } }> };
    expect(res.status).toBe(401);
    return res.json().then((j) => expect(j.error.code).toBe("UNAUTHORIZED"));
  });

  it("forbiddenResponse returns 403 with FORBIDDEN code", () => {
    const res = forbiddenResponse() as unknown as { status: number; json: () => Promise<{ error: { code: string } }> };
    expect(res.status).toBe(403);
    return res.json().then((j) => expect(j.error.code).toBe("FORBIDDEN"));
  });

  it("withAuth calls the handler with the session when authenticated", async () => {
    setAuth(studentSession);
    const handler = vi.fn(async () => "ok");
    const res = await withAuth(handler as any)({} as any, { params: Promise.resolve({}) });
    expect(handler).toHaveBeenCalled();
    expect(res).toBe("ok");
  });

  it("withAuth returns 401 when unauthenticated", async () => {
    setAuth(null);
    const handler = vi.fn();
    const res = (await withAuth(handler as any)({} as any, { params: Promise.resolve({}) })) as any;
    expect(handler).not.toHaveBeenCalled();
    expect(res.status).toBe(401);
  });

  it("withAdminAuth returns 403 for non-admin", async () => {
    setAuth(studentSession);
    const handler = vi.fn();
    const res = (await withAdminAuth(handler as any)({} as any, { params: Promise.resolve({}) })) as any;
    expect(res.status).toBe(403);
  });

  it("withAdminAuth invokes handler for admin", async () => {
    setAuth(adminSession);
    const handler = vi.fn(async () => "admin-ok");
    const res = await withAdminAuth(handler as any)({} as any, { params: Promise.resolve({}) });
    expect(res).toBe("admin-ok");
  });
});
