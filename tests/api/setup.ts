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

const mockPrisma = {
  $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
  $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn().mockResolvedValue(0),
  },
  document: {
    findUnique: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn().mockResolvedValue(0),
    aggregate: vi.fn().mockResolvedValue({ _sum: { fileSize: 0 }, _avg: { fileSize: 0 } }),
    groupBy: vi.fn().mockResolvedValue([]),
  },
  folder: {
    findUnique: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn().mockResolvedValue(0),
  },
  tag: {
    findUnique: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn().mockResolvedValue(0),
  },
  conversionJob: {
    findUnique: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn().mockResolvedValue(0),
  },
  shareLink: {
    findUnique: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn().mockResolvedValue(0),
  },
  webhook: {
    findUnique: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn().mockResolvedValue(0),
  },
  account: {
    findUnique: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn().mockResolvedValue(0),
  },
  session: {
    findUnique: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn().mockResolvedValue(0),
  },
  auditLog: {
    groupBy: vi.fn().mockResolvedValue([]),
  },
};

export { mockSession, mockPrisma };

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

vi.mock("@ibn-al-azhar-docs/database", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/transport/db", () => ({
  prisma: mockPrisma,
}));

// Reset session before each test
beforeEach(() => {
  mockSession.user = {
    id: "test-user-id",
    name: "Test User",
    email: "test@example.com",
    role: "USER",
  } as any;
  vi.clearAllMocks();
  mockPrisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
});
