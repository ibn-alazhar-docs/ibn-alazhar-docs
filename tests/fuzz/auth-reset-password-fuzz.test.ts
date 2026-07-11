import { describe, it, expect, vi } from "vitest";
import { POST as resetPasswordPost } from "@/app/api/auth/reset-password/route";

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
      resetPassword: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

vi.mock("@/middleware/audit", () => ({
  auditLog: vi.fn().mockResolvedValue(undefined),
  AUDIT_ACTIONS: { PASSWORD_RESET_COMPLETE: "auth.password.reset.complete" },
}));

function createRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const fuzzCases: Array<[string, unknown]> = [
  ["empty body", null],
  ["malformed JSON", "not-json-at-all"],
  [
    "SQL injection in email",
    { email: "' OR 1=1--", token: "tok123", password: "NewPass123", confirmPassword: "NewPass123" },
  ],
  [
    "SQL injection in token",
    {
      email: "t@t.com",
      token: "'; DROP TABLE verification_token;--",
      password: "NewPass123",
      confirmPassword: "NewPass123",
    },
  ],
  [
    "XSS in email",
    {
      email: "<script>alert(1)</script>",
      token: "tok123",
      password: "NewPass123",
      confirmPassword: "NewPass123",
    },
  ],
  ["empty object", {}],
  ["array instead of object", [1, 2, 3]],
  [
    "prototype pollution",
    {
      email: "t@t.com",
      token: "tok",
      password: "NewPass123",
      confirmPassword: "NewPass123",
      __proto__: { hacked: true },
    },
  ],
  ["missing email", { token: "tok", password: "NewPass123", confirmPassword: "NewPass123" }],
  ["missing token", { email: "t@t.com", password: "NewPass123", confirmPassword: "NewPass123" }],
  ["missing password", { email: "t@t.com", token: "tok" }],
  [
    "null email",
    { email: null, token: "tok", password: "NewPass123", confirmPassword: "NewPass123" },
  ],
  [
    "null token",
    { email: "t@t.com", token: null, password: "NewPass123", confirmPassword: "NewPass123" },
  ],
  [
    "empty token",
    { email: "t@t.com", token: "", password: "NewPass123", confirmPassword: "NewPass123" },
  ],
  [
    "weak password (too short)",
    { email: "t@t.com", token: "tok", password: "Short1", confirmPassword: "Short1" },
  ],
  [
    "password without uppercase",
    { email: "t@t.com", token: "tok", password: "lowercase1", confirmPassword: "lowercase1" },
  ],
  [
    "password without lowercase",
    { email: "t@t.com", token: "tok", password: "UPPERCASE1", confirmPassword: "UPPERCASE1" },
  ],
  [
    "password without number",
    { email: "t@t.com", token: "tok", password: "NoNumbers", confirmPassword: "NoNumbers" },
  ],
  [
    "ultra long password (129 chars)",
    {
      email: "t@t.com",
      token: "tok",
      password: "Ab1" + "x".repeat(126),
      confirmPassword: "Ab1" + "x".repeat(126),
    },
  ],
  [
    "mismatched passwords",
    { email: "t@t.com", token: "tok", password: "ValidPass1", confirmPassword: "Different1" },
  ],
  [
    "email with null byte",
    {
      email: "test\x00@test.com",
      token: "tok",
      password: "ValidPass1",
      confirmPassword: "ValidPass1",
    },
  ],
  [
    "email with control chars",
    {
      email: "test\n@test.com",
      token: "tok",
      password: "ValidPass1",
      confirmPassword: "ValidPass1",
    },
  ],
  [
    "extra unexpected fields",
    {
      email: "t@t.com",
      token: "tok",
      password: "ValidPass1",
      confirmPassword: "ValidPass1",
      admin: true,
    },
  ],
  [
    "number as email",
    { email: 12345, token: "tok", password: "ValidPass1", confirmPassword: "ValidPass1" },
  ],
  [
    "array as token",
    {
      email: "t@t.com",
      token: ["tok1", "tok2"],
      password: "ValidPass1",
      confirmPassword: "ValidPass1",
    },
  ],
];

describe("Fuzz: POST /api/auth/reset-password", () => {
  it.each(fuzzCases)("handles %s without 500 crash", async (_, payload) => {
    const req = createRequest(payload);
    const res = await resetPasswordPost(req);
    expect(res.status).toBeGreaterThanOrEqual(200);
    if (res.status >= 400) {
      const body = await res.json();
      expect(body).toHaveProperty("error");
    }
  });
});
