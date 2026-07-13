import { logger as baseLogger } from "@ibn-al-azhar-docs/shared";

const logger = baseLogger.child({ module: "alerts" });

export type AlertSeverity = "info" | "warning" | "critical";

export interface AlertInput {
  severity: AlertSeverity;
  code: string;
  message: string;
  context?: Record<string, unknown>;
}

const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL?.trim();
const ALERT_SOURCE = process.env.ALERT_SOURCE || "ibn-al-azhar-docs";

/**
 * Best-effort, fire-and-forget alerting for production incidents.
 * No-ops when ALERT_WEBHOOK_URL is unset, so local/dev runs are unaffected.
 * Never throws — alerting must not break the main processing flow.
 */
export function sendAlert(input: AlertInput): void {
  if (!ALERT_WEBHOOK_URL) {
    return;
  }

  const payload = {
    source: ALERT_SOURCE,
    severity: input.severity,
    code: input.code,
    message: input.message,
    context: input.context ?? {},
    timestamp: new Date().toISOString(),
  };

  void fetch(ALERT_WEBHOOK_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  }).catch((err) => {
    logger.warn({ err }, "alert delivery failed (non-fatal)");
  });
}
