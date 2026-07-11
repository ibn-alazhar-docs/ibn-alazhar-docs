import { describe, it, expect, vi } from "vitest";
import { POST as registerPost } from "@/app/api/auth/register/route";

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
    registration: {
      register: vi
        .fn()
        .mockResolvedValue({ id: "user-reg-fuzz", name: "Test", email: "test@test.com" }),
    },
  },
}));

vi.mock("@/middleware/audit", () => ({
  auditLog: vi.fn().mockResolvedValue(undefined),
  AUDIT_ACTIONS: { REGISTER: "auth.register" },
}));

function createRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const fuzzCases: Array<[string, unknown]> = [
  ["empty body", null],
  ["undefined body (not JSON)", "this-is-not-json"],
  ["malformed JSON brackets", '{"email": "test"}'],
  [
    "SQL injection in email",
    {
      email: "' OR 1=1--",
      password: "TestPass123",
      confirmPassword: "TestPass123",
      name: "Hacker",
    },
  ],
  [
    "SQL injection in name",
    {
      email: "valid@test.com",
      password: "TestPass123",
      confirmPassword: "TestPass123",
      name: "Robert'); DROP TABLE users;--",
    },
  ],
  [
    "XSS in name",
    {
      email: "test@test.com",
      password: "TestPass123",
      confirmPassword: "TestPass123",
      name: "<script>alert('xss')</script>",
    },
  ],
  [
    "XSS in email",
    {
      email: '"><img src=x onerror=alert(1)>',
      password: "TestPass123",
      confirmPassword: "TestPass123",
      name: "Test",
    },
  ],
  [
    "prototype pollution",
    {
      email: "t@t.com",
      password: "TestPass123",
      confirmPassword: "TestPass123",
      name: "Test",
      __proto__: { admin: true },
    },
  ],
  [
    "constructor pollution",
    {
      email: "t@t.com",
      password: "TestPass123",
      confirmPassword: "TestPass123",
      name: "Test",
      constructor: { prototype: { role: "ADMIN" } },
    },
  ],
  ["empty object", {}],
  ["array instead of object", [1, 2, 3]],
  ["string instead of object", "just a string"],
  ["number instead of object", 42],
  [
    "null email",
    { email: null, password: "TestPass123", confirmPassword: "TestPass123", name: "Test" },
  ],
  [
    "empty email",
    { email: "", password: "TestPass123", confirmPassword: "TestPass123", name: "Test" },
  ],
  [
    "long name (10KB+)",
    {
      email: "t@t.com",
      password: "TestPass123",
      confirmPassword: "TestPass123",
      name: "A".repeat(10_001),
    },
  ],
  [
    "name with null byte",
    {
      email: "t@t.com",
      password: "TestPass123",
      confirmPassword: "TestPass123",
      name: "Test\x00User",
    },
  ],
  [
    "name with control chars",
    {
      email: "t@t.com",
      password: "TestPass123",
      confirmPassword: "TestPass123",
      name: "Test\n\r\tUser",
    },
  ],
  [
    "name with zero-width chars",
    {
      email: "t@t.com",
      password: "TestPass123",
      confirmPassword: "TestPass123",
      name: "Test\u200B\u200C\u200DUser",
    },
  ],
  [
    "name with RTL override",
    {
      email: "t@t.com",
      password: "TestPass123",
      confirmPassword: "TestPass123",
      name: "\u202Etest\u202D",
    },
  ],
  [
    "name with BOM",
    {
      email: "t@t.com",
      password: "TestPass123",
      confirmPassword: "TestPass123",
      name: "\uFEFFTest",
    },
  ],
  [
    "name with emoji sequence",
    {
      email: "t@t.com",
      password: "TestPass123",
      confirmPassword: "TestPass123",
      name: "👨‍👩‍👧‍👦Test🏴󐁧󐁢󐁳󐁣󐁴󐁿",
    },
  ],
  [
    "email with unicode normalization",
    {
      email: "tést@test.com",
      password: "TestPass123",
      confirmPassword: "TestPass123",
      name: "Test",
    },
  ],
  [
    "email with HTML injection",
    {
      email: "<b>test@test.com</b>",
      password: "TestPass123",
      confirmPassword: "TestPass123",
      name: "Test",
    },
  ],
  [
    "password only spaces",
    { email: "t@t.com", password: "   ", confirmPassword: "   ", name: "Test" },
  ],
  [
    "password without uppercase",
    { email: "t@t.com", password: "lowercase1", confirmPassword: "lowercase1", name: "Test" },
  ],
  [
    "password without lowercase",
    { email: "t@t.com", password: "UPPERCASE1", confirmPassword: "UPPERCASE1", name: "Test" },
  ],
  [
    "password without number",
    { email: "t@t.com", password: "OnlyLetters", confirmPassword: "OnlyLetters", name: "Test" },
  ],
  [
    "ultra long password (129 chars)",
    {
      email: "t@t.com",
      password: "Ab1" + "x".repeat(126),
      confirmPassword: "Ab1" + "x".repeat(126),
      name: "Test",
    },
  ],
  [
    "mismatched passwords",
    { email: "t@t.com", password: "TestPass123", confirmPassword: "DifferentPass1", name: "Test" },
  ],
  ["all fields empty", { email: "", password: "", confirmPassword: "", name: "" }],
  [
    "extra unexpected fields",
    {
      email: "t@t.com",
      password: "TestPass123",
      confirmPassword: "TestPass123",
      name: "Test",
      extraField: "shouldBeIgnored",
      role: "ADMIN",
    },
  ],
  [
    "very long email",
    {
      email: "a".repeat(200) + "@test.com",
      password: "TestPass123",
      confirmPassword: "TestPass123",
      name: "Test",
    },
  ],
  [
    "email with JS injection",
    {
      email: 'test@test.com";alert(1);//',
      password: "TestPass123",
      confirmPassword: "TestPass123",
      name: "Test",
    },
  ],
  [
    "name with path traversal",
    {
      email: "t@t.com",
      password: "TestPass123",
      confirmPassword: "TestPass123",
      name: "../../etc/passwd",
    },
  ],
  [
    "object with getter injection",
    Object.defineProperty({}, "email", { get: () => "hacked@test.com" }) as unknown as Record<
      string,
      unknown
    >,
  ],
];

describe("Fuzz: POST /api/auth/register", () => {
  it.each(fuzzCases)("handles %s without 500 crash", async (_, payload) => {
    const req = createRequest(payload);
    const res = await registerPost(req);
    expect(res.status).toBeGreaterThanOrEqual(200);
    if (res.status >= 400) {
      const body = await res.json();
      expect(body).toHaveProperty("error");
    }
  });
});
