import { prisma } from "@/lib/prisma";
import { NotFoundError, ValidationError, type Role } from "@/lib/errors";

export class UserUseCases {
  async getUsers() {
    return prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { documents: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateUserRole(userId: string, role: Role, adminUserId: string) {
    if (userId === adminUserId) {
      throw new ValidationError("Cannot change your own role");
    }

    const userExists = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });
    if (!userExists) throw new NotFoundError("المستخدم غير موجود");

    return prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
  }

  async deleteUser(userId: string, adminUserId: string) {
    if (userId === adminUserId) {
      throw new ValidationError("Cannot delete yourself");
    }

    const userExists = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });
    if (!userExists) throw new NotFoundError("المستخدم غير موجود");

    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });
  }
}

export const userUseCases = new UserUseCases();
