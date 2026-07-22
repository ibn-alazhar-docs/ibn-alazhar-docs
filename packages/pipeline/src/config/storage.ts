import { existsSync } from "node:fs";
import type { PipelineConfig, StorageDriver } from "../types";
import { logger } from "@ibn-al-azhar-docs/shared";

export function getStorageDriver(): StorageDriver {
  const envValue = process.env.STORAGE_DRIVER;
  const driver = envValue === "s3" ? "s3" : "local";
  if (process.env.NODE_ENV === "production") {
    logger.info(
      { storageDriver: driver, storageDriverEnv: envValue },
      "[config] Storage driver selected",
    );
  }
  return driver;
}

export function buildStorageConfig(
  storageDriver: StorageDriver,
): Pick<PipelineConfig, "storage" | "minio"> {
  return {
    storage: {
      driver: storageDriver,
      localDir: process.env.STORAGE_LOCAL_DIR || "/data",
    },
    minio: (() => {
      if (storageDriver === "local") {
        return {
          endpoint: "localhost",
          port: 9000,
          useSSL: false,
          accessKey: "dummy",
          secretKey: "dummy",
          bucket: "dummy",
        };
      }

      const rawEndpoint =
        process.env.S3_ENDPOINT ?? process.env.MINIO_ENDPOINT ?? "localhost";
      let endpoint = rawEndpoint;
      let port = Number(process.env.S3_PORT ?? process.env.MINIO_PORT ?? 9000);
      let useSSL =
        process.env.S3_USE_SSL === "true" || process.env.MINIO_USE_SSL === "true";

      if (
        rawEndpoint.startsWith("http://") ||
        rawEndpoint.startsWith("https://")
      ) {
        try {
          const parsed = new URL(rawEndpoint);
          endpoint = parsed.hostname;
          useSSL = parsed.protocol === "https:";
          if (parsed.port) {
            port = Number(parsed.port);
          } else if (!process.env.S3_PORT && !process.env.MINIO_PORT) {
            port = useSSL ? 443 : 80;
          }
        } catch {
          // fallback to raw
        }
      }

      const accessKey =
        process.env.S3_ACCESS_KEY_ID ?? process.env.MINIO_ACCESS_KEY;
      const secretKey =
        process.env.S3_SECRET_ACCESS_KEY ?? process.env.MINIO_SECRET_KEY;

      return {
        endpoint,
        port,
        useSSL,
        accessKey: accessKey ?? "minioadmin",
        secretKey: secretKey ?? "minioadmin",
        bucket:
          process.env.S3_BUCKET ?? process.env.MINIO_BUCKET ?? "ibnalazhardocs",
      };
    })(),
  };
}
