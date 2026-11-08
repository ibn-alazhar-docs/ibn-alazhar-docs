import type { PipelineConfig, FailedJob } from "../types";
import { JOB_QUEUES } from "../types";
import { getQueue } from "./connection";
import { isPgDriver } from "./driver";
import { logger as baseLogger } from "@ibn-al-azhar-docs/shared";

const logger = baseLogger.child({ module: "dlq" });

/**
 * DLQ behavior is intentionally asymmetric (PARITY — do not unify):
 * - redis (default): failures live in a BullMQ FAILED queue; callers read
 *   them through `getFailedJobs()` / remove via `cleanupFailedJob()`.
 * - pg: there is no Redis DLQ. `PgQueueDriver.fail()` persists exhausted
 *   jobs as `job_queue` rows with status `dead`; `recordFailedJob()` is a
 *   log-only fallback that still fires the registered handler, and the
 *   `getFailedJobs()`/`cleanupFailedJob()` helpers are no-ops. Driver-aware
 *   callers must use `getFailedJobsViaDriver()`/`cleanupFailedJobViaDriver()`
 *   from `routing.ts`.
 */

type DlqHandler = (failed: FailedJob) => Promise<void>;

let dlqHandler: DlqHandler | null = null;
let failedJobsQueue: import("bullmq").Queue | null = null;

export async function setupDlq(config: PipelineConfig, handler: DlqHandler): Promise<void> {
  dlqHandler = handler;
  // PG: no Redis DLQ queue to pre-create; dead rows are the DLQ (see above).
  if (isPgDriver()) return;
  failedJobsQueue = getQueue(JOB_QUEUES.FAILED, config);
}

export async function recordFailedJob(config: PipelineConfig, job: FailedJob): Promise<void> {
  if (isPgDriver()) {
    // PG: log-only fallback — the authoritative DLQ is job_queue dead rows
    // written by PgQueueDriver.fail(). Never open a Redis queue here.
    logger.warn(
      { jobId: job.jobId, queue: job.queue, errorCode: job.errorCode },
      "[dlq] PG mode — recording failure in logs only (no Redis DLQ)",
    );
    if (dlqHandler) {
      await dlqHandler(job).catch(() => {});
    }
    return;
  }

  if (!failedJobsQueue) {
    failedJobsQueue = getQueue(JOB_QUEUES.FAILED, config);
  }
  await failedJobsQueue.add(job.jobId, job);
  if (dlqHandler) {
    await dlqHandler(job);
  }
}

export async function getFailedJobs(config: PipelineConfig): Promise<FailedJob[]> {
  // PG: dead rows are read via getFailedJobsViaDriver(); this Redis helper is inert.
  if (isPgDriver()) return [];
  const queue = getQueue(JOB_QUEUES.FAILED, config);
  const jobs = await queue.getJobs(["waiting", "active", "completed", "failed"]);
  return jobs.map((j) => j.data as FailedJob);
}

export async function cleanupFailedJob(config: PipelineConfig, jobId: string): Promise<void> {
  // PG: removal goes through cleanupFailedJobViaDriver() (dead-row delete).
  if (isPgDriver()) return;
  const queue = getQueue(JOB_QUEUES.FAILED, config);
  const job = await queue.getJob(jobId);
  if (job) {
    await job.remove();
  }
}
