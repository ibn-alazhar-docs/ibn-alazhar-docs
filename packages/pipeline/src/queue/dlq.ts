import type { PipelineConfig, FailedJob } from "../types";
import { JOB_QUEUES } from "../types";
import { getQueue } from "./connection";

type DlqHandler = (failed: FailedJob) => Promise<void>;

let dlqHandler: DlqHandler | null = null;
let failedJobsQueue: import("bullmq").Queue | null = null;

export async function setupDlq(config: PipelineConfig, handler: DlqHandler): Promise<void> {
  dlqHandler = handler;
  failedJobsQueue = getQueue(JOB_QUEUES.FAILED, config);
}

export async function recordFailedJob(config: PipelineConfig, job: FailedJob): Promise<void> {
  if (!failedJobsQueue) {
    failedJobsQueue = getQueue(JOB_QUEUES.FAILED, config);
  }
  await failedJobsQueue.add(job.jobId, job);
  if (dlqHandler) {
    await dlqHandler(job);
  }
}

export async function getFailedJobs(config: PipelineConfig): Promise<FailedJob[]> {
  const queue = getQueue(JOB_QUEUES.FAILED, config);
  const jobs = await queue.getJobs(["waiting", "active", "completed", "failed"]);
  return jobs.map((j) => j.data as FailedJob);
}

export async function cleanupFailedJob(config: PipelineConfig, jobId: string): Promise<void> {
  const queue = getQueue(JOB_QUEUES.FAILED, config);
  const job = await queue.getJob(jobId);
  if (job) {
    await job.remove();
  }
}
