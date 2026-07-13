/**
 * Next.js Instrumentation — OpenTelemetry tracing.
 *
 * Loaded once when the server starts (production only — Turbopack skips this in dev).
 * Activated via NEXT_OTEL_VERBOSE=1 env var (or NODE_ENV=production).
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
import { registerOTel } from "@vercel/otel";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  validateRequiredEnv();

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
  const required = ["DATABASE_URL", "REDIS_URL", "AUTH_SECRET"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    const message = `[instrumentation] Missing required environment variables: ${missing.join(", ")}`;
    if (process.env.NODE_ENV === "production") {
      throw new Error(message);
    }
    console.warn(`[instrumentation] ${message} (continuing in development)`);
  }
}
