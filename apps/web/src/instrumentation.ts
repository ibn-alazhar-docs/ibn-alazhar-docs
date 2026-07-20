/**
 * Next.js Instrumentation — OpenTelemetry tracing.
 *
 * Loaded once when the server starts (production only — Turbopack skips this in dev).
 * Activated via NEXT_OTEL_VERBOSE=1 env var (or NODE_ENV=production).
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
import { registerOTel } from "@vercel/otel";
import { loadConfig, isRedisHealthy } from "@ibn-al-azhar-docs/pipeline";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  validateRequiredEnv();

  // Boot diagnostics: log the resolved Redis config and a live ping so a
  // connection/auth mismatch between web and the bundled Redis is visible in
  // the HF logs without reproducing the failure interactively.
  if (process.env.NODE_ENV === "production") {
    try {
      const cfg = loadConfig();
      const ok = await isRedisHealthy(cfg);
      console.warn(
        `[diagnostics] boot REDIS_URL=${process.env.REDIS_URL ?? "unset"} ` +
          `host=${cfg.redis.host}:${cfg.redis.port} ` +
          `hasPassword=${Boolean(cfg.redis.password)} redisHealthy=${ok}`,
      );
    } catch (err) {
      console.warn(`[diagnostics] boot redis check error: ${String(err)}`);
    }
  }

  // Only activate in production or when explicitly enabled
  if (process.env.NODE_ENV !== "production" && process.env.NEXT_OTEL_VERBOSE !== "1") {
    console.warn("[instrumentation] OTel disabled (dev mode). Set NEXT_OTEL_VERBOSE=1 to enable.");
    return;
  }

  try {
    registerOTel({
      serviceName: "ibn-al-azhar-docs",
      instrumentations: [],
    });
    console.warn("[instrumentation] OpenTelemetry tracing registered");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[instrumentation] Failed to register OTel:", err);
  }
}

/**
 * Fail fast at boot when a required environment variable is missing. In
 * production a missing secret (e.g. AUTH_SECRET) silently breaks auth, so we
 * surface it immediately instead of letting the app start in a broken state.
 */
function validateRequiredEnv(): void {
  // REDIS_URL is only required when using the Redis/BullMQ queue driver.
  // Under QUEUE_DRIVER=pg (the HuggingFace Spaces deployment) Redis is
  // intentionally unused, so requiring it would crash boot for no reason.
  const required = ["DATABASE_URL", "AUTH_SECRET"];
  if (process.env.QUEUE_DRIVER !== "pg") {
    required.push("REDIS_URL");
  }
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    const message = `[instrumentation] Missing required environment variables: ${missing.join(", ")}`;
    if (process.env.NODE_ENV === "production") {
      throw new Error(message);
    }
    console.warn(`[instrumentation] ${message} (continuing in development)`);
  }
}
