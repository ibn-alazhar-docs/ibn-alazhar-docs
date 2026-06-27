import { NotFoundError, ValidationError } from "@/lib/errors";
import { LIMITS } from "@/lib/constants";
import type { Role } from "@/domain/auth";
import type { IUserRepository } from "@/domain/repositories/user.repository.interface";

export class UserUseCases {
  constructor(private readonly userRepository: IUserRepository) {}

  async getUsers(page: number = 1, limit: number = 50) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), LIMITS.MAX_PAGE_LIMIT);
    const skip = (safePage - 1) * safeLimit;

    const [users, total] = await Promise.all([
      this.userRepository.findMany({
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
        skip,
        take: safeLimit,
      }),
      this.userRepository.count({ where: { deletedAt: null } }),
    ]);

    return {
      users,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async updateUserRole(userId: string, role: Role, adminUserId: string) {
    if (userId === adminUserId) {
      throw new ValidationError("Cannot change your own role");
    }

    const userExists = await this.userRepository.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });
    if (!userExists) throw new NotFoundError("المستخدم غير موجود");

    return this.userRepository.updateRole(userId, role);
  }

  async deleteUser(userId: string, adminUserId: string) {
    if (userId === adminUserId) {
      throw new ValidationError("Cannot delete yourself");
    }

    const userExists = await this.userRepository.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });
    if (!userExists) throw new NotFoundError("المستخدم غير موجود");

    await this.userRepository.softDelete(userId);
  }
}
