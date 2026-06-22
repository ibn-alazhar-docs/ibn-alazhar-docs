import "dotenv/config";
import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";

const prisma = new PrismaClient();

function uid(): string {
  return `mem_${Date.now()}_${randomBytes(4).toString("hex")}`;
}

describe("Memory Patterns Load Test", () => {
  const userIds: string[] = [];
  const docIds: string[] = [];

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

  describe("Heap growth during bulk inserts", () => {
    it("insert 100 documents and measure memory", async () => {
      const userId = uid();
      await prisma.user.create({
        data: { id: userId, email: `${userId}@mem.ibn`, name: "Mem User", passwordHash: "hash" },
      });
      userIds.push(userId);

      const memBefore = process.memoryUsage();
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        const docId = uid();
        docIds.push(docId);
        await prisma.document.create({
          data: {
            id: docId,
            userId,
            title: `Memory Test Doc ${i}`,
            fileName: `mem-${docId}.pdf`,
            originalName: `mem-${docId}.pdf`,
            mimeType: "application/pdf",
            fileSize: 1024,
            storageKey: `mem/${userId}/${docId}.pdf`,
            status: "COMPLETED",
          },
        });
      }

      const elapsed = performance.now() - start;
      const memAfter = process.memoryUsage();
      const heapGrowthMB = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;

      console.log(`  100 inserts: ${elapsed.toFixed(0)}ms`);
      console.log(`  Heap growth: ${heapGrowthMB.toFixed(1)}MB`);
      console.log(
        `  Heap used: ${(memAfter.heapUsed / 1024 / 1024).toFixed(1)}MB / ${(memAfter.heapTotal / 1024 / 1024).toFixed(1)}MB`,
      );

      expect(heapGrowthMB).toBeLessThan(50);
    });
  });

  describe("Heap growth during bulk reads", () => {
    it("read 500 documents and measure memory", async () => {
      const userId = userIds[0]!;

      const memBefore = process.memoryUsage();
      const start = performance.now();

      const docs = await prisma.document.findMany({
        where: { userId, deletedAt: null },
      });

      const elapsed = performance.now() - start;
      const memAfter = process.memoryUsage();
      const heapGrowthMB = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;

      console.log(`  Read ${docs.length} docs: ${elapsed.toFixed(0)}ms`);
      console.log(`  Heap growth: ${heapGrowthMB.toFixed(1)}MB`);

      expect(heapGrowthMB).toBeLessThan(20);
    });
  });

  describe("Concurrent read memory pressure", () => {
    it("50 concurrent reads — memory stays bounded", async () => {
      const userId = userIds[0]!;
      const memBefore = process.memoryUsage();

      await Promise.all(
        Array.from({ length: 50 }, () =>
          prisma.document.findMany({
            where: { userId, deletedAt: null },
            take: 10,
          }),
        ),
      );

      const memAfter = process.memoryUsage();
      const heapGrowthMB = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;

      console.log(`  50 concurrent reads: heap growth ${heapGrowthMB.toFixed(1)}MB`);

      expect(heapGrowthMB).toBeLessThan(30);
    });
  });

  describe("Connection pool behavior", () => {
    it("100 rapid sequential queries don't exhaust connections", async () => {
      const userId = userIds[0]!;
      const start = performance.now();
      let errors = 0;

      for (let i = 0; i < 100; i++) {
        try {
          await prisma.document.count({ where: { userId, deletedAt: null } });
        } catch {
          errors++;
        }
      }

      const elapsed = performance.now() - start;
      console.log(`  100 sequential counts: ${elapsed.toFixed(0)}ms, errors=${errors}`);

      expect(errors).toBe(0);
    });

    it("50 concurrent queries don't exhaust connections", async () => {
      const userId = userIds[0]!;
      const start = performance.now();

      const results = await Promise.all(
        Array.from({ length: 50 }, () =>
          prisma.document.count({ where: { userId, deletedAt: null } }).catch(() => -1),
        ),
      );

      const elapsed = performance.now() - start;
      const errors = results.filter((r) => r === -1).length;

      console.log(`  50 concurrent counts: ${elapsed.toFixed(0)}ms, errors=${errors}`);

      expect(errors).toBe(0);
    });
  });
});
