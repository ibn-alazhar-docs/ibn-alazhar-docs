import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { ValidationError } from "@/lib/shared/errors";

export class PasswordResetUseCases {
  constructor(private readonly prisma: PrismaClient) {}

  async forgotPassword(email: string) {
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists and is not deleted
    const user = await this.prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        deletedAt: null,
      },
    });

    if (!user) {
      // To prevent email enumeration attacks, return success status cleanly
      return { success: true };
    }

    // Delete any existing verification tokens for this email first (identifier = email)
    await this.prisma.verificationToken.deleteMany({
      where: {
        identifier: normalizedEmail,
      },
    });

    // Generate a random 64-character hex token (using Node.js crypto)
    const token = crypto.randomBytes(32).toString("hex");

    // Save the new verification token with identifier = email, token, and expires = 1 hour from now
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    await this.prisma.verificationToken.create({
      data: {
        identifier: normalizedEmail,
        token,
        expires,
      },
    });

    return {
      success: true,
      token,
      email: normalizedEmail,
    };
  }

  async resetPassword(email: string, token: string, newPassword: string) {
    const normalizedEmail = email.toLowerCase().trim();

    // Find the verification token in the database where identifier = email and token = token
    const verificationToken = await this.prisma.verificationToken.findFirst({
      where: {
        identifier: normalizedEmail,
        token: token,
      },
    });

    // If not found or if the token has expired, throw a ValidationError
    if (!verificationToken || verificationToken.expires < new Date()) {
      throw new ValidationError("رابط إعادة التعيين غير صالح أو منتهي الصلاحية");
    }

    // Hash the new password using bcryptjs with salt rounds 10
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update the user record: set passwordHash, reset failedLoginAttempts to 0, and clear lockedAt
    await this.prisma.user.update({
      where: {
        email: normalizedEmail,
      },
      data: {
        passwordHash,
        failedLoginAttempts: 0,
        lockedAt: null,
      },
    });

    // Delete the verification token from the database
    await this.prisma.verificationToken.deleteMany({
      where: {
        identifier: normalizedEmail,
        token: token,
      },
    });

    return { success: true };
  }
}
