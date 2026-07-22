import type { PipelineConfig } from "../types";
import { getStorageDriver, buildStorageConfig } from "./storage";
import { buildRedisConfig } from "./redis";
import { buildGoogleConfig } from "./google";
import { buildOcrConfig } from "./ocr";

export { getStorageDriver } from "./storage";

export function loadConfig(): PipelineConfig {
  const storageDriver = getStorageDriver();

  return {
    ...buildStorageConfig(storageDriver),
    ...buildRedisConfig(),
    ...buildGoogleConfig(),
    ...buildOcrConfig(),
    paths: {
      uploads: "uploads",
      pages: "pages",
      ocrResults: "ocr-results",
      exports: "exports",
      temp: "temp",
    },
  };
}
