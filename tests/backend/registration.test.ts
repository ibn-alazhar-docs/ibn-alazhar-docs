import { describe, it, expect, vi, beforeEach } from "vitest";
import { RegistrationUseCases } from "@/core/services/registration.use-cases";
import type { IUserRepository } from "@/domain/repositories/user.repository.interface";
import { ConflictError } from "@/lib/shared/errors";

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(),
  },
}));

import bcrypt from "bcryptjs";

describe("RegistrationUseCases", () => {
  let userRepo: {
    findByEmail: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  let useCases: RegistrationUseCases;

  beforeEach(() => {
    userRepo = {
      findByEmail: vi.fn(),
      create: vi.fn(),
    };
    useCases = new RegistrationUseCases(userRepo as unknown as IUserRepository);
    vi.clearAllMocks();
  });

  describe("register", () => {
    it("creates a new user with STUDENT role", async () => {
      userRepo.findByEmail.mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue("hashed-pw" as never);
      userRepo.create.mockResolvedValue({
        id: "user-1",
        name: "Test",
        email: "test@test.com",
        role: "STUDENT",
      });

      const result = await useCases.register("Test", "Test@Test.com", "password123");

      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Test",
          email: "test@test.com",
          role: "STUDENT",
          locale: "ar",
        }),
      );
      expect(result.id).toBe("user-1");
    });

    it("normalizes email to lowercase", async () => {
      userRepo.findByEmail.mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue("hashed" as never);
      userRepo.create.mockResolvedValue({ id: "u1" });

      await useCases.register(null, "USER@EXAMPLE.COM", "pw");

      expect(userRepo.findByEmail).toHaveBeenCalledWith("user@example.com");
    });

    it("throws ConflictError when email already exists", async () => {
      userRepo.findByEmail.mockResolvedValue({ id: "existing" });

      await expect(useCases.register(null, "test@test.com", "pw")).rejects.toThrow(ConflictError);
    });
  });
});
