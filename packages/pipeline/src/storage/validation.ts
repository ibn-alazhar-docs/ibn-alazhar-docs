import type { PipelineConfig, StorageObject } from "../types";

export interface PdfValidationResult {
  valid: boolean;
  error?: string;
  errorCode?: string;
  details: {
    hasValidHeader: boolean;
    hasValidTrailer: boolean;
    isEncrypted: boolean;
    mimeType: string;
    size: number;
  };
}

const PDF_HEADER_PATTERN = /^%PDF-\d+\.\d+/;
const PDF_TRAILER_PATTERN = /%%EOF\s*$/;
const PDF_ENCRYPT_PATTERN = /\/Encrypt\s+\d+\s+\d+\s+R/;
const MAX_FILE_SIZE = Math.max(1, Number(process.env.MAX_UPLOAD_SIZE_MB) || 100) * 1024 * 1024;

const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

export function validatePdf(
  buffer: Buffer,
  mimeType: string,
  fileSize: number,
): PdfValidationResult {
  const details = {
    hasValidHeader: false,
    hasValidTrailer: false,
    isEncrypted: false,
    mimeType,
    size: fileSize,
  };

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return {
      valid: false,
      error: `Unsupported MIME type: ${mimeType}`,
      errorCode: "INVALID_TYPE",
      details,
    };
  }

  if (buffer.length > MAX_FILE_SIZE) {
    details.size = buffer.length;
    return {
      valid: false,
      error: `File exceeds maximum size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      errorCode: "FILE_TOO_LARGE",
      details,
    };
  }

  if (mimeType === "image/jpeg") {
    details.hasValidHeader = buffer.subarray(0, JPEG_MAGIC.length).equals(JPEG_MAGIC);
    details.hasValidTrailer = true;
    if (!details.hasValidHeader) {
      return {
        valid: false,
        error: "Missing or invalid JPEG magic bytes (FF D8 FF)",
        errorCode: "IMAGE_CORRUPT",
        details,
      };
    }
    return { valid: true, details };
  }

  if (mimeType === "image/png") {
    details.hasValidHeader = buffer.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC);
    details.hasValidTrailer = true;
    if (!details.hasValidHeader) {
      return {
        valid: false,
        error: "Missing or invalid PNG magic bytes (89 50 4E 47)",
        errorCode: "IMAGE_CORRUPT",
        details,
      };
    }
    return { valid: true, details };
  }

  if (mimeType !== "application/pdf") {
    return {
      valid: false,
      error: `Unsupported MIME type: ${mimeType}`,
      errorCode: "INVALID_TYPE",
      details,
    };
  }

  if (buffer.length < 20) {
    return {
      valid: false,
      error: "File too small to be a valid PDF",
      errorCode: "PDF_MALFORMED",
      details,
    };
  }

  const header = buffer.subarray(0, 20).toString("utf-8").trim();
  details.hasValidHeader = PDF_HEADER_PATTERN.test(header);
  if (!details.hasValidHeader) {
    return {
      valid: false,
      error: "Missing or invalid PDF header signature",
      errorCode: "PDF_CORRUPT",
      details,
    };
  }

  const trailer = buffer.subarray(-20).toString("utf-8").trimEnd();
  details.hasValidTrailer = PDF_TRAILER_PATTERN.test(trailer);
  if (!details.hasValidTrailer) {
    return {
      valid: false,
      error: "Missing or truncated PDF trailer (%%EOF)",
      errorCode: "PDF_TRUNCATED",
      details,
    };
  }

  const headSize = Math.min(buffer.length, 8192);
  const head = buffer.subarray(0, headSize).toString("utf-8");
  details.isEncrypted = PDF_ENCRYPT_PATTERN.test(head);
  if (details.isEncrypted) {
    return {
      valid: false,
      error: "PDF is password-protected or encrypted",
      errorCode: "PDF_ENCRYPTED",
      details,
    };
  }

  return { valid: true, details };
}
