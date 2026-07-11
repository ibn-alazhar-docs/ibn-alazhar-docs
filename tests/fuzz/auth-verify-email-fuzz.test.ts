import { describe, it, expect, vi } from "vitest";
import { GET as verifyEmailGet } from "@/app/api/auth/verify-email/route";

vi.mock("@/clients/redis", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  rateLimitResponse: vi
    .fn()
    .mockReturnValue(
      new Response(JSON.stringify({ error: { code: "RATE_LIMITED" } }), { status: 429 }),
    ),
}));

vi.mock("@/transport/db", () => ({
  prisma: {
    verificationToken: {
      findUnique: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue({}),
    },
    user: {
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock("@/middleware/audit", () => ({
  auditLog: vi.fn().mockResolvedValue(undefined),
  AUDIT_ACTIONS: { EMAIL_VERIFIED: "auth.email.verified" },
}));

function createRequest(urlString: string): Request {
  return new Request(urlString, { method: "GET" });
}

const fuzzCases: Array<[string, string]> = [
  ["no query params", "http://localhost/api/auth/verify-email"],
  ["empty token param", "http://localhost/api/auth/verify-email?token="],
  ["SQL injection in token", "http://localhost/api/auth/verify-email?token=' OR 1=1--"],
  ["XSS in token", "http://localhost/api/auth/verify-email?token=<script>alert(1)</script>"],
  ["path traversal in token", "http://localhost/api/auth/verify-email?token=../../etc/passwd"],
  ["very long token", "http://localhost/api/auth/verify-email?token=" + "A".repeat(10_000)],
  ["multiple token params", "http://localhost/api/auth/verify-email?token=a&token=b"],
  ["unicode in token", "http://localhost/api/auth/verify-email?token=tést\u200Btoken"],
  ["RTL override in token", "http://localhost/api/auth/verify-email?token=\u202Eoverride"],
  ["null byte in token", "http://localhost/api/auth/verify-email?token=test\x00token"],
  ["empty locale", "http://localhost/api/auth/verify-email?token=abc&locale="],
  ["invalid locale", "http://localhost/api/auth/verify-email?token=abc&locale=fr"],
  [
    "SQL injection in locale",
    "http://localhost/api/auth/verify-email?token=abc&locale='; DROP TABLE users;--",
  ],
  ["array-like param", "http://localhost/api/auth/verify-email?token[]=abc&token[]=def"],
  [
    "prototype pollution param",
    "http://localhost/api/auth/verify-email?token=abc&__proto__[admin]=true",
  ],
  ["extremely long query string", "http://localhost/api/auth/verify-email?" + "A".repeat(50_000)],
  ["special chars in token", "http://localhost/api/auth/verify-email?token=abc!@#$%^&*()"],
  ["token with newline", "http://localhost/api/auth/verify-email?token=abc%0Adef"],
  ["BOM in token", "http://localhost/api/auth/verify-email?token=\uFEFFabc"],
  ["emoji in token", "http://localhost/api/auth/verify-email?token=🔑test"],
];

describe("Fuzz: GET /api/auth/verify-email", () => {
  it.each(fuzzCases)("handles %s without 500 crash", async (_, url) => {
    const req = createRequest(url);
    const res = await verifyEmailGet(req);
    expect(res.status).toBeGreaterThanOrEqual(200);
  });
});
