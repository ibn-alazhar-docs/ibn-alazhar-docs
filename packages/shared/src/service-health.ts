/**
 * Service Health Module
 *
 * Provides error classification, retry logic, and service validation
 * for Hugging Face Spaces deployment with external dependencies:
 * - Neon PostgreSQL (free tier with cold start)
 * - Upstash Redis (free tier with quota limits)
 * - Local filesystem storage
 */

import { logger } from "./logger";

/**
 * Service error type enumeration
 * Maps specific service failures to error categories
 */
export enum ServiceErrorType {
  DATABASE_UNAVAILABLE = "DATABASE_UNAVAILABLE",
  REDIS_UNAVAILABLE = "REDIS_UNAVAILABLE",
  STORAGE_UNAVAILABLE = "STORAGE_UNAVAILABLE",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * Classified service error with bilingual messages
 * Requirement 1.5: All errors include Arabic and English messages
 */
export interface ServiceError {
  type: ServiceErrorType;
  message: { ar: string; en: string };
  httpStatus: number;
  originalError?: Error;
}

/**
 * Service Error Classifier
 *
 * Maps raw errors to specific error types with appropriate messages
 * and HTTP status codes. Detects database, Redis, and storage errors
 * based on error message content.
 *
 * Requirements 1.1-1.4: Classify service-specific errors
 * Requirement 1.5: Provide bilingual error messages
 */
export class ServiceErrorClassifier {
  /**
   * Classify an error into a specific service error type
   *
   * @param error - Unknown error from service operation
   * @returns ServiceError with type, messages, and HTTP status
   */
  static classify(error: unknown): ServiceError {
    const err = error instanceof Error ? error : new Error(String(error));
    const message = err.message.toLowerCase();

    // Database errors (Requirement 1.1)
    // Detect: connection issues, postgres/neon-specific errors
    if (
      message.includes("connection") &&
      (message.includes("database") || message.includes("postgres") || message.includes("neon"))
    ) {
      return {
        type: ServiceErrorType.DATABASE_UNAVAILABLE,
        message: {
          ar: "قاعدة البيانات غير متاحة حالياً. يرجى المحاولة مرة أخرى",
          en: "Database is currently unavailable. Please try again.",
        },
        httpStatus: 503,
        originalError: err,
      };
    }

    // Redis errors (Requirement 1.2)
    // Detect: Redis connection, Upstash quota, or command errors
    if (message.includes("redis") || message.includes("upstash") || message.includes("quota")) {
      return {
        type: ServiceErrorType.REDIS_UNAVAILABLE,
        message: {
          ar: "خدمة التخزين المؤقت غير متاحة. يرجى المحاولة مرة أخرى",
          en: "Cache service is unavailable. Please try again.",
        },
        httpStatus: 503,
        originalError: err,
      };
    }

    // Storage errors (Requirement 1.3)
    // Detect: filesystem errors (ENOENT, EACCES, ENOSPC) and storage keywords
    if (
      message.includes("enoent") ||
      message.includes("eacces") ||
      message.includes("enospc") ||
      message.includes("disk") ||
      message.includes("storage")
    ) {
      return {
        type: ServiceErrorType.STORAGE_UNAVAILABLE,
        message: {
          ar: "نظام التخزين غير متاح. يرجى الاتصال بالدعم الفني",
          en: "Storage system is unavailable. Please contact technical support.",
        },
        httpStatus: 503,
        originalError: err,
      };
    }

    // Unknown errors (Requirement 1.4)
    // Fallback for any unrecognized error
    return {
      type: ServiceErrorType.UNKNOWN_ERROR,
      message: {
        ar: "حدث خطأ في الخدمة. يرجى المحاولة لاحقاً",
        en: "A service error occurred. Please try again later.",
      },
      httpStatus: 500,
      originalError: err,
    };
  }
}

/**
 * Retry Strategy Configuration
 *
 * Defines retry behavior for specific error types:
 * - delays: Array of milliseconds to wait between attempts
 * - maxTotalTimeout: Maximum time for all retry attempts
 * - shouldRetry: Function to determine if error is retryable
 */
export interface RetryStrategy {
  delays: number[];
  maxTotalTimeout: number;
  shouldRetry: (error: unknown) => boolean;
}

/**
 * Database Retry Strategy (Requirement 2.1)
 *
 * Exponential backoff for Neon PostgreSQL cold starts:
 * - 6 attempts: 100ms, 200ms, 400ms, 800ms, 1600ms, 3200ms
 * - Total timeout: 10 seconds
 * - Only retries DATABASE_UNAVAILABLE errors
 */
export const DATABASE_RETRY_STRATEGY: RetryStrategy = {
  delays: [100, 200, 400, 800, 1600, 3200],
  maxTotalTimeout: 10000,
  shouldRetry: (error: unknown) => {
    const serviceError = ServiceErrorClassifier.classify(error);
    return serviceError.type === ServiceErrorType.DATABASE_UNAVAILABLE;
  },
};

/**
 * Redis Retry Strategy (Requirement 2.2)
 *
 * Exponential backoff for Upstash Redis quota/connection issues:
 * - 5 attempts: 100ms, 200ms, 400ms, 800ms, 1600ms
 * - Total timeout: 10 seconds
 * - Only retries REDIS_UNAVAILABLE errors
 */
export const REDIS_RETRY_STRATEGY: RetryStrategy = {
  delays: [100, 200, 400, 800, 1600],
  maxTotalTimeout: 10000,
  shouldRetry: (error: unknown) => {
    const serviceError = ServiceErrorClassifier.classify(error);
    return serviceError.type === ServiceErrorType.REDIS_UNAVAILABLE;
  },
};

/**
 * Retry Executor with Exponential Backoff
 *
 * Executes operations with configurable retry strategies.
 * Logs attempts at debug level, successes at info, failures at warn/error.
 *
 * Requirements 2.1-2.3: Implement retry with exponential backoff
 */
export class RetryExecutor {
  /**
   * Execute operation with retry strategy
   *
   * @param operation - Async function to execute
   * @param strategy - Retry configuration
   * @param context - Service and operation names for logging
   * @returns Result of successful operation
   * @throws Last error if all retries exhausted or non-retryable
   */
  static async retryWithBackoff<T>(
    operation: () => Promise<T>,
    strategy: RetryStrategy,
    context: { serviceName: string; operationName: string },
  ): Promise<T> {
    const startTime = Date.now();
    let lastError: unknown;

    for (let attempt = 0; attempt < strategy.delays.length + 1; attempt++) {
      try {
        if (attempt > 0) {
          logger.debug(
            {
              service: context.serviceName,
              operation: context.operationName,
              attempt,
              totalAttempts: strategy.delays.length + 1,
            },
            "Retrying operation",
          );
        }

        const result = await operation();

        if (attempt > 0) {
          logger.info(
            {
              service: context.serviceName,
              operation: context.operationName,
              attempt,
              duration: Date.now() - startTime,
            },
            "Operation succeeded after retry",
          );
        }

        return result;
      } catch (error) {
        lastError = error;
        logger.warn(
          {
            service: context.serviceName,
            operation: context.operationName,
            attempt,
            error: error instanceof Error ? error.message : String(error),
          },
          "Operation failed",
        );

        const elapsedTime = Date.now() - startTime;
        const isLastAttempt = attempt >= strategy.delays.length;
        const timeoutExceeded = elapsedTime >= strategy.maxTotalTimeout;

        if (isLastAttempt || timeoutExceeded || !strategy.shouldRetry(error)) {
          logger.error(
            {
              service: context.serviceName,
              operation: context.operationName,
              totalAttempts: attempt + 1,
              duration: elapsedTime,
              reason: timeoutExceeded
                ? "timeout"
                : isLastAttempt
                  ? "max_attempts"
                  : "non_retryable",
            },
            "Retry attempts exhausted",
          );
          throw error;
        }

        const delay = strategy.delays[attempt];
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}

/**
 * Resolve a promise with a hard timeout.
 *
 * Used by the service validator and health checks so a hung external
 * dependency (e.g. Neon cold start) cannot block the request thread.
 *
 * @param promise - The operation to race against the timeout
 * @param timeoutMs - Maximum milliseconds to wait
 * @param message - Error message used when the timeout fires
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer!: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * A lightweight service availability check.
 * Resolves when the service is reachable, rejects with a descriptive error
 * when it is not. Kept dependency-free so the shared package never imports
 * concrete Prisma/Redis clients.
 */
export type ServiceCheckFn = () => Promise<void>;

/**
 * Result of running the pre-upload service validation.
 * When `success` is false, `error` carries the classified service error so
 * the caller can return the Arabic message and English fallback.
 */
export interface ServiceValidationResult {
  success: boolean;
  error?: ServiceError;
}

/**
 * Service Health Validator
 *
 * Runs cheap connectivity checks against every external dependency before
 * an upload is accepted, so users are not left uploading a file that will
 * fail to process (Requirement 3.1-3.5). All checks run in parallel with a
 * shared timeout to keep validation fast (Requirement 7.2, 7.4).
 */
export class ServiceHealthValidator {
  static async validateDatabase(check: ServiceCheckFn): Promise<void> {
    await check();
  }

  static async validateRedis(check: ServiceCheckFn): Promise<void> {
    await check();
  }

  static async validateStorage(check: ServiceCheckFn): Promise<void> {
    await check();
  }

  /**
   * Validate all required services in parallel.
   *
   * @param checks - Per-service check functions (DB, Redis, storage)
   * @param options.timeoutMs - Per-check timeout (default 2000ms per REQ 7.2)
   * @returns Success, or the classified service error to surface to the user
   */
  static async validateAll(
    checks: {
      database: ServiceCheckFn;
      redis: ServiceCheckFn;
      storage: ServiceCheckFn;
    },
    options?: { timeoutMs?: number },
  ): Promise<ServiceValidationResult> {
    const timeoutMs = options?.timeoutMs ?? 2000;

    const run = (fn: ServiceCheckFn): Promise<void> =>
      withTimeout(fn(), timeoutMs, "Service validation timed out");

    try {
      await Promise.all([run(checks.database), run(checks.redis), run(checks.storage)]);
      return { success: true };
    } catch (error) {
      const serviceError = ServiceErrorClassifier.classify(error);
      return { success: false, error: serviceError };
    }
  }
}
