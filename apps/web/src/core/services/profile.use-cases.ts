import bcrypt from "bcryptjs";
import { AppError, NotFoundError } from "@/shared/errors";
import { ERROR_CODES } from "@/shared/constants";
import type { IUserRepository } from "@/domain/repositories/user.repository.interface";

export class ProfileUseCases {
  constructor(private readonly userRepository: IUserRepository) {}

  async getProfile(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError();
    // Exclude passwordHash from the returned user object
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async updateProfile(userId: string, name: string) {
    return this.userRepository.update(userId, { name });
  }

  async deleteAccount(userId: string, password: string) {
    const user = await this.userRepository.findById(userId);

    if (!user) throw new NotFoundError();

    const valid = await bcrypt.compare(password, user.passwordHash ?? "");
    if (!valid) throw new AppError("كلمة المرور غير صحيحة", ERROR_CODES.UNAUTHORIZED, 401);

    await this.userRepository.softDelete(userId);

    return true;
  }
}
