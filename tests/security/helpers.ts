import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

let counter = 0;

function uid(): string {
  return `sec_${Date.now()}_${++counter}_${randomBytes(4).toString("hex")}`;
}

export async function createSecUser(overrides: Record<string, unknown> = {}) {
  const id = uid();
  const email = `${id}@sec.ibn`;
  const password = "Secure@123456";
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      id,
      email,
      name: overrides.name ?? `SecUser ${id}`,
      role: (overrides.role as string) ?? "STUDENT",
      passwordHash,
      deletedAt: (overrides.deletedAt as Date) ?? null,
    },
  });

  return { ...user, plainPassword: password };
}

export async function createSecDocument(userId: string, overrides: Record<string, unknown> = {}) {
  const id = uid();
  return prisma.document.create({
    data: {
      id,
      userId,
      title: (overrides.title as string) ?? `SecDoc ${id}`,
      fileName: `sec-${id}.pdf`,
      originalName: `sec-${id}.pdf`,
      mimeType: "application/pdf",
      fileSize: 1024,
      storageKey: `sec/${userId}/${id}.pdf`,
      status: (overrides.status as string) ?? "COMPLETED",
      ...overrides,
    },
  });
}

export async function cleanupSecUsers(userIds: string[]) {
  if (userIds.length === 0) return;
  await prisma.shareLink.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.tagDocument.deleteMany({ where: { tag: { userId: { in: userIds } } } });
  await prisma.tag.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.conversionJob.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.document.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.folder.updateMany({ where: { userId: { in: userIds } }, data: { parentId: null } });
  await prisma.folder.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.userSetting.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.account.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

export { prisma };
