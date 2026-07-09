import { describe, it, expect } from "vitest";
import { getClientIp } from "@/clients/redis";

describe("Security Fixes — Rate Limiting", () => {
  describe("getClientIp", () => {
    const createRequest = (headers: Record<string, string> = {}) => {
      return new Request("http://localhost", { headers });
    };

    it("extracts IP from x-forwarded-for header (IPv4)", () => {
      const req = createRequest({ "x-forwarded-for": "192.168.1.1, 10.0.0.1" });
      expect(getClientIp(req)).toBe("192.168.1.1");
    });

    it("extracts IP from x-forwarded-for header (IPv6)", () => {
      const req = createRequest({ "x-forwarded-for": "2001:db8::1" });
      expect(getClientIp(req)).toBe("2001:db8::1");
    });

    it("rejects invalid IP format from x-forwarded-for", () => {
      const req = createRequest({ "x-forwarded-for": "not-an-ip" });
      expect(getClientIp(req)).toBe("unknown");
    });

    it("rejects empty x-forwarded-for", () => {
      const req = createRequest({ "x-forwarded-for": "" });
      expect(getClientIp(req)).toBe("unknown");
    });

    it("rejects IPs with invalid characters", () => {
      const req = createRequest({ "x-forwarded-for": "192.168.1.1; DROP TABLE users" });
      expect(getClientIp(req)).toBe("unknown");
    });

    it("extracts IP from x-real-ip header (IPv4)", () => {
      const req = createRequest({ "x-real-ip": "10.0.0.1" });
      expect(getClientIp(req)).toBe("10.0.0.1");
    });

    it("extracts IP from x-real-ip header (IPv6)", () => {
      const req = createRequest({ "x-real-ip": "::1" });
      expect(getClientIp(req)).toBe("::1");
    });

    it("rejects invalid x-real-ip format", () => {
      const req = createRequest({ "x-real-ip": "invalid" });
      expect(getClientIp(req)).toBe("unknown");
    });

    it("returns unknown when no IP headers present", () => {
      const req = createRequest();
      expect(getClientIp(req)).toBe("unknown");
    });

    it("accepts IPv6 with many colons (rate limit key purposes)", () => {
      const req = createRequest({ "x-forwarded-for": ":::::" });
      expect(getClientIp(req)).toBe(":::::");
    });

    it("accepts IPv4 with high octets (rate limit key purposes)", () => {
      const req = createRequest({ "x-forwarded-for": "999.999.999.999" });
      expect(getClientIp(req)).toBe("999.999.999.999");
    });
  });
});
