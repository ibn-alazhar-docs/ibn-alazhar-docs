import type { PipelineConfig, ProcessingJob, ExportRequest } from "../types";
import { JOB_QUEUES } from "../types";
import { getQueue, getLastConnectionError } from "./connection";
import { getRetryConfigForQueue, getDefaultJobOptions } from "./workers";
import { logger } from "@ibn-al-azhar-docs/shared";

/**
 * Fail-fast readiness probe before enqueueing. A dead or mis-authenticated
 * Redis (wrong password, host unreachable, TLS mismatch) makes BullMQ's
 * `queue.add()` hang for the full ioredis retry budget (~31s) and then reject
 * with the opaque "Connection is closed." — hiding the real cause. We instead
 * ping once with a short timeout and throw the ACTUAL underlying error
 * (NOAUTH / WRONGPASS / ECONNREFUSED) so the caller can classify and surface it
 * honestly. Returns normally when Redis is reachable and authenticated.
 */
async function assertRedisReady(config: PipelineConfig): Promise<void> {
  // Use the shared singleton connection directly for a bounded probe.
  const { getConnection } = await import("./connection");
  const client = getConnection(config);
  const underlying = getLastConnectionError();
  if (underlying) {
    // A prior connection attempt already captured the real failure reason.
    const msg = underlying.message;
    logger.error({ error: msg }, "[redis] Enqueue blocked: connection previously failed");
    throw new Error(`Redis connection failed: ${msg}`);
  }
  const ping = client.ping();
  const timeout = new Promise<"TIMEOUT">((resolve) =>
    setTimeout(() => resolve("TIMEOUT"), 2500),
  );
  const result = await Promise.race([ping, timeout]);
  if (result === "TIMEOUT") {
    throw new Error("Redis ping timed out (2.5s)");
  }
  if (result !== "PONG") {
    throw new Error(`Redis ping returned: ${String(result)}`);
  }
}

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
  // Fail fast with the real Redis error before BullMQ hides it behind a 30s hang.
  await assertRedisReady(config);
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
