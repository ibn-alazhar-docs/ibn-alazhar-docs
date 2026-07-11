import { PrismaClient } from "@prisma/client";
import type {
  IVerificationTokenRepository,
  VerificationTokenRecord,
} from "@/domain/repositories/verification-token.repository.interface";

export class VerificationTokenRepository implements IVerificationTokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: { identifier: string; token: string; expires: Date }): Promise<void> {
    await this.prisma.verificationToken.create({ data });
  }

  async findByIdentifierAndToken(
    identifier: string,
    token: string,
  ): Promise<VerificationTokenRecord | null> {
    const row = await this.prisma.verificationToken.findFirst({
      where: { identifier, token },
    });
    if (!row) return null;
    return { identifier: row.identifier, token: row.token, expires: row.expires };
  }

  async deleteByIdentifier(identifier: string): Promise<void> {
    await this.prisma.verificationToken.deleteMany({ where: { identifier } });
  }

  async deleteByIdentifierAndToken(identifier: string, token: string): Promise<void> {
    await this.prisma.verificationToken.deleteMany({ where: { identifier, token } });
  }
}
