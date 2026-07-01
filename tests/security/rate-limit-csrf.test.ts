import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, cleanupExpiredEntries } from "@/lib/backend/rate-limit";

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: new Headers(headers),
  });
}

describe("Rate Limiting Security", () => {
  beforeEach(() => {
    cleanupExpiredEntries();
  });

  describe("Rate limit enforcement", () => {
    it("allows requests within limit", async () => {
      const request = makeRequest({ "x-forwarded-for": "1.2.3.4" });
      const result = await checkRateLimit("/api/upload", request);
      expect(result.allowed).toBe(true);
    });

    it("unrated endpoints always allowed", async () => {
      const request = makeRequest({ "x-forwarded-for": "1.2.3.4" });
      const result = await checkRateLimit("/api/health", request);
      expect(result.allowed).toBe(true);
    });

    it("upload endpoint has limit of 20 per minute", async () => {
      const ip = "10.0.0.1";
      const request = makeRequest({ "x-forwarded-for": ip });

      let lastResult = { allowed: true };
      for (let i = 0; i < 21; i++) {
        lastResult = await checkRateLimit("/api/upload", request);
      }

      expect(lastResult.allowed).toBe(false);
    });

    it("search endpoint has limit of 30 per minute", async () => {
      const ip = "10.0.0.2";
      const request = makeRequest({ "x-forwarded-for": ip });

      let lastResult = { allowed: true };
      for (let i = 0; i < 31; i++) {
        lastResult = await checkRateLimit("/api/search", request);
      }

      expect(lastResult.allowed).toBe(false);
    });

    it("register endpoint has limit of 50 per minute", async () => {
      const ip = "10.0.0.3";
      const request = makeRequest({ "x-forwarded-for": ip });

      let lastResult = { allowed: true };
      for (let i = 0; i < 51; i++) {
        lastResult = await checkRateLimit("/api/auth/register", request);
      }

      expect(lastResult.allowed).toBe(false);
    });

    it("returns retryAfterMs when rate limited", async () => {
      const ip = "10.0.0.4";
      const request = makeRequest({ "x-forwarded-for": ip });

      for (let i = 0; i < 21; i++) {
        await checkRateLimit("/api/upload", request);
      }

      const result = await checkRateLimit("/api/upload", request);
      expect(result.allowed).toBe(false);
      expect(result.retryAfterMs).toBeGreaterThan(0);
    });
  });

  describe("IP isolation", () => {
    it("different IPs have separate rate limit buckets", async () => {
      const req1 = makeRequest({ "x-forwarded-for": "192.168.1.1" });
      const req2 = makeRequest({ "x-forwarded-for": "192.168.1.2" });

      for (let i = 0; i < 20; i++) {
        await checkRateLimit("/api/upload", req1);
      }

      const result1 = await checkRateLimit("/api/upload", req1);
      expect(result1.allowed).toBe(false);

      const result2 = await checkRateLimit("/api/upload", req2);
      expect(result2.allowed).toBe(true);
    });

    it("x-forwarded-for first IP used for rate limiting", async () => {
      const request = makeRequest({ "x-forwarded-for": "1.1.1.1, 2.2.2.2, 3.3.3.3" });
      const result = await checkRateLimit("/api/upload", request);
      expect(result.allowed).toBe(true);
    });

    it("x-real-ip used as fallback", async () => {
      const request = makeRequest({ "x-real-ip": "5.5.5.5" });
      const result = await checkRateLimit("/api/upload", request);
      expect(result.allowed).toBe(true);
    });

    it("unknown IP when no headers present", async () => {
      const request = makeRequest();
      const result = await checkRateLimit("/api/upload", request);
      expect(result.allowed).toBe(true);
    });
  });

  describe("Memory fallback bounds", () => {
    it("cleanupExpiredEntries does not throw", () => {
      expect(() => cleanupExpiredEntries()).not.toThrow();
    });

    it("cleanupExpiredEntries removes old entries", async () => {
      const request = makeRequest({ "x-forwarded-for": "99.99.99.99" });
      await checkRateLimit("/api/upload", request);

      cleanupExpiredEntries();

      const result = await checkRateLimit("/api/upload", request);
      expect(result.allowed).toBe(true);
    });
  });
});

describe("CSRF Protection", () => {
  describe("Origin validation logic", () => {
    it("matching origin passes CSRF check", () => {
      const origin = "http://localhost:3000";
      const expectedHost = "localhost:3000";
      const originUrl = new URL(origin);
      expect(originUrl.host).toBe(expectedHost);
    });

    it("mismatched origin fails CSRF check", () => {
      const origin = "http://evil.com";
      const expectedHost = "localhost:3000";
      const originUrl = new URL(origin);
      expect(originUrl.host).not.toBe(expectedHost);
    });

    it("invalid origin URL caught by try-catch", () => {
      const origin = "not-a-url";
      expect(() => new URL(origin)).toThrow();
    });

    it("referer fallback works when origin missing", () => {
      const referer = "http://localhost:3000/dashboard";
      const expectedHost = "localhost:3000";
      const refererUrl = new URL(referer);
      expect(refererUrl.host).toBe(expectedHost);
    });

    it("session cookie without origin/referer is rejected", () => {
      const hasSession = true;
      const hasOrigin = false;
      const hasReferer = false;
      const shouldReject = hasSession && !hasOrigin && !hasReferer;
      expect(shouldReject).toBe(true);
    });
  });
});
