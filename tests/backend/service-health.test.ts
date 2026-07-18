/**
 * Unit tests for the Service Health module
 * - ServiceErrorClassifier (Requirement 1.1-1.5)
 * - RetryExecutor (Requirement 2.1-2.5, 5.2, 5.3)
 * - ServiceHealthValidator (Requirement 3.1-3.5)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ServiceErrorClassifier,
  ServiceErrorType,
  RetryExecutor,
  DATABASE_RETRY_STRATEGY,
  REDIS_RETRY_STRATEGY,
  ServiceHealthValidator,
  logger,
} from "@ibn-al-azhar-docs/shared";

describe("ServiceErrorClassifier", () => {
  describe("classify", () => {
    it("should classify database connection errors", () => {
      const error = new Error("Connection to database failed");
      const result = ServiceErrorClassifier.classify(error);

      expect(result.type).toBe(ServiceErrorType.DATABASE_UNAVAILABLE);
      expect(result.httpStatus).toBe(503);
      expect(result.message.ar).toBe("قاعدة البيانات غير متاحة حالياً. يرجى المحاولة مرة أخرى");
      expect(result.message.en).toBe("Database is currently unavailable. Please try again.");
      expect(result.originalError).toBe(error);
    });

    it("should classify postgres connection errors", () => {
      const error = new Error("Postgres connection refused");
      const result = ServiceErrorClassifier.classify(error);

      expect(result.type).toBe(ServiceErrorType.DATABASE_UNAVAILABLE);
      expect(result.httpStatus).toBe(503);
    });

    it("should classify neon connection errors", () => {
      const error = new Error("Neon connection timeout");
      const result = ServiceErrorClassifier.classify(error);

      expect(result.type).toBe(ServiceErrorType.DATABASE_UNAVAILABLE);
      expect(result.httpStatus).toBe(503);
    });

    it("should classify Redis errors", () => {
      const error = new Error("Redis connection failed");
      const result = ServiceErrorClassifier.classify(error);

      expect(result.type).toBe(ServiceErrorType.REDIS_UNAVAILABLE);
      expect(result.httpStatus).toBe(503);
      expect(result.message.ar).toBe("خدمة التخزين المؤقت غير متاحة. يرجى المحاولة مرة أخرى");
      expect(result.message.en).toBe("Cache service is unavailable. Please try again.");
    });

    it("should classify Upstash errors", () => {
      const error = new Error("Upstash quota exceeded");
      const result = ServiceErrorClassifier.classify(error);

      expect(result.type).toBe(ServiceErrorType.REDIS_UNAVAILABLE);
      expect(result.httpStatus).toBe(503);
    });

    it("should classify quota errors", () => {
      const error = new Error("Command quota limit reached");
      const result = ServiceErrorClassifier.classify(error);

      expect(result.type).toBe(ServiceErrorType.REDIS_UNAVAILABLE);
      expect(result.httpStatus).toBe(503);
    });

    it("should classify BullMQ/ioredis failure modes without the word 'redis'", () => {
      const bullMqErrors = [
        "ECONNREFUSED 127.0.0.1:6379",
        "WRONGPASS invalid username-password pair",
        "NOAUTH Authentication required",
        "OOM command not allowed when used memory > 'maxmemory'",
        "max number of clients reached",
        "ioredis: failed to connect",
        "bullmq: could not reconnect",
        "ioredis: ETIMEDOUT while connecting to redis",
        "bullmq connection is closed.",
      ];

      for (const message of bullMqErrors) {
        const result = ServiceErrorClassifier.classify(new Error(message));
        expect(result.type, `expected "${message}" to be REDIS_UNAVAILABLE`).toBe(
          ServiceErrorType.REDIS_UNAVAILABLE,
        );
        expect(result.httpStatus).toBe(503);
      }
    });

    it("should classify a timeout/closed-connection ONLY as REDIS when in a redis context", () => {
      // Redis context -> classified as REDIS_UNAVAILABLE
      const inContext = [
        "ioredis: ETIMEDOUT",
        "bullmq connection is closed.",
        "redis connection timeout",
        "Stream timed out, no reply received from redis server",
        "ECONNREFUSED 127.0.0.1:6379",
      ];
      for (const message of inContext) {
        const result = ServiceErrorClassifier.classify(new Error(message));
        expect(result.type, `expected "${message}" to be REDIS_UNAVAILABLE`).toBe(
          ServiceErrorType.REDIS_UNAVAILABLE,
        );
      }

      // Bare timeout/closed-connection from a non-redis dependency must NOT be
      // misclassified as a Redis outage.
      const bare = [
        "ETIMEDOUT while connecting to postgres",
        "Connection timeout contacting auth provider",
        "Connection is closed. (fetch)",
        "ECONNREFUSED 127.0.0.1:5432",
      ];
      for (const message of bare) {
        const result = ServiceErrorClassifier.classify(new Error(message));
        expect(result.type, `expected "${message}" NOT to be REDIS_UNAVAILABLE`).not.toBe(
          ServiceErrorType.REDIS_UNAVAILABLE,
        );
      }
    });

    it("should match the redis port 6379 precisely, not as a loose substring", () => {
      // These must NOT be classified as REDIS: a different port number that
      // merely contains the digits 6379, or a non-redis service port.
      const notRedis = [
        "ECONNREFUSED 127.0.0.1:16379", // a different port that contains 6379
        "ECONNREFUSED 127.0.0.1:5432", // postgres
        "ECONNREFUSED 127.0.0.1:26379", // another redis-like but different port
      ];
      for (const message of notRedis) {
        const result = ServiceErrorClassifier.classify(new Error(message));
        expect(result.type, `expected "${message}" NOT to be REDIS_UNAVAILABLE`).not.toBe(
          ServiceErrorType.REDIS_UNAVAILABLE,
        );
      }

      // These ARE redis (port 6379 at a host:port boundary — end of string or
      // followed by / or whitespace, matching the canonical ioredis
      // "connect ECONNREFUSED host:6379" form).
      const isRedis = [
        "ECONNREFUSED 127.0.0.1:6379",
        "ECONNREFUSED redis.example.com:6379",
        "connect ECONNREFUSED my-redis:6379/",
      ];
      for (const message of isRedis) {
        const result = ServiceErrorClassifier.classify(new Error(message));
        expect(result.type, `expected "${message}" to be REDIS_UNAVAILABLE`).toBe(
          ServiceErrorType.REDIS_UNAVAILABLE,
        );
      }
    });

    it("should classify ENOENT storage errors with specific message", () => {
      const error = new Error("ENOENT: no such file or directory");
      const result = ServiceErrorClassifier.classify(error);

      expect(result.type).toBe(ServiceErrorType.STORAGE_UNAVAILABLE);
      expect(result.httpStatus).toBe(503);
      expect(result.message.ar).toBe("مجلد التخزين غير موجود. يرجى التحقق من إعدادات النشر");
      expect(result.message.en).toBe(
        "Storage directory does not exist. Please check deployment configuration.",
      );
    });

    it("should classify EACCES storage errors with specific message", () => {
      const error = new Error("EACCES: permission denied");
      const result = ServiceErrorClassifier.classify(error);

      expect(result.type).toBe(ServiceErrorType.STORAGE_UNAVAILABLE);
      expect(result.httpStatus).toBe(503);
      expect(result.message.ar).toBe(
        "لا توجد صلاحيات كتابة على مجلد التخزين. يرجى الاتصال بالدعم الفني",
      );
      expect(result.message.en).toBe(
        "Storage directory is not writable. Please contact technical support.",
      );
    });

    it("should classify ENOSPC storage errors with specific message", () => {
      const error = new Error("ENOSPC: no space left on device");
      const result = ServiceErrorClassifier.classify(error);

      expect(result.type).toBe(ServiceErrorType.STORAGE_UNAVAILABLE);
      expect(result.httpStatus).toBe(507);
      expect(result.message.ar).toBe("مساحة التخزين ممتلئة. يرجى حذف بعض الملفات أو زيادة المساحة");
      expect(result.message.en).toBe(
        "Storage is full. Please delete files or increase storage capacity.",
      );
    });

    it("should classify disk errors", () => {
      const error = new Error("Disk write failed");
      const result = ServiceErrorClassifier.classify(error);

      expect(result.type).toBe(ServiceErrorType.STORAGE_UNAVAILABLE);
      expect(result.httpStatus).toBe(503);
    });

    it("should classify storage errors", () => {
      const error = new Error("Storage service unavailable");
      const result = ServiceErrorClassifier.classify(error);

      expect(result.type).toBe(ServiceErrorType.STORAGE_UNAVAILABLE);
      expect(result.httpStatus).toBe(503);
    });

    it("should classify unknown errors with fallback", () => {
      const error = new Error("Something went wrong");
      const result = ServiceErrorClassifier.classify(error);

      expect(result.type).toBe(ServiceErrorType.UNKNOWN_ERROR);
      expect(result.httpStatus).toBe(500);
      expect(result.message.ar).toBe("حدث خطأ في الخدمة. يرجى المحاولة لاحقاً");
      expect(result.message.en).toBe("A service error occurred. Please try again later.");
    });

    it("should handle non-Error objects", () => {
      const result = ServiceErrorClassifier.classify("string error");

      expect(result.type).toBe(ServiceErrorType.UNKNOWN_ERROR);
      expect(result.httpStatus).toBe(500);
      expect(result.originalError).toBeInstanceOf(Error);
    });

    it("should be case-insensitive for error detection", () => {
      const error = new Error("CONNECTION TO DATABASE FAILED");
      const result = ServiceErrorClassifier.classify(error);

      expect(result.type).toBe(ServiceErrorType.DATABASE_UNAVAILABLE);
    });
  });
});

describe("RetryExecutor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns the result without retrying on success", async () => {
    const operation = vi.fn().mockResolvedValue("ok");

    const promise = RetryExecutor.retryWithBackoff(operation, DATABASE_RETRY_STRATEGY, {
      serviceName: "database",
      operationName: "create_document",
    });
    const result = await promise;

    expect(result).toBe("ok");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("retries transient database failures and succeeds", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error("database connection refused"))
      .mockRejectedValueOnce(new Error("database connection refused"))
      .mockResolvedValueOnce("recovered");

    const promise = RetryExecutor.retryWithBackoff(operation, DATABASE_RETRY_STRATEGY, {
      serviceName: "database",
      operationName: "create_document",
    });

    // Flush microtasks and advance through the 100ms + 200ms backoff delays.
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(200);
    const result = await promise;

    expect(result).toBe("recovered");
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it("throws after exhausting all database retries", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("database connection refused"));

    const promise = RetryExecutor.retryWithBackoff(operation, DATABASE_RETRY_STRATEGY, {
      serviceName: "database",
      operationName: "create_document",
    });
    // Attach a no-op handler so the rejection during timer advancement is never
    // reported as unhandled; expect().rejects adds its own handler too.
    promise.catch(() => {});

    // Total delays: 100+200+400+800+1600+3200 = 6300ms across 6 waits.
    await vi.advanceTimersByTimeAsync(6300);
    await expect(promise).rejects.toThrow("database connection refused");
    // Initial attempt + 6 retries = 7 calls.
    expect(operation).toHaveBeenCalledTimes(7);
  });

  it("does not retry non-retryable errors", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("unknown boom"));

    const promise = RetryExecutor.retryWithBackoff(operation, DATABASE_RETRY_STRATEGY, {
      serviceName: "database",
      operationName: "create_document",
    });

    await expect(promise).rejects.toThrow("unknown boom");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("stops retrying when the total timeout is exceeded", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("database connection refused"));
    const strategy = {
      ...DATABASE_RETRY_STRATEGY,
      maxTotalTimeout: 50,
    };

    const promise = RetryExecutor.retryWithBackoff(operation, strategy, {
      serviceName: "database",
      operationName: "create_document",
    });
    promise.catch(() => {});

    // First wait 100ms, second attempt fails at ~200ms which exceeds the 150ms
    // budget, so no further waits are scheduled.
    await vi.advanceTimersByTimeAsync(500);
    await expect(promise).rejects.toThrow("database connection refused");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("uses the exact database backoff delay sequence", () => {
    expect(DATABASE_RETRY_STRATEGY.delays).toEqual([100, 200, 400, 800, 1600, 3200]);
    expect(DATABASE_RETRY_STRATEGY.maxTotalTimeout).toBe(10000);
  });

  it("uses the redis backoff delay sequence", () => {
    expect(REDIS_RETRY_STRATEGY.delays).toEqual([150, 300, 600]);
    expect(REDIS_RETRY_STRATEGY.maxTotalTimeout).toBe(4000);
  });

  it("logs retry lifecycle events", async () => {
    const debugSpy = vi.spyOn(logger, "debug");
    const infoSpy = vi.spyOn(logger, "info");
    const errorSpy = vi.spyOn(logger, "error");
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error("database connection refused"))
      .mockResolvedValueOnce("ok");

    const promise = RetryExecutor.retryWithBackoff(operation, DATABASE_RETRY_STRATEGY, {
      serviceName: "database",
      operationName: "create_document",
    });
    await vi.advanceTimersByTimeAsync(100);
    await promise;

    expect(debugSpy).toHaveBeenCalledWith(expect.any(Object), "Retrying operation");
    expect(infoSpy).toHaveBeenCalledWith(expect.any(Object), "Operation succeeded after retry");
    expect(errorSpy).not.toHaveBeenCalledWith(expect.any(Object), "Retry attempts exhausted");
  });
});

describe("ServiceHealthValidator", () => {
  it("returns success when all services are healthy", async () => {
    const result = await ServiceHealthValidator.validateAll({
      database: async () => {},
      redis: async () => {},
      storage: async () => {},
    });

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("returns the classified arabic error when database fails", async () => {
    const result = await ServiceHealthValidator.validateAll({
      database: async () => {
        throw new Error("database connection refused");
      },
      redis: async () => {},
      storage: async () => {},
    });

    expect(result.success).toBe(false);
    expect(result.error?.type).toBe(ServiceErrorType.DATABASE_UNAVAILABLE);
    expect(result.error?.httpStatus).toBe(503);
    expect(result.error?.message.ar).toBe(
      "قاعدة البيانات غير متاحة حالياً. يرجى المحاولة مرة أخرى",
    );
    expect(result.error?.message.en).toBe("Database is currently unavailable. Please try again.");
  });

  it("returns the classified error when redis fails", async () => {
    const result = await ServiceHealthValidator.validateAll({
      database: async () => {},
      redis: async () => {
        throw new Error("Redis connection failed");
      },
      storage: async () => {},
    });

    expect(result.success).toBe(false);
    expect(result.error?.type).toBe(ServiceErrorType.REDIS_UNAVAILABLE);
  });

  it("returns the classified error when storage fails with permission denied", async () => {
    const result = await ServiceHealthValidator.validateAll({
      database: async () => {},
      redis: async () => {},
      storage: async () => {
        throw new Error("EACCES: permission denied");
      },
    });

    expect(result.success).toBe(false);
    expect(result.error?.type).toBe(ServiceErrorType.STORAGE_UNAVAILABLE);
    expect(result.error?.httpStatus).toBe(503);
    expect(result.error?.message.ar).toBe(
      "لا توجد صلاحيات كتابة على مجلد التخزين. يرجى الاتصال بالدعم الفني",
    );
    expect(result.error?.message.en).toBe(
      "Storage directory is not writable. Please contact technical support.",
    );
  });

  it("fails within the configured timeout when a check hangs", async () => {
    vi.useFakeTimers();
    const resultPromise = ServiceHealthValidator.validateAll(
      {
        database: async () => {},
        redis: async () => {},
        storage: async () => new Promise<void>(() => {}), // never resolves
      },
      { timeoutMs: 200 },
    );
    await vi.advanceTimersByTimeAsync(200);
    const result = await resultPromise;
    vi.useRealTimers();

    expect(result.success).toBe(false);
  });
});

describe("Redis retry wall-clock budget (real timers)", () => {
  it("exhausts the redis retry strategy within maxTotalTimeout (~4s), not 30s", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("ECONNREFUSED 127.0.0.1:6379"));
    const start = Date.now();

    const promise = RetryExecutor.retryWithBackoff(operation, REDIS_RETRY_STRATEGY, {
      serviceName: "redis",
      operationName: "enqueue_validation",
    });
    await expect(promise).rejects.toThrow("ECONNREFUSED 127.0.0.1:6379");
    const elapsedMs = Date.now() - start;

    // 1 initial + 3 retries = 4 calls. Sum of delays = 150+300+600 = 1050ms.
    // Allow generous overhead; must stay well under the old 30s window.
    expect(operation).toHaveBeenCalledTimes(4);
    expect(elapsedMs).toBeLessThan(4000);
    expect(elapsedMs).toBeGreaterThanOrEqual(1000);
  });
});
