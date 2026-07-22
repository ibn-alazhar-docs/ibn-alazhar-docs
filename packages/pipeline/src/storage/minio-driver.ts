import { Client as MinioClient } from "minio";
import type { PipelineConfig, StorageDriver } from "../types";
import { getStorageDriver } from "../config";
import { logger } from "@ibn-al-azhar-docs/shared";

let client: MinioClient | null = null;
let lastEndpoint = "";
let lastPort = 0;
let lastUseSSL = false;
let lastAccessKey = "";
let lastSecretKey = "";
let clientLock = false;

function getDriver(config: PipelineConfig): StorageDriver {
  return config.storage?.driver ?? getStorageDriver();
}

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

export async function minioCleanupOrphanedFiles(
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
