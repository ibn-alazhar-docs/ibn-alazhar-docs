import { PrismaClient } from "@prisma/client";

// WHY: In development, Next.js hot-reloads modules which creates new PrismaClient
// instances, exhausting the connection pool. Storing on globalThis survives reloads.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
