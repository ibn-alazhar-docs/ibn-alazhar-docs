import type { IUserRepository } from "@/domain/repositories/user.repository.interface";
import type { IVerificationTokenRepository } from "@/domain/repositories/verification-token.repository.interface";

export type EmailVerificationResult = { verified: true; identifier: string } | { verified: false };

export class EmailVerificationUseCases {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly verificationTokenRepository: IVerificationTokenRepository,
  ) {}

  async verify(token: string): Promise<EmailVerificationResult> {
    const verificationToken = await this.verificationTokenRepository.findByToken(token);

    if (!verificationToken || verificationToken.expires < new Date()) {
      return { verified: false };
    }

    await this.userRepository.updateByEmail(verificationToken.identifier, {
      emailVerified: new Date(),
    });

    await this.verificationTokenRepository.deleteByToken(token);

    return { verified: true, identifier: verificationToken.identifier };
  }
}
