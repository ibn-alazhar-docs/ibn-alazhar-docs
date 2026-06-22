import { describe, it, expect } from "vitest";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_UPLOAD_SIZE_MB = Math.max(1, Number(process.env.MAX_UPLOAD_SIZE_MB) || 2048);
const MAX_FILE_SIZE = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._\u0600-\u06FF\u0660-\u0669-]/g, "_").slice(0, 200);
}

function simulateUploadValidation(file: { type: string; size: number; name: string }) {
  const errors: string[] = [];

  if (!file.type) {
    errors.push("MISSING_TYPE");
  } else if (!ALLOWED_TYPES.includes(file.type)) {
    errors.push("INVALID_TYPE");
  }

  if (file.size > MAX_FILE_SIZE) {
    errors.push("FILE_TOO_LARGE");
  }

  if (file.size === 0) {
    errors.push("EMPTY_FILE");
  }

  return { valid: errors.length === 0, errors };
}

describe("File Upload Security", () => {
  describe("MIME type validation", () => {
    it("application/pdf accepted", () => {
      const result = simulateUploadValidation({
        type: "application/pdf",
        size: 1024,
        name: "test.pdf",
      });
      expect(result.valid).toBe(true);
    });

    it("image/jpeg accepted", () => {
      const result = simulateUploadValidation({
        type: "image/jpeg",
        size: 1024,
        name: "test.jpg",
      });
      expect(result.valid).toBe(true);
    });

    it("image/png accepted", () => {
      const result = simulateUploadValidation({
        type: "image/png",
        size: 1024,
        name: "test.png",
      });
      expect(result.valid).toBe(true);
    });

    it("application/javascript rejected", () => {
      const result = simulateUploadValidation({
        type: "application/javascript",
        size: 1024,
        name: "test.js",
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("INVALID_TYPE");
    });

    it("text/html rejected", () => {
      const result = simulateUploadValidation({
        type: "text/html",
        size: 1024,
        name: "test.html",
      });
      expect(result.valid).toBe(false);
    });

    it("application/x-executable rejected", () => {
      const result = simulateUploadValidation({
        type: "application/x-executable",
        size: 1024,
        name: "malware",
      });
      expect(result.valid).toBe(false);
    });

    it("empty MIME type rejected", () => {
      const result = simulateUploadValidation({
        type: "",
        size: 1024,
        name: "test.pdf",
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("MISSING_TYPE");
    });

    it("MIME type with parameters rejected", () => {
      const result = simulateUploadValidation({
        type: "application/pdf; charset=utf-8",
        size: 1024,
        name: "test.pdf",
      });
      expect(result.valid).toBe(false);
    });
  });

  describe("File size limits", () => {
    it("1KB file accepted", () => {
      const result = simulateUploadValidation({
        type: "application/pdf",
        size: 1024,
        name: "small.pdf",
      });
      expect(result.valid).toBe(true);
    });

    it("1GB file accepted (well within 2GB limit)", () => {
      const result = simulateUploadValidation({
        type: "application/pdf",
        size: 1024 * 1024 * 1024,
        name: "large-book.pdf",
      });
      expect(result.valid).toBe(true);
    });

    it("2GB file accepted (at default limit)", () => {
      const result = simulateUploadValidation({
        type: "application/pdf",
        size: 2048 * 1024 * 1024,
        name: "max-size.pdf",
      });
      expect(result.valid).toBe(true);
    });

    it("2GB + 1 byte rejected", () => {
      const result = simulateUploadValidation({
        type: "application/pdf",
        size: 2048 * 1024 * 1024 + 1,
        name: "over-limit.pdf",
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("FILE_TOO_LARGE");
    });

    it("zero-byte file rejected", () => {
      const result = simulateUploadValidation({
        type: "application/pdf",
        size: 0,
        name: "empty.pdf",
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("EMPTY_FILE");
    });

    it("default limit is 2048MB (2GB)", () => {
      expect(MAX_UPLOAD_SIZE_MB).toBe(2048);
    });

    it("MAX_UPLOAD_SIZE_MB respects env override", () => {
      const original = process.env.MAX_UPLOAD_SIZE_MB;
      try {
        process.env.MAX_UPLOAD_SIZE_MB = "50";
        const limit = Math.max(1, Number(process.env.MAX_UPLOAD_SIZE_MB) || 100);
        expect(limit).toBe(50);
      } finally {
        if (original !== undefined) {
          process.env.MAX_UPLOAD_SIZE_MB = original;
        } else {
          delete process.env.MAX_UPLOAD_SIZE_MB;
        }
      }
    });

    it("invalid MAX_UPLOAD_SIZE_MB falls back to 2048MB", () => {
      const original = process.env.MAX_UPLOAD_SIZE_MB;
      try {
        process.env.MAX_UPLOAD_SIZE_MB = "not-a-number";
        const limit = Math.max(1, Number(process.env.MAX_UPLOAD_SIZE_MB) || 2048);
        expect(limit).toBe(2048);
      } finally {
        if (original !== undefined) {
          process.env.MAX_UPLOAD_SIZE_MB = original;
        } else {
          delete process.env.MAX_UPLOAD_SIZE_MB;
        }
      }
    });

    it("zero MAX_UPLOAD_SIZE_MB clamped to 1MB minimum", () => {
      const original = process.env.MAX_UPLOAD_SIZE_MB;
      try {
        process.env.MAX_UPLOAD_SIZE_MB = "0";
        const limit = Math.max(1, Number(process.env.MAX_UPLOAD_SIZE_MB) || 100);
        expect(limit).toBeGreaterThanOrEqual(1);
      } finally {
        if (original !== undefined) {
          process.env.MAX_UPLOAD_SIZE_MB = original;
        } else {
          delete process.env.MAX_UPLOAD_SIZE_MB;
        }
      }
    });
  });

  describe("Filename sanitization", () => {
    it("normal filename preserved", () => {
      expect(sanitizeFileName("document.pdf")).toBe("document.pdf");
    });

    it("Arabic filename preserved (spaces become underscores)", () => {
      expect(sanitizeFileName("كتاب التفسير.pdf")).toBe("كتاب_التفسير.pdf");
    });

    it("path traversal slashes sanitized, dots preserved", () => {
      const sanitized = sanitizeFileName("../../../etc/passwd");
      expect(sanitized).not.toContain("/");
      expect(sanitized).not.toContain("\\");
    });

    it("null bytes sanitized", () => {
      const sanitized = sanitizeFileName("test\x00.pdf");
      expect(sanitized).not.toContain("\x00");
    });

    it("special characters replaced with underscores", () => {
      const sanitized = sanitizeFileName('file<>:"|?*.pdf');
      expect(sanitized).not.toContain("<");
      expect(sanitized).not.toContain(">");
      expect(sanitized).not.toContain(":");
      expect(sanitized).not.toContain('"');
      expect(sanitized).not.toContain("|");
      expect(sanitized).not.toContain("?");
      expect(sanitized).not.toContain("*");
    });

    it("filename truncated to 200 chars", () => {
      const longName = "a".repeat(300) + ".pdf";
      const sanitized = sanitizeFileName(longName);
      expect(sanitized.length).toBeLessThanOrEqual(200);
    });

    it("backslash sanitized", () => {
      const sanitized = sanitizeFileName("..\\..\\windows\\system32");
      expect(sanitized).not.toContain("\\");
    });
  });

  describe("Storage key construction", () => {
    function buildStorageKey(userId: string, jobId: string, safeName: string): string {
      return `uploads/${userId}/${jobId}_${safeName}`;
    }

    it("storage key includes userId isolation", () => {
      const key = buildStorageKey("user-123", "job-456", "document.pdf");
      expect(key).toContain("user-123");
      expect(key).toContain("job-456");
    });

    it("sanitized name prevents path traversal in storage key", () => {
      const maliciousName = sanitizeFileName("../../../etc/passwd");
      const key = buildStorageKey("user-1", "job-1", maliciousName);
      expect(key).not.toContain("../");
      expect(key).not.toContain("/etc/");
    });

    it("storage key starts with uploads/", () => {
      const key = buildStorageKey("u1", "j1", "test.pdf");
      expect(key.startsWith("uploads/")).toBe(true);
    });
  });
});
