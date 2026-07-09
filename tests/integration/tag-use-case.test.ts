import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  prisma,
  createTestUser,
  createTestDocument,
  createTestTag,
  cleanupTestUsers,
} from "./helpers/db";
import { TagUseCases } from "../../apps/web/src/core/services/tag.use-cases";
import { TagRepository } from "../../apps/web/src/core/repositories/tag.repository";
import { TagDocumentRepository } from "../../apps/web/src/core/repositories/tag-document.repository";
import type { AuthSession } from "../../apps/web/src/lib/backend/auth-guards";
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from "../../apps/web/src/shared/errors";

describe("TagUseCases (use-case level)", () => {
  let userA: { id: string; role: string };
  let userB: { id: string; role: string };
  const userIds: string[] = [];

  let tagUseCases: TagUseCases;
  let sessionA: AuthSession;
  let sessionB: AuthSession;

  beforeEach(async () => {
    userA = await createTestUser({ name: "Tag UC User A" });
    userB = await createTestUser({ name: "Tag UC User B" });
    userIds.push(userA.id, userB.id);

    const tagRepo = new TagRepository(prisma);
    const tagDocRepo = new TagDocumentRepository(prisma);
    tagUseCases = new TagUseCases(tagRepo, tagDocRepo);

    sessionA = { user: { id: userA.id, role: "STUDENT" } } as AuthSession;
    sessionB = { user: { id: userB.id, role: "STUDENT" } } as AuthSession;
  });

  afterEach(async () => {
    await cleanupTestUsers(userIds);
    userIds.length = 0;
  });

  describe("getTags", () => {
    it("returns only user's tags", async () => {
      await createTestTag(userA.id, { name: "a-tag" });
      await createTestTag(userB.id, { name: "b-tag" });

      const tags = await tagUseCases.getTags(sessionA);
      expect(tags).toHaveLength(1);
      expect(tags[0].name).toBe("a-tag");
    });

    it("admin sees all tags", async () => {
      await createTestTag(userA.id, { name: "a-tag" });
      await createTestTag(userB.id, { name: "b-tag" });

      const adminSession = { user: { id: userA.id, role: "ADMIN" } } as AuthSession;
      const tags = await tagUseCases.getTags(adminSession);
      expect(tags.length).toBeGreaterThanOrEqual(2);
      expect(tags.some(t => t.name === "a-tag" && t.userId === userA.id)).toBe(true);
      expect(tags.some(t => t.name === "b-tag" && t.userId === userB.id)).toBe(true);
    });
  });

  describe("createTag", () => {
    it("creates tag with default color", async () => {
      const tag = await tagUseCases.createTag("فقه", undefined, sessionA);
      expect(tag.name).toBe("فقه");
      expect(tag.color).toBeTruthy();
    });

    it("creates tag with custom color", async () => {
      const tag = await tagUseCases.createTag("تفسير", "#FF0000", sessionA);
      expect(tag.color).toBe("#FF0000");
    });

    it("rejects duplicate tag name for same user", async () => {
      await tagUseCases.createTag("duplicate", undefined, sessionA);
      await expect(tagUseCases.createTag("duplicate", undefined, sessionA)).rejects.toThrow(
        ConflictError,
      );
    });

    it("allows same tag name for different users", async () => {
      await tagUseCases.createTag("shared", undefined, sessionA);
      const tagB = await tagUseCases.createTag("shared", undefined, sessionB);
      expect(tagB.name).toBe("shared");
    });

    it("case-insensitive duplicate check", async () => {
      await tagUseCases.createTag("MyTag", undefined, sessionA);
      await expect(tagUseCases.createTag("mytag", undefined, sessionA)).rejects.toThrow(
        ConflictError,
      );
    });
  });

  describe("updateTag", () => {
    it("updates tag name via use-case", async () => {
      const tag = await tagUseCases.createTag("old-name", undefined, sessionA);
      const updated = await tagUseCases.updateTag(tag.id, { name: "new-name" }, sessionA);
      expect(updated.name).toBe("new-name");
    });

    it("updates tag color via use-case", async () => {
      const tag = await tagUseCases.createTag("color-tag", "#000000", sessionA);
      const updated = await tagUseCases.updateTag(tag.id, { color: "#FFFFFF" }, sessionA);
      expect(updated.color).toBe("#FFFFFF");
    });

    it("throws NotFoundError for wrong owner", async () => {
      const tag = await tagUseCases.createTag("a-tag", undefined, sessionA);
      await expect(tagUseCases.updateTag(tag.id, { name: "hacked" }, sessionB)).rejects.toThrow(
        NotFoundError,
      );
    });

    it("rejects duplicate name on update", async () => {
      await tagUseCases.createTag("tag1", undefined, sessionA);
      const tag2 = await tagUseCases.createTag("tag2", undefined, sessionA);
      await expect(tagUseCases.updateTag(tag2.id, { name: "tag1" }, sessionA)).rejects.toThrow(
        ConflictError,
      );
    });
  });

  describe("deleteTag", () => {
    it("deletes tag via use-case", async () => {
      const tag = await tagUseCases.createTag("to-delete", undefined, sessionA);
      await tagUseCases.deleteTag(tag.id, sessionA);

      const tags = await tagUseCases.getTags(sessionA);
      expect(tags.find((t) => t.id === tag.id)).toBeUndefined();
    });

    it("deletes tag-document associations", async () => {
      const tag = await tagUseCases.createTag("with-docs", undefined, sessionA);
      const doc = await createTestDocument(userA.id);
      await prisma.tagDocument.create({ data: { tagId: tag.id, documentId: doc.id } });

      await tagUseCases.deleteTag(tag.id, sessionA);

      const assoc = await prisma.tagDocument.findMany({ where: { tagId: tag.id } });
      expect(assoc).toHaveLength(0);
    });

    it("throws NotFoundError for wrong owner", async () => {
      const tag = await tagUseCases.createTag("a-tag", undefined, sessionA);
      await expect(tagUseCases.deleteTag(tag.id, sessionB)).rejects.toThrow(NotFoundError);
    });
  });

  describe("mergeTags", () => {
    it("merges source tag docs into target", async () => {
      const source = await tagUseCases.createTag("source", undefined, sessionA);
      const target = await tagUseCases.createTag("target", undefined, sessionA);
      const doc = await createTestDocument(userA.id);
      await prisma.tagDocument.create({ data: { tagId: source.id, documentId: doc.id } });

      const result = await tagUseCases.mergeTags(source.id, target.id, sessionA);
      expect(result.affectedDocuments).toBe(1);

      const sourceAssoc = await prisma.tagDocument.findMany({ where: { tagId: source.id } });
      expect(sourceAssoc).toHaveLength(0);

      const targetAssoc = await prisma.tagDocument.findMany({ where: { tagId: target.id } });
      expect(targetAssoc).toHaveLength(1);
    });

    it("throws ValidationError when merging same tag", async () => {
      const tag = await tagUseCases.createTag("self", undefined, sessionA);
      await expect(tagUseCases.mergeTags(tag.id, tag.id, sessionA)).rejects.toThrow(
        ValidationError,
      );
    });

    it("skips already-tagged documents", async () => {
      const source = await tagUseCases.createTag("source", undefined, sessionA);
      const target = await tagUseCases.createTag("target", undefined, sessionA);
      const doc = await createTestDocument(userA.id);
      await prisma.tagDocument.create({ data: { tagId: source.id, documentId: doc.id } });
      await prisma.tagDocument.create({ data: { tagId: target.id, documentId: doc.id } });

      const result = await tagUseCases.mergeTags(source.id, target.id, sessionA);
      expect(result.affectedDocuments).toBe(0);
    });

    it("throws NotFoundError for wrong owner", async () => {
      const source = await tagUseCases.createTag("source", undefined, sessionA);
      const target = await tagUseCases.createTag("target", undefined, sessionA);

      await expect(tagUseCases.mergeTags(source.id, target.id, sessionB)).rejects.toThrow(
        NotFoundError,
      );
    });
  });
});
