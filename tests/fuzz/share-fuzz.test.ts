import { describe, it, expect, vi } from "vitest";
import { GET as shareGet } from "@/app/api/share/[token]/route";
import { GET as shareExportGet } from "@/app/api/share/[token]/export/[format]/route";

vi.mock("@/core/composition-root", () => ({
  repos: {
    tagDocument: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    folder: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    storage: {
      ocrTextKey: vi.fn().mockReturnValue("ocr/key"),
      exportOutputKey: vi.fn().mockReturnValue("export/key"),
      exportCacheKey: vi.fn().mockReturnValue("cache/key"),
      fileExists: vi.fn().mockResolvedValue(false),
      downloadFile: vi.fn().mockResolvedValue(Buffer.from("")),
    },
    document: {
      findFirst: vi.fn().mockResolvedValue({
        id: "share-doc",
        title: "Shared Doc",
        description: null,
        language: "ar",
        isRtl: true,
        pageCount: 5,
        outputFormats: ["md", "txt"],
        createdAt: new Date(),
        status: "COMPLETED",
      }),
    },
  },
  useCases: {
    shareAccess: {
      execute: vi.fn().mockResolvedValue({
        share: {
          documentId: "share-doc",
          document: {
            id: "share-doc",
            title: "Shared Doc",
            description: null,
            language: "ar",
            isRtl: true,
            pageCount: 5,
            outputFormats: ["md", "txt"],
            createdAt: new Date(),
          },
        },
      }),
    },
  },
}));

vi.mock("@/shared/validators/share", () => ({
  SHARE_EXPORT_FORMATS: ["md", "txt", "json", "docx", "pdf", "epub", "searchable-pdf"] as const,
}));

vi.mock("@/core/services/export/profiles", () => ({
  contentDispositionHeader: vi.fn().mockReturnValue("attachment"),
  sanitizeTitle: vi.fn().mockReturnValue("shared-doc"),
  getContentType: vi.fn().mockReturnValue("text/markdown"),
}));

vi.mock("@/clients/redis", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  rateLimitResponse: vi
    .fn()
    .mockReturnValue(
      new Response(JSON.stringify({ error: { code: "RATE_LIMITED" } }), { status: 429 }),
    ),
}));

const tokenFuzzCases: Array<[string, string]> = [
  ["empty token", ""],
  ["null byte", "token\x00abc"],
  ["SQL injection", "' OR 1=1--"],
  ["path traversal", "../../etc/passwd"],
  ["very long token", "A".repeat(10_000)],
  ["unicode token", "tést\u200Btoken"],
  ["RTL override", "\u202Eoverride"],
  ["special chars", "!@#$%^&*()"],
  ["emoji token", "🔑test"],
  ["control chars", "token\nabc"],
  ["prototype pollution", "__proto__"],
  ["constructor", "constructor"],
  ["UUID injection", "'; DROP TABLE shares;--"],
  ["JWT-like token", "eyJhbGciOiJIUzI1NiJ9.eyJhZG1pbiI6dHJ1ZX0"],
];

const formatFuzzCases: Array<[string, string]> = [
  ["empty format", ""],
  ["invalid format", "exe"],
  ["SQL injection in format", "' OR 1=1--"],
  ["XSS in format", "<script>alert(1)</script>"],
  ["very long format", "A".repeat(10_000)],
  ["mixed case format", "Md"],
  ["format with null byte", "md\x00"],
  ["format with slashes", "../pdf"],
  ["unicode format", "tést"],
  ["proto format", "__proto__"],
  ["dot format", "....//...//md"],
  ["space format", "md txt"],
];

describe("Fuzz: GET /api/share/[token]", () => {
  it.each(tokenFuzzCases)("handles token '%s' without 500 crash", async (_, token) => {
    const req = new Request(`http://localhost/api/share/${encodeURIComponent(token)}`, {
      method: "GET",
    });
    const res = await shareGet(req, { params: Promise.resolve({ token }) } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
    if (res.status >= 400) {
      const b = await res.json();
      expect(b).toHaveProperty("error");
    }
  });
});

describe("Fuzz: GET /api/share/[token]/export/[format]", () => {
  it.each(tokenFuzzCases)(
    "handles token '%s' with format 'md' without 500 crash",
    async (_, token) => {
      const req = new Request(`http://localhost/api/share/${encodeURIComponent(token)}/export/md`, {
        method: "GET",
      });
      const res = await shareExportGet(req, {
        params: Promise.resolve({ token, format: "md" }),
      } as any);
      expect(res.status).toBeGreaterThanOrEqual(200);
    },
  );

  it.each(formatFuzzCases)("handles format '%s' without 500 crash", async (_, format) => {
    const req = new Request(
      `http://localhost/api/share/token-test/export/${encodeURIComponent(format)}`,
      { method: "GET" },
    );
    const res = await shareExportGet(req, {
      params: Promise.resolve({ token: "token-test", format }),
    } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
    if (res.status === 400) {
      const b = await res.json();
      expect(b).toHaveProperty("error");
    }
  });
});
