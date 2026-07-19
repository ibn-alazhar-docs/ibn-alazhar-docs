/**
 * Validates the queue configuration derived from the QUEUE_DRIVER flag.
 *
 * - `"pg"`: requires both DATABASE_URL and DATABASE_URL_DIRECT to be present.
 *   The values are never logged or printed here.
 * - `"redis"` (default): no-op. The redis readiness check is deferred to
 *   RedisQueueDriver so default test runs are not broken by missing Redis.
 *
 * Throws on misconfiguration. Intended to be called early in bootstrap.
 */
export function validateQueueConfig(): void {
  const driver = process.env.QUEUE_DRIVER ?? "redis";
  if (driver === "pg") {
    const hasDbUrl = Boolean(process.env.DATABASE_URL);
    const hasDirectUrl = Boolean(process.env.DATABASE_URL_DIRECT);
    if (!hasDbUrl || !hasDirectUrl) {
      throw new Error("QUEUE_DRIVER=pg requires DATABASE_URL and DATABASE_URL_DIRECT");
    }
  }
}
