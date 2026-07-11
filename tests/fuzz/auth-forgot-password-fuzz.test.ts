import { describe, it, expect, vi } from "vitest";
import { POST as forgotPasswordPost } from "@/app/api/auth/forgot-password/route";

vi.mock("@/clients/redis", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  rateLimitResponse: vi
    .fn()
    .mockReturnValue(
      new Response(JSON.stringify({ error: { code: "RATE_LIMITED" } }), { status: 429 }),
    ),
}));

vi.mock("@/core/composition-root", () => ({
  useCases: {
    passwordReset: {
      forgotPassword: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock("@/middleware/audit", () => ({
  auditLog: vi.fn().mockResolvedValue(undefined),
  AUDIT_ACTIONS: { PASSWORD_RESET_REQUEST: "auth.password.reset.request" },
}));

vi.mock("@/lib/email/send", () => ({
  sendResetPasswordEmail: vi.fn().mockResolvedValue({ success: true }),
}));

function createRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const fuzzCases: Array<[string, unknown]> = [
  ["empty body", null],
  ["malformed JSON", "not-json"],
  ["SQL injection in email", { email: "' OR 1=1--" }],
  ["XSS in email", { email: "<script>alert(1)</script>" }],
  ["empty object", {}],
  ["array instead of object", [1, 2, 3]],
  ["prototype pollution", { email: "t@t.com", __proto__: { hacked: true } }],
  ["missing email field", { notEmail: "value" }],
  ["null email", { email: null }],
  ["undefined email", { email: undefined }],
  ["empty email string", { email: "" }],
  ["email with null byte", { email: "test\x00@test.com" }],
  ["email with control chars", { email: "test\n@test.com" }],
  ["very long email", { email: "a".repeat(300) + "@test.com" }],
  ["email with path traversal", { email: "../../etc/passwd" }],
  ["postgres injection", { email: "test@test.com'; DROP TABLE users; --" }],
  ["NoSQL injection", { email: { $ne: "" } }],
  ["unexpected extra fields", { email: "t@t.com", role: "ADMIN", sudo: true }],
  ["number as email", { email: 12345 }],
  ["array as email", { email: ["a@b.com"] }],
  ["untrimmed email", { email: "  test@test.com  " }],
  ["email with unicode normalization", { email: "tést@test.com" }],
  ["email with RTL override", { email: "\u202Etest@test.com" }],
  ["email with zero-width chars", { email: "test\u200B@test.com" }],
];

describe("Fuzz: POST /api/auth/forgot-password", () => {
  it.each(fuzzCases)("handles %s without 500 crash", async (_, payload) => {
    const req = createRequest(payload);
    const res = await forgotPasswordPost(req);
    expect(res.status).toBeGreaterThanOrEqual(200);
    if (res.status >= 400) {
      const body = await res.json();
      expect(body).toHaveProperty("error");
    }
  });
});
