import { Worker, type Job } from "bullmq";
import type { PipelineConfig, ProcessingJob, ExportRequest } from "../types";
import { JOB_QUEUES, JOB_TIMEOUTS, JOB_CONCURRENCY } from "../types";
import { getConnection } from "./connection";

type JobHandler = (job: ProcessingJob) => Promise<void>;
type ExportHandler = (req: ExportRequest) => Promise<void>;

export function getRetryConfigForQueue(queueName: string) {
  const baseConfig = {
    attempts: 3,
    backoff: { type: "exponential" as const, delay: 2000 },
  };

  if (queueName === JOB_QUEUES.OCR) {
    return {
      attempts: Math.max(1, parseInt(process.env.OCR_MAX_RETRIES ?? "3") || 3),
      backoff: { type: "exponential" as const, delay: 5000 },
    };
  }

  return baseConfig;
}

export function getDefaultJobOptions(queueName: string) {
  const timeout = JOB_TIMEOUTS[queueName];
  if (timeout) {
    return { timeout };
  }
  return {};
}

function makeWorkerHandler(handler: JobHandler) {
  return async (job: Job<ProcessingJob>) => {
    await job.updateProgress(0);
    try {
      await handler(job.data);
      await job.updateProgress(100);
    } catch (error) {
      await job.updateProgress(0);
      throw error;
    }
  };
}

function createBaseWorker<T>(
  queueName: string,
  config: PipelineConfig,
  handler: (job: Job<T>) => Promise<void>,
) {
  const concurrency = JOB_CONCURRENCY[queueName] ?? 1;
  const timeout = JOB_TIMEOUTS[queueName as keyof typeof JOB_TIMEOUTS] ?? 60_000;
  return new Worker<T>(queueName, handler, {
    connection: getConnection(config) as unknown as import("bullmq").ConnectionOptions,
    concurrency,
    lockDuration: Math.max(timeout, 60_000),
    lockRenewTime: 15_000,
    stalledInterval: 30_000,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  });
}

export function createValidationWorker(config: PipelineConfig, handler: JobHandler) {
  return createBaseWorker(JOB_QUEUES.VALIDATION, config, makeWorkerHandler(handler));
}

export function createSplittingWorker(config: PipelineConfig, handler: JobHandler) {
  return createBaseWorker(JOB_QUEUES.SPLITTING, config, makeWorkerHandler(handler));
}

export function createOcrWorker(config: PipelineConfig, handler: JobHandler) {
  return createBaseWorker(JOB_QUEUES.OCR, config, makeWorkerHandler(handler));
}

export function createCleaningWorker(config: PipelineConfig, handler: JobHandler) {
  return createBaseWorker(JOB_QUEUES.CLEANING, config, makeWorkerHandler(handler));
}

export function createGenerationWorker(config: PipelineConfig, handler: JobHandler) {
  return createBaseWorker(JOB_QUEUES.GENERATION, config, makeWorkerHandler(handler));
}

export function createExportWorker(config: PipelineConfig, handler: ExportHandler) {
  return createBaseWorker(JOB_QUEUES.EXPORT, config, async (job: Job<ExportRequest>) => {
    await job.updateProgress(0);
    await handler(job.data);
    await job.updateProgress(100);
  });
}
