import { describe, it, expect } from "vitest";
import {
  DOC_STATUS_MAP,
  STATUS_LABELS,
  ERROR_CODES,
  FAILURE_CATEGORIES,
} from "../../packages/shared/src/types";

describe("DOC_STATUS_MAP", () => {
  it("maps pending to UPLOADED", () => {
    expect(DOC_STATUS_MAP.pending).toBe("UPLOADED");
  });

  it("maps validating to VALIDATING", () => {
    expect(DOC_STATUS_MAP.validating).toBe("VALIDATING");
  });

  it("maps splitting to SPLITTING", () => {
    expect(DOC_STATUS_MAP.splitting).toBe("SPLITTING");
  });

  it("maps ocr to OCR_PROCESSING", () => {
    expect(DOC_STATUS_MAP.ocr).toBe("OCR_PROCESSING");
  });

  it("maps cleaning to CLEANING", () => {
    expect(DOC_STATUS_MAP.cleaning).toBe("CLEANING");
  });

  it("maps generating to GENERATING", () => {
    expect(DOC_STATUS_MAP.generating).toBe("GENERATING");
  });

  it("maps completed to COMPLETED", () => {
    expect(DOC_STATUS_MAP.completed).toBe("COMPLETED");
  });

  it("maps failed to FAILED", () => {
    expect(DOC_STATUS_MAP.failed).toBe("FAILED");
  });

  it("has 8 entries", () => {
    expect(Object.keys(DOC_STATUS_MAP)).toHaveLength(8);
  });

  it("all keys are lowercase strings", () => {
    for (const k of Object.keys(DOC_STATUS_MAP)) {
      expect(k).toBe(k.toLowerCase());
    }
  });

  it("all values are uppercase DocStatus values", () => {
    for (const v of Object.values(DOC_STATUS_MAP)) {
      expect(v).toBe(v.toUpperCase());
    }
  });
});

describe("STATUS_LABELS", () => {
  it("has Arabic labels for all DocStatus values", () => {
    expect(STATUS_LABELS.UPLOADED).toBe("تم الرفع");
    expect(STATUS_LABELS.VALIDATING).toBe("جاري التحقق");
    expect(STATUS_LABELS.SPLITTING).toBe("جاري التقسيم");
    expect(STATUS_LABELS.OCR_PROCESSING).toBe("جاري التعرف على النص");
    expect(STATUS_LABELS.CLEANING).toBe("جاري التنظيف");
    expect(STATUS_LABELS.GENERATING).toBe("جاري التوليد");
    expect(STATUS_LABELS.COMPLETED).toBe("مكتمل");
    expect(STATUS_LABELS.FAILED).toBe("فشل");
    expect(STATUS_LABELS.ARCHIVED).toBe("مؤرشف");
  });

  it("has 9 entries (including ARCHIVED)", () => {
    expect(Object.keys(STATUS_LABELS)).toHaveLength(9);
  });

  it("all labels are Arabic strings", () => {
    for (const label of Object.values(STATUS_LABELS)) {
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
    }
  });
});

describe("ERROR_CODES", () => {
  it("contains all expected error codes", () => {
    expect(ERROR_CODES.NOT_FOUND).toBe("NOT_FOUND");
    expect(ERROR_CODES.VALIDATION_ERROR).toBe("VALIDATION_ERROR");
    expect(ERROR_CODES.FILE_TOO_LARGE).toBe("FILE_TOO_LARGE");
    expect(ERROR_CODES.INVALID_TYPE).toBe("INVALID_TYPE");
    expect(ERROR_CODES.UPLOAD_FAILED).toBe("UPLOAD_FAILED");
    expect(ERROR_CODES.OCR_FAILED).toBe("OCR_FAILED");
    expect(ERROR_CODES.STORAGE_ERROR).toBe("STORAGE_ERROR");
    expect(ERROR_CODES.PDF_ENCRYPTED).toBe("PDF_ENCRYPTED");
    expect(ERROR_CODES.PDF_CORRUPT).toBe("PDF_CORRUPT");
    expect(ERROR_CODES.PDF_MALFORMED).toBe("PDF_MALFORMED");
    expect(ERROR_CODES.JOB_TIMEOUT).toBe("JOB_TIMEOUT");
    expect(ERROR_CODES.REDIS_CONNECTION).toBe("REDIS_CONNECTION");
    expect(ERROR_CODES.MINIO_CONNECTION).toBe("MINIO_CONNECTION");
  });

  it("all values are UPPERCASE strings matching their keys", () => {
    for (const [k, v] of Object.entries(ERROR_CODES)) {
      expect(v).toBe(k);
      expect(v).toBe(v.toUpperCase());
    }
  });

  it("all values are strings", () => {
    for (const v of Object.values(ERROR_CODES)) {
      expect(typeof v).toBe("string");
    }
  });
});

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

  it("all values are lowercase", () => {
    for (const v of Object.values(FAILURE_CATEGORIES)) {
      expect(v).toBe(v.toLowerCase());
    }
  });
});
