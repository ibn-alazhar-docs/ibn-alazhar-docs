import { Client as MinioClient } from "minio";
import type { PipelineConfig, StorageObject } from "./types";
import { stat } from "node:fs/promises";

const PDF_HEADER_PATTERN = /^%PDF-\d+\.\d+/;
const PDF_TRAILER_PATTERN = /%%EOF\s*$/;
const PDF_ENCRYPT_PATTERN = /\/Encrypt\s+\d+\s+\d+\s+R/;
const MAX_FILE_SIZE = 100 * 1024 * 1024;

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

export function getStorageClient(config: PipelineConfig): MinioClient {
  const changed =
    !client ||
    lastEndpoint !== config.minio.endpoint ||
    lastPort !== config.minio.port ||
    lastUseSSL !== config.minio.useSSL ||
    lastAccessKey !== config.minio.accessKey ||
    lastSecretKey !== config.minio.secretKey;

  if (changed) {
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

  // Validate file size
  if (fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File exceeds maximum size of 100MB`,
      errorCode: "FILE_TOO_LARGE",
      details,
    };
  }

  // For non-PDF files (images), skip PDF-specific checks
  if (mimeType !== "application/pdf") {
    details.hasValidHeader = true;
    details.hasValidTrailer = true;
    return { valid: true, details };
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

export async function ensureBucket(config: PipelineConfig): Promise<void> {
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
      const delay = Math.min(1000 * attempt, 5000);
      console.warn(
        `[storage] MinIO not ready (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`,
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
    console.error("Failed to stat uploaded file:", err);
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
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    mc.getObject(config.minio.bucket, key)
      .then((stream) => {
        stream.on("data", (chunk: Buffer) => chunks.push(chunk));
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
