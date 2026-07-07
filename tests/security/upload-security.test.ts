import { describe, it, expect, afterEach, vi } from "vitest";
import { validateUploadFile } from "@/lib/shared/validators/document";

// NOTE: Previously this file re-implemented `simulateUploadValidation` as a copy of the
// app's upload validation logic. It now imports the REAL `validateUploadFile` from
// `apps/web/src/lib/shared/validators/document.ts` and asserts against the actual
// implementation, so security coverage tracks the production behavior.

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._\u0600-\u06FF\u0660-\u0669-]/g, "_").slice(0, 200);
}

function buildStorageKey(userId: string, jobId: string, safeName: string): string {
  return `uploads/${userId}/${jobId}_${safeName}`;
}

describe("File Upload Security", () => {
  describe("MIME type validation (real validateUploadFile)", () => {
    it("application/pdf accepted", () => {
      const result = validateUploadFile({
        type: "application/pdf",
        size: 1024,
      } as unknown as File);
      expect(result.valid).toBe(true);
    });

    it("image/jpeg accepted", () => {
      const result = validateUploadFile({
        type: "image/jpeg",
        size: 1024,
      } as unknown as File);
      expect(result.valid).toBe(true);
    });

    it("image/png accepted", () => {
      const result = validateUploadFile({
        type: "image/png",
        size: 1024,
      } as unknown as File);
      expect(result.valid).toBe(true);
    });

    it("application/javascript rejected", () => {
      const result = validateUploadFile({
        type: "application/javascript",
        size: 1024,
      } as unknown as File);
      expect(result.valid).toBe(false);
      expect(result.status).toBe(400);
    });

    it("text/html rejected", () => {
      const result = validateUploadFile({
        type: "text/html",
        size: 1024,
      } as unknown as File);
      expect(result.valid).toBe(false);
      expect(result.status).toBe(400);
    });

    it("application/x-executable rejected", () => {
      const result = validateUploadFile({
        type: "application/x-executable",
        size: 1024,
      } as unknown as File);
      expect(result.valid).toBe(false);
      expect(result.status).toBe(400);
    });

    it("empty MIME type rejected", () => {
      const result = validateUploadFile({
        type: "",
        size: 1024,
      } as unknown as File);
      expect(result.valid).toBe(false);
      expect(result.status).toBe(400);
    });

    it("MIME type with parameters rejected", () => {
      const result = validateUploadFile({
        type: "application/pdf; charset=utf-8",
        size: 1024,
      } as unknown as File);
      expect(result.valid).toBe(false);
      expect(result.status).toBe(400);
    });
  });

  describe("File size limits (real validateUploadFile, default 50MB)", () => {
    it("1KB file accepted", () => {
      const result = validateUploadFile({
        type: "application/pdf",
        size: 1024,
      } as unknown as File);
      expect(result.valid).toBe(true);
    });

    it("exactly 50MB accepted (limit is exclusive upper bound)", () => {
      const result = validateUploadFile({
        type: "application/pdf",
        size: 50 * 1024 * 1024,
      } as unknown as File);
      expect(result.valid).toBe(true);
    });

    it("50MB + 1 byte rejected", () => {
      const result = validateUploadFile({
        type: "application/pdf",
        size: 50 * 1024 * 1024 + 1,
      } as unknown as File);
      expect(result.valid).toBe(false);
      expect(result.status).toBe(400);
    });

    it("1GB file rejected", () => {
      const result = validateUploadFile({
        type: "application/pdf",
        size: 1024 * 1024 * 1024,
      } as unknown as File);
      expect(result.valid).toBe(false);
      expect(result.status).toBe(400);
    });

    it("2GB + 1 byte rejected", () => {
      const result = validateUploadFile({
        type: "application/pdf",
        size: 2048 * 1024 * 1024 + 1,
      } as unknown as File);
      expect(result.valid).toBe(false);
      expect(result.status).toBe(400);
    });

    it("zero-byte PDF passes type+size validation (validator does not check emptiness)", () => {
      const result = validateUploadFile({
        type: "application/pdf",
        size: 0,
      } as unknown as File);
      expect(result.valid).toBe(true);
    });
  });

  describe("MAX_UPLOAD_SIZE_MB env override (real validateUploadFile)", () => {
    const ORIGINAL = process.env.MAX_UPLOAD_SIZE_MB;

    afterEach(() => {
      if (ORIGINAL === undefined) {
        delete process.env.MAX_UPLOAD_SIZE_MB;
      } else {
        process.env.MAX_UPLOAD_SIZE_MB = ORIGINAL;
      }
      vi.resetModules();
    });

    it("uses a custom limit from MAX_UPLOAD_SIZE_MB", async () => {
      process.env.MAX_UPLOAD_SIZE_MB = "1";
      vi.resetModules();
      const mod = await import("@/lib/shared/validators/document");

      const small = { type: "application/pdf", size: 1024 } as unknown as File;
      const big = { type: "application/pdf", size: 2 * 1024 * 1024 } as unknown as File;

      expect(mod.validateUploadFile(small).valid).toBe(true);
      expect(mod.validateUploadFile(big).valid).toBe(false);
      expect(mod.validateUploadFile(big).status).toBe(400);
    });

    it("falls back to 50MB when env is invalid", async () => {
      process.env.MAX_UPLOAD_SIZE_MB = "not-a-number";
      vi.resetModules();
      const mod = await import("@/lib/shared/validators/document");

      const huge = { type: "application/pdf", size: 60 * 1024 * 1024 } as unknown as File;
      expect(mod.validateUploadFile(huge).valid).toBe(false);
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
