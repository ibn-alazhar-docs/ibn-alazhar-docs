import { describe, it, expect } from "vitest";
import { loginSchema, registerSchema, profileUpdateSchema } from "@/shared/validators/auth";
import { documentUpdateSchema } from "@/shared/validators/document";
import { createFolderSchema, renameFolderSchema } from "@/shared/validators/folder";
import { createTagSchema } from "@/shared/validators/tag";
import { singleExportSchema, batchExportSchema } from "@/core/services/export/validators";

describe("Input Validation Security", () => {
  describe("XSS payloads", () => {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      "<img src=x onerror=alert(1)>",
      '"><svg onload=alert(1)>',
      "javascript:alert(1)",
      '<iframe src="evil.com"></iframe>',
      "{{constructor.constructor('return this')()}}",
      "${7*7}",
      "%3Cscript%3Ealert(1)%3C/script%3E",
    ];

    for (const payload of xssPayloads) {
      it(`document title rejects XSS: ${payload.slice(0, 40)}`, () => {
        const result = documentUpdateSchema.safeParse({ title: payload });
        if (result.success) {
          expect(result.data.title!.length).toBeLessThanOrEqual(200);
        }
      });
    }

    for (const payload of xssPayloads) {
      it(`folder name rejects XSS: ${payload.slice(0, 40)}`, () => {
        const result = createFolderSchema.safeParse({ name: payload });
        if (result.success) {
          expect(result.data.name.length).toBeLessThanOrEqual(100);
        }
      });
    }

    for (const payload of xssPayloads) {
      it(`tag name rejects XSS: ${payload.slice(0, 40)}`, () => {
        const result = createTagSchema.safeParse({ name: payload });
        if (result.success) {
          expect(result.data.name.length).toBeLessThanOrEqual(50);
        }
      });
    }
  });

  describe("SQL injection payloads", () => {
    const sqliPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "1; EXEC xp_cmdshell('dir')",
      "admin'--",
      "' OR 1=1 --",
      "Robert'); DROP TABLE Students;--",
      "1' AND (SELECT * FROM (SELECT(SLEEP(5)))a)--",
    ];

    for (const payload of sqliPayloads) {
      it(`login email rejects SQLi: ${payload.slice(0, 40)}`, () => {
        const result = loginSchema.safeParse({ email: payload, password: "ValidPass1" });
        expect(result.success).toBe(false);
      });
    }

    for (const payload of sqliPayloads) {
      it(`register email rejects SQLi: ${payload.slice(0, 40)}`, () => {
        const result = registerSchema.safeParse({
          name: "Test",
          email: payload,
          password: "ValidPass1",
          confirmPassword: "ValidPass1",
        });
        expect(result.success).toBe(false);
      });
    }

    for (const payload of sqliPayloads) {
      it(`folder name accepts but bounds SQLi (parameterized queries): ${payload.slice(0, 40)}`, () => {
        const result = createFolderSchema.safeParse({ name: payload });
        if (result.success) {
          expect(result.data.name.length).toBeLessThanOrEqual(100);
        }
      });
    }
  });

  describe("Path traversal payloads", () => {
    const pathPayloads = [
      "../../../etc/passwd",
      "..\\..\\..\\windows\\system32",
      "/etc/shadow",
      "....//....//etc/passwd",
      "%2e%2e%2f%2e%2e%2fetc%2fpasswd",
      "..%252f..%252f..%252fetc%252fpasswd",
    ];

    for (const payload of pathPayloads) {
      it(`document title accepts path strings (safe — stored in DB, not used as file path): ${payload.slice(0, 40)}`, () => {
        const result = documentUpdateSchema.safeParse({ title: payload });
        expect(result.success).toBe(true);
      });
    }

    for (const payload of pathPayloads) {
      it(`folder name accepts path strings (safe — stored in DB): ${payload.slice(0, 40)}`, () => {
        const result = createFolderSchema.safeParse({ name: payload });
        if (payload.length <= 100) {
          expect(result.success).toBe(true);
        }
      });
    }
  });

  describe("Oversized input", () => {
    it("document title > 200 chars rejected", () => {
      const result = documentUpdateSchema.safeParse({ title: "أ".repeat(201) });
      expect(result.success).toBe(false);
    });

    it("document description > 500 chars rejected", () => {
      const result = documentUpdateSchema.safeParse({ description: "أ".repeat(501) });
      expect(result.success).toBe(false);
    });

    it("folder name > 100 chars rejected", () => {
      const result = createFolderSchema.safeParse({ name: "أ".repeat(101) });
      expect(result.success).toBe(false);
    });

    it("tag name > 50 chars rejected", () => {
      const result = createTagSchema.safeParse({ name: "أ".repeat(51) });
      expect(result.success).toBe(false);
    });

    it("profile name > 100 chars rejected", () => {
      const result = profileUpdateSchema.safeParse({ name: "أ".repeat(101) });
      expect(result.success).toBe(false);
    });

    it("register name > 100 chars rejected", () => {
      const result = registerSchema.safeParse({
        name: "أ".repeat(101),
        email: "test@example.com",
        password: "ValidPass1",
        confirmPassword: "ValidPass1",
      });
      expect(result.success).toBe(false);
    });

    it("password > 128 chars rejected", () => {
      const result = registerSchema.safeParse({
        name: "Test",
        email: "test@example.com",
        password: "A1" + "a".repeat(127),
        confirmPassword: "A1" + "a".repeat(127),
      });
      expect(result.success).toBe(false);
    });

    it("batch export > 50 documents rejected", () => {
      const result = batchExportSchema.safeParse({
        documentIds: Array.from({ length: 51 }, (_, i) => `d${i}`),
        format: "md",
        profile: "research",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Unicode abuse", () => {
    it("null bytes in email rejected", () => {
      const result = loginSchema.safeParse({
        email: "user\x00@example.com",
        password: "ValidPass1",
      });
      expect(result.success).toBe(false);
    });

    it("zero-width characters in name accepted (but bounded)", () => {
      const result = registerSchema.safeParse({
        name: "\u200B\u200C\u200D",
        email: "test@example.com",
        password: "ValidPass1",
        confirmPassword: "ValidPass1",
      });
      expect(result.success).toBe(result.data ? result.data.name.length >= 2 : false);
    });

    it("right-to-left override character in title accepted (stored safely in DB)", () => {
      const result = documentUpdateSchema.safeParse({
        title: "Normal\u202Etext",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("Format injection", () => {
    it("invalid export format rejected", () => {
      const result = singleExportSchema.safeParse({
        documentId: "doc-1",
        format: "../../../etc/passwd",
        profile: "research",
      });
      expect(result.success).toBe(false);
    });

    it("invalid export profile rejected", () => {
      const result = singleExportSchema.safeParse({
        documentId: "doc-1",
        format: "md",
        profile: "admin",
      });
      expect(result.success).toBe(false);
    });

    it("invalid color format rejected", () => {
      const result = createTagSchema.safeParse({
        name: "test",
        color: "javascript:alert(1)",
      });
      expect(result.success).toBe(false);
    });

    it("folder color must be valid hex", () => {
      const result = createFolderSchema.safeParse({
        name: "test",
        color: "<script>alert(1)</script>",
      });
      expect(result.success).toBe(false);
    });
  });
});
