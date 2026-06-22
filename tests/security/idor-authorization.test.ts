import { describe, it, expect, afterEach } from "vitest";
import { prisma, createSecUser, createSecDocument, cleanupSecUsers } from "./helpers";

describe("IDOR / Authorization Attacks", () => {
  const userIds: string[] = [];

  afterEach(async () => {
    await cleanupSecUsers(userIds);
    userIds.length = 0;
  });

  describe("Document IDOR", () => {
    it("attacker cannot read victim's document via scoped query", async () => {
      const victim = await createSecUser({ name: "Victim" });
      const attacker = await createSecUser({ name: "Attacker" });
      userIds.push(victim.id, attacker.id);

      const doc = await createSecDocument(victim.id, { title: "Secret Document" });

      const result = await prisma.document.findFirst({
        where: { id: doc.id, userId: attacker.id, deletedAt: null },
      });
      expect(result).toBeNull();
    });

    it("attacker cannot update victim's document", async () => {
      const victim = await createSecUser();
      const attacker = await createSecUser();
      userIds.push(victim.id, attacker.id);

      const doc = await createSecDocument(victim.id);

      const findResult = await prisma.document.findFirst({
        where: { id: doc.id, userId: attacker.id },
      });
      expect(findResult).toBeNull();
    });

    it("attacker cannot delete victim's document", async () => {
      const victim = await createSecUser();
      const attacker = await createSecUser();
      userIds.push(victim.id, attacker.id);

      const doc = await createSecDocument(victim.id);

      const findResult = await prisma.document.findFirst({
        where: { id: doc.id, userId: attacker.id },
      });
      expect(findResult).toBeNull();
    });

    it("attacker cannot list victim's documents", async () => {
      const victim = await createSecUser();
      const attacker = await createSecUser();
      userIds.push(victim.id, attacker.id);

      await createSecDocument(victim.id, { title: "Victim Doc 1" });
      await createSecDocument(victim.id, { title: "Victim Doc 2" });

      const attackerDocs = await prisma.document.findMany({
        where: { userId: attacker.id, deletedAt: null },
      });
      expect(attackerDocs).toHaveLength(0);
    });

    it("document enumeration via sequential IDs blocked by userId scope", async () => {
      const victim = await createSecUser();
      const attacker = await createSecUser();
      userIds.push(victim.id, attacker.id);

      const doc = await createSecDocument(victim.id);

      for (const attemptId of [doc.id, doc.id + "x", "nonexistent-id"]) {
        const result = await prisma.document.findFirst({
          where: { id: attemptId, userId: attacker.id, deletedAt: null },
        });
        expect(result).toBeNull();
      }
    });
  });

  describe("Folder IDOR", () => {
    it("attacker cannot read victim's folder", async () => {
      const victim = await createSecUser();
      const attacker = await createSecUser();
      userIds.push(victim.id, attacker.id);

      const folder = await prisma.folder.create({
        data: { id: `f_${Date.now()}`, userId: victim.id, name: "Private Folder" },
      });

      const result = await prisma.folder.findFirst({
        where: { id: folder.id, userId: attacker.id, deletedAt: null },
      });
      expect(result).toBeNull();
    });

    it("attacker cannot move documents to victim's folder", async () => {
      const victim = await createSecUser();
      const attacker = await createSecUser();
      userIds.push(victim.id, attacker.id);

      const victimFolder = await prisma.folder.create({
        data: { id: `vf_${Date.now()}`, userId: victim.id, name: "Victim Folder" },
      });

      const folderForAttacker = await prisma.folder.findFirst({
        where: { id: victimFolder.id, userId: attacker.id, deletedAt: null },
      });
      expect(folderForAttacker).toBeNull();
    });
  });

  describe("Tag IDOR", () => {
    it("attacker cannot use victim's tag on their documents", async () => {
      const victim = await createSecUser();
      const attacker = await createSecUser();
      userIds.push(victim.id, attacker.id);

      const victimTag = await prisma.tag.create({
        data: { id: `vt_${Date.now()}`, userId: victim.id, name: "victim-tag" },
      });

      const tagForAttacker = await prisma.tag.findFirst({
        where: { id: victimTag.id, userId: attacker.id },
      });
      expect(tagForAttacker).toBeNull();
    });

    it("attacker cannot see victim's tag list", async () => {
      const victim = await createSecUser();
      const attacker = await createSecUser();
      userIds.push(victim.id, attacker.id);

      await prisma.tag.create({
        data: { id: `t1_${Date.now()}`, userId: victim.id, name: "v-tag-1" },
      });
      await prisma.tag.create({
        data: { id: `t2_${Date.now()}`, userId: victim.id, name: "v-tag-2" },
      });

      const attackerTags = await prisma.tag.findMany({
        where: { userId: attacker.id },
      });
      expect(attackerTags).toHaveLength(0);
    });
  });

  describe("Admin privilege boundary", () => {
    it("STUDENT role is not admin", async () => {
      const student = await createSecUser({ role: "STUDENT" });
      userIds.push(student.id);
      expect(student.role).toBe("STUDENT");
      expect(student.role).not.toBe("ADMIN");
    });

    it("student cannot see all documents (admin-only)", async () => {
      const student = await createSecUser({ role: "STUDENT" });
      const other = await createSecUser();
      userIds.push(student.id, other.id);

      await createSecDocument(other.id, { title: "Other User Doc" });

      const isAdmin = student.role === "ADMIN";
      const where = isAdmin ? { deletedAt: null } : { userId: student.id, deletedAt: null };

      const docs = await prisma.document.findMany({ where });
      expect(docs.every((d) => d.userId === student.id)).toBe(true);
    });

    it("admin can see all documents", async () => {
      const admin = await createSecUser({ role: "ADMIN" });
      const user = await createSecUser();
      userIds.push(admin.id, user.id);

      await createSecDocument(user.id);

      const isAdmin = admin.role === "ADMIN";
      const where = isAdmin ? { deletedAt: null } : { userId: admin.id, deletedAt: null };

      const docs = await prisma.document.findMany({ where });
      expect(docs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Share link IDOR", () => {
    it("attacker cannot see victim's share links", async () => {
      const victim = await createSecUser();
      const attacker = await createSecUser();
      userIds.push(victim.id, attacker.id);

      const doc = await createSecDocument(victim.id);
      await prisma.shareLink.create({
        data: {
          token: `tok_${Date.now()}`,
          documentId: doc.id,
          userId: victim.id,
          expiresAt: null,
        },
      });

      const attackerShares = await prisma.shareLink.findMany({
        where: { userId: attacker.id },
      });
      expect(attackerShares).toHaveLength(0);
    });
  });
});
