import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as exportBatchPost } from "@/app/api/export/batch/route";
import { POST as exportFolderPost } from "@/app/api/export/folder/route";
import { POST as exportTagPost } from "@/app/api/export/tag/route";
import { mockSession } from "../api/setup";

vi.mock("@/core/composition-root", () => ({
  useCases: {
    export: {
      exportByBatch: vi
        .fn()
        .mockResolvedValue({ zipBuffer: Buffer.from("zip"), zipName: "export.zip" }),
      exportByFolder: vi
        .fn()
        .mockResolvedValue({ zipBuffer: Buffer.from("zip"), zipName: "folder.zip" }),
      exportByTag: vi.fn().mockResolvedValue({ zipBuffer: Buffer.from("zip"), zipName: "tag.zip" }),
    },
  },
}));

vi.mock("@/core/services/export/validators", () => {
  const { z } = require("zod");
  const EXPORT_FORMATS = ["md", "txt", "json", "zip", "docx", "epub", "pdf"] as const;
  const EXPORT_PROFILES = ["research", "archive", "plain", "developer"] as const;

  return {
    batchExportSchema: z
      .object({
        documentIds: z
          .array(z.string().min(1))
          .min(1, "Document IDs required")
          .max(50, "Max 50 per batch"),
        format: z.enum(EXPORT_FORMATS, { error: "Unsupported format" }),
        profile: z.enum(EXPORT_PROFILES, { error: "Unsupported profile" }),
        includeSource: z.boolean().optional().default(false),
      })
      .strip(),
    folderExportSchema: z
      .object({
        folderId: z.string().min(1, "Folder ID required"),
        format: z.enum(EXPORT_FORMATS, { error: "Unsupported format" }),
        profile: z.enum(EXPORT_PROFILES, { error: "Unsupported profile" }),
        includeSource: z.boolean().optional().default(false),
        recursive: z.boolean().optional().default(true),
      })
      .strip(),
    tagExportSchema: z
      .object({
        tagId: z.string().min(1, "Tag ID required"),
        format: z.enum(EXPORT_FORMATS, { error: "Unsupported format" }),
        profile: z.enum(EXPORT_PROFILES, { error: "Unsupported profile" }),
        includeSource: z.boolean().optional().default(false),
      })
      .strip(),
  };
});

vi.mock("@/core/services/export/profiles", () => ({
  contentDispositionHeader: vi.fn().mockReturnValue("attachment"),
}));

vi.mock("@/clients/redis", () => ({
  checkUserRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  rateLimitResponse: vi
    .fn()
    .mockReturnValue(
      new Response(JSON.stringify({ error: { code: "RATE_LIMITED" } }), { status: 429 }),
    ),
}));

function createPostRequest(body: unknown): Request {
  return new Request("http://localhost/api/export/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const batchFuzzCases: Array<[string, unknown]> = [
  ["empty body", null],
  ["malformed JSON", "not-json"],
  ["empty object", {}],
  ["array instead of object", ["doc1"]],
  ["empty documentIds", { documentIds: [], format: "md", profile: "plain" }],
  ["null documentIds", { documentIds: null, format: "md", profile: "plain" }],
  ["SQL injection in documentIds", { documentIds: ["' OR 1=1--"], format: "md", profile: "plain" }],
  [
    "XSS in documentIds",
    { documentIds: ["<script>alert(1)</script>"], format: "md", profile: "plain" },
  ],
  [
    "too many ids (51)",
    {
      documentIds: Array.from({ length: 51 }, (_, i) => `doc-${i}`),
      format: "md",
      profile: "plain",
    },
  ],
  ["invalid format", { documentIds: ["doc1"], format: "exe", profile: "plain" }],
  ["invalid profile", { documentIds: ["doc1"], format: "md", profile: "invalid" }],
  [
    "prototype pollution",
    { documentIds: ["doc1"], format: "md", profile: "plain", __proto__: { hacked: true } },
  ],
  [
    "extra unexpected fields",
    { documentIds: ["doc1"], format: "md", profile: "plain", sudo: true },
  ],
  ["number as format", { documentIds: ["doc1"], format: 123, profile: "plain" }],
  [
    "boolean as includeSource",
    { documentIds: ["doc1"], format: "md", profile: "plain", includeSource: "not-a-boolean" },
  ],
  ["missing format", { documentIds: ["doc1"], profile: "plain" }],
  ["missing profile", { documentIds: ["doc1"], format: "md" }],
  ["unicode in documentId", { documentIds: ["tést\u200Bdoc"], format: "md", profile: "plain" }],
  ["RTL override in documentId", { documentIds: ["\u202Edoc"], format: "md", profile: "plain" }],
];

const folderFuzzCases: Array<[string, unknown]> = [
  ["empty body", null],
  ["empty object", {}],
  ["missing folderId", { format: "md", profile: "plain" }],
  ["SQL injection in folderId", { folderId: "' OR 1=1--", format: "md", profile: "plain" }],
  ["XSS in folderId", { folderId: "<script>alert(1)</script>", format: "md", profile: "plain" }],
  ["null folderId", { folderId: null, format: "md", profile: "plain" }],
  ["invalid format", { folderId: "folder1", format: "exe", profile: "plain" }],
  ["invalid profile", { folderId: "folder1", format: "md", profile: "bad" }],
  [
    "prototype pollution",
    { folderId: "folder1", format: "md", profile: "plain", __proto__: { hacked: true } },
  ],
];

const tagFuzzCases: Array<[string, unknown]> = [
  ["empty body", null],
  ["empty object", {}],
  ["missing tagId", { format: "md", profile: "plain" }],
  ["SQL injection in tagId", { tagId: "' OR 1=1--", format: "md", profile: "plain" }],
  ["XSS in tagId", { tagId: "<script>alert(1)</script>", format: "md", profile: "plain" }],
  ["null tagId", { tagId: null, format: "md", profile: "plain" }],
  ["invalid format", { tagId: "tag1", format: "exe", profile: "plain" }],
  ["invalid profile", { tagId: "tag1", format: "md", profile: "bad" }],
  [
    "prototype pollution",
    { tagId: "tag1", format: "md", profile: "plain", __proto__: { hacked: true } },
  ],
];

describe("Fuzz: POST /api/export/batch", () => {
  beforeEach(() => {
    mockSession.user = {
      id: "user-export-fuzz",
      name: "Fuzzer",
      email: "fuzz@test.com",
      role: "USER",
    } as any;
  });

  it.each(batchFuzzCases)("handles %s without 500 crash", async (_, body) => {
    const req = createPostRequest(body);
    const res = await exportBatchPost(req, { params: Promise.resolve({}) } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
    if (res.status >= 400) {
      const b = await res.json();
      expect(b).toHaveProperty("error");
    }
  });
});

describe("Fuzz: POST /api/export/folder", () => {
  beforeEach(() => {
    mockSession.user = {
      id: "user-export-fuzz",
      name: "Fuzzer",
      email: "fuzz@test.com",
      role: "USER",
    } as any;
  });

  it.each(folderFuzzCases)("handles %s without 500 crash", async (_, body) => {
    const req = new Request("http://localhost/api/export/folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const res = await exportFolderPost(req, { params: Promise.resolve({}) } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
    if (res.status >= 400) {
      const b = await res.json();
      expect(b).toHaveProperty("error");
    }
  });
});

describe("Fuzz: POST /api/export/tag", () => {
  beforeEach(() => {
    mockSession.user = {
      id: "user-export-fuzz",
      name: "Fuzzer",
      email: "fuzz@test.com",
      role: "USER",
    } as any;
  });

  it.each(tagFuzzCases)("handles %s without 500 crash", async (_, body) => {
    const req = new Request("http://localhost/api/export/tag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const res = await exportTagPost(req, { params: Promise.resolve({}) } as any);
    expect(res.status).toBeGreaterThanOrEqual(200);
    if (res.status >= 400) {
      const b = await res.json();
      expect(b).toHaveProperty("error");
    }
  });
});
