import { mockPrisma, resetStore } from "./mock-prisma";

// Re-export the mock prisma as the singleton (same API as @ibn-al-azhar-docs/database)
export const prisma = mockPrisma;

// Mock PrismaClient constructor (used in integration helpers)
export class PrismaClient {
  constructor() {
    return mockPrisma;
  }
}

// Reset store between test files
beforeAll(() => resetStore());

export type { Prisma } from "@prisma/client";
