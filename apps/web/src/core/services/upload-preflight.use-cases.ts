import { access, constants } from "node:fs/promises";
import { ServiceHealthValidator, ServiceErrorType } from "@ibn-al-azhar-docs/shared";
import type { IUserRepository } from "@/domain/repositories/user.repository.interface";
import { MAX_UPLOAD_SIZE_MB } from "@/shared/validators/document";
import { ERROR_CODES } from "@/shared/constants";
import { logger } from "@/shared/logger";
import { getRedisClient } from "@/clients/redis/rate-limit/redis";

export type UploadPreflightResult =
  | { ok: true }
  | { ok: false; status: number; body: Record<string, unknown> };

export class UploadPreflightUseCases {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly pingDatabase: () => Promise<void>,
  ) {}

  async assertUserActive(userId: string): Promise<UploadPreflightResult> {
    const userExists = await this.userRepository.findById(userId);

    if (!userExists || userExists.deletedAt) {
      logger.warn({ userId }, "Upload rejected: user not found or deleted");
      return {
        ok: false,
        status: 401,
        body: {
          error: {
            code: ERROR_CODES.UNAUTHORIZED,
            message: "الجلسة غير صالحة. يرجى تسجيل الدخول مرة أخرى.",
          },
        },
      };
    }

    return { ok: true };
  }

  async checkSizeAndServices(
    userId: string,
    declaredLength: number,
  ): Promise<UploadPreflightResult> {
    const hardCap = MAX_UPLOAD_SIZE_MB * 1024 * 1024 + 8 * 1024 * 1024;
    if (declaredLength > hardCap) {
      return {
        ok: false,
        status: 400,
        body: {
          error: {
            code: ERROR_CODES.UPLOAD_FILE_TOO_LARGE,
            message: `الملف أكبر من الحد المسموح (${MAX_UPLOAD_SIZE_MB}MB). يرجى تقليل الحجم أو تقسيم الملف.`,
          },
        },
      };
    }

    const serviceValidation = await ServiceHealthValidator.validateAll(
      {
        database: this.pingDatabase,
        redis: async () => {
          if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
            return;
          }
          try {
            const client = await getRedisClient();
            if (!client) return;
            await client.ping();
          } catch {
            // Non-blocking: Redis may be starting up or temporarily unreachable.
          }
        },
        storage: async () => {
          await access(process.env.STORAGE_LOCAL_DIR || "/data", constants.W_OK);
        },
      },
      { timeoutMs: 2000 },
    );

    if (!serviceValidation.success && serviceValidation.error) {
      const { type, message, httpStatus } = serviceValidation.error;
      const code =
        type === ServiceErrorType.DATABASE_UNAVAILABLE
          ? ERROR_CODES.DB_CONNECTION_FAILED
          : type === ServiceErrorType.REDIS_UNAVAILABLE
            ? ERROR_CODES.REDIS_UNAVAILABLE
            : type === ServiceErrorType.STORAGE_UNAVAILABLE
              ? ERROR_CODES.UPLOAD_STORAGE_UNAVAILABLE
              : ERROR_CODES.INTERNAL_ERROR;

      logger.warn({ service: type, userId }, "Pre-upload service validation failed");

      return {
        ok: false,
        status: httpStatus,
        body: {
          error: { code, message: message.ar },
          errorEn: message.en,
        },
      };
    }

    return { ok: true };
  }
}
