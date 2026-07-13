import type { PipelineConfig, FailedJob } from "../types";
import { categorizeFailure, sanitizeErrorMessage } from "./categorize";
import { recordFailedJob } from "./dlq";
import { sendAlert } from "../alerts";
import { logger as baseLogger } from "@ibn-al-azhar-docs/shared";

const logger = baseLogger.child({ module: "job-error" });

/**
 * Minimal shape of a BullMQ Job we need for failure bookkeeping. Typed
 * structurally so this helper works for both ProcessingJob and ExportRequest
 * queues without importing the bullmq `Job` type everywhere.
 */
export interface JobLike {
  id?: string;
  attemptsMade?: number;
  opts?: { attempts?: number };
  data: unknown;
}

export function getJobAttempts(job: JobLike): number {
  return job.attemptsMade ?? 1;
}

export function isFinalAttempt(job: JobLike): boolean {
  const configured = job.opts?.attempts ?? 3;
  return (job.attemptsMade ?? 1) >= configured;
}

export function classifyError(error: unknown): {
  category: "transient" | "permanent" | "fatal";
  code: string;
} {
  const err = error instanceof Error ? error : new Error(String(error));
  return categorizeFailure(err);
}

/**
 * Resolve the final error code written to the document + DLQ. When a transient
 * failure has exhausted every retry, we surface RETRY_EXHAUSTED so the UI can
 * offer a manual retry (rather than a raw provider error the user can't act on).
 */
export function resolveFinalErrorCode(
  error: unknown,
  job: JobLike,
): {
  code: string;
  category: "transient" | "permanent" | "fatal";
} {
  const err = error instanceof Error ? error : new Error(String(error));
  const { category, code } = categorizeFailure(err);
  if (isFinalAttempt(job) && category === "transient") {
    return { code: "RETRY_EXHAUSTED", category: "transient" };
  }
  return { code, category };
}

/**
 * Persist a failed job to the Dead-Letter Queue with correct attempt count,
 * failure category and a sanitized (non-stack-trace) error message. Always
 * resolves — a DLQ persistence failure must never mask the original error.
 */
export async function recordJobFailure(
  config: PipelineConfig,
  queueName: string,
  job: JobLike,
  error: unknown,
): Promise<void> {
  const err = error instanceof Error ? error : new Error(String(error));
  const { category, code } = resolveFinalErrorCode(error, job);
  const failed: FailedJob = {
    jobId: job.id ?? "unknown",
    queue: queueName,
    originalData: job.data,
    error: sanitizeErrorMessage(err.message),
    errorCode: code as FailedJob["errorCode"],
    failureCategory: category,
    attempts: getJobAttempts(job),
    lastAttemptAt: new Date().toISOString(),
    failedAt: new Date().toISOString(),
  };
  try {
    await recordFailedJob(config, failed);
  } catch (dlqErr) {
    // Never let a DLQ write failure escalate — log and continue so the
    // original job failure is still observable upstream.
    logger.warn({ err: dlqErr }, "[job-error] Failed to record DLQ entry");
  }

  // Page on real failures: permanent (unrecoverable) or retries exhausted.
  if (category === "permanent" || code === "RETRY_EXHAUSTED") {
    sendAlert({
      severity: category === "permanent" ? "critical" : "warning",
      code: failed.errorCode,
      message: `Job ${failed.jobId} (${queueName}) failed: ${failed.error}`,
      context: {
        queue: queueName,
        jobId: failed.jobId,
        failureCategory: failed.failureCategory,
        attempts: failed.attempts,
      },
    });
  }
}
