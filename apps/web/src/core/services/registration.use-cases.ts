import crypto from "crypto";
import bcrypt from "bcryptjs";
import { ConflictError } from "@/shared/errors";
import { ROLE } from "@/domain/auth";
import type { IUserRepository } from "@/domain/repositories/user.repository.interface";
import type { IVerificationTokenRepository } from "@/domain/repositories/verification-token.repository.interface";
import { sendVerificationEmail } from "@/lib/email/send";
import { logger } from "@/shared/logger";

export class RegistrationUseCases {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly verificationTokenRepository: IVerificationTokenRepository,
  ) {}

  async register(name: string | null, email: string, password: string) {
    const normalizedEmail = email.toLowerCase();

    const existingUser = await this.userRepository.findByEmail(normalizedEmail);

    if (existingUser) {
      throw new ConflictError("هذا البريد الإلكتروني مسجل مسبقاً");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.userRepository.create({
      name,
      email: normalizedEmail,
      passwordHash,
      role: ROLE.STUDENT,
      locale: "ar",
      // SECURITY (M1): new accounts are created UNVERIFIED. `emailVerified`
      // stays null until the user completes email verification. This is what
      // allows the Google OAuth linking guard in auth.ts to safely refuse to
      // link a Google account to an unverified credentials account.
      emailVerified: null,
    });

    // SECURITY (M2): issue a single-use email-verification token so the new
    // account can complete verification (and unlock Google account linking).
    // The account stays unverified until the user clicks the link.
    // Graceful: if email sending is unavailable (RESEND_API_KEY unset) or
    // fails, we do NOT throw — the account simply remains unverified and the
    // user can request verification later.
    try {
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date();
      expires.setHours(expires.getHours() + 24);

      await this.verificationTokenRepository.create({
        identifier: normalizedEmail,
        token,
        expires,
      });

      const sent = await sendVerificationEmail({
        to: normalizedEmail,
        username: name ?? normalizedEmail,
        token,
      });

      if (!sent.success) {
        logger.warn(
          { email: normalizedEmail, error: sent.error ?? "unknown" },
          "[registration] verification email not sent",
        );
      }
    } catch (error) {
      // Never fail registration because of email/verification-token issues.
      logger.error(
        { err: error, email: normalizedEmail },
        "[registration] failed to issue verification token/email",
      );
    }

    return user;
  }
}
