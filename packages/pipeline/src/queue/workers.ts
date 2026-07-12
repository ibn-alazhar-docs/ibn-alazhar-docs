import { Worker, type Job } from "bullmq";
import type { PipelineConfig, ProcessingJob, ExportRequest } from "../types";
import { JOB_QUEUES, JOB_TIMEOUTS, JOB_CONCURRENCY } from "../types";
import { getConnection } from "./connection";

export type JobHandler<T> = (job: Job<T>) => Promise<void>;
export type JobFailedHandler<T> = (job: Job<T>, error: Error, queueName: string) => Promise<void>;

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

function createBaseWorker<T>(
  queueName: string,
  config: PipelineConfig,
  handler: JobHandler<T>,
  onFailed?: JobFailedHandler<T>,
) {
  const concurrency = JOB_CONCURRENCY[queueName] ?? 1;
  const timeout = JOB_TIMEOUTS[queueName as keyof typeof JOB_TIMEOUTS] ?? 60_000;
  const worker = new Worker<T>(
    queueName,
    async (bullJob) => {
      await bullJob.updateProgress(0);
      await handler(bullJob as Job<T>);
      await bullJob.updateProgress(100);
    },
    {
      connection: getConnection(config) as unknown as import("bullmq").ConnectionOptions,
      concurrency,
      lockDuration: Math.max(timeout, 60_000),
      lockRenewTime: 15_000,
      stalledInterval: 30_000,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  );

  if (onFailed) {
    worker.on("failed", (job, error) => {
      if (job) {
        void onFailed(job as Job<T>, error, queueName);
      }
    });
  }

  return worker;
}

export function createValidationWorker(
  config: PipelineConfig,
  handler: JobHandler<ProcessingJob>,
  onFailed?: JobFailedHandler<ProcessingJob>,
) {
  return createBaseWorker(JOB_QUEUES.VALIDATION, config, handler, onFailed);
}

export function createSplittingWorker(
  config: PipelineConfig,
  handler: JobHandler<ProcessingJob>,
  onFailed?: JobFailedHandler<ProcessingJob>,
) {
  return createBaseWorker(JOB_QUEUES.SPLITTING, config, handler, onFailed);
}

export function createOcrWorker(
  config: PipelineConfig,
  handler: JobHandler<ProcessingJob>,
  onFailed?: JobFailedHandler<ProcessingJob>,
) {
  return createBaseWorker(JOB_QUEUES.OCR, config, handler, onFailed);
}

export function createCleaningWorker(
  config: PipelineConfig,
  handler: JobHandler<ProcessingJob>,
  onFailed?: JobFailedHandler<ProcessingJob>,
) {
  return createBaseWorker(JOB_QUEUES.CLEANING, config, handler, onFailed);
}

export function createGenerationWorker(
  config: PipelineConfig,
  handler: JobHandler<ProcessingJob>,
  onFailed?: JobFailedHandler<ProcessingJob>,
) {
  return createBaseWorker(JOB_QUEUES.GENERATION, config, handler, onFailed);
}

export function createExportWorker(
  config: PipelineConfig,
  handler: JobHandler<ExportRequest>,
  onFailed?: JobFailedHandler<ExportRequest>,
) {
  return createBaseWorker(JOB_QUEUES.EXPORT, config, handler, onFailed);
}
