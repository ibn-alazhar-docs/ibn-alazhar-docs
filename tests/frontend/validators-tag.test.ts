import { describe, it, expect } from "vitest";
import {
  createTagSchema,
  updateTagSchema,
  mergeTagsSchema,
  addTagToDocumentSchema,
  setDocumentTagsSchema,
  bulkTagSchema,
  bulkUntagSchema,
  TAG_COLORS,
  MAX_TAGS_PER_USER,
} from "@/lib/validators/tag";

describe("TAG_COLORS", () => {
  it("has 10 colors", () => {
    expect(TAG_COLORS).toHaveLength(10);
  });

  it("all colors are valid hex", () => {
    for (const color of TAG_COLORS) {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("includes brand green #16A34A", () => {
    expect(TAG_COLORS).toContain("#16A34A");
  });
});

describe("MAX_TAGS_PER_USER", () => {
  it("is 50", () => {
    expect(MAX_TAGS_PER_USER).toBe(50);
  });
});

describe("createTagSchema", () => {
  it("valid name and color passes", () => {
    const result = createTagSchema.safeParse({ name: "تفسير", color: "#2563EB" });
    expect(result.success).toBe(true);
  });

  it("empty name fails", () => {
    const result = createTagSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("name > 50 chars fails", () => {
    const result = createTagSchema.safeParse({ name: "أ".repeat(51) });
    expect(result.success).toBe(false);
  });

  it("name is trimmed", () => {
    const result = createTagSchema.parse({ name: "  تفسير  " });
    expect(result.name).toBe("تفسير");
  });

  it("color defaults to #16A34A", () => {
    const result = createTagSchema.parse({ name: "test" });
    expect(result.color).toBe("#16A34A");
  });

  it("invalid color fails", () => {
    const result = createTagSchema.safeParse({ name: "test", color: "red" });
    expect(result.success).toBe(false);
  });

  it("color without # fails", () => {
    const result = createTagSchema.safeParse({ name: "test", color: "16A34A" });
    expect(result.success).toBe(false);
  });

  it("short hex fails", () => {
    const result = createTagSchema.safeParse({ name: "test", color: "#FFF" });
    expect(result.success).toBe(false);
  });
});

describe("updateTagSchema", () => {
  it("name only passes", () => {
    const result = updateTagSchema.safeParse({ name: "new name" });
    expect(result.success).toBe(true);
  });

  it("color only passes", () => {
    const result = updateTagSchema.safeParse({ color: "#FF0000" });
    expect(result.success).toBe(true);
  });

  it("both name and color passes", () => {
    const result = updateTagSchema.safeParse({ name: "new", color: "#FF0000" });
    expect(result.success).toBe(true);
  });

  it("empty object passes (all optional)", () => {
    const result = updateTagSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("invalid color fails", () => {
    const result = updateTagSchema.safeParse({ color: "xyz" });
    expect(result.success).toBe(false);
  });

  it("empty name fails", () => {
    const result = updateTagSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("name > 50 chars fails", () => {
    const result = updateTagSchema.safeParse({ name: "أ".repeat(51) });
    expect(result.success).toBe(false);
  });
});

describe("mergeTagsSchema", () => {
  it("valid input passes", () => {
    const result = mergeTagsSchema.safeParse({ sourceTagId: "s1", targetTagId: "t1" });
    expect(result.success).toBe(true);
  });

  it("empty source fails", () => {
    const result = mergeTagsSchema.safeParse({ sourceTagId: "", targetTagId: "t1" });
    expect(result.success).toBe(false);
  });

  it("empty target fails", () => {
    const result = mergeTagsSchema.safeParse({ sourceTagId: "s1", targetTagId: "" });
    expect(result.success).toBe(false);
  });

  it("both empty fails", () => {
    const result = mergeTagsSchema.safeParse({ sourceTagId: "", targetTagId: "" });
    expect(result.success).toBe(false);
  });
});

describe("addTagToDocumentSchema", () => {
  it("valid tagId passes", () => {
    const result = addTagToDocumentSchema.safeParse({ tagId: "tag-1" });
    expect(result.success).toBe(true);
  });

  it("empty tagId fails", () => {
    const result = addTagToDocumentSchema.safeParse({ tagId: "" });
    expect(result.success).toBe(false);
  });

  it("missing tagId fails", () => {
    const result = addTagToDocumentSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("setDocumentTagsSchema", () => {
  it("valid tagIds passes", () => {
    const result = setDocumentTagsSchema.safeParse({ tagIds: ["tag-1", "tag-2"] });
    expect(result.success).toBe(true);
  });

  it("empty array passes", () => {
    const result = setDocumentTagsSchema.safeParse({ tagIds: [] });
    expect(result.success).toBe(true);
  });

  it("exactly 50 tags passes", () => {
    const result = setDocumentTagsSchema.safeParse({
      tagIds: Array.from({ length: 50 }, (_, i) => `tag-${i}`),
    });
    expect(result.success).toBe(true);
  });

  it("more than 50 tags fails", () => {
    const result = setDocumentTagsSchema.safeParse({
      tagIds: Array.from({ length: 51 }, (_, i) => `tag-${i}`),
    });
    expect(result.success).toBe(false);
  });
});

describe("bulkTagSchema", () => {
  it("valid input passes", () => {
    const result = bulkTagSchema.safeParse({ documentIds: ["doc-1"], tagId: "tag-1" });
    expect(result.success).toBe(true);
  });

  it("empty documentIds fails", () => {
    const result = bulkTagSchema.safeParse({ documentIds: [], tagId: "tag-1" });
    expect(result.success).toBe(false);
  });

  it("empty tagId fails", () => {
    const result = bulkTagSchema.safeParse({ documentIds: ["doc-1"], tagId: "" });
    expect(result.success).toBe(false);
  });

  it("more than 50 documents fails", () => {
    const result = bulkTagSchema.safeParse({
      documentIds: Array.from({ length: 51 }, (_, i) => `d${i}`),
      tagId: "tag-1",
    });
    expect(result.success).toBe(false);
  });

  it("exactly 50 documents passes", () => {
    const result = bulkTagSchema.safeParse({
      documentIds: Array.from({ length: 50 }, (_, i) => `d${i}`),
      tagId: "tag-1",
    });
    expect(result.success).toBe(true);
  });
});

describe("bulkUntagSchema", () => {
  it("valid input passes", () => {
    const result = bulkUntagSchema.safeParse({ documentIds: ["doc-1"], tagId: "tag-1" });
    expect(result.success).toBe(true);
  });

  it("empty documentIds fails", () => {
    const result = bulkUntagSchema.safeParse({ documentIds: [], tagId: "tag-1" });
    expect(result.success).toBe(false);
  });

  it("empty tagId fails", () => {
    const result = bulkUntagSchema.safeParse({ documentIds: ["doc-1"], tagId: "" });
    expect(result.success).toBe(false);
  });

  it("more than 50 documents fails", () => {
    const result = bulkUntagSchema.safeParse({
      documentIds: Array.from({ length: 51 }, (_, i) => `d${i}`),
      tagId: "tag-1",
    });
    expect(result.success).toBe(false);
  });
});
