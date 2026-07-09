import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";

const prisma = new PrismaClient();

function uid(): string {
  return `load_${Date.now()}_${randomBytes(4).toString("hex")}`;
}

interface LatencyResult {
  latency: number;
  success: boolean;
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)]!;
}

async function measureAsync<T>(fn: () => Promise<T>): Promise<LatencyResult> {
  const start = performance.now();
  try {
    await fn();
    return { latency: performance.now() - start, success: true };
  } catch {
    return { latency: performance.now() - start, success: false };
  }
}

async function runConcurrent(
  concurrency: number,
  fn: () => Promise<unknown>,
): Promise<LatencyResult[]> {
  const promises = Array.from({ length: concurrency }, () => measureAsync(fn));
  return Promise.all(promises);
}

describe("Database Concurrency Load Test", () => {
  const userIds: string[] = [];
  const docIds: string[] = [];

  beforeAll(async () => {
    for (let i = 0; i < 5; i++) {
      const id = uid();
      const user = await prisma.user.create({
        data: {
          id,
          email: `${id}@load.ibn`,
          name: `Load User ${i}`,
          passwordHash: "hash",
        },
      });
      userIds.push(user.id);

      for (let j = 0; j < 10; j++) {
        const docId = uid();
        await prisma.document.create({
          data: {
            id: docId,
            userId: user.id,
            title: `Load Doc ${j} for User ${i}`,
            fileName: `load-${docId}.pdf`,
            originalName: `load-${docId}.pdf`,
            mimeType: "application/pdf",
            fileSize: 1024,
            storageKey: `load/${user.id}/${docId}.pdf`,
            status: "COMPLETED",
          },
        });
        docIds.push(docId);
      }
    }
  });

  afterAll(async () => {
    for (const docId of docIds) {
      await prisma.document.delete({ where: { id: docId } }).catch(() => {});
    }
    await prisma.folder
      .updateMany({ where: { userId: { in: userIds } }, data: { parentId: null } })
      .catch(() => {});
    await prisma.folder.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {});
  });

  describe("Concurrent reads (10 users)", () => {
    it("10 concurrent document reads", async () => {
      const results = await runConcurrent(10, async () => {
        const userId = userIds[Math.floor(Math.random() * userIds.length)]!;
        return prisma.document.findMany({
          where: { userId, deletedAt: null },
          take: 10,
        });
      });

      const latencies = results.filter((r) => r.success).map((r) => r.latency);
      const p50 = percentile(latencies, 50);
      const p95 = percentile(latencies, 95);
      const p99 = percentile(latencies, 99);
      const errors = results.filter((r) => !r.success).length;

      console.log(
        `  10 reads: p50=${p50.toFixed(1)}ms p95=${p95.toFixed(1)}ms p99=${p99.toFixed(1)}ms errors=${errors}`,
      );

      expect(p95).toBeLessThan(2000);
      expect(errors).toBe(0);
    });
  });

  describe("Concurrent reads (50 users)", () => {
    it("50 concurrent document reads", async () => {
      const results = await runConcurrent(50, async () => {
        const userId = userIds[Math.floor(Math.random() * userIds.length)]!;
        return prisma.document.findMany({
          where: { userId, deletedAt: null },
          take: 10,
        });
      });

      const latencies = results.filter((r) => r.success).map((r) => r.latency);
      const p50 = percentile(latencies, 50);
      const p95 = percentile(latencies, 95);
      const p99 = percentile(latencies, 99);
      const errors = results.filter((r) => !r.success).length;

      console.log(
        `  50 reads: p50=${p50.toFixed(1)}ms p95=${p95.toFixed(1)}ms p99=${p99.toFixed(1)}ms errors=${errors}`,
      );

      expect(p95).toBeLessThan(500);
      expect(errors).toBe(0);
    });
  });

  describe("Concurrent reads (100 users)", () => {
    it("100 concurrent document reads", async () => {
      const results = await runConcurrent(100, async () => {
        const userId = userIds[Math.floor(Math.random() * userIds.length)]!;
        return prisma.document.findMany({
          where: { userId, deletedAt: null },
          take: 10,
        });
      });

      const latencies = results.filter((r) => r.success).map((r) => r.latency);
      const p50 = percentile(latencies, 50);
      const p95 = percentile(latencies, 95);
      const p99 = percentile(latencies, 99);
      const errors = results.filter((r) => !r.success).length;

      console.log(
        `  100 reads: p50=${p50.toFixed(1)}ms p95=${p95.toFixed(1)}ms p99=${p99.toFixed(1)}ms errors=${errors}`,
      );

      expect(errors).toBe(0);
    });
  });

  describe("Concurrent writes (10 users)", () => {
    it("10 concurrent document creates", async () => {
      const userId = userIds[0]!;
      const createdIds: string[] = [];

      const results = await runConcurrent(10, async () => {
        const id = uid();
        createdIds.push(id);
        return prisma.document.create({
          data: {
            id,
            userId,
            title: `Write Load ${id}`,
            fileName: `write-${id}.pdf`,
            originalName: `write-${id}.pdf`,
            mimeType: "application/pdf",
            fileSize: 1024,
            storageKey: `load/${userId}/${id}.pdf`,
            status: "UPLOADED",
          },
        });
      });

      const latencies = results.filter((r) => r.success).map((r) => r.latency);
      const p50 = percentile(latencies, 50);
      const p95 = percentile(latencies, 95);
      const errors = results.filter((r) => !r.success).length;

      console.log(`  10 writes: p50=${p50.toFixed(1)}ms p95=${p95.toFixed(1)}ms errors=${errors}`);

      expect(p95).toBeLessThan(300);
      expect(errors).toBe(0);

      for (const id of createdIds) {
        await prisma.document.delete({ where: { id } }).catch(() => {});
      }
    });
  });

  describe("Concurrent writes (50 users)", () => {
    it("50 concurrent document creates", async () => {
      const userId = userIds[0]!;
      const createdIds: string[] = [];

      const results = await runConcurrent(50, async () => {
        const id = uid();
        createdIds.push(id);
        return prisma.document.create({
          data: {
            id,
            userId,
            title: `Bulk Write ${id}`,
            fileName: `bulk-${id}.pdf`,
            originalName: `bulk-${id}.pdf`,
            mimeType: "application/pdf",
            fileSize: 1024,
            storageKey: `load/${userId}/${id}.pdf`,
            status: "UPLOADED",
          },
        });
      });

      const latencies = results.filter((r) => r.success).map((r) => r.latency);
      const p50 = percentile(latencies, 50);
      const p95 = percentile(latencies, 95);
      const p99 = percentile(latencies, 99);
      const errors = results.filter((r) => !r.success).length;

      console.log(
        `  50 writes: p50=${p50.toFixed(1)}ms p95=${p95.toFixed(1)}ms p99=${p99.toFixed(1)}ms errors=${errors}`,
      );

      expect(errors).toBe(0);

      for (const id of createdIds) {
        await prisma.document.delete({ where: { id } }).catch(() => {});
      }
    });
  });

  describe("Concurrent count queries", () => {
    it("50 concurrent count operations", async () => {
      const results = await runConcurrent(50, async () => {
        const userId = userIds[Math.floor(Math.random() * userIds.length)]!;
        return prisma.document.count({
          where: { userId, deletedAt: null },
        });
      });

      const latencies = results.filter((r) => r.success).map((r) => r.latency);
      const p50 = percentile(latencies, 50);
      const p95 = percentile(latencies, 95);
      const errors = results.filter((r) => !r.success).length;

      console.log(`  50 counts: p50=${p50.toFixed(1)}ms p95=${p95.toFixed(1)}ms errors=${errors}`);

      expect(p95).toBeLessThan(2000);
      expect(errors).toBe(0);
    });
  });

  describe("Mixed read/write load", () => {
    it("50 concurrent mixed operations", async () => {
      const userId = userIds[0]!;
      const createdIds: string[] = [];

      const results = await Promise.all(
        Array.from({ length: 50 }, (_, i) =>
          measureAsync(async () => {
            if (i % 3 === 0) {
              const id = uid();
              createdIds.push(id);
              return prisma.document.create({
                data: {
                  id,
                  userId,
                  title: `Mixed ${id}`,
                  fileName: `mixed-${id}.pdf`,
                  originalName: `mixed-${id}.pdf`,
                  mimeType: "application/pdf",
                  fileSize: 1024,
                  storageKey: `load/${userId}/${id}.pdf`,
                  status: "UPLOADED",
                },
              });
            } else {
              return prisma.document.findMany({
                where: { userId, deletedAt: null },
                take: 5,
              });
            }
          }),
        ),
      );

      const latencies = results.filter((r) => r.success).map((r) => r.latency);
      const p50 = percentile(latencies, 50);
      const p95 = percentile(latencies, 95);
      const errors = results.filter((r) => !r.success).length;

      console.log(`  50 mixed: p50=${p50.toFixed(1)}ms p95=${p95.toFixed(1)}ms errors=${errors}`);

      expect(errors).toBe(0);

      for (const id of createdIds) {
        await prisma.document.delete({ where: { id } }).catch(() => {});
      }
    });
  });
});
