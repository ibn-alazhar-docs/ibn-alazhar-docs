import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { randomBytes } from "node:crypto";
import JSZip from "jszip";
import { prisma, createTestUser, createTestDocument, cleanupTestUsers } from "./helpers/db";
import { DocumentShareUseCases } from "../../apps/web/src/core/services/document-share.use-cases";
import { ShareAccessUseCase } from "../../apps/web/src/core/services/share-access.use-case";
import { generateMarkdown, generateTxt, generateJson } from "../../packages/pipeline/src/output";
import { buildZipPackage } from "../../apps/web/src/core/services/export/zip-builder";
import type { CleanedText } from "../../packages/pipeline/src/types";

vi.mock("@/shared/logger", () => ({
  logger: { child: () => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn() }) },
}));

vi.mock("ioredis", () => ({
  default: class MockRedis {
    on() {}
    get() {
      return null;
    }
    set() {}
    del() {}
  },
}));

vi.mock("minio", () => ({
  Client: class MockMinio {
    putObject() {}
    getObject() {}
    bucketExists() {}
    makeBucket() {}
  },
}));

const ARABIC_TEXT =
  "بسم الله الرحمن الرحيم\n## الفصل الأول\nالحمد لله رب العالمين\nهذا كتاب التوحيد";

describe("Share + Export Full Flow", () => {
  let userA: { id: string };
  const userIds: string[] = [];

  beforeEach(async () => {
    userA = await createTestUser({ name: "Share Export User" });
    userIds.push(userA.id);
  });

  afterEach(async () => {
    await cleanupTestUsers(userIds);
    userIds.length = 0;
  });

  describe("Share link creation and access", () => {
    let docRepo: any;
    let shareRepo: any;

    beforeEach(() => {
      const storedShares: any[] = [];

      docRepo = {
        findDocumentById: vi.fn().mockImplementation(async (id: string, userId: string) => {
          const doc = await prisma.document.findFirst({
            where: { id, userId, deletedAt: null },
          });
          return doc || null;
        }),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        update: vi.fn(),
        updateMany: vi.fn(),
      };

      shareRepo = {
        findShareLinkByDocumentId: vi
          .fn()
          .mockImplementation(async (docId: string, uid: string) => {
            return storedShares.find((s) => s.documentId === docId && s.userId === uid) || null;
          }),
        createShareLink: vi.fn().mockImplementation(async (data: any) => {
          const share = { id: `share_${Date.now()}`, ...data };
          storedShares.push(share);
          return share;
        }),
        updateShareLinkToken: vi.fn().mockImplementation(async (id: string, token: string) => {
          const s = storedShares.find((sh) => sh.id === id);
          if (s) s.token = token;
          return s;
        }),
        deleteShareLinkByDocumentId: vi.fn().mockResolvedValue({}),
        findShareLinkByToken: vi.fn(),
      };
    });

    it("creates share link for completed document", async () => {
      const doc = await createTestDocument(userA.id, { status: "COMPLETED" });
      const share = new DocumentShareUseCases(docRepo, shareRepo);

      const result = await share.createShareLink(doc.id, userA.id, null);
      expect(result).toBeDefined();
      expect(result.token).toBeTruthy();
    });

    it("rejects share for non-completed document", async () => {
      const doc = await createTestDocument(userA.id, { status: "UPLOADED" });

      const share = new DocumentShareUseCases(docRepo, shareRepo);
      await expect(share.createShareLink(doc.id, userA.id, null)).rejects.toThrow(/غير جاهز/);
    });

    it("rejects share for failed document", async () => {
      const doc = await createTestDocument(userA.id, { status: "FAILED" });
      const share = new DocumentShareUseCases(docRepo, shareRepo);

      await expect(share.createShareLink(doc.id, userA.id, null)).rejects.toThrow(/فشل/);
    });

    it("returns existing share link if already created", async () => {
      const doc = await createTestDocument(userA.id, { status: "COMPLETED" });
      const share = new DocumentShareUseCases(docRepo, shareRepo);

      const first = await share.createShareLink(doc.id, userA.id, null);
      const second = await share.createShareLink(doc.id, userA.id, null);
      expect(second).toEqual(first);
    });

    it("regenerates share token", async () => {
      const doc = await createTestDocument(userA.id, { status: "COMPLETED" });
      const share = new DocumentShareUseCases(docRepo, shareRepo);

      const original = await share.createShareLink(doc.id, userA.id, null);
      const originalToken = original.token;

      shareRepo.updateShareLinkToken = vi.fn().mockResolvedValue({
        ...original,
        token: `new_${originalToken}`,
      });

      const regenerated = await share.regenerateShareLink(doc.id, userA.id);
      expect(regenerated.token).not.toBe(originalToken);
    });
  });

  describe("Share link expiry", () => {
    it("creates share with expiry date", async () => {
      const doc = await createTestDocument(userA.id);
      const token = randomBytes(32).toString("base64url");
      const futureDate = new Date(Date.now() + 7 * 86400000);

      const share = await prisma.shareLink.create({
        data: { token, documentId: doc.id, userId: userA.id, expiresAt: futureDate },
      });
      expect(share.expiresAt!.getTime()).toBeGreaterThan(Date.now());
    });

    it("detects expired share link", async () => {
      const doc = await createTestDocument(userA.id);
      const token = randomBytes(32).toString("base64url");
      const pastDate = new Date(Date.now() - 86400000);

      await prisma.shareLink.create({
        data: { token, documentId: doc.id, userId: userA.id, expiresAt: pastDate },
      });

      const shareAccess = new ShareAccessUseCase({
        findShareLinkByToken: vi.fn().mockResolvedValue({
          documentId: doc.id,
          expiresAt: pastDate,
          document: {
            id: doc.id,
            title: doc.title,
            status: "COMPLETED",
            deletedAt: null,
            outputFormats: [],
            originalName: "test.pdf",
          },
        }),
        findShareLinkByDocumentId: vi.fn(),
        createShareLink: vi.fn(),
        updateShareLinkToken: vi.fn(),
        deleteShareLinkByDocumentId: vi.fn(),
      });

      const result = await shareAccess.execute(token);
      expect("error" in result).toBe(true);
      expect(result).toHaveProperty("error");
    });
  });

  describe("Export shared document", () => {
    it("marks document as COMPLETED before export", async () => {
      const doc = await createTestDocument(userA.id, { status: "COMPLETED" });
      expect(doc.status).toBe("COMPLETED");
    });

    it("generates all export formats from shared document content", () => {
      const cleanedText = generateMarkdown(ARABIC_CONTENT, {
        title: "كتاب التوحيد",
        pageCount: 3,
      });

      const txt = generateTxt(cleanedText, true);
      expect(txt).toContain("بسم الله");
      expect(txt).toContain("Pages:");

      const json = generateJson(cleanedText, "shared-book.pdf");
      const parsed = JSON.parse(json);
      expect(parsed.content.raw).toContain("التوحيد");
      expect(parsed.source).toBe("shared-book.pdf");
    });

    it("multi-format consistency across txt and json", () => {
      const ct = generateMarkdown(ARABIC_CONTENT, { pageCount: 3 });
      const txt = generateTxt(ct, false);
      const json = JSON.parse(generateJson(ct));
      expect(txt).toContain("بسم الله");
      expect(json.content.raw).toContain("بسم الله");
    });
  });

  describe("Batch export multiple documents as ZIP", () => {
    it("builds valid ZIP with single document", async () => {
      const cleanedText = generateMarkdown(ARABIC_CONTENT);

      const doc = {
        id: "batch-doc-1",
        title: "كتاب التوحيد",
        tags: ["عقيدة"],
        folderPath: "علوم شرعية",
        pageCount: 3,
        metadata: makeMetadata(),
        rawText: ARABIC_CONTENT,
        markdown: cleanedText.markdown,
      };

      const buffer = await buildZipPackage({
        exportId: "export-batch-1",
        documents: [doc],
        profile: "research",
        includeSource: false,
      });

      expect(buffer).toBeInstanceOf(Buffer);
      const zip = await JSZip.loadAsync(buffer);
      expect(Object.keys(zip.files).length).toBeGreaterThan(0);
    });

    it("ZIP includes manifest.json", async () => {
      const cleanedText = generateMarkdown(ARABIC_CONTENT);
      const doc = {
        id: "doc-manifest",
        title: "Test Doc",
        tags: [],
        folderPath: "",
        pageCount: 2,
        metadata: makeMetadata(),
        rawText: ARABIC_CONTENT,
        markdown: cleanedText.markdown,
      };

      const buffer = await buildZipPackage({
        exportId: "export-manifest",
        documents: [doc],
        profile: "research",
        includeSource: false,
      });

      const zip = await JSZip.loadAsync(buffer);
      expect(zip.files["manifest.json"]).toBeDefined();

      const manifest = JSON.parse(await zip.files["manifest.json"].async("text"));
      expect(manifest.exportId).toBe("export-manifest");
      expect(manifest.documentCount).toBe(1);
    });

    it("ZIP with multiple docs includes README.md", async () => {
      const cleanedText = generateMarkdown(ARABIC_CONTENT);
      const docs = [
        {
          id: "doc-1",
          title: "كتاب التوحيد",
          tags: [],
          folderPath: "",
          pageCount: 2,
          metadata: makeMetadata(),
          rawText: ARABIC_CONTENT,
          markdown: cleanedText.markdown,
        },
        {
          id: "doc-2",
          title: "كتاب الفقه",
          tags: [],
          folderPath: "",
          pageCount: 3,
          metadata: makeMetadata(),
          rawText: ARABIC_CONTENT,
          markdown: cleanedText.markdown,
        },
      ];

      const buffer = await buildZipPackage({
        exportId: "export-multi",
        documents: docs,
        profile: "research",
        includeSource: false,
      });

      const zip = await JSZip.loadAsync(buffer);
      expect(zip.files["README.md"]).toBeDefined();

      const manifest = JSON.parse(await zip.files["manifest.json"].async("text"));
      expect(manifest.documentCount).toBe(2);
    });

    it("ZIP source inclusion toggle works", async () => {
      const cleanedText = generateMarkdown(ARABIC_CONTENT);

      const buffer = await buildZipPackage({
        exportId: "export-source",
        documents: [
          {
            id: "doc-source",
            title: "With Source",
            tags: [],
            folderPath: "",
            pageCount: 1,
            metadata: makeMetadata(),
            rawText: ARABIC_CONTENT,
            markdown: cleanedText.markdown,
            sourceBuffer: Buffer.from("fake-pdf"),
            sourceFileName: "original.pdf",
          },
        ],
        profile: "archive",
        includeSource: true,
      });

      const zip = await JSZip.loadAsync(buffer);
      const fileNames = Object.keys(zip.files);
      expect(fileNames.some((f) => f.includes("source/"))).toBe(true);
      expect(fileNames.some((f) => f.includes("original.pdf"))).toBe(true);
    });
  });
});

const ARABIC_CONTENT =
  "بسم الله الرحمن الرحيم\n## الفصل الأول\nالحمد لله رب العالمين\nهذا كتاب التوحيد";

function makeMetadata() {
  return {
    source: {
      title: "Test Document",
      description: null,
      fileName: "test.pdf",
      originalName: "test.pdf",
      mimeType: "application/pdf",
      fileSize: 1024,
      language: "ar",
      isRtl: true,
    },
    tags: [],
    folder: null,
    ocr: { confidence: 0.85, engine: "google", pageCount: 5 },
    pipeline: {
      wordCount: 200,
      charCount: 1000,
      headingCount: 3,
      paragraphCount: 10,
      qualityScore: 0.8,
      garbageRatio: 0.02,
    },
    dates: {
      created: "2025-01-01T00:00:00.000Z",
      updated: "2025-06-01T00:00:00.000Z",
      exported: new Date().toISOString(),
    },
    export: {
      format: "zip",
      profile: "research",
      version: "1.0",
      generator: "ibn-al-azhar-docs/v1",
    },
  };
}
