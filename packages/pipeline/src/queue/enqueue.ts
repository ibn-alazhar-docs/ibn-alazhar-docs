import type { PipelineConfig, ProcessingJob, ExportRequest } from "../types";
import { JOB_QUEUES } from "../types";
import { getQueue } from "./connection";
import { getRetryConfigForQueue, getDefaultJobOptions } from "./workers";

export function createValidationQueue(config: PipelineConfig) {
  return getQueue(JOB_QUEUES.VALIDATION, config);
}

export function createSplittingQueue(config: PipelineConfig) {
  return getQueue(JOB_QUEUES.SPLITTING, config);
}

export function createOcrQueue(config: PipelineConfig) {
  return getQueue(JOB_QUEUES.OCR, config);
}

export function createCleaningQueue(config: PipelineConfig) {
  return getQueue(JOB_QUEUES.CLEANING, config);
}

export function createGenerationQueue(config: PipelineConfig) {
  return getQueue(JOB_QUEUES.GENERATION, config);
}

export function createExportQueue(config: PipelineConfig) {
  return getQueue(JOB_QUEUES.EXPORT, config);
}

async function enqueueWithDefaults(
  queueName: string,
  config: PipelineConfig,
  jobId: string,
  data: ProcessingJob | ExportRequest,
  overrides?: Record<string, unknown>,
): Promise<void> {
  const queue = getQueue(queueName, config);
  const retryConfig = getRetryConfigForQueue(queueName);
  const defaultOptions = getDefaultJobOptions(queueName);
  await queue.add(jobId, data, {
    ...defaultOptions,
    ...retryConfig,
    ...overrides,
  });
}

export async function enqueueValidation(
  config: PipelineConfig,
  job: ProcessingJob,
  overrides?: Record<string, unknown>,
): Promise<void> {
  await enqueueWithDefaults(JOB_QUEUES.VALIDATION, config, job.id, job, overrides);
}

export async function enqueueSplitting(
  config: PipelineConfig,
  job: ProcessingJob,
  overrides?: Record<string, unknown>,
): Promise<void> {
  await enqueueWithDefaults(JOB_QUEUES.SPLITTING, config, job.id, job, overrides);
}

export async function enqueueOcr(
  config: PipelineConfig,
  job: ProcessingJob,
  overrides?: Record<string, unknown>,
): Promise<void> {
  await enqueueWithDefaults(JOB_QUEUES.OCR, config, job.id, job, overrides);
}

export async function enqueueCleaning(
  config: PipelineConfig,
  job: ProcessingJob,
  overrides?: Record<string, unknown>,
): Promise<void> {
  await enqueueWithDefaults(JOB_QUEUES.CLEANING, config, job.id, job, overrides);
}

export async function enqueueGeneration(
  config: PipelineConfig,
  job: ProcessingJob,
  overrides?: Record<string, unknown>,
): Promise<void> {
  await enqueueWithDefaults(JOB_QUEUES.GENERATION, config, job.id, job, overrides);
}

export async function enqueueExport(
  config: PipelineConfig,
  req: ExportRequest,
  overrides?: Record<string, unknown>,
): Promise<void> {
  await enqueueWithDefaults(JOB_QUEUES.EXPORT, config, req.jobId, req, overrides);
}
