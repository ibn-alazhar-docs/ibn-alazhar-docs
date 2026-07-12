import type { PipelineConfig, FailedJob } from "../types";
import { categorizeFailure } from "./categorize";
import { recordFailedJob } from "./dlq";

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
  const { category, code } = categorizeFailure(err);
  const failed: FailedJob = {
    jobId: job.id ?? "unknown",
    queue: queueName,
    originalData: job.data,
    error: err.message,
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
    // eslint-disable-next-line no-console
    console.error("[job-error] Failed to record DLQ entry:", dlqErr);
  }
}
