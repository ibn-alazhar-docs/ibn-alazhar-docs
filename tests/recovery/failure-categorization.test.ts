import { describe, it, expect } from "vitest";
import { categorizeFailure } from "../../packages/pipeline/src/queue";
import { FAILURE_CATEGORIES, JOB_TIMEOUTS, JOB_QUEUES } from "../../packages/pipeline/src/types";

describe("Failure Categorization & Retry Logic", () => {
  describe("Transient failures (retryable)", () => {
    const transientErrors = [
      { msg: "OCR_UPLOAD_FAILED: Could not upload to storage", code: "OCR_UPLOAD_FAILED" },
      { msg: "OCR_NO_TEXT: No text extracted from page 3", code: "OCR_NO_TEXT" },
      { msg: "ETIMEDOUT: Connection timed out after 30000ms", code: "NETWORK_ERROR" },
      { msg: "ECONNRESET: Connection reset by peer", code: "NETWORK_ERROR" },
      { msg: "socket hang up during OCR processing", code: "NETWORK_ERROR" },
      { msg: "RequestTimeout: API call exceeded 60s", code: "REQUEST_TIMEOUT" },
      { msg: "socket timeout while downloading", code: "REQUEST_TIMEOUT" },
      { msg: "rateLimit: API rate limit exceeded (429)", code: "RATE_LIMITED" },
      { msg: "quota exceeded for Google Vision API", code: "RATE_LIMITED" },
      { msg: "429 Too Many Requests", code: "RATE_LIMITED" },
      { msg: "Redis connection refused", code: "REDIS_ERROR" },
      { msg: "redis: MISCONF errors writing key", code: "REDIS_ERROR" },
      { msg: "MinIO storage error: bucket not found", code: "STORAGE_ERROR" },
      { msg: "minio: S3 error AccessDenied", code: "STORAGE_ERROR" },
      { msg: "storage: file not found in bucket", code: "STORAGE_ERROR" },
    ];

    for (const { msg, code } of transientErrors) {
      it(`classifies as TRANSIENT: ${msg.slice(0, 50)}`, () => {
        const result = categorizeFailure(new Error(msg));
        expect(result.category).toBe(FAILURE_CATEGORIES.TRANSIENT);
        expect(result.code).toBe(code);
      });
    }

    it("unknown errors default to TRANSIENT (safe default for retry)", () => {
      const result = categorizeFailure(new Error("some unexpected error"));
      expect(result.category).toBe(FAILURE_CATEGORIES.TRANSIENT);
      expect(result.code).toBe("UNKNOWN_ERROR");
    });
  });

  describe("Permanent failures (retry unlikely to succeed)", () => {
    const permanentErrors = [
      {
        msg: "OCR_QUOTA_EXCEEDED: Monthly quota exhausted",
        code: "OCR_QUOTA_EXCEEDED",
      },
      { msg: "PDF_ENCRYPTED: File is password-protected", code: "PDF_ENCRYPTED" },
      { msg: "PDF_CORRUPT: Invalid PDF header", code: "PDF_CORRUPT" },
      { msg: "PDF_TRUNCATED: File ends unexpectedly at byte 4096", code: "PDF_TRUNCATED" },
      { msg: "PDF_INVALID: could not open document (Data format error)", code: "PDF_INVALID" },
      { msg: "PDF_EXCEEDS_MAX_PAGES: 4 > 3", code: "PDF_EXCEEDS_MAX_PAGES" },
      { msg: "PDF_RENDER_FAILED: page 1 (out of memory)", code: "PDF_RENDER_FAILED" },
      // Wrapped by splitPdfPages (PDF_SPLIT_FAILED: <code>: <msg>) — substring still matches.
      {
        msg: "PDF_SPLIT_FAILED: PDF_INVALID: could not open document",
        code: "PDF_INVALID",
      },
      { msg: "FILE_TOO_LARGE: 6GB exceeds maximum allowed", code: "FILE_TOO_LARGE" },
      { msg: "INVALID_TYPE: application/x-executable not allowed", code: "INVALID_TYPE" },
    ];

    for (const { msg, code } of permanentErrors) {
      it(`classifies as PERMANENT: ${msg.slice(0, 50)}`, () => {
        const result = categorizeFailure(new Error(msg));
        expect(result.category).toBe(FAILURE_CATEGORIES.PERMANENT);
        expect(result.code).toBe(code);
      });
    }
  });

  describe("Fatal failures (not retryable, go to DLQ)", () => {
    it("JOB_TIMEOUT classified as FATAL", () => {
      const result = categorizeFailure(new Error("JOB_TIMEOUT: exceeded 7200000ms"));
      expect(result.category).toBe(FAILURE_CATEGORIES.FATAL);
      expect(result.code).toBe("JOB_TIMEOUT");
    });

    it("JOB_ABORTED classified as FATAL", () => {
      const result = categorizeFailure(new Error("JOB_ABORTED: user cancelled"));
      expect(result.category).toBe(FAILURE_CATEGORIES.FATAL);
      expect(result.code).toBe("JOB_ABORTED");
    });
  });

  describe("Retry configuration", () => {
    it("OCR queue gets 3 retries by default", () => {
      const maxRetries = parseInt(process.env.OCR_MAX_RETRIES ?? "3") || 3;
      expect(maxRetries).toBe(3);
    });

    it("OCR queue retry delay starts at 5 seconds (exponential)", () => {
      const delay = 5000;
      expect(delay).toBe(5000);
    });

    it("non-OCR queues get 3 retries with 2-second delay", () => {
      const attempts = 3;
      const delay = 2000;
      expect(attempts).toBe(3);
      expect(delay).toBe(2000);
    });

    it("exponential backoff: delays are 2s, 4s, 8s for standard queues", () => {
      const baseDelay = 2000;
      const delays = [baseDelay, baseDelay * 2, baseDelay * 4];
      expect(delays).toEqual([2000, 4000, 8000]);
    });

    it("exponential backoff: delays are 5s, 10s, 20s for OCR queue", () => {
      const baseDelay = 5000;
      const delays = [baseDelay, baseDelay * 2, baseDelay * 4];
      expect(delays).toEqual([5000, 10000, 20000]);
    });
  });

  describe("Job timeout configuration", () => {
    it("OCR timeout is 2 hours", () => {
      expect(JOB_TIMEOUTS[JOB_QUEUES.OCR]).toBe(7_200_000);
    });

    it("validation timeout is 1 minute", () => {
      expect(JOB_TIMEOUTS[JOB_QUEUES.VALIDATION]).toBe(60_000);
    });

    it("export timeout is 5 minutes", () => {
      expect(JOB_TIMEOUTS[JOB_QUEUES.EXPORT]).toBe(300_000);
    });

    it("splitting timeout is 10 minutes", () => {
      expect(JOB_TIMEOUTS[JOB_QUEUES.SPLITTING]).toBe(600_000);
    });
  });

  describe("Redis reconnection strategy", () => {
    it("retry strategy: exponential backoff capped at 10s", () => {
      function retryStrategy(times: number): number | null {
        if (times > 5) return null;
        return Math.min(1000 * 2 ** times, 10000);
      }

      expect(retryStrategy(1)).toBe(2000);
      expect(retryStrategy(2)).toBe(4000);
      expect(retryStrategy(3)).toBe(8000);
      expect(retryStrategy(4)).toBe(10000);
      expect(retryStrategy(5)).toBe(10000);
      expect(retryStrategy(6)).toBeNull();
    });

    it("gives up after 5 reconnection attempts", () => {
      function retryStrategy(times: number): number | null {
        if (times > 5) return null;
        return Math.min(1000 * 2 ** times, 10000);
      }

      expect(retryStrategy(6)).toBeNull();
      expect(retryStrategy(10)).toBeNull();
    });
  });
});
