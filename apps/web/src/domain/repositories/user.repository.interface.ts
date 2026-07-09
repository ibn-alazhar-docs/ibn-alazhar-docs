import type { User, Prisma } from "@prisma/client";
import type { Role } from "@/domain/auth";

export type UserListItem = Pick<User, "id" | "name" | "email" | "role" | "createdAt"> & {
  _count: { documents: number };
};

export type UserRoleUpdate = Pick<User, "id" | "name" | "email" | "role">;

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findFirst(where: Prisma.UserFindFirstArgs): Promise<Pick<User, "id"> | null>;
  findMany(options?: Prisma.UserFindManyArgs): Promise<UserListItem[]>;
  count(args?: Prisma.UserCountArgs): Promise<number>;
  create(data: Prisma.UserUncheckedCreateInput): Promise<User>;
  update(id: string, data: Prisma.UserUncheckedUpdateInput): Promise<User>;
  updateByEmail(email: string, data: Prisma.UserUncheckedUpdateInput): Promise<void>;
  updateRole(id: string, role: Role): Promise<UserRoleUpdate>;
  softDelete(id: string): Promise<void>;
}
