import type { PipelineConfig, JobStage, JOB_QUEUES, JOB_STAGE_MAP } from "../types";
import { getQueue } from "./connection";

export { JOB_STAGE_MAP };

export async function getJobStatus(
  config: PipelineConfig,
  jobId: string,
): Promise<{ stage: JobStage; progress: number } | null> {
  if (process.env.QUEUE_DRIVER === "pg") return null;

  const pipelineQueues = [
    JOB_QUEUES.VALIDATION,
    JOB_QUEUES.SPLITTING,
    JOB_QUEUES.OCR,
    JOB_QUEUES.CLEANING,
    JOB_QUEUES.GENERATION,
  ] as const;

  for (const queueName of pipelineQueues) {
    const queue = getQueue(queueName, config);
    const job = await queue.getJob(jobId);
    if (job) {
      if ((await job.isCompleted()) || (await job.isFailed())) continue;
      const stage = QUEUE_STAGE_MAP[queueName];
      if (!stage) continue;
      const progress = typeof job.progress === "number" ? job.progress : 0;
      return { stage, progress };
    }
  }

  return null;
}

export async function getQueueMetrics(config: PipelineConfig): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  if (process.env.QUEUE_DRIVER === "pg") {
    return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
  }
  const queue = getQueue(JOB_QUEUES.OCR, config);
  const counts = await queue.getJobCounts();
  return {
    waiting: counts.waiting ?? 0,
    active: counts.active ?? 0,
    completed: counts.completed ?? 0,
    failed: counts.failed ?? 0,
    delayed: counts.delayed ?? 0,
  };
}

export async function getAllQueueMetrics(
  config: PipelineConfig,
): Promise<
  Record<
    string,
    { waiting: number; active: number; completed: number; failed: number; delayed: number }
  >
> {
  if (process.env.QUEUE_DRIVER === "pg") return {};
  const queueNames = Object.values(JOB_QUEUES);
  const result: Record<
    string,
    { waiting: number; active: number; completed: number; failed: number; delayed: number }
  > = {};
  for (const name of queueNames) {
    if (name === JOB_QUEUES.FAILED) continue;
    const queue = getQueue(name, config);
    const counts = await queue.getJobCounts();
    result[name] = {
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      delayed: counts.delayed ?? 0,
    };
  }
  return result;
}

export async function getStuckJobs(
  config: PipelineConfig,
): Promise<{ queue: string; jobId: string; ageMs: number }[]> {
  if (process.env.QUEUE_DRIVER === "pg") return [];
  const stuck: { queue: string; jobId: string; ageMs: number }[] = [];
  const queueNames = Object.values(JOB_QUEUES).filter((n) => n !== JOB_QUEUES.FAILED);
  const now = Date.now();

  for (const name of queueNames) {
    const queue = getQueue(name, config);
    const activeJobs = await queue.getJobs(["active"]);
    for (const job of activeJobs) {
      const timestamp = job.timestamp ?? now;
      const age = now - timestamp;
      const timeout = JOB_TIMEOUTS[name] ?? 30000;
      if (age > timeout * 2) {
        stuck.push({ queue: name, jobId: job.id!, ageMs: age });
      }
    }
  }
  return stuck;
}
