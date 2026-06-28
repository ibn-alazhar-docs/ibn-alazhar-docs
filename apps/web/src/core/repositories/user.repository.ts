import { PrismaClient } from "@prisma/client";
import type {
  IUserRepository,
  UserListItem,
  UserRoleUpdate,
} from "@/domain/repositories/user.repository.interface";
import type { Role } from "@/domain/auth";
import type { Prisma } from "@prisma/client";

export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string) {
    return this.prisma.user.findFirst({ where: { id, deletedAt: null } });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findFirst(where: Prisma.UserFindFirstArgs) {
    return this.prisma.user.findFirst(where);
  }

  async findMany(options?: Prisma.UserFindManyArgs) {
    return this.prisma.user.findMany(options ?? {}) as unknown as UserListItem[];
  }

  async count(args?: Prisma.UserCountArgs) {
    return this.prisma.user.count(args);
  }

  async create(data: Prisma.UserUncheckedCreateInput) {
    return this.prisma.user.create({ data });
  }

  async update(id: string, data: Prisma.UserUncheckedUpdateInput) {
    return this.prisma.user.update({ where: { id }, data });
  }

  async updateRole(id: string, role: Role): Promise<UserRoleUpdate> {
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    }) as unknown as UserRoleUpdate;
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
