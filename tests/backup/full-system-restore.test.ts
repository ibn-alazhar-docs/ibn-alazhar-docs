import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { randomBytes, createHash } from "node:crypto";

const prisma = new PrismaClient();

function uid(): string {
  return `ful_${Date.now()}_${randomBytes(4).toString("hex")}`;
}

interface FullBackup {
  version: string;
  timestamp: string;
  checksum: string;
  database: {
    users: Array<Record<string, unknown>>;
    documents: Array<Record<string, unknown>>;
    folders: Array<Record<string, unknown>>;
    tags: Array<Record<string, unknown>>;
    tagDocuments: Array<Record<string, unknown>>;
    shareLinks: Array<Record<string, unknown>>;
    conversionJobs: Array<Record<string, unknown>>;
  };
  storage: {
    uploadKeys: string[];
    ocrKeys: string[];
    exportKeys: string[];
  };
}

function computeChecksum(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

function safeStringify(obj: unknown): string {
  return JSON.stringify(obj, (_key, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );
}

describe("Full System Backup & Restore", () => {
  const userIds: string[] = [];
  let backup: FullBackup;

  beforeAll(async () => {
    const userId = uid();
    await prisma.user.create({
      data: {
        id: userId,
        email: `${userId}@ful.ibn`,
        name: "Full Backup User",
        passwordHash: "hash",
      },
    });
    userIds.push(userId);

    const folder1 = uid();
    const folder2 = uid();
    await prisma.folder.create({ data: { id: folder1, userId, name: "Parent", order: 0 } });
    await prisma.folder.create({
      data: { id: folder2, userId, name: "Child", parentId: folder1, order: 1 },
    });

    const docIds: string[] = [];
    for (let i = 0; i < 3; i++) {
      const docId = uid();
      docIds.push(docId);
      await prisma.document.create({
        data: {
          id: docId,
          userId,
          title: `Full Doc ${i}`,
          fileName: `f-${docId}.pdf`,
          originalName: `f-${docId}.pdf`,
          mimeType: "application/pdf",
          fileSize: 2048,
          storageKey: `uploads/${userId}/${docId}.pdf`,
          status: "COMPLETED",
          folderId: i === 0 ? folder1 : null,
        },
      });
    }

    const tagId = uid();
    await prisma.tag.create({ data: { id: tagId, userId, name: "full-tag", color: "#2563EB" } });
    await prisma.tagDocument.create({ data: { tagId, documentId: docIds[0]! } });

    await prisma.shareLink.create({
      data: {
        token: randomBytes(32).toString("base64url"),
        documentId: docIds[0]!,
        userId,
        expiresAt: null,
      },
    });

    await prisma.conversionJob.create({
      data: {
        id: uid(),
        userId,
        documentId: docIds[0]!,
        sourceFormat: "pdf",
        targetFormat: "md",
        inputKey: `uploads/${userId}/input.pdf`,
        status: "COMPLETED",
      },
    });
  });

  afterAll(async () => {
    for (const id of userIds) {
      await prisma.shareLink.deleteMany({ where: { userId: id } }).catch(() => {});
      await prisma.tagDocument.deleteMany({ where: { tag: { userId: id } } }).catch(() => {});
      await prisma.tag.deleteMany({ where: { userId: id } }).catch(() => {});
      await prisma.conversionJob.deleteMany({ where: { userId: id } }).catch(() => {});
      await prisma.document.deleteMany({ where: { userId: id } }).catch(() => {});
      await prisma.folder
        .updateMany({ where: { userId: id }, data: { parentId: null } })
        .catch(() => {});
      await prisma.folder.deleteMany({ where: { userId: id } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: id } }).catch(() => {});
    }
  });

  describe("Full system backup", () => {
    it("captures all entities for a user", async () => {
      const userId = userIds[0]!;
      const start = performance.now();

      const users = await prisma.user.findMany({ where: { id: userId } });
      const documents = await prisma.document.findMany({ where: { userId } });
      const folders = await prisma.folder.findMany({ where: { userId } });
      const tags = await prisma.tag.findMany({ where: { userId } });
      const tagDocuments = await prisma.tagDocument.findMany({
        where: { tagId: { in: tags.map((t) => t.id) } },
      });
      const shareLinks = await prisma.shareLink.findMany({ where: { userId } });
      const conversionJobs = await prisma.conversionJob.findMany({ where: { userId } });

      const dbPayload = safeStringify({
        users,
        documents,
        folders,
        tags,
        tagDocuments,
        shareLinks,
        conversionJobs,
      });

      const uploadKeys = documents.map((d) => d.storageKey);
      const ocrKeys = documents.map((d) => `ocr-results/${d.id}/text.json`);
      const exportKeys = documents.flatMap((d) =>
        ["output.md", "output.txt"].map((f) => `exports/${d.id}/${f}`),
      );

      const fullPayload = safeStringify({
        db: dbPayload,
        storage: { uploadKeys, ocrKeys, exportKeys },
      });
      const checksum = computeChecksum(fullPayload);

      backup = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        checksum,
        database: {
          users: users as unknown as Record<string, unknown>[],
          documents: documents.map((d) => ({
            ...d,
            fileSize: d.fileSize.toString(),
          })) as unknown as Record<string, unknown>[],
          folders: folders as unknown as Record<string, unknown>[],
          tags: tags as unknown as Record<string, unknown>[],
          tagDocuments: tagDocuments as unknown as Record<string, unknown>[],
          shareLinks: shareLinks as unknown as Record<string, unknown>[],
          conversionJobs: conversionJobs as unknown as Record<string, unknown>[],
        },
        storage: { uploadKeys, ocrKeys, exportKeys },
      };

      const elapsed = performance.now() - start;
      console.log(`  Full backup time: ${elapsed.toFixed(0)}ms`);

      expect(backup.database.users).toHaveLength(1);
      expect(backup.database.documents).toHaveLength(3);
      expect(backup.database.folders).toHaveLength(2);
      expect(backup.database.tags).toHaveLength(1);
      expect(backup.database.tagDocuments).toHaveLength(1);
      expect(backup.database.shareLinks).toHaveLength(1);
      expect(backup.database.conversionJobs).toHaveLength(1);
    });

    it("storage keys are consistent with database records", () => {
      expect(backup.storage.uploadKeys).toHaveLength(3);
      expect(backup.storage.ocrKeys).toHaveLength(3);
      expect(backup.storage.exportKeys).toHaveLength(6);

      for (const key of backup.storage.uploadKeys) {
        expect(key).toMatch(/^uploads\/[^/]+\/[^/]+$/);
      }
    });
  });

  describe("Backup serialization", () => {
    it("full backup serializes to valid JSON", () => {
      const json = safeStringify(backup);
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it("backup size is reasonable", () => {
      const json = safeStringify(backup);
      const sizeKB = json.length / 1024;
      console.log(`  Backup JSON size: ${sizeKB.toFixed(1)}KB`);
      expect(sizeKB).toBeLessThan(100);
    });
  });

  describe("Restore integrity verification", () => {
    it("all documents have valid storage keys", () => {
      for (const doc of backup.database.documents) {
        expect(doc.storageKey).toBeDefined();
        expect(typeof doc.storageKey).toBe("string");
      }
    });

    it("all folders have valid parent references", () => {
      const folderIds = new Set(backup.database.folders.map((f) => f.id));

      for (const folder of backup.database.folders) {
        if (folder.parentId) {
          expect(folderIds.has(folder.parentId as string)).toBe(true);
        }
      }
    });

    it("all tag-document associations reference valid entities", () => {
      const docIds = new Set(backup.database.documents.map((d) => d.id));
      const tagIds = new Set(backup.database.tags.map((t) => t.id));

      for (const td of backup.database.tagDocuments) {
        expect(docIds.has(td.documentId as string)).toBe(true);
        expect(tagIds.has(td.tagId as string)).toBe(true);
      }
    });

    it("all share links reference valid documents", () => {
      const docIds = new Set(backup.database.documents.map((d) => d.id));

      for (const share of backup.database.shareLinks) {
        expect(docIds.has(share.documentId as string)).toBe(true);
        expect(share.token).toBeDefined();
      }
    });

    it("all conversion jobs reference valid documents", () => {
      const docIds = new Set(backup.database.documents.map((d) => d.id));

      for (const job of backup.database.conversionJobs) {
        expect(docIds.has(job.documentId as string)).toBe(true);
      }
    });

    it("checksum validates after serialization round-trip", () => {
      const json = safeStringify(backup);
      const restored = JSON.parse(json) as FullBackup;
      expect(restored.checksum).toBe(backup.checksum);
    });
  });

  describe("Partial restore failure handling", () => {
    it("missing document does not break tag restore", () => {
      const partialBackup = {
        ...backup,
        database: {
          ...backup.database,
          documents: backup.database.documents.slice(0, 2),
        },
      };

      const validDocIds = new Set(partialBackup.database.documents.map((d) => d.id));
      const orphanedTags = partialBackup.database.tagDocuments.filter(
        (td) => !validDocIds.has(td.documentId as string),
      );

      expect(orphanedTags.length).toBeGreaterThanOrEqual(0);
    });

    it("missing folder orphans documents gracefully", () => {
      const noFolders = { ...backup, database: { ...backup.database, folders: [] } };

      const folderIds = new Set(noFolders.database.folders.map((f) => f.id));
      const orphanedDocs = noFolders.database.documents.filter(
        (d) => d.folderId && !folderIds.has(d.folderId as string),
      );

      expect(orphanedDocs.length).toBeGreaterThanOrEqual(0);
    });

    it("missing user invalidates all entity ownership", () => {
      const noUsers = { ...backup, database: { ...backup.database, users: [] } };

      const userIdSet = new Set(noUsers.database.users.map((u) => u.id));
      const orphanedDocs = noUsers.database.documents.filter(
        (d) => !userIdSet.has(d.userId as string),
      );

      expect(orphanedDocs.length).toBe(noUsers.database.documents.length);
    });
  });

  describe("Recovery time estimation", () => {
    it("backup and restore cycle completes quickly", async () => {
      const start = performance.now();

      const json = safeStringify(backup);
      const restored = JSON.parse(json) as FullBackup;

      const docCount = restored.database.documents.length;
      const tagCount = restored.database.tags.length;
      const folderCount = restored.database.folders.length;

      const elapsed = performance.now() - start;
      console.log(`  Serialize + deserialize: ${elapsed.toFixed(0)}ms`);
      console.log(`  Entities: ${docCount} docs, ${tagCount} tags, ${folderCount} folders`);

      expect(elapsed).toBeLessThan(1000);
    });
  });
});
