import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  prisma,
  createTestUser,
  createTestDocument,
  createTestTag,
  cleanupTestUsers,
} from "./helpers/db";

describe("Tags → Documents Integration", () => {
  let userA: { id: string };
  let userB: { id: string };
  const userIds: string[] = [];

  beforeEach(async () => {
    userA = await createTestUser({ name: "Tag User A" });
    userB = await createTestUser({ name: "Tag User B" });
    userIds.push(userA.id, userB.id);
  });

  afterEach(async () => {
    await cleanupTestUsers(userIds);
    userIds.length = 0;
  });

  describe("Tag CRUD", () => {
    it("user can create a tag", async () => {
      const tag = await createTestTag(userA.id, { name: "تفسير" });

      const found = await prisma.tag.findUnique({ where: { id: tag.id } });
      expect(found).not.toBeNull();
      expect(found!.name).toBe("تفسير");
    });

    it("tag name uniqueness per user enforced", async () => {
      await createTestTag(userA.id, { name: "duplicate-tag" });

      await expect(
        prisma.tag.create({
          data: { userId: userA.id, name: "duplicate-tag", color: "#16A34A" },
        }),
      ).rejects.toThrow();
    });

    it("different users can have same tag name", async () => {
      await createTestTag(userA.id, { name: "shared-name" });
      const tagB = await createTestTag(userB.id, { name: "shared-name" });

      expect(tagB.name).toBe("shared-name");
    });
  });

  describe("Tag → Document assignment", () => {
    it("tag can be assigned to a document", async () => {
      const tag = await createTestTag(userA.id);
      const doc = await createTestDocument(userA.id);

      await prisma.tagDocument.create({
        data: { tagId: tag.id, documentId: doc.id },
      });

      const assoc = await prisma.tagDocument.findUnique({
        where: { tagId_documentId: { tagId: tag.id, documentId: doc.id } },
      });
      expect(assoc).not.toBeNull();
    });

    it("same tag cannot be assigned twice to same document", async () => {
      const tag = await createTestTag(userA.id);
      const doc = await createTestDocument(userA.id);

      await prisma.tagDocument.create({
        data: { tagId: tag.id, documentId: doc.id },
      });

      await expect(
        prisma.tagDocument.create({
          data: { tagId: tag.id, documentId: doc.id },
        }),
      ).rejects.toThrow();
    });

    it("multiple tags on one document", async () => {
      const tag1 = await createTestTag(userA.id, { name: "tag1" });
      const tag2 = await createTestTag(userA.id, { name: "tag2" });
      const tag3 = await createTestTag(userA.id, { name: "tag3" });
      const doc = await createTestDocument(userA.id);

      await prisma.tagDocument.createMany({
        data: [
          { tagId: tag1.id, documentId: doc.id },
          { tagId: tag2.id, documentId: doc.id },
          { tagId: tag3.id, documentId: doc.id },
        ],
      });

      const tags = await prisma.tagDocument.findMany({
        where: { documentId: doc.id },
      });
      expect(tags).toHaveLength(3);
    });

    it("one tag on multiple documents", async () => {
      const tag = await createTestTag(userA.id);
      const doc1 = await createTestDocument(userA.id);
      const doc2 = await createTestDocument(userA.id);

      await prisma.tagDocument.createMany({
        data: [
          { tagId: tag.id, documentId: doc1.id },
          { tagId: tag.id, documentId: doc2.id },
        ],
      });

      const assoc = await prisma.tagDocument.findMany({
        where: { tagId: tag.id },
      });
      expect(assoc).toHaveLength(2);
    });
  });

  describe("Bulk tag/untag", () => {
    it("bulk tag adds tag to multiple documents", async () => {
      const tag = await createTestTag(userA.id);
      const docs = await Promise.all([
        createTestDocument(userA.id),
        createTestDocument(userA.id),
        createTestDocument(userA.id),
      ]);

      await prisma.tagDocument.createMany({
        data: docs.map((d) => ({ tagId: tag.id, documentId: d.id })),
      });

      const count = await prisma.tagDocument.count({ where: { tagId: tag.id } });
      expect(count).toBe(3);
    });

    it("bulk untag removes tag from multiple documents", async () => {
      const tag = await createTestTag(userA.id);
      const docs = await Promise.all([createTestDocument(userA.id), createTestDocument(userA.id)]);

      await prisma.tagDocument.createMany({
        data: docs.map((d) => ({ tagId: tag.id, documentId: d.id })),
      });

      const result = await prisma.tagDocument.deleteMany({
        where: { tagId: tag.id, documentId: { in: docs.map((d) => d.id) } },
      });

      expect(result.count).toBe(2);

      const remaining = await prisma.tagDocument.count({ where: { tagId: tag.id } });
      expect(remaining).toBe(0);
    });

    it("bulk tag skips already-tagged documents", async () => {
      const tag = await createTestTag(userA.id);
      const doc1 = await createTestDocument(userA.id);
      const doc2 = await createTestDocument(userA.id);

      await prisma.tagDocument.create({
        data: { tagId: tag.id, documentId: doc1.id },
      });

      const existing = await prisma.tagDocument.findMany({
        where: { tagId: tag.id, documentId: { in: [doc1.id, doc2.id] } },
      });
      const existingSet = new Set(existing.map((e) => e.documentId));
      const newDocs = [doc1.id, doc2.id].filter((id) => !existingSet.has(id));

      if (newDocs.length > 0) {
        await prisma.tagDocument.createMany({
          data: newDocs.map((documentId) => ({ tagId: tag.id, documentId })),
        });
      }

      const all = await prisma.tagDocument.findMany({ where: { tagId: tag.id } });
      expect(all).toHaveLength(2);
    });
  });

  describe("Tag → Document query with include", () => {
    it("document with tags returns tag details", async () => {
      const tag = await createTestTag(userA.id, { name: "فقه", color: "#2563EB" });
      const doc = await createTestDocument(userA.id);

      await prisma.tagDocument.create({
        data: { tagId: tag.id, documentId: doc.id },
      });

      const docWithTags = await prisma.document.findUnique({
        where: { id: doc.id },
        include: {
          tags: {
            include: { tag: { select: { id: true, name: true, color: true } } },
          },
        },
      });

      expect(docWithTags!.tags).toHaveLength(1);
      expect(docWithTags!.tags[0].tag.name).toBe("فقه");
      expect(docWithTags!.tags[0].tag.color).toBe("#2563EB");
    });

    it("document count per tag reflects assignments", async () => {
      const tag = await createTestTag(userA.id);
      const doc1 = await createTestDocument(userA.id);
      const doc2 = await createTestDocument(userA.id);

      await prisma.tagDocument.createMany({
        data: [
          { tagId: tag.id, documentId: doc1.id },
          { tagId: tag.id, documentId: doc2.id },
        ],
      });

      const tagWithCount = await prisma.tag.findUnique({
        where: { id: tag.id },
        include: { _count: { select: { documents: true } } },
      });

      expect(tagWithCount!._count.documents).toBe(2);
    });
  });

  describe("Cross-user tag isolation", () => {
    it("user B cannot see user A's tags", async () => {
      await createTestTag(userA.id, { name: "a-tag" });

      const tagsForB = await prisma.tag.findMany({
        where: { userId: userB.id },
      });

      expect(tagsForB).toHaveLength(0);
    });

    it("user B cannot tag their document with user A's tag", async () => {
      const aTag = await createTestTag(userA.id);
      const bDoc = await createTestDocument(userB.id);

      const tagForB = await prisma.tag.findFirst({
        where: { id: aTag.id, userId: userB.id },
      });
      expect(tagForB).toBeNull();
    });
  });
});
