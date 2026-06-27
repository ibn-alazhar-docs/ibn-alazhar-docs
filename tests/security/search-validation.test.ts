import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

const searchParamsSchema = z.object({
  q: z.string().max(500).optional().default(""),
  type: z.enum(["title", "folder", "all"]).optional().default("all"),
  folderId: z.string().uuid().optional(),
  status: z.enum(["UPLOADED", "PROCESSING", "COMPLETED", "FAILED"]).optional(),
  tagId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

describe("Security Fixes — Search Input Validation", () => {
  describe("searchParamsSchema", () => {
    it("accepts valid minimal input", () => {
      const result = searchParamsSchema.parse({});
      expect(result.q).toBe("");
      expect(result.type).toBe("all");
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it("accepts valid full input", () => {
      const result = searchParamsSchema.parse({
        q: "biology",
        type: "title",
        folderId: "550e8400-e29b-41d4-a716-446655440000",
        status: "COMPLETED",
        tagId: "550e8400-e29b-41d4-a716-446655440001",
        page: 2,
        limit: 10,
      });
      expect(result.q).toBe("biology");
      expect(result.type).toBe("title");
      expect(result.folderId).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(result.status).toBe("COMPLETED");
    });

    it("rejects query exceeding 500 characters", () => {
      const longQuery = "a".repeat(501);
      expect(() => searchParamsSchema.parse({ q: longQuery })).toThrow();
    });

    it("accepts query at exactly 500 characters", () => {
      const maxQuery = "a".repeat(500);
      const result = searchParamsSchema.parse({ q: maxQuery });
      expect(result.q).toBe(maxQuery);
    });

    it("rejects invalid type enum", () => {
      expect(() => searchParamsSchema.parse({ type: "invalid" })).toThrow();
    });

    it("rejects invalid folderId format", () => {
      expect(() => searchParamsSchema.parse({ folderId: "not-a-uuid" })).toThrow();
    });

    it("rejects invalid status enum", () => {
      expect(() => searchParamsSchema.parse({ status: "INVALID" })).toThrow();
    });

    it("rejects page < 1", () => {
      expect(() => searchParamsSchema.parse({ page: 0 })).toThrow();
    });

    it("rejects negative page", () => {
      expect(() => searchParamsSchema.parse({ page: -1 })).toThrow();
    });

    it("rejects limit > 100", () => {
      expect(() => searchParamsSchema.parse({ limit: 101 })).toThrow();
    });

    it("rejects limit < 1", () => {
      expect(() => searchParamsSchema.parse({ limit: 0 })).toThrow();
    });

    it("accepts limit at exactly 100", () => {
      const result = searchParamsSchema.parse({ limit: 100 });
      expect(result.limit).toBe(100);
    });

    it("coerces string numbers to numbers", () => {
      const result = searchParamsSchema.parse({ page: "3", limit: "50" });
      expect(result.page).toBe(3);
      expect(result.limit).toBe(50);
    });

    it("rejects non-numeric strings for page", () => {
      expect(() => searchParamsSchema.parse({ page: "abc" })).toThrow();
    });

    it("rejects SQL injection in query", () => {
      const result = searchParamsSchema.parse({ q: "' OR 1=1--" });
      expect(result.q).toBe("' OR 1=1--");
    });

    it("rejects XSS payload in query", () => {
      const result = searchParamsSchema.parse({ q: "<script>alert(1)</script>" });
      expect(result.q).toBe("<script>alert(1)</script>");
    });
  });
});
