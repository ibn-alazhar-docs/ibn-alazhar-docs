import { FAILURE_CATEGORIES, type FailureCategory } from "../types";

export function categorizeFailure(error: Error): { category: FailureCategory; code: string } {
  const msg = error.message;

  if (msg.includes("OCR_QUOTA_EXCEEDED"))
    return { category: FAILURE_CATEGORIES.PERMANENT, code: "OCR_QUOTA_EXCEEDED" };
  if (msg.includes("ALL_OCR_PROVIDERS_FAILED"))
    return { category: FAILURE_CATEGORIES.PERMANENT, code: "OCR_ENGINE_FAILED" };
  if (msg.includes("PDF_ENCRYPTED"))
    return { category: FAILURE_CATEGORIES.PERMANENT, code: "PDF_ENCRYPTED" };
  if (msg.includes("PDF_CORRUPT"))
    return { category: FAILURE_CATEGORIES.PERMANENT, code: "PDF_CORRUPT" };
  if (msg.includes("PDF_TRUNCATED"))
    return { category: FAILURE_CATEGORIES.PERMANENT, code: "PDF_TRUNCATED" };
  if (msg.includes("PDF_INVALID"))
    return { category: FAILURE_CATEGORIES.PERMANENT, code: "PDF_INVALID" };
  if (msg.includes("PDF_EXCEEDS_MAX_PAGES"))
    return { category: FAILURE_CATEGORIES.PERMANENT, code: "PDF_EXCEEDS_MAX_PAGES" };
  if (msg.includes("PDF_RENDER_FAILED"))
    return { category: FAILURE_CATEGORIES.PERMANENT, code: "PDF_RENDER_FAILED" };
  if (msg.includes("FILE_TOO_LARGE"))
    return { category: FAILURE_CATEGORIES.PERMANENT, code: "FILE_TOO_LARGE" };
  if (msg.includes("INVALID_TYPE"))
    return { category: FAILURE_CATEGORIES.PERMANENT, code: "INVALID_TYPE" };
  if (msg.includes("UNSUPPORTED_FORMAT"))
    return { category: FAILURE_CATEGORIES.PERMANENT, code: "INVALID_TYPE" };

  if (msg.includes("OCR_UPLOAD_FAILED"))
    return { category: FAILURE_CATEGORIES.TRANSIENT, code: "OCR_UPLOAD_FAILED" };
  if (msg.includes("OCR_NO_TEXT"))
    return { category: FAILURE_CATEGORIES.TRANSIENT, code: "OCR_NO_TEXT" };
  if (msg.includes("ETIMEDOUT") || msg.includes("ECONNRESET") || msg.includes("socket hang up"))
    return { category: FAILURE_CATEGORIES.TRANSIENT, code: "NETWORK_ERROR" };
  if (msg.includes("RequestTimeout") || msg.includes("socket timeout"))
    return { category: FAILURE_CATEGORIES.TRANSIENT, code: "REQUEST_TIMEOUT" };
  if (msg.includes("rateLimit") || msg.includes("quota") || msg.includes("429"))
    return { category: FAILURE_CATEGORIES.TRANSIENT, code: "RATE_LIMITED" };
  if (msg.includes("Redis") || msg.includes("redis"))
    return { category: FAILURE_CATEGORIES.TRANSIENT, code: "REDIS_UNAVAILABLE" };
  if (msg.includes("MinIO") || msg.includes("minio") || msg.includes("storage"))
    return { category: FAILURE_CATEGORIES.TRANSIENT, code: "UPLOAD_STORAGE_UNAVAILABLE" };

  if (msg.includes("JOB_TIMEOUT"))
    return { category: FAILURE_CATEGORIES.FATAL, code: "JOB_TIMEOUT" };
  if (msg.includes("JOB_ABORTED"))
    return { category: FAILURE_CATEGORIES.FATAL, code: "JOB_ABORTED" };

  return { category: FAILURE_CATEGORIES.TRANSIENT, code: "UNKNOWN_ERROR" };
}
