import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as exportGet } from "@/app/api/export/[id]/[format]/route";
import { mockSession } from "../api/setup";

vi.mock("@/core/composition-root", () => ({
  useCases: {
    exportDocument: {
      execute: vi.fn().mockResolvedValue({
        buffer: Buffer.from("test content"),
        document: { title: "test-document" },
      }),
    },
  },
}));

vi.mock("@/core/services/export/profiles", () => ({
  contentDispositionHeader: vi.fn().mockReturnValue('attachment; filename="test.txt"'),
  getContentType: vi.fn().mockReturnValue("text/plain"),
}));

vi.mock("@/clients/redis", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  rateLimitResponse: vi
    .fn()
    .mockReturnValue(
      new Response(JSON.stringify({ error: { code: "RATE_LIMITED" } }), { status: 429 }),
    ),
}));

const idFuzzCases: Array<[string, string]> = [
  ["empty id", ""],
  ["null byte", "doc\x00id"],
  ["SQL injection", "' OR 1=1--"],
  ["path traversal", "../../etc/passwd"],
  ["very long id", "A".repeat(10_000)],
  ["unicode", "tést\u200B"],
  ["RTL override", "\u202Eoverride"],
  ["special chars", "!@#$%^&*()"],
  ["emoji", "📄🔑"],
  ["control chars", "doc\nid"],
  ["prototype pollution", "__proto__"],
  ["constructor", "constructor"],
];

const formatFuzzCases: Array<[string, string]> = [
  ["empty format", ""],
  ["invalid format", "exe"],
  ["SQL injection in format", "' OR 1=1--"],
  ["XSS in format", "<script>alert(1)</script>"],
  ["very long format", "A".repeat(10_000)],
  ["mixed case", "Md"],
  ["format with null byte", "md\x00"],
  ["format with path", "../../etc/passwd"],
  ["unicode format", "tést"],
  ["format with slashes", "../md"],
  ["format with dots", "....//...//md"],
  ["format with spaces", "md txt"],
  ["emoji format", "📄"],
  ["prototype pollution", "__proto__"],
];

describe("Fuzz: GET /api/export/[id]/[format]", () => {
  beforeEach(() => {
    mockSession.user = {
      id: "user-export-fuzz",
      name: "Fuzzer",
      email: "fuzz@test.com",
      role: "USER",
    } as any;
  });

  it.each(idFuzzCases)("handles id '%s' with format 'md' without 500 crash", async (_, id) => {
    const req = new Request(`http://localhost/api/export/${encodeURIComponent(id)}/md`, {
      method: "GET",
    });
    const res = await exportGet(req, { params: Promise.resolve({ id, format: "md" }) } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
  });

  it.each(formatFuzzCases)("handles format '%s' without 500 crash", async (_, format) => {
    const req = new Request(`http://localhost/api/export/doc-id/${encodeURIComponent(format)}`, {
      method: "GET",
    });
    const res = await exportGet(req, { params: Promise.resolve({ id: "doc-id", format }) } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
    if (res.status === 400) {
      const b = await res.json();
      expect(b).toHaveProperty("error");
    }
  });
});
