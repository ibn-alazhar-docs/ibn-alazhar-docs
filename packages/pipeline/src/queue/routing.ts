import { prisma } from "@ibn-al-azhar-docs/database";
import type { FailedJob } from "../types";
import { JOB_QUEUES, QUEUE_STAGE_MAP } from "../types";
import { loadConfig } from "../config";
import { getAllQueueMetrics, getJobStatus } from "./metrics";
import { getFailedJobs, cleanupFailedJob, recordFailedJob } from "./dlq";

/** Map the persisted DocStatus to the UI stage name. */
const STATUS_TO_STAGE: Record<string, string> = {
  UPLOADED: "pending",
  VALIDATING: "validating",
  SPLITTING: "splitting",
  OCR_PROCESSING: "ocr",
  CLEANING: "cleaning",
  GENERATING: "generating",
  COMPLETED: "completed",
  FAILED: "failed",
};

/** Map the persisted DocStatus back to its originating queue (fallback only). */
const QUEUE_BY_STATUS: Record<string, string> = {
  UPLOADED: JOB_QUEUES.VALIDATION,
  VALIDATING: JOB_QUEUES.VALIDATION,
  SPLITTING: JOB_QUEUES.SPLITTING,
  OCR_PROCESSING: JOB_QUEUES.OCR,
  CLEANING: JOB_QUEUES.CLEANING,
  GENERATING: JOB_QUEUES.GENERATION,
  COMPLETED: JOB_QUEUES.GENERATION,
  FAILED: JOB_QUEUES.GENERATION,
};

/** Normalized queue metrics shared by every driver backend. */
export interface QueueBucket {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface DriverMetrics {
  ocrQueue: QueueBucket;
  exportQueue: QueueBucket;
}

const EMPTY_BUCKET: QueueBucket = {
  waiting: 0,
  active: 0,
  completed: 0,
  failed: 0,
  delayed: 0,
};

/**
 * Returns aggregate queue metrics for the active driver, normalized to a stable
 * `{ ocrQueue, exportQueue }` shape so web consumers don't branch on backend.
 * - pg: derives buckets from `job_queue` status counts.
 * - redis: derives buckets from BullMQ `getJobCounts`.
 */
export async function getMetricsViaDriver(): Promise<DriverMetrics> {
  if (process.env.QUEUE_DRIVER === "pg") {
    const rows = await prisma.$queryRaw<{ queue: string; status: string; count: bigint }[]>`
      SELECT queue, status, COUNT(*)::bigint AS count
      FROM job_queue
      GROUP BY queue, status;
    `;
    const byQueue: Record<string, Record<string, number>> = {};
    for (const row of rows) {
      const bucket = (byQueue[row.queue] ??= {});
      bucket[row.status] = Number(row.count);
    }
    return {
      ocrQueue: toBucket(byQueue[JOB_QUEUES.OCR]),
      exportQueue: toBucket(byQueue[JOB_QUEUES.EXPORT]),
    };
  }

  const all = await getAllQueueMetrics(loadConfig());
  return {
    ocrQueue: all[JOB_QUEUES.OCR] ?? EMPTY_BUCKET,
    exportQueue: all[JOB_QUEUES.EXPORT] ?? EMPTY_BUCKET,
  };
}

/** Maps a BullMQ/pg status-count map into the normalized `QueueBucket`. */
function toBucket(counts: Record<string, number> | undefined): QueueBucket {
  if (!counts) return { ...EMPTY_BUCKET };
  return {
    waiting: counts["pending"] ?? 0,
    active: counts["reserved"] ?? 0,
    completed: counts["done"] ?? 0,
    failed: counts["dead"] ?? 0,
    delayed: 0,
  };
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
    // Prefer the document's own status/progress (the source of truth written by
    // the worker stages). Fall back to the queue→stage mapping only when the
    // document row is missing, so the percentage is always real, never 0.
    const doc = await prisma.document.findFirst({
      where: { id: jobId },
      select: { status: true, progress: true },
    });
    if (doc) {
      const stage =
        STATUS_TO_STAGE[doc.status] ?? QUEUE_STAGE_MAP[QUEUE_BY_STATUS[doc.status] ?? ""];
      if (!stage) return null;
      return { stage, progress: doc.progress ?? 0 };
    }

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
