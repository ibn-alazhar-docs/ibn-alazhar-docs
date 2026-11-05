import { vi, beforeEach } from "vitest";
import dotenv from "dotenv";
import { handleRouteError } from "@/shared/route-helpers";

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
    // Route handlers (e.g. /api/upload) verify the session user exists via
    // findUnique; a bare vi.fn() returned undefined, so authenticated requests
    // were rejected with 401 ("user not found"). Default to a valid user.
    findUnique: vi.fn().mockResolvedValue({
      id: "test-user-id",
      name: "Test User",
      email: "test@example.com",
      role: "USER",
      deletedAt: null,
    }),
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

// Route handlers import the Prisma client from @/transport/db (not
// @prisma/client). Without mocking it, they hit the real DB and the
// "user exists" check 401s for mock users that don't exist in the DB.
vi.mock("@/transport/db", async () => {
  const { prisma: realPrisma } = await import("@ibn-al-azhar-docs/database");
  // Proxy the REAL client so repositories get the full delegate surface
  // (findFirst, aggregate, upsert, $transaction, ...). Only user.findUnique
  // falls back to a synthetic user for fake session ids (upload/contract
  // tests use users that don't exist in the DB).
  const wrappedUser = new Proxy(realPrisma.user, {
    get(target, prop) {
      if (prop === "findUnique") {
        return async (args: any) => {
          const found = await (target.findUnique as any)(args);
          if (found) return found;
          // Only id-based existence checks (upload/contract session users)
          // get the synthetic fallback. Email lookups must return null for
          // unknown emails, otherwise registration always sees a conflict.
          if (args?.where?.id) {
            return { id: args.where.id, name: "Test User", email: "test@example.com", role: "USER", deletedAt: null };
          }
          return null;
        };
      }
      const v = Reflect.get(target, prop, target);
      return typeof v === "function" ? v.bind(target) : v;
    },
  });
  const wrapped = new Proxy(realPrisma, {
    get(target, prop) {
      if (prop === "user") return wrappedUser;
      const v = Reflect.get(target, prop, target);
      return typeof v === "function" ? v.bind(target) : v;
    },
  });
  return { prisma: wrapped };
});

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
        try {
          return await handler(request, { session: mockSession, params });
        } catch (error) {
          return handleRouteError(error, "test", "Test request failed");
        }
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
        try {
          return await handler(request, { session: mockSession, params });
        } catch (error) {
          return handleRouteError(error, "test", "Test request failed");
        }
      };
    }),
  };
});

// NOTE: The DB is exercised against a real Postgres instance (see P2.5 of the
// audit). We intentionally do NOT mock `@ibn-al-azhar-docs/database` /
// `@/transport/db` here — the repository code expects a full `PrismaClient`
// (delegates such as folder.findFirst / aggregate), and the api suites seed
// real data via `tests/integration/helpers/db`. Mocking it with the internal
// `mockPrisma` (a partial delegate stub) caused `findFirst is not a function`
// 500s and broke the real-data assertions.

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
