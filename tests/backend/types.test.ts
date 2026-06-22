import { describe, it, expect } from "vitest";
import {
  JOB_QUEUES,
  JOB_TIMEOUTS,
  JOB_CONCURRENCY,
  FAILURE_CATEGORIES,
  ERROR_CODES,
  DOCUMENT_STATUS_MAP,
} from "../../packages/pipeline/src/types";

// ═══════════════════════════════════════════════════════════════════════════════
// JOB_QUEUES
// ═══════════════════════════════════════════════════════════════════════════════

describe("JOB_QUEUES", () => {
  it("contains 7 pipeline queues", () => {
    expect(Object.keys(JOB_QUEUES)).toHaveLength(7);
  });

  it("VALIDATION maps to pipeline-validation", () => {
    expect(JOB_QUEUES.VALIDATION).toBe("pipeline-validation");
  });

  it("SPLITTING maps to pipeline-splitting", () => {
    expect(JOB_QUEUES.SPLITTING).toBe("pipeline-splitting");
  });

  it("OCR maps to pipeline-ocr", () => {
    expect(JOB_QUEUES.OCR).toBe("pipeline-ocr");
  });

  it("CLEANING maps to pipeline-cleaning", () => {
    expect(JOB_QUEUES.CLEANING).toBe("pipeline-cleaning");
  });

  it("GENERATION maps to pipeline-generation", () => {
    expect(JOB_QUEUES.GENERATION).toBe("pipeline-generation");
  });

  it("EXPORT maps to pipeline-export", () => {
    expect(JOB_QUEUES.EXPORT).toBe("pipeline-export");
  });

  it("FAILED maps to pipeline-failed", () => {
    expect(JOB_QUEUES.FAILED).toBe("pipeline-failed");
  });

  it("all queue names start with pipeline-", () => {
    for (const v of Object.values(JOB_QUEUES)) {
      expect(v).toMatch(/^pipeline-/);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// JOB_TIMEOUTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("JOB_TIMEOUTS", () => {
  it("has timeout for each queue (6 entries, FAILED not timed)", () => {
    expect(Object.keys(JOB_TIMEOUTS)).toHaveLength(6);
  });

  it("all timeouts are positive numbers", () => {
    for (const v of Object.values(JOB_TIMEOUTS)) {
      expect(v).toBeGreaterThan(0);
    }
  });

  it("VALIDATION timeout is 60000", () => {
    expect(JOB_TIMEOUTS[JOB_QUEUES.VALIDATION]).toBe(60000);
  });

  it("OCR timeout is 7200000", () => {
    expect(JOB_TIMEOUTS[JOB_QUEUES.OCR]).toBe(7_200_000);
  });

  it("GENERATION timeout is 600000", () => {
    expect(JOB_TIMEOUTS[JOB_QUEUES.GENERATION]).toBe(600000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// JOB_CONCURRENCY
// ═══════════════════════════════════════════════════════════════════════════════

describe("JOB_CONCURRENCY", () => {
  it("has concurrency for each queue (6 entries)", () => {
    expect(Object.keys(JOB_CONCURRENCY)).toHaveLength(6);
  });

  it("all concurrency values are positive", () => {
    for (const v of Object.values(JOB_CONCURRENCY)) {
      expect(v).toBeGreaterThan(0);
    }
  });

  it("VALIDATION concurrency is 5", () => {
    expect(JOB_CONCURRENCY[JOB_QUEUES.VALIDATION]).toBe(5);
  });

  it("SPLITTING concurrency is 2", () => {
    expect(JOB_CONCURRENCY[JOB_QUEUES.SPLITTING]).toBe(2);
  });

  it("OCR concurrency is 3", () => {
    expect(JOB_CONCURRENCY[JOB_QUEUES.OCR]).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FAILURE_CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════

describe("FAILURE_CATEGORIES", () => {
  it("contains 3 categories", () => {
    expect(Object.keys(FAILURE_CATEGORIES)).toHaveLength(3);
  });

  it("TRANSIENT = transient", () => {
    expect(FAILURE_CATEGORIES.TRANSIENT).toBe("transient");
  });

  it("PERMANENT = permanent", () => {
    expect(FAILURE_CATEGORIES.PERMANENT).toBe("permanent");
  });

  it("FATAL = fatal", () => {
    expect(FAILURE_CATEGORIES.FATAL).toBe("fatal");
  });

  it("all values are lowercase strings", () => {
    for (const v of Object.values(FAILURE_CATEGORIES)) {
      expect(v).toBe(v.toLowerCase());
      expect(typeof v).toBe("string");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR_CODES
// ═══════════════════════════════════════════════════════════════════════════════

describe("ERROR_CODES", () => {
  it("has FILE_TOO_LARGE", () => {
    expect(ERROR_CODES.FILE_TOO_LARGE).toBe("FILE_TOO_LARGE");
  });

  it("has INVALID_TYPE", () => {
    expect(ERROR_CODES.INVALID_TYPE).toBe("INVALID_TYPE");
  });

  it("has OCR_FAILED", () => {
    expect(ERROR_CODES.OCR_FAILED).toBe("OCR_FAILED");
  });

  it("has PDF_ENCRYPTED", () => {
    expect(ERROR_CODES.PDF_ENCRYPTED).toBe("PDF_ENCRYPTED");
  });

  it("has PDF_CORRUPT", () => {
    expect(ERROR_CODES.PDF_CORRUPT).toBe("PDF_CORRUPT");
  });

  it("has NOT_FOUND", () => {
    expect(ERROR_CODES.NOT_FOUND).toBe("NOT_FOUND");
  });

  it("has STORAGE_ERROR", () => {
    expect(ERROR_CODES.STORAGE_ERROR).toBe("STORAGE_ERROR");
  });

  it("has REDIS_CONNECTION", () => {
    expect(ERROR_CODES.REDIS_CONNECTION).toBe("REDIS_CONNECTION");
  });

  it("has MINIO_CONNECTION", () => {
    expect(ERROR_CODES.MINIO_CONNECTION).toBe("MINIO_CONNECTION");
  });

  it("has JOB_TIMEOUT", () => {
    expect(ERROR_CODES.JOB_TIMEOUT).toBe("JOB_TIMEOUT");
  });

  it("all values are uppercase strings matching their keys", () => {
    for (const [k, v] of Object.entries(ERROR_CODES)) {
      expect(v).toBe(k);
      expect(v).toBe(v.toUpperCase());
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENT_STATUS_MAP
// ═══════════════════════════════════════════════════════════════════════════════

describe("DOCUMENT_STATUS_MAP", () => {
  it("pending maps to UPLOADED", () => {
    expect(DOCUMENT_STATUS_MAP.pending).toBe("UPLOADED");
  });

  it("validating maps to VALIDATING", () => {
    expect(DOCUMENT_STATUS_MAP.validating).toBe("VALIDATING");
  });

  it("splitting maps to SPLITTING", () => {
    expect(DOCUMENT_STATUS_MAP.splitting).toBe("SPLITTING");
  });

  it("ocr maps to OCR_PROCESSING", () => {
    expect(DOCUMENT_STATUS_MAP.ocr).toBe("OCR_PROCESSING");
  });

  it("cleaning maps to CLEANING", () => {
    expect(DOCUMENT_STATUS_MAP.cleaning).toBe("CLEANING");
  });

  it("generating maps to GENERATING", () => {
    expect(DOCUMENT_STATUS_MAP.generating).toBe("GENERATING");
  });

  it("completed maps to COMPLETED", () => {
    expect(DOCUMENT_STATUS_MAP.completed).toBe("COMPLETED");
  });

  it("failed maps to FAILED", () => {
    expect(DOCUMENT_STATUS_MAP.failed).toBe("FAILED");
  });

  it("has 8 entries", () => {
    expect(Object.keys(DOCUMENT_STATUS_MAP)).toHaveLength(8);
  });

  it("all keys are lowercase", () => {
    for (const k of Object.keys(DOCUMENT_STATUS_MAP)) {
      expect(k).toBe(k.toLowerCase());
    }
  });

  it("all values are UPPERCASE", () => {
    for (const v of Object.values(DOCUMENT_STATUS_MAP)) {
      expect(v).toBe(v.toUpperCase());
    }
  });
});
