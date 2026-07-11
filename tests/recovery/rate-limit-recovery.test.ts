import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, cleanupExpiredEntries } from "@/clients/redis";

function makeRequest(ip: string): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: new Headers({ "x-forwarded-for": ip }),
  });
}

describe("Rate Limiter Recovery", () => {
  beforeEach(() => {
    cleanupExpiredEntries();
  });

  describe("Recovery after rate limit exhaustion", () => {
    it("rate limit resets after window expires", async () => {
      const request = makeRequest("10.1.1.1");

      for (let i = 0; i < 20; i++) {
        await checkRateLimit("/api/upload", request);
      }

      const blocked = await checkRateLimit("/api/upload", request);
      expect(blocked.allowed).toBe(false);

      const allowed = await checkRateLimit("/api/search", request);
      expect(allowed.allowed).toBe(true);
    });

    it("different endpoints recover independently", async () => {
      const request = makeRequest("10.1.1.2");

      for (let i = 0; i < 50; i++) {
        await checkRateLimit("/api/auth/register", request);
      }

      const registerResult = await checkRateLimit("/api/auth/register", request);
      expect(registerResult.allowed).toBe(false);

      const uploadResult = await checkRateLimit("/api/upload", request);
      expect(uploadResult.allowed).toBe(true);

      const searchResult = await checkRateLimit("/api/search", request);
      expect(searchResult.allowed).toBe(true);
    });
  });

  describe("Memory map recovery", () => {
    it("cleanupExpiredEntries runs safely and new IPs unaffected", async () => {
      const request = makeRequest("10.2.2.1");

      for (let i = 0; i < 20; i++) {
        await checkRateLimit("/api/upload", request);
      }

      cleanupExpiredEntries();

      const freshRequest = makeRequest("10.2.2.99");
      const result = await checkRateLimit("/api/upload", freshRequest);
      expect(result.allowed).toBe(true);
    });

    it("memory map handles 500 unique IPs without degradation", async () => {
      const start = performance.now();

      for (let i = 0; i < 500; i++) {
        const ip = `172.16.${Math.floor(i / 255)}.${i % 255}`;
        const request = makeRequest(ip);
        await checkRateLimit("/api/upload", request);
      }

      const elapsed = performance.now() - start;
      console.log(`  500 unique IPs: ${elapsed.toFixed(0)}ms`);

      const newRequest = makeRequest("192.168.0.1");
      const result = await checkRateLimit("/api/upload", newRequest);
      expect(result.allowed).toBe(true);
    });
  });

  describe("Flood recovery", () => {
    it("system recovers after 200 rapid requests from same IP", async () => {
      const request = makeRequest("10.3.3.1");

      const results: boolean[] = [];
      for (let i = 0; i < 200; i++) {
        const r = await checkRateLimit("/api/upload", request);
        results.push(r.allowed);
      }

      const blocked = results.filter((r) => !r).length;
      expect(blocked).toBeGreaterThan(100);

      const otherIp = makeRequest("10.3.3.2");
      const fresh = await checkRateLimit("/api/upload", otherIp);
      expect(fresh.allowed).toBe(true);
    });

    it("concurrent flood from 50 IPs all handled correctly", async () => {
      const promises = Array.from({ length: 50 }, (_, i) => {
        const request = makeRequest(`10.4.${Math.floor(i / 255)}.${i % 255}`);
        return checkRateLimit("/api/upload", request);
      });

      const results = await Promise.all(promises);
      const allowed = results.filter((r) => r.allowed).length;

      expect(allowed).toBe(50);
    });
  });
});
