import type { PipelineConfig, StorageObject } from "../types";
import { stat, mkdir, writeFile, readFile, rm, access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { join, normalize, isAbsolute, dirname } from "node:path";
import { pipeline as streamPipeline } from "node:stream/promises";
import { createReadStream, createWriteStream } from "node:fs";

export function localPath(config: PipelineConfig, key: string): string {
  const root = config.storage?.localDir || "/data";
  const normalized = normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
  const full = isAbsolute(normalized) ? normalized : join(root, normalized);
  if (full !== root && !full.startsWith(root + "/") && !full.startsWith(root + "\\")) {
    throw new Error(`Invalid storage key (escapes root): ${key}`);
  }
  return full;
}

export async function localEnsureRoot(config: PipelineConfig): Promise<void> {
  await mkdir(config.storage?.localDir || "/data", { recursive: true });
}

export async function localUploadFile(
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

export async function localUploadBuffer(
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

export async function localDownloadFile(config: PipelineConfig, key: string): Promise<Buffer> {
  const dest = localPath(config, key);
  return readFile(dest);
}

export async function localDeleteFile(config: PipelineConfig, key: string): Promise<void> {
  const dest = localPath(config, key);
  await rm(dest, { force: true });
}

export async function localFileExists(config: PipelineConfig, key: string): Promise<boolean> {
  try {
    await access(localPath(config, key), fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}
