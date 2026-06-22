import { describe, it, expect } from "vitest";
import {
  singleExportSchema,
  batchExportSchema,
  folderExportSchema,
  tagExportSchema,
} from "@/lib/export/validators";

describe("singleExportSchema", () => {
  it("valid input passes", () => {
    const result = singleExportSchema.safeParse({
      documentId: "doc-1",
      format: "md",
      profile: "research",
    });
    expect(result.success).toBe(true);
  });

  it("missing documentId fails", () => {
    const result = singleExportSchema.safeParse({ format: "md", profile: "research" });
    expect(result.success).toBe(false);
  });

  it("empty documentId fails", () => {
    const result = singleExportSchema.safeParse({
      documentId: "",
      format: "md",
      profile: "research",
    });
    expect(result.success).toBe(false);
  });

  it("invalid format fails", () => {
    const result = singleExportSchema.safeParse({
      documentId: "doc-1",
      format: "epub",
      profile: "research",
    });
    expect(result.success).toBe(false);
  });

  it("invalid profile fails", () => {
    const result = singleExportSchema.safeParse({
      documentId: "doc-1",
      format: "md",
      profile: "custom",
    });
    expect(result.success).toBe(false);
  });

  it("includeSource defaults to false", () => {
    const result = singleExportSchema.parse({
      documentId: "doc-1",
      format: "md",
      profile: "research",
    });
    expect(result.includeSource).toBe(false);
  });

  it("includeSource can be set to true", () => {
    const result = singleExportSchema.parse({
      documentId: "doc-1",
      format: "md",
      profile: "archive",
      includeSource: true,
    });
    expect(result.includeSource).toBe(true);
  });

  it("all valid formats accepted", () => {
    for (const format of ["md", "txt", "json", "zip"]) {
      const result = singleExportSchema.safeParse({
        documentId: "doc-1",
        format,
        profile: "research",
      });
      expect(result.success).toBe(true);
    }
  });

  it("all valid profiles accepted", () => {
    for (const profile of ["research", "archive", "plain", "developer"]) {
      const result = singleExportSchema.safeParse({
        documentId: "doc-1",
        format: "md",
        profile,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("batchExportSchema", () => {
  it("valid input passes", () => {
    const result = batchExportSchema.safeParse({
      documentIds: ["doc-1", "doc-2"],
      format: "md",
      profile: "research",
    });
    expect(result.success).toBe(true);
  });

  it("empty documentIds fails", () => {
    const result = batchExportSchema.safeParse({
      documentIds: [],
      format: "md",
      profile: "research",
    });
    expect(result.success).toBe(false);
  });

  it("more than 50 documentIds fails", () => {
    const result = batchExportSchema.safeParse({
      documentIds: Array.from({ length: 51 }, (_, i) => `doc-${i}`),
      format: "md",
      profile: "research",
    });
    expect(result.success).toBe(false);
  });

  it("exactly 50 documentIds passes", () => {
    const result = batchExportSchema.safeParse({
      documentIds: Array.from({ length: 50 }, (_, i) => `doc-${i}`),
      format: "md",
      profile: "research",
    });
    expect(result.success).toBe(true);
  });

  it("invalid format fails", () => {
    const result = batchExportSchema.safeParse({
      documentIds: ["doc-1"],
      format: "epub",
      profile: "research",
    });
    expect(result.success).toBe(false);
  });

  it("includeSource defaults to false", () => {
    const result = batchExportSchema.parse({
      documentIds: ["doc-1"],
      format: "md",
      profile: "research",
    });
    expect(result.includeSource).toBe(false);
  });
});

describe("folderExportSchema", () => {
  it("valid input passes", () => {
    const result = folderExportSchema.safeParse({
      folderId: "folder-1",
      format: "md",
      profile: "research",
    });
    expect(result.success).toBe(true);
  });

  it("missing folderId fails", () => {
    const result = folderExportSchema.safeParse({ format: "md", profile: "research" });
    expect(result.success).toBe(false);
  });

  it("empty folderId fails", () => {
    const result = folderExportSchema.safeParse({
      folderId: "",
      format: "md",
      profile: "research",
    });
    expect(result.success).toBe(false);
  });

  it("recursive defaults to true", () => {
    const result = folderExportSchema.parse({
      folderId: "folder-1",
      format: "md",
      profile: "research",
    });
    expect(result.recursive).toBe(true);
  });

  it("recursive can be set to false", () => {
    const result = folderExportSchema.parse({
      folderId: "folder-1",
      format: "md",
      profile: "research",
      recursive: false,
    });
    expect(result.recursive).toBe(false);
  });
});

describe("tagExportSchema", () => {
  it("valid input passes", () => {
    const result = tagExportSchema.safeParse({
      tagId: "tag-1",
      format: "md",
      profile: "research",
    });
    expect(result.success).toBe(true);
  });

  it("missing tagId fails", () => {
    const result = tagExportSchema.safeParse({ format: "md", profile: "research" });
    expect(result.success).toBe(false);
  });

  it("empty tagId fails", () => {
    const result = tagExportSchema.safeParse({
      tagId: "",
      format: "md",
      profile: "research",
    });
    expect(result.success).toBe(false);
  });

  it("includeSource defaults to false", () => {
    const result = tagExportSchema.parse({
      tagId: "tag-1",
      format: "md",
      profile: "research",
    });
    expect(result.includeSource).toBe(false);
  });
});
