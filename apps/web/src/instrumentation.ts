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
