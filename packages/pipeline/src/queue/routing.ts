import { prisma } from "@ibn-al-azhar-docs/database";
import type { FailedJob } from "../types";
import { JOB_QUEUES } from "../types";
import { loadConfig } from "../config";
import { PgQueueDriver } from "./drivers/pg-driver";
import { getAllQueueMetrics, getJobStatus } from "./metrics";
import { getFailedJobs, cleanupFailedJob, recordFailedJob } from "./dlq";

/** Map a queue name to the pipeline stage (mirrors metrics.ts QUEUE_STAGE_MAP). */
const QUEUE_STAGE_MAP: Record<string, string> = {
  [JOB_QUEUES.VALIDATION]: "validating",
  [JOB_QUEUES.SPLITTING]: "splitting",
  [JOB_QUEUES.OCR]: "ocr",
  [JOB_QUEUES.CLEANING]: "cleaning",
  [JOB_QUEUES.GENERATION]: "generating",
};

/**
 * Returns aggregate queue metrics for the active driver.
 * - pg: `PgQueueDriver.getMetrics()` (job_queue table).
 * - redis: `getAllQueueMetrics(config)`.
 */
export async function getMetricsViaDriver(): Promise<unknown> {
  if (process.env.QUEUE_DRIVER === "pg") {
    return new PgQueueDriver().getMetrics();
  }
  return getAllQueueMetrics(loadConfig());
}

/**
 * Returns the current stage/progress for a job, or null if not in-flight.
 * - pg: reads `job_queue` by `idempotencyKey`; maps queue→stage; pending/
 *   reserved return stage with progress 0; done/dead return null.
 * - redis: `getJobStatus(config, jobId)`.
 */
export async function getJobStatusViaDriver(
  jobId: string,
): Promise<{ stage: string; progress: number } | null> {
  if (process.env.QUEUE_DRIVER === "pg") {
    const row = await prisma.jobQueue.findFirst({
      where: {
        idempotencyKey: jobId,
        status: { in: ["pending", "reserved"] },
      },
      select: { queue: true, status: true },
    });
    if (!row) {
      return null;
    }
    const stage = QUEUE_STAGE_MAP[row.queue];
    if (!stage) {
      return null;
    }
    return { stage, progress: 0 };
  }
  return getJobStatus(loadConfig(), jobId);
}

/**
 * Records a failed job. In pg mode the DLQ is handled by `job_queue` rows with
 * status `dead` (written by `PgQueueDriver.fail`); callers should read them via
 * `getFailedJobsViaDriver` instead. This function therefore refuses to act in
 * pg mode and preserves the redis path unchanged.
 */
export async function recordFailedJobViaDriver(failed: FailedJob): Promise<void> {
  if (process.env.QUEUE_DRIVER === "pg") {
    throw new Error(
      "DLQ for pg mode is handled by job_queue.dead rows; use getFailedJobsViaDriver",
    );
  }
  await recordFailedJob(loadConfig(), failed);
}

/**
 * Returns failed jobs for the active driver.
 * - pg: reads `job_queue` rows with status `dead` and maps them to `FailedJob`.
 * - redis: `getFailedJobs(config)`.
 */
export async function getFailedJobsViaDriver(): Promise<FailedJob[]> {
  if (process.env.QUEUE_DRIVER === "pg") {
    const rows = await prisma.jobQueue.findMany({
      where: { status: "dead" },
    });
    return rows.map((row) => ({
      jobId: row.idempotencyKey,
      queue: row.queue,
      originalData: row.payload,
      error: row.lastError ?? "",
      errorCode: "RETRY_EXHAUSTED" as FailedJob["errorCode"],
      failureCategory: "transient" as FailedJob["failureCategory"],
      attempts: row.attempts,
      lastAttemptAt: row.updatedAt.toISOString(),
      failedAt: row.updatedAt.toISOString(),
    }));
  }
  return getFailedJobs(loadConfig());
}

/**
 * Removes a failed job from the DLQ.
 * - pg: deletes `job_queue` rows with status `dead` and matching idempotencyKey.
 * - redis: `cleanupFailedJob(config, jobId)`.
 */
export async function cleanupFailedJobViaDriver(jobId: string): Promise<void> {
  if (process.env.QUEUE_DRIVER === "pg") {
    await prisma.jobQueue.deleteMany({
      where: { status: "dead", idempotencyKey: jobId },
    });
    return;
  }
  await cleanupFailedJob(loadConfig(), jobId);
}
