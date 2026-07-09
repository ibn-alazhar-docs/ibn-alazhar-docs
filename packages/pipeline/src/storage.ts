import { Client as MinioClient } from "minio";
import type { PipelineConfig, StorageObject } from "./types";
import { stat } from "node:fs/promises";
import { logger as baseLogger } from "@ibn-al-azhar-docs/shared";

const logger = baseLogger.child({ module: "storage" });

const PDF_HEADER_PATTERN = /^%PDF-\d+\.\d+/;
const PDF_TRAILER_PATTERN = /%%EOF\s*$/;
const PDF_ENCRYPT_PATTERN = /\/Encrypt\s+\d+\s+\d+\s+R/;
const MAX_FILE_SIZE = 100 * 1024 * 1024;

const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

interface PdfValidationResult {
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

let client: MinioClient | null = null;
let lastEndpoint = "";
let lastPort = 0;
let lastUseSSL = false;
let lastAccessKey = "";
let lastSecretKey = "";
let clientLock = false;

export function getStorageClient(config: PipelineConfig): MinioClient {
  if (clientLock) {
    if (client) return client;
  }

  const changed =
    !client ||
    lastEndpoint !== config.minio.endpoint ||
    lastPort !== config.minio.port ||
    lastUseSSL !== config.minio.useSSL ||
    lastAccessKey !== config.minio.accessKey ||
    lastSecretKey !== config.minio.secretKey;

  if (changed) {
    clientLock = true;
    try {
      client = new MinioClient({
        endPoint: config.minio.endpoint,
        port: config.minio.port,
        useSSL: config.minio.useSSL,
        accessKey: config.minio.accessKey,
        secretKey: config.minio.secretKey,
      });
      lastEndpoint = config.minio.endpoint;
      lastPort = config.minio.port;
      lastUseSSL = config.minio.useSSL;
      lastAccessKey = config.minio.accessKey;
      lastSecretKey = config.minio.secretKey;
    } finally {
      clientLock = false;
    }
  }
  return client!;
}

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

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return {
      valid: false,
      error: `Unsupported MIME type: ${mimeType}`,
      errorCode: "INVALID_TYPE",
      details,
    };
  }

  // Validate file size against the ACTUAL buffer content, not the
  // client-reported `fileSize` (which an attacker could under-report to
  // bypass the gate while still uploading a large file).
  if (buffer.length > MAX_FILE_SIZE) {
    details.size = buffer.length;
    return {
      valid: false,
      error: `File exceeds maximum size of 100MB`,
      errorCode: "FILE_TOO_LARGE",
      details,
    };
  }

  // For non-PDF files (images), validate the actual content via magic bytes
  // before accepting, so a mismatched/forged contentType is rejected.
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

  // Any other (non-PDF) MIME type is unsupported here.
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

  // Check PDF header
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

  // Check PDF trailer
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

  // Check for encryption — only scan first 8KB to avoid converting large files to string
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

export async function ensureBucket(config: PipelineConfig, retryDelay?: number): Promise<void> {
  const mc = getStorageClient(config);
  const maxRetries = 10;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const exists = await mc.bucketExists(config.minio.bucket);
      if (!exists) {
        await mc.makeBucket(config.minio.bucket);
      }
      return;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      const delay = retryDelay ?? Math.min(1000 * attempt, 5000);
      logger.warn(
        `Storage not ready (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

export async function uploadFile(
  config: PipelineConfig,
  key: string,
  filePath: string,
  contentType: string,
): Promise<StorageObject> {
  const mc = getStorageClient(config);
  await mc.fPutObject(config.minio.bucket, key, filePath, {
    "Content-Type": contentType,
  });
  let fileSize = 0;
  try {
    const stats = await stat(filePath);
    fileSize = stats.size;
  } catch (err) {
    logger.error(`Failed to stat uploaded file: ${err}`);
  }
  return {
    bucket: config.minio.bucket,
    key,
    size: fileSize,
    contentType,
  };
}

export async function uploadBuffer(
  config: PipelineConfig,
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<StorageObject> {
  const mc = getStorageClient(config);
  await mc.putObject(config.minio.bucket, key, buffer, buffer.length, {
    "Content-Type": contentType,
  });
  return {
    bucket: config.minio.bucket,
    key,
    size: buffer.length,
    contentType,
  };
}

export async function downloadFile(config: PipelineConfig, key: string): Promise<Buffer> {
  const mc = getStorageClient(config);
  const MAX_DOWNLOAD_SIZE = 100 * 1024 * 1024;
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalSize = 0;
    mc.getObject(config.minio.bucket, key)
      .then((stream) => {
        stream.on("data", (chunk: Buffer) => {
          totalSize += chunk.length;
          if (totalSize > MAX_DOWNLOAD_SIZE) {
            stream.destroy();
            reject(new Error("File too large"));
            return;
          }
          chunks.push(chunk);
        });
        stream.on("end", () => resolve(Buffer.concat(chunks)));
        stream.on("error", reject);
      })
      .catch(reject);
  });
}

export async function getPresignedUrl(
  config: PipelineConfig,
  key: string,
  expirySeconds: number = 3600,
): Promise<string> {
  const mc = getStorageClient(config);
  return mc.presignedGetObject(config.minio.bucket, key, expirySeconds);
}

export async function deleteFile(config: PipelineConfig, key: string): Promise<void> {
  const mc = getStorageClient(config);
  await mc.removeObject(config.minio.bucket, key);
}

export async function fileExists(config: PipelineConfig, key: string): Promise<boolean> {
  const mc = getStorageClient(config);
  try {
    await mc.statObject(config.minio.bucket, key);
    return true;
  } catch {
    return false;
  }
}

export async function cleanupOrphanedFiles(
  config: PipelineConfig,
  prefix: string,
  maxAgeMs: number,
): Promise<number> {
  const mc = getStorageClient(config);
  const stream = mc.listObjects(config.minio.bucket, prefix, true);
  const now = Date.now();
  const deletions: Promise<void>[] = [];

  return new Promise((resolve, reject) => {
    stream.on("data", (obj) => {
      if (obj.name && obj.lastModified) {
        const age = now - obj.lastModified.getTime();
        if (age > maxAgeMs) {
          deletions.push(mc.removeObject(config.minio.bucket, obj.name).catch(() => {}));
        }
      }
    });
    stream.on("end", () => {
      Promise.all(deletions)
        .then(() => resolve(deletions.length))
        .catch(() => resolve(deletions.length));
    });
    stream.on("error", reject);
  });
}
