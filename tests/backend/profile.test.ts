import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProfileUseCases } from "@/core/use-cases/profile.use-cases";
import type { IUserRepository } from "@/domain/repositories/user.repository.interface";
import { NotFoundError, AppError } from "@/lib/errors";

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
  },
}));

import bcrypt from "bcryptjs";

describe("ProfileUseCases", () => {
  let userRepo: {
    findById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    softDelete: ReturnType<typeof vi.fn>;
  };
  let useCases: ProfileUseCases;

  beforeEach(() => {
    userRepo = {
      findById: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
    };
    useCases = new ProfileUseCases(userRepo as unknown as IUserRepository);
    vi.clearAllMocks();
  });

  describe("updateProfile", () => {
    it("updates user name", async () => {
      userRepo.update.mockResolvedValue({ id: "user-1", name: "Updated" });

      const result = await useCases.updateProfile("user-1", "Updated");

      expect(result.name).toBe("Updated");
    });
  });

  describe("deleteAccount", () => {
    it("deletes account when password is correct", async () => {
      userRepo.findById.mockResolvedValue({
        id: "user-1",
        passwordHash: "hashed-password",
      });
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      userRepo.softDelete.mockResolvedValue(undefined);

      const result = await useCases.deleteAccount("user-1", "correct-password");

      expect(result).toBe(true);
      expect(userRepo.softDelete).toHaveBeenCalledWith("user-1");
    });

    it("throws when password is incorrect", async () => {
      userRepo.findById.mockResolvedValue({
        id: "user-1",
        passwordHash: "hashed-password",
      });
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(useCases.deleteAccount("user-1", "wrong")).rejects.toThrow(AppError);
    });

    it("throws NotFoundError when user not found", async () => {
      userRepo.findById.mockResolvedValue(null);

      await expect(useCases.deleteAccount("missing", "pw")).rejects.toThrow(NotFoundError);
    });
  });
});
