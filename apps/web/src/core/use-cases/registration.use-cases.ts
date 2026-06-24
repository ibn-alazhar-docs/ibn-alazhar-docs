import bcrypt from "bcryptjs";
import { ConflictError } from "@/lib/errors";
import type { IUserRepository } from "@/domain/repositories/user.repository.interface";
import { userRepository } from "../repositories/user.repository";

export class RegistrationUseCases {
  constructor(private readonly userRepository: IUserRepository) {}

  async register(name: string | null, email: string, password: string) {
    const normalizedEmail = email.toLowerCase();

    const existingUser = await this.userRepository.findByEmail(normalizedEmail);

    if (existingUser) {
      throw new ConflictError("هذا البريد الإلكتروني مسجل مسبقاً");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await this.userRepository.create({
      name,
      email: normalizedEmail,
      passwordHash,
      role: "STUDENT",
      locale: "ar",
    });

    return user;
  }
}

export const registrationUseCases = new RegistrationUseCases(userRepository);
