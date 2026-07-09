import { describe, it, expect } from "vitest";
import { loginSchema, registerSchema } from "@/shared/validators/auth";
import { documentUpdateSchema } from "@/shared/validators/document";
import { createFolderSchema } from "@/shared/validators/folder";
import { createTagSchema } from "@/shared/validators/tag";
import { singleExportSchema, batchExportSchema } from "@/core/services/export/validators";

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)]!;
}

describe("Validation Throughput Load Test", () => {
  describe("Login schema", () => {
    it("parse 1000 valid login inputs", () => {
      const input = { email: "user@example.com", password: "ValidPass1" };
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        loginSchema.safeParse(input);
      }

      const elapsed = performance.now() - start;
      const opsPerSec = (1000 / elapsed) * 1000;

      console.log(`  1000 login parses: ${elapsed.toFixed(0)}ms, ${opsPerSec.toFixed(0)} ops/sec`);

      expect(opsPerSec).toBeGreaterThan(5000);
    });

    it("parse 1000 invalid login inputs", () => {
      const input = { email: "bad", password: "x" };
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        loginSchema.safeParse(input);
      }

      const elapsed = performance.now() - start;
      const opsPerSec = (1000 / elapsed) * 1000;

      console.log(`  1000 invalid login: ${elapsed.toFixed(0)}ms, ${opsPerSec.toFixed(0)} ops/sec`);

      expect(opsPerSec).toBeGreaterThan(5000);
    });
  });

  describe("Register schema", () => {
    it("parse 500 valid register inputs", () => {
      const input = {
        name: "أحمد محمد",
        email: "ahmed@example.com",
        password: "SecurePass1",
        confirmPassword: "SecurePass1",
      };
      const start = performance.now();

      for (let i = 0; i < 500; i++) {
        registerSchema.safeParse(input);
      }

      const elapsed = performance.now() - start;
      const opsPerSec = (500 / elapsed) * 1000;

      console.log(
        `  500 register parses: ${elapsed.toFixed(0)}ms, ${opsPerSec.toFixed(0)} ops/sec`,
      );

      expect(opsPerSec).toBeGreaterThan(2000);
    });
  });

  describe("Document update schema", () => {
    it("parse 1000 document updates", () => {
      const input = { title: "عنوان المستند", description: "وصف طويل للمستند", folderId: null };
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        documentUpdateSchema.safeParse(input);
      }

      const elapsed = performance.now() - start;
      const opsPerSec = (1000 / elapsed) * 1000;

      console.log(`  1000 doc updates: ${elapsed.toFixed(0)}ms, ${opsPerSec.toFixed(0)} ops/sec`);

      expect(opsPerSec).toBeGreaterThan(5000);
    });
  });

  describe("Folder schema", () => {
    it("parse 1000 folder creates", () => {
      const input = { name: "مجلد جديد", color: "#16A34A" };
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        createFolderSchema.safeParse(input);
      }

      const elapsed = performance.now() - start;
      const opsPerSec = (1000 / elapsed) * 1000;

      console.log(
        `  1000 folder creates: ${elapsed.toFixed(0)}ms, ${opsPerSec.toFixed(0)} ops/sec`,
      );

      expect(opsPerSec).toBeGreaterThan(5000);
    });
  });

  describe("Tag schema", () => {
    it("parse 1000 tag creates", () => {
      const input = { name: "وسم جديد", color: "#2563EB" };
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        createTagSchema.safeParse(input);
      }

      const elapsed = performance.now() - start;
      const opsPerSec = (1000 / elapsed) * 1000;

      console.log(`  1000 tag creates: ${elapsed.toFixed(0)}ms, ${opsPerSec.toFixed(0)} ops/sec`);

      expect(opsPerSec).toBeGreaterThan(5000);
    });
  });

  describe("Export schemas", () => {
    it("parse 500 single exports", () => {
      const input = { documentId: "doc-1", format: "md", profile: "research" };
      const start = performance.now();

      for (let i = 0; i < 500; i++) {
        singleExportSchema.safeParse(input);
      }

      const elapsed = performance.now() - start;
      const opsPerSec = (500 / elapsed) * 1000;

      console.log(`  500 single exports: ${elapsed.toFixed(0)}ms, ${opsPerSec.toFixed(0)} ops/sec`);

      expect(opsPerSec).toBeGreaterThan(2000);
    });

    it("parse 500 batch exports", () => {
      const input = {
        documentIds: Array.from({ length: 10 }, (_, i) => `doc-${i}`),
        format: "md",
        profile: "research",
      };
      const start = performance.now();

      for (let i = 0; i < 500; i++) {
        batchExportSchema.safeParse(input);
      }

      const elapsed = performance.now() - start;
      const opsPerSec = (500 / elapsed) * 1000;

      console.log(`  500 batch exports: ${elapsed.toFixed(0)}ms, ${opsPerSec.toFixed(0)} ops/sec`);

      expect(opsPerSec).toBeGreaterThan(2000);
    });
  });
});
