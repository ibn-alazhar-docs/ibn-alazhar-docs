import { vi, beforeEach } from "vitest";
import dotenv from "dotenv";

dotenv.config();

const { mockSession } = vi.hoisted(() => ({
  mockSession: {
    user: {
      id: "test-user-id",
      name: "Test User",
      email: "test@example.com",
      role: "USER",
    },
  },
}));

export { mockSession };

vi.mock("@/middleware/auth-guards", () => {
  return {
    requireAuth: vi.fn().mockImplementation(async () => {
      if (!mockSession.user) {
        throw new Error("Unauthorized");
      }
      return mockSession;
    }),
    requireRole: vi.fn().mockImplementation(async (role) => {
      if (!mockSession.user) throw new Error("Unauthorized");
      if (mockSession.user.role !== role) {
        throw new Error("FORBIDDEN");
      }
      return mockSession;
    }),
    unauthorizedResponse: vi.fn().mockImplementation(() => {
      return new Response(
        JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }),
    forbiddenResponse: vi.fn().mockImplementation(() => {
      return new Response(JSON.stringify({ error: { code: "FORBIDDEN", message: "Forbidden" } }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }),
    isAdmin: vi.fn().mockImplementation((session) => {
      return session?.user?.role === "ADMIN";
    }),
    ownedWhere: vi.fn().mockImplementation((baseWhere, session, userIdField = "userId") => {
      if (session?.user?.role === "ADMIN") return baseWhere;
      return { ...baseWhere, [userIdField]: session.user.id };
    }),
    withAuth: vi.fn().mockImplementation((handler) => {
      return async (request: any, context: any) => {
        if (!mockSession.user) {
          return new Response(
            JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }),
            { status: 401, headers: { "Content-Type": "application/json" } },
          );
        }
        const params = context?.params ? await context.params : {};
        return handler(request, { session: mockSession, params });
      };
    }),
    withAdminAuth: vi.fn().mockImplementation((handler) => {
      return async (request: any, context: any) => {
        if (!mockSession.user) {
          return new Response(
            JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }),
            { status: 401, headers: { "Content-Type": "application/json" } },
          );
        }
        if (mockSession.user.role !== "ADMIN") {
          return new Response(
            JSON.stringify({ error: { code: "FORBIDDEN", message: "Forbidden" } }),
            { status: 403, headers: { "Content-Type": "application/json" } },
          );
        }
        const params = context?.params ? await context.params : {};
        return handler(request, { session: mockSession, params });
      };
    }),
  };
});

// Reset session before each test
beforeEach(() => {
  mockSession.user = {
    id: "test-user-id",
    name: "Test User",
    email: "test@example.com",
    role: "USER",
  } as any;
});
