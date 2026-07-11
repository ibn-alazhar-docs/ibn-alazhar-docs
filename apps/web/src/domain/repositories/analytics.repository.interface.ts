import type { PrismaClient } from "@prisma/client";

/**
 * Read-only data source contract for analytics aggregation.
 * Keeps `core/services` free of a direct `@prisma/client` dependency so the
 * analytics use-case can be swapped or mocked without touching Prisma.
 */
export interface IAnalyticsDataSource {
  document: {
    count: PrismaClient["document"]["count"];
    aggregate: PrismaClient["document"]["aggregate"];
    groupBy: PrismaClient["document"]["groupBy"];
    findMany: PrismaClient["document"]["findMany"];
  };
  auditLog: {
    groupBy: PrismaClient["auditLog"]["groupBy"];
    findMany: PrismaClient["auditLog"]["findMany"];
  };
  tag: {
    count: PrismaClient["tag"]["count"];
    findMany: PrismaClient["tag"]["findMany"];
  };
  user: { findMany: PrismaClient["user"]["findMany"] };
}
