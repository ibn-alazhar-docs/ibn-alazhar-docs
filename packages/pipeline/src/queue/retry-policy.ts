import { JOB_QUEUES } from "../types";

/**
 * Shared retry policy for the queue layer — single source of truth (PARITY).
 *
 * Both the Postgres driver (via `nextRunAt` / `baseDelayFor`) and the Redis
 * driver (via BullMQ job options) consult these constants so the two paths
 * keep identical retry semantics. Do NOT add per-driver delays here; change
 * the shared constants (or the OCC/OCR overrides below) if behavior must move
 * for both backends. Defaults mirror the historical BullMQ config in
 * `queue/workers.ts`: 3 attempts, exponential backoff, 2000ms base delay
 * (5000ms for the OCR queue).
 */

/** Default number of attempts for a job. */
export const DEFAULT_RETRY_ATTEMPTS = 3;

/** Default exponential-backoff base delay (ms). */
export const DEFAULT_RETRY_BACKOFF_MS = 2000;

/** OCR queue uses a longer backoff base delay (ms). */
export const OCR_RETRY_BACKOFF_MS = 5000;

/** Per-queue base backoff delay (ms). */
export const QUEUE_BASE_DELAY_MS: Readonly<Partial<Record<string, number>>> = {
  [JOB_QUEUES.OCR]: OCR_RETRY_BACKOFF_MS,
};

/** Default base delay when a queue has no override (ms). */
export const DEFAULT_BASE_DELAY_MS = DEFAULT_RETRY_BACKOFF_MS;

/** Resolve the base backoff delay for a queue. */
export function baseDelayFor(queue: string): number {
  return QUEUE_BASE_DELAY_MS[queue] ?? DEFAULT_BASE_DELAY_MS;
}

/** Retry config shape shared by both drivers. */
export interface RetryConfig {
  attempts: number;
  backoff: { type: "exponential"; delay: number };
}

/**
 * Resolve the retry config for a queue. OCR honours the `OCR_MAX_RETRIES`
 * env override (default 3); every other queue uses the defaults.
 */
export function getRetryConfigForQueue(queueName: string): RetryConfig {
  if (queueName === JOB_QUEUES.OCR) {
    return {
      attempts: Math.max(1, parseInt(process.env.OCR_MAX_RETRIES ?? "3") || 3),
      backoff: { type: "exponential", delay: OCR_RETRY_BACKOFF_MS },
    };
  }
  return {
    attempts: DEFAULT_RETRY_ATTEMPTS,
    backoff: { type: "exponential", delay: DEFAULT_RETRY_BACKOFF_MS },
  };
}
