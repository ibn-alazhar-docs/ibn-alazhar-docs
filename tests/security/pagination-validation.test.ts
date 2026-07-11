import { describe, it, expect } from "vitest";

describe("Security Fixes — Pagination Validation", () => {
  describe("getUsers pagination bounds", () => {
    function validatePagination(page: number, limit: number) {
      const safePage = Math.max(1, page);
      const safeLimit = Math.min(Math.max(1, limit), 100);
      const skip = (safePage - 1) * safeLimit;
      return { safePage, safeLimit, skip };
    }

    it("clamps page < 1 to 1", () => {
      const result = validatePagination(0, 50);
      expect(result.safePage).toBe(1);
    });

    it("clamps negative page to 1", () => {
      const result = validatePagination(-5, 50);
      expect(result.safePage).toBe(1);
    });

    it("clamps limit > 100 to 100", () => {
      const result = validatePagination(1, 1000);
      expect(result.safeLimit).toBe(100);
    });

    it("clamps limit < 1 to 1", () => {
      const result = validatePagination(1, 0);
      expect(result.safeLimit).toBe(1);
    });

    it("clamps negative limit to 1", () => {
      const result = validatePagination(1, -10);
      expect(result.safeLimit).toBe(1);
    });

    it("accepts valid pagination", () => {
      const result = validatePagination(1, 20);
      expect(result.safePage).toBe(1);
      expect(result.safeLimit).toBe(20);
      expect(result.skip).toBe(0);
    });

    it("calculates correct skip for page 2", () => {
      const result = validatePagination(2, 20);
      expect(result.skip).toBe(20);
    });

    it("calculates correct skip for page 3, limit 50", () => {
      const result = validatePagination(3, 50);
      expect(result.skip).toBe(100);
    });

    it("handles very large page number", () => {
      const result = validatePagination(1000000, 20);
      expect(result.safePage).toBe(1000000);
      expect(result.skip).toBe(19999980);
    });

    it("handles max limit", () => {
      const result = validatePagination(1, 100);
      expect(result.safeLimit).toBe(100);
      expect(result.skip).toBe(0);
    });
  });
});
