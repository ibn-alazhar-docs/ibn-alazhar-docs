import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";

interface StorageObject {
  key: string;
  size: number;
  contentType: string;
  checksum: string;
}

interface StorageBackupManifest {
  version: string;
  timestamp: string;
  bucket: string;
  totalObjects: number;
  totalSize: number;
  objects: StorageObject[];
}

function buildStorageKey(
  userId: string,
  type: "upload" | "ocr" | "export",
  docId: string,
  filename: string,
): string {
  switch (type) {
    case "upload":
      return `uploads/${userId}/${docId}_${filename}`;
    case "ocr":
      return `ocr-results/${docId}/${filename}`;
    case "export":
      return `exports/${docId}/${filename}`;
  }
}

function computeFileChecksum(content: Buffer): string {
  return createHash("md5").update(content).digest("hex");
}

function simulateStorageBackup(objects: StorageObject[]): StorageBackupManifest {
  return {
    version: "1.0",
    timestamp: new Date().toISOString(),
    bucket: "ibn-al-azhar-docs",
    totalObjects: objects.length,
    totalSize: objects.reduce((sum, o) => sum + o.size, 0),
    objects,
  };
}

function validateStorageManifest(manifest: StorageBackupManifest): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  const computedSize = manifest.objects.reduce((sum, o) => sum + o.size, 0);
  if (computedSize !== manifest.totalSize) {
    errors.push(`Size mismatch: manifest says ${manifest.totalSize}, computed ${computedSize}`);
  }

  if (manifest.objects.length !== manifest.totalObjects) {
    errors.push(
      `Object count mismatch: manifest says ${manifest.totalObjects}, got ${manifest.objects.length}`,
    );
  }

  const keys = manifest.objects.map((o) => o.key);
  const uniqueKeys = new Set(keys);
  if (keys.length !== uniqueKeys.size) {
    errors.push("Duplicate storage keys found");
  }

  return { valid: errors.length === 0, errors };
}

describe("Storage (MinIO) Backup & Restore", () => {
  describe("Storage key patterns", () => {
    it("upload keys follow consistent pattern", () => {
      const key = buildStorageKey("user-1", "upload", "doc-1", "book.pdf");
      expect(key).toBe("uploads/user-1/doc-1_book.pdf");
      expect(key).toMatch(/^uploads\/[^/]+\/[^/]+$/);
    });

    it("OCR result keys follow consistent pattern", () => {
      const key = buildStorageKey("user-1", "ocr", "doc-1", "text.json");
      expect(key).toBe("ocr-results/doc-1/text.json");
      expect(key).toMatch(/^ocr-results\/[^/]+\/[^/]+$/);
    });

    it("export keys follow consistent pattern", () => {
      const key = buildStorageKey("user-1", "export", "doc-1", "output.md");
      expect(key).toBe("exports/doc-1/output.md");
      expect(key).toMatch(/^exports\/[^/]+\/[^/]+$/);
    });

    it("all key types are deterministic and reproducible", () => {
      const key1 = buildStorageKey("user-a", "upload", "doc-x", "file.pdf");
      const key2 = buildStorageKey("user-a", "upload", "doc-x", "file.pdf");
      expect(key1).toBe(key2);
    });

    it("storage keys extractable to components", () => {
      const key = "uploads/user-abc/doc-123_book.pdf";
      const parts = key.split("/");
      expect(parts[0]).toBe("uploads");
      expect(parts[1]).toBe("user-abc");
      expect(parts[2]).toContain("doc-123");
    });
  });

  describe("Storage backup manifest", () => {
    it("creates manifest with correct totals", () => {
      const objects: StorageObject[] = [
        {
          key: "uploads/u1/d1_file.pdf",
          size: 1024,
          contentType: "application/pdf",
          checksum: "abc",
        },
        {
          key: "ocr-results/d1/text.json",
          size: 512,
          contentType: "application/json",
          checksum: "def",
        },
        { key: "exports/d1/output.md", size: 2048, contentType: "text/markdown", checksum: "ghi" },
      ];

      const manifest = simulateStorageBackup(objects);

      expect(manifest.totalObjects).toBe(3);
      expect(manifest.totalSize).toBe(3584);
      expect(manifest.bucket).toBe("ibn-al-azhar-docs");
    });

    it("validates manifest integrity", () => {
      const objects: StorageObject[] = [
        { key: "uploads/u1/d1.pdf", size: 1000, contentType: "application/pdf", checksum: "aaa" },
      ];

      const manifest = simulateStorageBackup(objects);
      const result = validateStorageManifest(manifest);
      expect(result.valid).toBe(true);
    });

    it("detects size mismatch", () => {
      const manifest: StorageBackupManifest = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        bucket: "ibn-al-azhar-docs",
        totalObjects: 1,
        totalSize: 9999,
        objects: [{ key: "test", size: 1000, contentType: "text/plain", checksum: "abc" }],
      };

      const result = validateStorageManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Size mismatch");
    });

    it("detects duplicate storage keys", () => {
      const manifest: StorageBackupManifest = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        bucket: "ibn-al-azhar-docs",
        totalObjects: 2,
        totalSize: 2000,
        objects: [
          { key: "uploads/u1/same.pdf", size: 1000, contentType: "application/pdf", checksum: "a" },
          { key: "uploads/u1/same.pdf", size: 1000, contentType: "application/pdf", checksum: "b" },
        ],
      };

      const result = validateStorageManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Duplicate storage keys found");
    });
  });

  describe("File checksum verification", () => {
    it("MD5 checksum computed correctly", () => {
      const content = Buffer.from("بسم الله الرحمن الرحيم");
      const checksum = computeFileChecksum(content);
      expect(checksum).toMatch(/^[a-f0-9]{32}$/);
    });

    it("same content produces same checksum", () => {
      const content = Buffer.from("test content");
      const c1 = computeFileChecksum(content);
      const c2 = computeFileChecksum(Buffer.from("test content"));
      expect(c1).toBe(c2);
    });

    it("different content produces different checksum", () => {
      const c1 = computeFileChecksum(Buffer.from("content A"));
      const c2 = computeFileChecksum(Buffer.from("content B"));
      expect(c1).not.toBe(c2);
    });
  });

  describe("Missing file detection", () => {
    it("detects missing upload files", () => {
      const expected: string[] = ["uploads/u1/d1_file.pdf", "uploads/u1/d2_file.pdf"];
      const actual: string[] = ["uploads/u1/d1_file.pdf"];

      const missing = expected.filter((k) => !actual.includes(k));
      expect(missing).toEqual(["uploads/u1/d2_file.pdf"]);
    });

    it("detects missing OCR results", () => {
      const expected: string[] = ["ocr-results/d1/text.json", "ocr-results/d2/text.json"];
      const actual: string[] = [];

      const missing = expected.filter((k) => !actual.includes(k));
      expect(missing).toHaveLength(2);
    });

    it("detects missing export files", () => {
      const expected: string[] = ["exports/d1/output.md", "exports/d1/output.txt"];
      const actual: string[] = ["exports/d1/output.md"];

      const missing = expected.filter((k) => !actual.includes(k));
      expect(missing).toEqual(["exports/d1/output.txt"]);
    });
  });

  describe("Restore path construction", () => {
    it("can reconstruct full restore path from storage key", () => {
      const key = "uploads/user-abc/doc-123_book.pdf";
      const parts = key.split("/");

      expect(parts[0]).toBe("uploads");
      expect(parts[1]).toBe("user-abc");
      expect(parts[2]).toMatch(/^doc-123/);
    });

    it("OCR results path is document-scoped", () => {
      const key = "ocr-results/doc-456/text.json";
      expect(key.startsWith("ocr-results/")).toBe(true);
      expect(key).toContain("doc-456");
    });

    it("export path supports multiple formats", () => {
      const formats = ["output.md", "output.txt", "output.json", "output.pdf"];
      for (const fmt of formats) {
        const key = buildStorageKey("u1", "export", "doc-1", fmt);
        expect(key).toContain("exports/");
        expect(key).toContain(fmt);
      }
    });
  });
});
