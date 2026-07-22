import { stat, rm } from "node:fs/promises";
import { join } from "node:path";
import type { PipelineConfig, StorageObject, StorageDriver } from "./types";
import { getStorageDriver } from "./config";
import { logger as baseLogger } from "@ibn-al-azhar-docs/shared";
import { getStorageClient } from "./minio-driver";
import { validatePdf } from "./validation";
import {
  localPath,
  localEnsureRoot,
  localUploadFile,
  localUploadBuffer,
  localDownloadFile,
  localDeleteFile,
  localFileExists,
} from "./local-driver";

const logger = baseLogger.child({ module: "storage" });

export { getStorageClient } from "./minio-driver";
export { validatePdf } from "./validation";

function getDriver(config: PipelineConfig): StorageDriver {
  return config.storage?.driver ?? getStorageDriver();
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
  return minioCleanupOrphanedFiles(config, prefix, maxAgeMs);
}
