import { describe, it, expect } from "vitest";
import { categorizeFailure } from "../../packages/pipeline/src/queue";
import {
  JOB_QUEUES,
  JOB_TIMEOUTS,
  JOB_CONCURRENCY,
  FAILURE_CATEGORIES,
  ERROR_CODES,
  DOCUMENT_STATUS_MAP,
} from "../../packages/pipeline/src/types";

function err(msg: string): Error {
  return new Error(msg);
}

describe("categorizeFailure — transient errors", () => {
  it("OCR_UPLOAD_FAILED", () => {
    expect(categorizeFailure(err("OCR_UPLOAD_FAILED"))).toEqual({
      category: "transient",
      code: "OCR_UPLOAD_FAILED",
    });
  });

  it("OCR_NO_TEXT", () => {
    expect(categorizeFailure(err("OCR_NO_TEXT"))).toEqual({
      category: "transient",
      code: "OCR_NO_TEXT",
    });
  });

  it("ETIMEDOUT → NETWORK_ERROR", () => {
    expect(categorizeFailure(err("connect ETIMEDOUT"))).toEqual({
      category: "transient",
      code: "NETWORK_ERROR",
    });
  });

  it("ECONNRESET → NETWORK_ERROR", () => {
    expect(categorizeFailure(err("read ECONNRESET"))).toEqual({
      category: "transient",
      code: "NETWORK_ERROR",
    });
  });

  it("socket hang up → NETWORK_ERROR", () => {
    expect(categorizeFailure(err("socket hang up"))).toEqual({
      category: "transient",
      code: "NETWORK_ERROR",
    });
  });

  it("RequestTimeout → REQUEST_TIMEOUT", () => {
    expect(categorizeFailure(err("RequestTimeout"))).toEqual({
      category: "transient",
      code: "REQUEST_TIMEOUT",
    });
  });

  it("socket timeout → REQUEST_TIMEOUT", () => {
    expect(categorizeFailure(err("socket timeout"))).toEqual({
      category: "transient",
      code: "REQUEST_TIMEOUT",
    });
  });

  it("rateLimit → RATE_LIMITED", () => {
    expect(categorizeFailure(err("rateLimit exceeded"))).toEqual({
      category: "transient",
      code: "RATE_LIMITED",
    });
  });

  it("quota → RATE_LIMITED", () => {
    expect(categorizeFailure(err("quota exceeded"))).toEqual({
      category: "transient",
      code: "RATE_LIMITED",
    });
  });

  it("429 → RATE_LIMITED", () => {
    expect(categorizeFailure(err("HTTP 429 Too Many Requests"))).toEqual({
      category: "transient",
      code: "RATE_LIMITED",
    });
  });

  it("Redis (capital R) → REDIS_ERROR", () => {
    expect(categorizeFailure(err("Redis connection lost"))).toEqual({
      category: "transient",
      code: "REDIS_ERROR",
    });
  });

  it("redis (lowercase r) → REDIS_ERROR", () => {
    expect(categorizeFailure(err("redis timeout"))).toEqual({
      category: "transient",
      code: "REDIS_ERROR",
    });
  });

  it("MinIO → STORAGE_ERROR", () => {
    expect(categorizeFailure(err("MinIO connection failed"))).toEqual({
      category: "transient",
      code: "STORAGE_ERROR",
    });
  });

  it("storage (lowercase) → STORAGE_ERROR", () => {
    expect(categorizeFailure(err("storage unavailable"))).toEqual({
      category: "transient",
      code: "STORAGE_ERROR",
    });
  });
});

describe("categorizeFailure — permanent errors", () => {
  it("OCR_QUOTA_EXCEEDED", () => {
    expect(categorizeFailure(err("OCR_QUOTA_EXCEEDED"))).toEqual({
      category: "permanent",
      code: "OCR_QUOTA_EXCEEDED",
    });
  });

  it("PDF_ENCRYPTED", () => {
    expect(categorizeFailure(err("PDF_ENCRYPTED"))).toEqual({
      category: "permanent",
      code: "PDF_ENCRYPTED",
    });
  });

  it("PDF_CORRUPT", () => {
    expect(categorizeFailure(err("PDF_CORRUPT"))).toEqual({
      category: "permanent",
      code: "PDF_CORRUPT",
    });
  });

  it("PDF_TRUNCATED", () => {
    expect(categorizeFailure(err("PDF_TRUNCATED"))).toEqual({
      category: "permanent",
      code: "PDF_TRUNCATED",
    });
  });

  it("FILE_TOO_LARGE", () => {
    expect(categorizeFailure(err("FILE_TOO_LARGE"))).toEqual({
      category: "permanent",
      code: "FILE_TOO_LARGE",
    });
  });

  it("INVALID_TYPE", () => {
    expect(categorizeFailure(err("INVALID_TYPE"))).toEqual({
      category: "permanent",
      code: "INVALID_TYPE",
    });
  });
});

describe("categorizeFailure — fatal errors", () => {
  it("JOB_TIMEOUT", () => {
    expect(categorizeFailure(err("JOB_TIMEOUT"))).toEqual({
      category: "fatal",
      code: "JOB_TIMEOUT",
    });
  });

  it("JOB_ABORTED", () => {
    expect(categorizeFailure(err("JOB_ABORTED"))).toEqual({
      category: "fatal",
      code: "JOB_ABORTED",
    });
  });
});

describe("categorizeFailure — default/unknown", () => {
  it("unknown error returns transient UNKNOWN_ERROR", () => {
    expect(categorizeFailure(err("something random happened"))).toEqual({
      category: "transient",
      code: "UNKNOWN_ERROR",
    });
  });

  it("empty message returns transient UNKNOWN_ERROR", () => {
    expect(categorizeFailure(err(""))).toEqual({
      category: "transient",
      code: "UNKNOWN_ERROR",
    });
  });

  it("random string returns transient UNKNOWN_ERROR", () => {
    expect(categorizeFailure(err("xK9mQz"))).toEqual({
      category: "transient",
      code: "UNKNOWN_ERROR",
    });
  });
});

describe("JOB_QUEUES constants", () => {
  it("VALIDATION queue name", () => {
    expect(JOB_QUEUES.VALIDATION).toBe("pipeline-validation");
  });

  it("SPLITTING queue name", () => {
    expect(JOB_QUEUES.SPLITTING).toBe("pipeline-splitting");
  });

  it("OCR queue name", () => {
    expect(JOB_QUEUES.OCR).toBe("pipeline-ocr");
  });

  it("CLEANING queue name", () => {
    expect(JOB_QUEUES.CLEANING).toBe("pipeline-cleaning");
  });

  it("GENERATION queue name", () => {
    expect(JOB_QUEUES.GENERATION).toBe("pipeline-generation");
  });

  it("EXPORT queue name", () => {
    expect(JOB_QUEUES.EXPORT).toBe("pipeline-export");
  });

  it("FAILED queue name", () => {
    expect(JOB_QUEUES.FAILED).toBe("pipeline-failed");
  });

  it("has exactly 7 entries", () => {
    expect(Object.keys(JOB_QUEUES)).toHaveLength(7);
  });
});

describe("JOB_TIMEOUTS constants", () => {
  it("validation = 30000", () => {
    expect(JOB_TIMEOUTS[JOB_QUEUES.VALIDATION]).toBe(30_000);
  });

  it("splitting = 60000", () => {
    expect(JOB_TIMEOUTS[JOB_QUEUES.SPLITTING]).toBe(60_000);
  });

  it("ocr = 1800000", () => {
    expect(JOB_TIMEOUTS[JOB_QUEUES.OCR]).toBe(1_800_000);
  });

  it("cleaning = 30000", () => {
    expect(JOB_TIMEOUTS[JOB_QUEUES.CLEANING]).toBe(30_000);
  });

  it("generation = 30000", () => {
    expect(JOB_TIMEOUTS[JOB_QUEUES.GENERATION]).toBe(30_000);
  });

  it("export = 60000", () => {
    expect(JOB_TIMEOUTS[JOB_QUEUES.EXPORT]).toBe(60_000);
  });
});

describe("JOB_CONCURRENCY constants", () => {
  it("validation = 5", () => {
    expect(JOB_CONCURRENCY[JOB_QUEUES.VALIDATION]).toBe(5);
  });

  it("splitting = 2", () => {
    expect(JOB_CONCURRENCY[JOB_QUEUES.SPLITTING]).toBe(2);
  });

  it("ocr = 3", () => {
    expect(JOB_CONCURRENCY[JOB_QUEUES.OCR]).toBe(3);
  });

  it("cleaning = 5", () => {
    expect(JOB_CONCURRENCY[JOB_QUEUES.CLEANING]).toBe(5);
  });

  it("generation = 3", () => {
    expect(JOB_CONCURRENCY[JOB_QUEUES.GENERATION]).toBe(3);
  });

  it("export = 3", () => {
    expect(JOB_CONCURRENCY[JOB_QUEUES.EXPORT]).toBe(3);
  });
});

describe("FAILURE_CATEGORIES constants", () => {
  it("transient value", () => {
    expect(FAILURE_CATEGORIES.TRANSIENT).toBe("transient");
  });

  it("permanent value", () => {
    expect(FAILURE_CATEGORIES.PERMANENT).toBe("permanent");
  });

  it("fatal value", () => {
    expect(FAILURE_CATEGORIES.FATAL).toBe("fatal");
  });
});

describe("ERROR_CODES constants", () => {
  it("FILE_TOO_LARGE", () => {
    expect(ERROR_CODES.FILE_TOO_LARGE).toBe("FILE_TOO_LARGE");
  });

  it("PDF_ENCRYPTED", () => {
    expect(ERROR_CODES.PDF_ENCRYPTED).toBe("PDF_ENCRYPTED");
  });

  it("JOB_TIMEOUT", () => {
    expect(ERROR_CODES.JOB_TIMEOUT).toBe("JOB_TIMEOUT");
  });

  it("REDIS_CONNECTION", () => {
    expect(ERROR_CODES.REDIS_CONNECTION).toBe("REDIS_CONNECTION");
  });
});

describe("DOCUMENT_STATUS_MAP constants", () => {
  it("pending → UPLOADED", () => {
    expect(DOCUMENT_STATUS_MAP["pending"]).toBe("UPLOADED");
  });

  it("completed → COMPLETED", () => {
    expect(DOCUMENT_STATUS_MAP["completed"]).toBe("COMPLETED");
  });

  it("failed → FAILED", () => {
    expect(DOCUMENT_STATUS_MAP["failed"]).toBe("FAILED");
  });
});
