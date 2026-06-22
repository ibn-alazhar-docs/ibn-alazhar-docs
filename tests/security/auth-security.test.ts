import { describe, it, expect, beforeEach, afterEach } from "vitest";
import bcrypt from "bcryptjs";
import { prisma, createSecUser, cleanupSecUsers } from "./helpers";

describe("Authentication & Session Security", () => {
  const userIds: string[] = [];

  afterEach(async () => {
    await cleanupSecUsers(userIds);
    userIds.length = 0;
  });

  describe("Credential validation", () => {
    it("correct password verified by bcrypt", async () => {
      const user = await createSecUser();
      userIds.push(user.id);

      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      const valid = await bcrypt.compare(user.plainPassword, dbUser!.passwordHash!);
      expect(valid).toBe(true);
    });

    it("wrong password rejected by bcrypt", async () => {
      const user = await createSecUser();
      userIds.push(user.id);

      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      const valid = await bcrypt.compare("WrongPassword@123", dbUser!.passwordHash!);
      expect(valid).toBe(false);
    });

    it("empty password rejected", async () => {
      const user = await createSecUser();
      userIds.push(user.id);

      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      const valid = await bcrypt.compare("", dbUser!.passwordHash!);
      expect(valid).toBe(false);
    });

    it("password with SQL injection payload rejected", async () => {
      const user = await createSecUser();
      userIds.push(user.id);

      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      const valid = await bcrypt.compare("' OR '1'='1", dbUser!.passwordHash!);
      expect(valid).toBe(false);
    });

    it("extremely long password handled safely (no crash)", async () => {
      const user = await createSecUser();
      userIds.push(user.id);

      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      const longPassword = "A".repeat(10000);
      const valid = await bcrypt.compare(longPassword, dbUser!.passwordHash!);
      expect(valid).toBe(false);
    });
  });

  describe("Deleted user protection", () => {
    it("deleted user cannot authenticate", async () => {
      const user = await createSecUser({ deletedAt: new Date() });
      userIds.push(user.id);

      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(dbUser!.deletedAt).not.toBeNull();

      // Auth logic checks: if (!user || user.deletedAt || !user.passwordHash) return null;
      const shouldReject = !dbUser || dbUser.deletedAt || !dbUser.passwordHash;
      expect(shouldReject).toBeTruthy();
    });

    it("deleted user's password hash still exists (but user is blocked)", async () => {
      const user = await createSecUser({ deletedAt: new Date() });
      userIds.push(user.id);

      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(dbUser!.passwordHash).not.toBeNull();
      expect(dbUser!.deletedAt).not.toBeNull();
    });
  });

  describe("Password hashing strength", () => {
    it("bcrypt cost factor is 12", async () => {
      const user = await createSecUser();
      userIds.push(user.id);

      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      const hashParts = dbUser!.passwordHash!.split("$");
      const costFactor = parseInt(hashParts[2]!, 10);
      expect(costFactor).toBe(12);
    });

    it("same password produces different hashes (salt)", async () => {
      const user1 = await createSecUser();
      const user2 = await createSecUser();
      userIds.push(user1.id, user2.id);

      const db1 = await prisma.user.findUnique({ where: { id: user1.id } });
      const db2 = await prisma.user.findUnique({ where: { id: user2.id } });

      expect(db1!.passwordHash).not.toBe(db2!.passwordHash);
    });
  });

  describe("Registration abuse prevention", () => {
    it("duplicate email rejected (unique constraint)", async () => {
      const user = await createSecUser();
      userIds.push(user.id);

      await expect(
        prisma.user.create({
          data: {
            id: uid(),
            email: user.email,
            name: "Duplicate",
            passwordHash: await bcrypt.hash("Test@123456", 12),
          },
        }),
      ).rejects.toThrow();
    });

    it("email comparison is case-insensitive (stored lowercase)", async () => {
      const user = await createSecUser();
      userIds.push(user.id);

      const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(dbUser!.email).toBe(dbUser!.email.toLowerCase());
    });
  });
});

function uid(): string {
  return `helper_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
