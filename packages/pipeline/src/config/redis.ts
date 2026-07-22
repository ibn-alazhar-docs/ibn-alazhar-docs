import { existsSync } from "node:fs";

export function buildRedisConfig(): {
  host: string;
  port: number;
  password?: string;
  tls?: boolean;
} {
  const url = process.env.REDIS_URL;
  if (url) {
    try {
      const parsed = new URL(url);
      const password =
        parsed.password || process.env.REDIS_PASSWORD || undefined;
      return {
        host: parsed.hostname,
        port: Number(parsed.port || 6379),
        password,
        tls: parsed.protocol === "rediss:",
      };
    } catch {
      // fall through to individual vars
    }
  }
  const isSelfContained =
    process.env.SELF_CONTAINED === "1" || process.env.SELF_CONTAINED === "true";
  let flagFilePresent = false;
  try {
    flagFilePresent = existsSync("/data/.self-contained");
  } catch {
    flagFilePresent = false;
  }
  if (isSelfContained || flagFilePresent) {
    const password = process.env.REDIS_PASSWORD || "ibn_docs_redis";
    const fallback = `redis://:${password}@127.0.0.1:6379`;
    try {
      const parsed = new URL(fallback);
      return {
        host: parsed.hostname,
        port: Number(parsed.port || 6379),
        password: parsed.password || undefined,
        tls: parsed.protocol === "rediss:",
      };
    } catch {
      // unreachable
    }
  }
  return {
    host: process.env.REDIS_HOST ?? "localhost",
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD,
  };
}
