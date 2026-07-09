import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserUseCases } from "@/core/services/user.use-cases";
import type { IUserRepository } from "@/domain/repositories/user.repository.interface";
import { NotFoundError, ValidationError } from "@/shared/errors";

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    name: "Test User",
    email: "test@test.com",
    role: "STUDENT",
    createdAt: new Date(),
    _count: { documents: 5 },
    ...overrides,
  };
}

describe("UserUseCases", () => {
  let userRepo: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    updateRole: ReturnType<typeof vi.fn>;
    softDelete: ReturnType<typeof vi.fn>;
  };
  let useCases: UserUseCases;

  beforeEach(() => {
    userRepo = {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      updateRole: vi.fn(),
      softDelete: vi.fn(),
    };
    useCases = new UserUseCases(userRepo as unknown as IUserRepository);
  });

  describe("getUsers", () => {
    it("returns paginated users", async () => {
      userRepo.findMany.mockResolvedValue([makeUser()]);
      userRepo.count.mockResolvedValue(1);

      const result = await useCases.getUsers(1, 50);

      expect(result.users).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
    });

    it("sanitizes page and limit values", async () => {
      userRepo.findMany.mockResolvedValue([]);
      userRepo.count.mockResolvedValue(0);

      await useCases.getUsers(0, 0);

      expect(userRepo.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 1 }));
    });

    it("caps limit at MAX_PAGE_LIMIT", async () => {
      userRepo.findMany.mockResolvedValue([]);
      userRepo.count.mockResolvedValue(0);

      await useCases.getUsers(1, 999);

      expect(userRepo.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));
    });
  });

  describe("updateUserRole", () => {
    it("updates user role", async () => {
      userRepo.findFirst.mockResolvedValue({ id: "user-1" });
      userRepo.updateRole.mockResolvedValue({
        id: "user-1",
        name: "Test",
        email: "t@t.com",
        role: "TEACHER",
      });

      const result = await useCases.updateUserRole("user-1", "TEACHER", "admin-1");

      expect(result.role).toBe("TEACHER");
    });

    it("throws when trying to change own role", async () => {
      await expect(useCases.updateUserRole("user-1", "ADMIN", "user-1")).rejects.toThrow(
        ValidationError,
      );
    });

    it("throws NotFoundError when user not found", async () => {
      userRepo.findFirst.mockResolvedValue(null);

      await expect(useCases.updateUserRole("missing", "ADMIN", "admin-1")).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("deleteUser", () => {
    it("soft-deletes a user", async () => {
      userRepo.findFirst.mockResolvedValue({ id: "user-1" });
      userRepo.softDelete.mockResolvedValue(undefined);

      await useCases.deleteUser("user-1", "admin-1");

      expect(userRepo.softDelete).toHaveBeenCalledWith("user-1");
    });

    it("throws when trying to delete self", async () => {
      await expect(useCases.deleteUser("user-1", "user-1")).rejects.toThrow(ValidationError);
    });

    it("throws NotFoundError when user not found", async () => {
      userRepo.findFirst.mockResolvedValue(null);

      await expect(useCases.deleteUser("missing", "admin-1")).rejects.toThrow(NotFoundError);
    });
  });
});
