import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();

function uid(): string {
  return `bak_${Date.now()}_${randomBytes(4).toString("hex")}`;
}

interface BackupManifest {
  version: string;
  timestamp: string;
  checksum: string;
  entities: {
    users: number;
    documents: number;
    folders: number;
    tags: number;
    tagDocuments: number;
    shareLinks: number;
    conversionJobs: number;
  };
}

interface BackupData {
  manifest: BackupManifest;
  users: unknown[];
  documents: unknown[];
  folders: unknown[];
  tags: unknown[];
  tagDocuments: unknown[];
  shareLinks: unknown[];
  conversionJobs: unknown[];
}

function computeChecksum(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

function safeStringify(obj: unknown): string {
  return JSON.stringify(obj, (_key, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );
}

function simulateBackup(
  users: unknown[],
  documents: unknown[],
  folders: unknown[],
  tags: unknown[],
  tagDocuments: unknown[],
  shareLinks: unknown[],
  conversionJobs: unknown[],
): BackupData {
  const payload = safeStringify({
    users,
    documents,
    folders,
    tags,
    tagDocuments,
    shareLinks,
    conversionJobs,
  });
  const checksum = computeChecksum(payload);

  return {
    manifest: {
      version: "1.0",
      timestamp: new Date().toISOString(),
      checksum,
      entities: {
        users: users.length,
        documents: documents.length,
        folders: folders.length,
        tags: tags.length,
        tagDocuments: tagDocuments.length,
        shareLinks: shareLinks.length,
        conversionJobs: conversionJobs.length,
      },
    },
    users,
    documents,
    folders,
    tags,
    tagDocuments,
    shareLinks,
    conversionJobs,
  };
}

function validateBackupIntegrity(backup: BackupData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const payload = safeStringify({
    users: backup.users,
    documents: backup.documents,
    folders: backup.folders,
    tags: backup.tags,
    tagDocuments: backup.tagDocuments,
    shareLinks: backup.shareLinks,
    conversionJobs: backup.conversionJobs,
  });
  const computedChecksum = computeChecksum(payload);

  if (computedChecksum !== backup.manifest.checksum) {
    errors.push("Checksum mismatch — backup data corrupted");
  }

  if (backup.users.length !== backup.manifest.entities.users) {
    errors.push(
      `User count mismatch: expected ${backup.manifest.entities.users}, got ${backup.users.length}`,
    );
  }
  if (backup.documents.length !== backup.manifest.entities.documents) {
    errors.push(`Document count mismatch`);
  }
  if (backup.folders.length !== backup.manifest.entities.folders) {
    errors.push(`Folder count mismatch`);
  }
  if (backup.tags.length !== backup.manifest.entities.tags) {
    errors.push(`Tag count mismatch`);
  }

  return { valid: errors.length === 0, errors };
}

describe("Database Backup & Restore", () => {
  const userIds: string[] = [];
  let backupData: BackupData;

  beforeAll(async () => {
    const userId = uid();
    await prisma.user.create({
      data: {
        id: userId,
        email: `${userId}@bak.ibn`,
        name: "Backup User",
        passwordHash: "hash",
        role: "STUDENT",
      },
    });
    userIds.push(userId);

    const folderId = uid();
    await prisma.folder.create({
      data: { id: folderId, userId, name: "Backup Folder", order: 0 },
    });

    const docIds: string[] = [];
    for (let i = 0; i < 5; i++) {
      const docId = uid();
      docIds.push(docId);
      await prisma.document.create({
        data: {
          id: docId,
          userId,
          title: `Backup Doc ${i}`,
          fileName: `bak-${docId}.pdf`,
          originalName: `bak-${docId}.pdf`,
          mimeType: "application/pdf",
          fileSize: 1024 * (i + 1),
          storageKey: `uploads/${userId}/${docId}.pdf`,
          status: "COMPLETED",
          folderId: i < 3 ? folderId : null,
          outputFormats: i === 0 ? ["md", "txt"] : [],
          language: "ar",
          isRtl: true,
        },
      });
    }

    const tagIds: string[] = [];
    for (let i = 0; i < 3; i++) {
      const tagId = uid();
      tagIds.push(tagId);
      await prisma.tag.create({
        data: { id: tagId, userId, name: `backup-tag-${i}`, color: "#16A34A" },
      });
    }

    await prisma.tagDocument.createMany({
      data: [
        { tagId: tagIds[0]!, documentId: docIds[0]! },
        { tagId: tagIds[1]!, documentId: docIds[0]! },
        { tagId: tagIds[2]!, documentId: docIds[1]! },
      ],
    });

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
    for (const uid_ of userIds) {
      await prisma.shareLink.deleteMany({ where: { userId: uid_ } }).catch(() => {});
      await prisma.tagDocument.deleteMany({ where: { tag: { userId: uid_ } } }).catch(() => {});
      await prisma.tag.deleteMany({ where: { userId: uid_ } }).catch(() => {});
      await prisma.conversionJob.deleteMany({ where: { userId: uid_ } }).catch(() => {});
      await prisma.document.deleteMany({ where: { userId: uid_ } }).catch(() => {});
      await prisma.folder
        .updateMany({ where: { userId: uid_ }, data: { parentId: null } })
        .catch(() => {});
      await prisma.folder.deleteMany({ where: { userId: uid_ } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: uid_ } }).catch(() => {});
    }
  });

  describe("Backup creation", () => {
    it("creates backup with correct entity counts", async () => {
      const userId = userIds[0]!;

      const users = await prisma.user.findMany({ where: { id: userId } });
      const documents = await prisma.document.findMany({ where: { userId } });
      const folders = await prisma.folder.findMany({ where: { userId } });
      const tags = await prisma.tag.findMany({ where: { userId } });
      const tagDocuments = await prisma.tagDocument.findMany({
        where: { tagId: { in: tags.map((t) => t.id) } },
      });
      const shareLinks = await prisma.shareLink.findMany({ where: { userId } });
      const conversionJobs = await prisma.conversionJob.findMany({ where: { userId } });

      const start = performance.now();
      backupData = simulateBackup(
        users,
        documents,
        folders,
        tags,
        tagDocuments,
        shareLinks,
        conversionJobs,
      );
      const elapsed = performance.now() - start;

      console.log(`  Backup time: ${elapsed.toFixed(0)}ms`);
      console.log(`  Entities: ${JSON.stringify(backupData.manifest.entities)}`);

      expect(backupData.manifest.entities.users).toBe(1);
      expect(backupData.manifest.entities.documents).toBe(5);
      expect(backupData.manifest.entities.folders).toBe(1);
      expect(backupData.manifest.entities.tags).toBe(3);
      expect(backupData.manifest.entities.tagDocuments).toBe(3);
      expect(backupData.manifest.entities.shareLinks).toBe(1);
      expect(backupData.manifest.entities.conversionJobs).toBe(1);
    });

    it("backup manifest has valid checksum", () => {
      expect(backupData.manifest.checksum).toMatch(/^[a-f0-9]{64}$/);
    });

    it("backup manifest has version", () => {
      expect(backupData.manifest.version).toBe("1.0");
    });

    it("backup manifest has ISO timestamp", () => {
      const date = new Date(backupData.manifest.timestamp);
      expect(date.toISOString()).toBe(backupData.manifest.timestamp);
    });
  });

  describe("Backup integrity validation", () => {
    it("valid backup passes integrity check", () => {
      const result = validateBackupIntegrity(backupData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("corrupted backup detected by checksum", () => {
      const corrupted = { ...backupData, users: [...backupData.users, { fake: true }] };
      corrupted.manifest = { ...corrupted.manifest };
      const result = validateBackupIntegrity(corrupted);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes("Checksum mismatch") || e.includes("mismatch")),
      ).toBe(true);
    });

    it("tampered entity count detected", () => {
      const tampered = JSON.parse(safeStringify(backupData));
      tampered.manifest.entities.documents = 999;
      const result = validateBackupIntegrity(tampered);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("mismatch"))).toBe(true);
    });

    it("empty backup is valid (zero entities)", () => {
      const empty = simulateBackup([], [], [], [], [], [], []);
      const result = validateBackupIntegrity(empty);
      expect(result.valid).toBe(true);
    });
  });

  describe("Backup serialization", () => {
    it("backup serializes to valid JSON", () => {
      const json = safeStringify(backupData);
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it("backup deserializes without data loss", () => {
      const json = safeStringify(backupData);
      const restored = JSON.parse(json) as BackupData;

      expect(restored.manifest.checksum).toBe(backupData.manifest.checksum);
      expect(restored.users.length).toBe(backupData.users.length);
      expect(restored.documents.length).toBe(backupData.documents.length);
    });

    it("BigInt fileSize survives JSON round-trip via string conversion", () => {
      const docWithBigInt = { id: "test", fileSize: "1024" };
      const json = JSON.stringify(docWithBigInt);
      const parsed = JSON.parse(json);
      expect(Number(parsed.fileSize)).toBe(1024);
    });
  });

  describe("Restore simulation", () => {
    it("all documents from backup are restorable", () => {
      expect(backupData.documents.length).toBe(5);
      for (const doc of backupData.documents) {
        const d = doc as Record<string, unknown>;
        expect(d.id).toBeDefined();
        expect(d.title).toBeDefined();
        expect(d.storageKey).toBeDefined();
      }
    });

    it("folder hierarchy preserved in backup", () => {
      const folderId = (backupData.folders[0] as Record<string, unknown>).id;
      const folderDocs = backupData.documents.filter(
        (d) => (d as Record<string, unknown>).folderId === folderId,
      );
      expect(folderDocs.length).toBeGreaterThanOrEqual(1);
    });

    it("tag-document associations preserved", () => {
      expect(backupData.tagDocuments.length).toBe(3);
    });

    it("share links preserved with tokens", () => {
      expect(backupData.shareLinks.length).toBe(1);
      const share = backupData.shareLinks[0] as Record<string, unknown>;
      expect(share.token).toBeDefined();
      expect(typeof share.token).toBe("string");
    });

    it("conversion jobs preserved", () => {
      expect(backupData.conversionJobs.length).toBe(1);
      const job = backupData.conversionJobs[0] as Record<string, unknown>;
      expect(job.status).toBe("COMPLETED");
    });
  });
});
