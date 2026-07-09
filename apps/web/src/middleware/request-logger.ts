/**
 * HTTP Request Logger — Edge-compatible structured logging.
 *
 * Middleware runs in Edge Runtime (no node:fs available).
 * This logger emits structured JSON to stdout, which can be picked up by:
 * - Any log collector (Loki, Datadog, CloudWatch, etc.)
 * - Local dev: piped from `pnpm dev` output
 * - Production: Vercel/Cloudflare log streams
 *
 * Fire-and-forget: never throws, never blocks the request.
 */

export interface RequestLogEntry {
  level: "info" | "warn" | "error";
  type: "request";
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  requestId: string;
  userAgent?: string;
  clientIp?: string;
  timestamp: string;
}

/**
 * Log an HTTP request as structured JSON.
 * Only logs if APITRAIL_ENABLED=true (or in production).
 */
export function logRequest(entry: {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  traceId?: string;
  userAgent?: string;
  clientIp?: string;
}): void {
  // Only log when enabled — saves stdout noise in dev
  if (process.env.APITRAIL_ENABLED !== "true" && process.env.NODE_ENV !== "production") {
    return;
  }

  const logEntry: RequestLogEntry = {
    level: entry.statusCode >= 500 ? "error" : entry.statusCode >= 400 ? "warn" : "info",
    type: "request",
    method: entry.method,
    path: entry.path,
    statusCode: entry.statusCode,
    durationMs: entry.durationMs,
    requestId: entry.traceId || "",
    userAgent: entry.userAgent,
    clientIp: entry.clientIp,
    timestamp: new Date().toISOString(),
  };

  // Edge-compatible: structured JSON to stdout
  // This is a single console.warn call — non-blocking, fire-and-forget
  console.warn(JSON.stringify(logEntry));
}
