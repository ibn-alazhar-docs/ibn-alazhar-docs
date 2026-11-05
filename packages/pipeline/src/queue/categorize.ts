import { FAILURE_CATEGORIES, type FailureCategory } from "../types";

/**
 * Strip secrets/infra detail from upstream error text before it is persisted to
 * the DLQ or logged. BullMQ provider SDKs occasionally embed tokens, key IDs,
 * signed URLs or bucket hostnames in their error messages. None of that belongs
 * in our failure records or downstream alerts.
 */
export function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "<redacted-gcp-key>")
    .replace(/AKIA[0-9A-Z]{16}/g, "<redacted-aws-key>")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer <redacted>")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "<redacted-jwt>")
    .replace(/(https?:\/\/)[^/\s]+/g, "$1<redacted-host>")
    .replace(/access[_-]?token["\s:=]+[A-Za-z0-9._-]+/gi, "access_token=<redacted>")
    .slice(0, 2000);
}

export function categorizeFailure(error: Error): { category: FailureCategory; code: string } {
  const msg = error.message;

  // --- Permanent document/processing failures (never retry) ---
  if (msg.includes("OCR_QUOTA_EXCEEDED"))
    return { category: FAILURE_CATEGORIES.PERMANENT, code: "OCR_QUOTA_EXCEEDED" };
  if (msg.includes("ALL_OCR_PROVIDERS_FAILED"))
    return { category: FAILURE_CATEGORIES.PERMANENT, code: "OCR_ENGINE_FAILED" };
  // A genuinely empty document yields no text — but it can be transient
  // (blank scan, provider hiccup) so retry rather than hard-fail.
  if (msg.includes("OCR_NO_TEXT"))
    return { category: FAILURE_CATEGORIES.TRANSIENT, code: "OCR_NO_TEXT" };
  if (msg.includes("PDF_ENCRYPTED"))
    return { category: FAILURE_CATEGORIES.PERMANENT, code: "PDF_ENCRYPTED" };
  if (msg.includes("PDF_CORRUPT"))
    return { category: FAILURE_CATEGORIES.PERMANENT, code: "PDF_CORRUPT" };
  if (msg.includes("PDF_TRUNCATED"))
    return { category: FAILURE_CATEGORIES.PERMANENT, code: "PDF_TRUNCATED" };
  if (msg.includes("PDF_INVALID") || msg.includes("PDF_MALFORMED"))
    return { category: FAILURE_CATEGORIES.PERMANENT, code: "PDF_INVALID" };
  if (msg.includes("PDF_EXCEEDS_MAX_PAGES"))
    return { category: FAILURE_CATEGORIES.PERMANENT, code: "PDF_EXCEEDS_MAX_PAGES" };
  if (msg.includes("PDF_RENDER_FAILED"))
    return { category: FAILURE_CATEGORIES.PERMANENT, code: "PDF_RENDER_FAILED" };
  if (msg.includes("FILE_TOO_LARGE"))
    return { category: FAILURE_CATEGORIES.PERMANENT, code: "FILE_TOO_LARGE" };
  if (msg.includes("INVALID_TYPE") || msg.includes("UNSUPPORTED_FORMAT"))
    return { category: FAILURE_CATEGORIES.PERMANENT, code: "INVALID_TYPE" };
  // Engine/exec/parse failures are permanent — a re-run hits the same wall.
  if (
    msg.includes("SURYA_EXECUTION_FAILED") ||
    msg.includes("SURYA_TIMEOUT") ||
    msg.includes("SURYA_NOT_AVAILABLE")
  )
    return { category: FAILURE_CATEGORIES.PERMANENT, code: "OCR_ENGINE_FAILED" };
  if (msg.includes("TESSERACT_FAILED"))
    return { category: FAILURE_CATEGORIES.PERMANENT, code: "OCR_ENGINE_FAILED" };
  if (msg.includes("ALL_OCR_PROVIDERS_FAILED")) {
    if (
      msg.includes("503") ||
      msg.includes("Service Unavailable") ||
      msg.includes("429") ||
      msg.includes("rate limit") ||
      msg.includes("resource exhausted") ||
      msg.includes("overloaded") ||
      msg.includes("high demand")
    ) {
      return { category: FAILURE_CATEGORIES.TRANSIENT, code: "OCR_ENGINE_FAILED" };
    }
    return { category: FAILURE_CATEGORIES.PERMANENT, code: "OCR_ENGINE_FAILED" };
  }
  if (msg.includes("PDF_SPLIT_EXECUTION_FAILED") || msg.includes("PDF_SPLIT_PARSE_FAILED"))
    return { category: FAILURE_CATEGORIES.TRANSIENT, code: "PDF_SPLIT_FAILED" };
  if (msg.includes("DIACRITICS_EXECUTION_FAILED"))
    return { category: FAILURE_CATEGORIES.PERMANENT, code: "OCR_ENGINE_FAILED" };
  if (msg.includes("OCR_EXPORT_FAILED"))
    return { category: FAILURE_CATEGORIES.PERMANENT, code: "OCR_ENGINE_FAILED" };
  if (msg.includes("EXPORT_PANDOC_MISSING") || msg.includes("EXPORT_FORMAT_FAILED"))
    return { category: FAILURE_CATEGORIES.PERMANENT, code: "EXPORT_GENERATION_FAILED" };
  if (msg.includes("EXPORT_STORAGE_FAILED"))
    return { category: FAILURE_CATEGORIES.TRANSIENT, code: "EXPORT_GENERATION_FAILED" };

  // --- Transient (network / infra) failures (retry with backoff) ---
  if (msg.includes("OCR_UPLOAD_FAILED"))
    return { category: FAILURE_CATEGORIES.TRANSIENT, code: "OCR_UPLOAD_FAILED" };
  if (msg.includes("ETIMEDOUT") || msg.includes("ECONNRESET") || msg.includes("socket hang up"))
    return { category: FAILURE_CATEGORIES.TRANSIENT, code: "NETWORK_ERROR" };
  if (
    msg.includes("RequestTimeout") ||
    msg.includes("socket timeout") ||
    msg.includes("UPLOAD_TIMEOUT")
  )
    return { category: FAILURE_CATEGORIES.TRANSIENT, code: "REQUEST_TIMEOUT" };
  if (msg.includes("rateLimit") || msg.includes("quota") || msg.includes("429"))
    return { category: FAILURE_CATEGORIES.TRANSIENT, code: "RATE_LIMITED" };
  if (msg.includes("Redis") || msg.includes("redis"))
    return { category: FAILURE_CATEGORIES.TRANSIENT, code: "REDIS_ERROR" };
  if (msg.includes("MinIO") || msg.includes("minio"))
    return { category: FAILURE_CATEGORIES.TRANSIENT, code: "STORAGE_ERROR" };
  // Generic storage failures: transient unless clearly a permanent config issue.
  if (
    msg.includes("STORAGE_ERROR") ||
    msg.includes("STORAGE_UNAVAILABLE") ||
    msg.includes("storage")
  )
    return { category: FAILURE_CATEGORIES.TRANSIENT, code: "STORAGE_ERROR" };
  if (msg.includes("DB_CONNECTION") || msg.includes("PrismaClient"))
    return { category: FAILURE_CATEGORIES.TRANSIENT, code: "DB_CONNECTION_FAILED" };
  if (msg.includes("SEARCH_INDEX_FAILED"))
    return { category: FAILURE_CATEGORIES.TRANSIENT, code: "SEARCH_INDEX_FAILED" };

  // --- Fatal (job control) ---
  if (msg.includes("JOB_TIMEOUT"))
    return { category: FAILURE_CATEGORIES.FATAL, code: "JOB_TIMEOUT" };
  if (msg.includes("JOB_ABORTED"))
    return { category: FAILURE_CATEGORIES.FATAL, code: "JOB_ABORTED" };

  return { category: FAILURE_CATEGORIES.TRANSIENT, code: "UNKNOWN_ERROR" };
}
