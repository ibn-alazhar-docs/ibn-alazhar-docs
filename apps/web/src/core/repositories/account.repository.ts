import { prisma } from "@/lib/backend/prisma";
import type { IAccountRepository } from "../../domain/repositories/account.repository.interface";

export class AccountRepository implements IAccountRepository {
  async findGoogleAccount(userId: string) {
    return prisma.account.findFirst({
      where: { userId, provider: "google" },
      select: {
        id: true,
        access_token: true,
        refresh_token: true,
        expires_at: true,
      },
    });
  }
}
