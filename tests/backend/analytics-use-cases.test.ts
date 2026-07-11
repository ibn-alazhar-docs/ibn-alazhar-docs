import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/core/authorization", () => ({
  ownedWhere: vi.fn((base: Record<string, unknown>, session: { user: { id: string } }) => ({
    ...base,
    userId: session.user.id,
  })),
}));

vi.mock("@/domain/auth", () => ({
  isAdminRole: vi.fn((role: string) => role === "ADMIN"),
}));

import { AnalyticsUseCases } from "@/core/services/analytics.use-cases";
import type { AuthSession } from "@/domain/types";

function makeSession(role: string): AuthSession {
  return {
    user: { id: "user-1", role, name: "Test", email: "t@t.com" },
  } as unknown as AuthSession;
}

function makePrisma() {
  const auditLog = {
    groupBy: vi.fn(async () => []),
    findMany: vi.fn(async () => []),
  };
  const document = {
    count: vi.fn(async () => 0),
    aggregate: vi.fn(async () => ({ _sum: { fileSize: 0 }, _avg: { fileSize: 0 } })),
    groupBy: vi.fn(async () => []),
    findMany: vi.fn(async () => []),
  };
  const prisma = {
    document,
    auditLog,
    conversionJob: { findMany: vi.fn(async () => []) },
    exportJob: { findMany: vi.fn(async () => []) },
    tag: {
      count: vi.fn(async () => 0),
      findMany: vi.fn(async () => []),
    },
    user: { findMany: vi.fn(async () => []) },
  };
  return {
    prisma: prisma as unknown as Parameters<typeof AnalyticsUseCases.prototype.constructor>[0],
    auditLog,
    document,
  };
}

describe("AnalyticsUseCases.getAnalytics scoping", () => {
  it("scopes recent activity to the requesting user for non-admins", async () => {
    const { prisma, auditLog } = makePrisma();
    const useCases = new AnalyticsUseCases(prisma);
    await useCases.getAnalytics(makeSession("STUDENT"), 30);

    expect(auditLog.groupBy).toHaveBeenCalledTimes(1);
    const where = auditLog.groupBy.mock.calls[0]![0].where as Record<string, unknown>;
    expect(where.userId).toBe("user-1");
  });

  it("does not scope recent activity for admins", async () => {
    const { prisma, auditLog } = makePrisma();
    const useCases = new AnalyticsUseCases(prisma);
    await useCases.getAnalytics(makeSession("ADMIN"), 30);

    const where = auditLog.groupBy.mock.calls[0]![0].where as Record<string, unknown>;
    expect(where.userId).toBeUndefined();
  });
});
