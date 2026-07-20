import { Client as MinioClient } from "minio";
import type { PipelineConfig, StorageObject, StorageDriver } from "./types";
import { getStorageDriver } from "./config";
import { stat, mkdir, writeFile, readFile, rm, access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { join, normalize, isAbsolute, dirname } from "node:path";
import { pipeline as streamPipeline } from "node:stream/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { logger as baseLogger } from "@ibn-al-azhar-docs/shared";

const logger = baseLogger.child({ module: "storage" });

function getDriver(config: PipelineConfig): StorageDriver {
  return config.storage?.driver ?? getStorageDriver();
}

/**
 * Resolve a storage key to an absolute, sandboxed local path under the
 * configured local root. Guards against path-traversal in keys.
 */
function localPath(config: PipelineConfig, key: string): string {
  const root = config.storage?.localDir || "/data";
  const normalized = normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
  const full = isAbsolute(normalized) ? normalized : join(root, normalized);
  // Ensure the resolved path stays within root.
  if (full !== root && !full.startsWith(root + "/") && !full.startsWith(root + "\\")) {
    throw new Error(`Invalid storage key (escapes root): ${key}`);
  }
  return full;
}

async function localEnsureRoot(config: PipelineConfig): Promise<void> {
  await mkdir(config.storage.localDir || "/data", { recursive: true });
}

async function localUploadFile(
  config: PipelineConfig,
  key: string,
  filePath: string,
  contentType: string,
): Promise<StorageObject> {
  const dest = localPath(config, key);
  await mkdir(dirname(dest), { recursive: true });
  await rm(dest, { force: true });
  await streamPipeline(createReadStream(filePath), createWriteStream(dest));
  let size = 0;
  try {
    size = (await stat(dest)).size;
  } catch {
    size = 0;
  }
  return { bucket: "local", key, size, contentType };
}

async function localUploadBuffer(
  config: PipelineConfig,
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<StorageObject> {
  const dest = localPath(config, key);
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, buffer);
  return { bucket: "local", key, size: buffer.length, contentType };
}

async function localDownloadFile(config: PipelineConfig, key: string): Promise<Buffer> {
  const dest = localPath(config, key);
  return readFile(dest);
}

async function localDeleteFile(config: PipelineConfig, key: string): Promise<void> {
  const dest = localPath(config, key);
  await rm(dest, { force: true });
}

async function localFileExists(config: PipelineConfig, key: string): Promise<boolean> {
  try {
    await access(localPath(config, key), fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

const PDF_HEADER_PATTERN = /^%PDF-\d+\.\d+/;
const PDF_TRAILER_PATTERN = /%%EOF\s*$/;
const PDF_ENCRYPT_PATTERN = /\/Encrypt\s+\d+\s+\d+\s+R/;
const MAX_FILE_SIZE = Math.max(1, Number(process.env.MAX_UPLOAD_SIZE_MB) || 100) * 1024 * 1024;

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
  if (getDriver(config) !== "local") {
    const isProduction = process.env.NODE_ENV === "production";
    const accessKey = config.minio.accessKey;
    const secretKey = config.minio.secretKey;
    if (isProduction && (accessKey === "dummy" || !accessKey || !secretKey)) {
      throw new Error("S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required in production");
    }
  }

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
      error: `File exceeds maximum size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
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
  const driver = getDriver(config);
  logger.debug(
    {
      driver,
      envDriver: process.env.STORAGE_DRIVER,
      localDir: config.storage?.localDir,
    },
    "ensureBucket called",
  );

  if (driver === "local") {
    await localEnsureRoot(config);
    logger.debug({ localDir: config.storage.localDir }, "Local storage root ensured");
    return;
  }

  logger.debug("Attempting MinIO connection...");
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
  if (getDriver(config) === "local") {
    return localUploadFile(config, key, filePath, contentType);
  }
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
  if (getDriver(config) === "local") {
    return localUploadBuffer(config, key, buffer, contentType);
  }
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
  if (getDriver(config) === "local") {
    return localDownloadFile(config, key);
  }
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
  if (getDriver(config) === "local") {
    // Local driver serves files through the web app's own routes, so a
    // presigned URL is unnecessary. Return a placeholder; callers that rely
    // on presigned URLs are not used in local-storage mode.
    return `local://${key}`;
  }
  const mc = getStorageClient(config);
  return mc.presignedGetObject(config.minio.bucket, key, expirySeconds);
}

export async function deleteFile(config: PipelineConfig, key: string): Promise<void> {
  if (getDriver(config) === "local") {
    await localDeleteFile(config, key);
    return;
  }
  const mc = getStorageClient(config);
  await mc.removeObject(config.minio.bucket, key);
}

export async function fileExists(config: PipelineConfig, key: string): Promise<boolean> {
  if (getDriver(config) === "local") {
    return localFileExists(config, key);
  }
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
  if (getDriver(config) === "local") {
    // Best-effort local cleanup: walk the prefix dir and remove stale files.
    try {
      const base = localPath(config, prefix);
      const now = Date.now();
      let removed = 0;
      const walk = async (dir: string): Promise<void> => {
        let entries;
        try {
          entries = await import("node:fs/promises").then((m) =>
            m.readdir(dir, { withFileTypes: true }),
          );
        } catch {
          return;
        }
        for (const entry of entries) {
          const full = join(dir, entry.name);
          if (entry.isDirectory()) {
            await walk(full);
          } else if (entry.isFile()) {
            const age = now - (await stat(full)).mtimeMs;
            if (age > maxAgeMs) {
              await rm(full, { force: true }).catch(() => {});
              removed++;
            }
          }
        }
      };
      await walk(base);
      return removed;
    } catch {
      return 0;
    }
  }
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
