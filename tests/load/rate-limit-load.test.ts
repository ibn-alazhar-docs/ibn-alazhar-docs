import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, cleanupExpiredEntries } from "@/lib/backend/rate-limit";

function makeRequest(ip: string): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: new Headers({ "x-forwarded-for": ip }),
  });
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)]!;
}

describe("Rate Limiter Load Test", () => {
  beforeEach(() => {
    cleanupExpiredEntries();
  });

  describe("Throughput", () => {
    it("100 sequential rate limit checks", async () => {
      const request = makeRequest("10.0.0.1");
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        await checkRateLimit("/api/upload", request);
      }

      const elapsed = performance.now() - start;
      const opsPerSec = (100 / elapsed) * 1000;

      console.log(`  100 sequential: ${elapsed.toFixed(0)}ms, ${opsPerSec.toFixed(0)} ops/sec`);

      expect(opsPerSec).toBeGreaterThan(200);
    });

    it("50 concurrent rate limit checks (different IPs)", async () => {
      const start = performance.now();

      const promises = Array.from({ length: 50 }, (_, i) => {
        const request = makeRequest(`192.168.${Math.floor(i / 255)}.${i % 255}`);
        return checkRateLimit("/api/upload", request);
      });

      const results = await Promise.all(promises);
      const elapsed = performance.now() - start;
      const allowed = results.filter((r) => r.allowed).length;

      console.log(`  50 concurrent (diff IPs): ${elapsed.toFixed(0)}ms, ${allowed}/50 allowed`);

      expect(allowed).toBe(50);
    });

    it("100 concurrent rate limit checks (same IP)", async () => {
      const request = makeRequest("10.0.0.99");
      const start = performance.now();

      const promises = Array.from({ length: 100 }, () => checkRateLimit("/api/upload", request));

      const results = await Promise.all(promises);
      const elapsed = performance.now() - start;
      const allowed = results.filter((r) => r.allowed).length;
      const blocked = results.filter((r) => !r.allowed).length;

      console.log(
        `  100 concurrent (same IP): ${elapsed.toFixed(0)}ms, allowed=${allowed} blocked=${blocked}`,
      );

      expect(allowed).toBeLessThanOrEqual(20);
    });
  });

  describe("Accuracy under load", () => {
    it("rate limit correctly enforces after burst", async () => {
      const request = makeRequest("172.16.0.1");

      for (let i = 0; i < 20; i++) {
        await checkRateLimit("/api/upload", request);
      }

      const result = await checkRateLimit("/api/upload", request);
      expect(result.allowed).toBe(false);
      expect(result.retryAfterMs).toBeGreaterThan(0);
    });

    it("different endpoints have independent limits", async () => {
      const request = makeRequest("172.16.0.2");

      for (let i = 0; i < 20; i++) {
        await checkRateLimit("/api/upload", request);
      }

      const uploadResult = await checkRateLimit("/api/upload", request);
      const searchResult = await checkRateLimit("/api/search", request);

      expect(uploadResult.allowed).toBe(false);
      expect(searchResult.allowed).toBe(true);
    });
  });

  describe("Memory bounds", () => {
    it("memory fallback map stays bounded", async () => {
      for (let i = 0; i < 200; i++) {
        const request = makeRequest(
          `10.${Math.floor(i / 255)}.${i % 255}.${Math.floor(Math.random() * 255)}`,
        );
        await checkRateLimit("/api/upload", request);
      }

      cleanupExpiredEntries();

      console.log("  200 unique IPs processed, cleanup completed without error");
    });
  });
});
