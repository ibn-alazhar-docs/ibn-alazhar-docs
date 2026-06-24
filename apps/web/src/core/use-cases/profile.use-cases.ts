import bcrypt from "bcryptjs";
import { AppError, NotFoundError } from "@/lib/errors";
import type { IUserRepository } from "@/domain/repositories/user.repository.interface";
import { userRepository } from "../repositories/user.repository";

export class ProfileUseCases {
  constructor(private readonly userRepository: IUserRepository) {}

  async updateProfile(userId: string, name: string) {
    return this.userRepository.update(userId, { name });
  }

  async deleteAccount(userId: string, password: string) {
    const user = await this.userRepository.findById(userId);

    if (!user) throw new NotFoundError();

    const valid = await bcrypt.compare(password, user.passwordHash ?? "");
    if (!valid) throw new AppError("كلمة المرور غير صحيحة", "UNAUTHORIZED", 401);

    await this.userRepository.softDelete(userId);

    return true;
  }
}

export const profileUseCases = new ProfileUseCases(userRepository);
