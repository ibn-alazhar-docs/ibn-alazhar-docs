import { Queue, Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import type {
  PipelineConfig,
  ProcessingJob,
  ExportRequest,
  JobStage,
  FailedJob,
  FailureCategory,
} from "./types";
import { JOB_QUEUES, JOB_TIMEOUTS, JOB_CONCURRENCY, FAILURE_CATEGORIES } from "./types";

type JobHandler = (job: ProcessingJob) => Promise<void>;
type ExportHandler = (req: ExportRequest) => Promise<void>;
type DlqHandler = (failed: FailedJob) => Promise<void>;

let connection: IORedis | null = null;
let lastRedisHost = "";
let lastRedisPort = 0;
let lastRedisPassword: string | undefined = undefined;
let dlqHandler: DlqHandler | null = null;
let failedJobsQueue: Queue | null = null;

const queues: Record<string, Queue> = {};

function getConnection(config: PipelineConfig): IORedis {
  if (
    !connection ||
    lastRedisHost !== config.redis.host ||
    lastRedisPort !== config.redis.port ||
    lastRedisPassword !== config.redis.password
  ) {
    if (connection) {
      connection.disconnect();
    }
    connection = new IORedis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      maxRetriesPerRequest: null,
      retryStrategy: (times: number) => {
        if (times > 5) return null;
        return Math.min(1000 * 2 ** times, 10000);
      },
    });
    lastRedisHost = config.redis.host;
    lastRedisPort = config.redis.port;
    lastRedisPassword = config.redis.password;
  }
  return connection;
}

export function getQueue(queueName: string, config: PipelineConfig): Queue {
  const conn = getConnection(config);
  const hostChanged = lastRedisHost !== config.redis.host || lastRedisPort !== config.redis.port;

  if (hostChanged) {
    for (const name of Object.keys(queues)) {
      const q = queues[name];
      if (q) {
        q.close().catch(() => {});
      }
      delete queues[name];
    }
  }

  if (!queues[queueName]) {
    queues[queueName] = new Queue(queueName, { connection: conn });
  }
  return queues[queueName];
}

export function categorizeFailure(error: Error): { category: FailureCategory; code: string } {
  const msg = error.message;

  // Permanent — check before transient to prevent misclassification
  if (msg.includes("OCR_QUOTA_EXCEEDED"))
    return { category: FAILURE_CATEGORIES.PERMANENT, code: "OCR_QUOTA_EXCEEDED" };
  if (msg.includes("PDF_ENCRYPTED"))
    return { category: FAILURE_CATEGORIES.PERMANENT, code: "PDF_ENCRYPTED" };
  if (msg.includes("PDF_CORRUPT"))
    return { category: FAILURE_CATEGORIES.PERMANENT, code: "PDF_CORRUPT" };
  if (msg.includes("PDF_TRUNCATED"))
    return { category: FAILURE_CATEGORIES.PERMANENT, code: "PDF_TRUNCATED" };
  if (msg.includes("FILE_TOO_LARGE"))
    return { category: FAILURE_CATEGORIES.PERMANENT, code: "FILE_TOO_LARGE" };
  if (msg.includes("INVALID_TYPE"))
    return { category: FAILURE_CATEGORIES.PERMANENT, code: "INVALID_TYPE" };

  // Transient — retryable
  if (msg.includes("OCR_UPLOAD_FAILED"))
    return { category: FAILURE_CATEGORIES.TRANSIENT, code: "OCR_UPLOAD_FAILED" };
  if (msg.includes("OCR_NO_TEXT"))
    return { category: FAILURE_CATEGORIES.TRANSIENT, code: "OCR_NO_TEXT" };
  if (msg.includes("ETIMEDOUT") || msg.includes("ECONNRESET") || msg.includes("socket hang up"))
    return { category: FAILURE_CATEGORIES.TRANSIENT, code: "NETWORK_ERROR" };
  if (msg.includes("RequestTimeout") || msg.includes("socket timeout"))
    return { category: FAILURE_CATEGORIES.TRANSIENT, code: "REQUEST_TIMEOUT" };
  if (msg.includes("rateLimit") || msg.includes("quota") || msg.includes("429"))
    return { category: FAILURE_CATEGORIES.TRANSIENT, code: "RATE_LIMITED" };
  if (msg.includes("Redis") || msg.includes("redis"))
    return { category: FAILURE_CATEGORIES.TRANSIENT, code: "REDIS_ERROR" };
  if (msg.includes("MinIO") || msg.includes("minio") || msg.includes("storage"))
    return { category: FAILURE_CATEGORIES.TRANSIENT, code: "STORAGE_ERROR" };

  // Fatal — not retryable, goes straight to DLQ
  if (msg.includes("JOB_TIMEOUT"))
    return { category: FAILURE_CATEGORIES.FATAL, code: "JOB_TIMEOUT" };
  if (msg.includes("JOB_ABORTED"))
    return { category: FAILURE_CATEGORIES.FATAL, code: "JOB_ABORTED" };

  return { category: FAILURE_CATEGORIES.TRANSIENT, code: "UNKNOWN_ERROR" };
}

function getRetryConfigForQueue(queueName: string) {
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

function getDefaultJobOptions(queueName: string) {
  const timeout = JOB_TIMEOUTS[queueName];
  if (timeout) {
    return { timeout };
  }
  return {};
}

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
    connection: getConnection(config),
    concurrency,
    lockDuration: Math.max(timeout, 60_000),
    lockRenewTime: 15_000,
    stalledInterval: 30_000,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  });
}

export function createValidationQueue(config: PipelineConfig): Queue {
  return getQueue(JOB_QUEUES.VALIDATION, config);
}

export function createSplittingQueue(config: PipelineConfig): Queue {
  return getQueue(JOB_QUEUES.SPLITTING, config);
}

export function createOcrQueue(config: PipelineConfig): Queue {
  return getQueue(JOB_QUEUES.OCR, config);
}

export function createCleaningQueue(config: PipelineConfig): Queue {
  return getQueue(JOB_QUEUES.CLEANING, config);
}

export function createGenerationQueue(config: PipelineConfig): Queue {
  return getQueue(JOB_QUEUES.GENERATION, config);
}

export function createExportQueue(config: PipelineConfig): Queue {
  return getQueue(JOB_QUEUES.EXPORT, config);
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

const QUEUE_STAGE_MAP: Record<string, JobStage> = {
  [JOB_QUEUES.VALIDATION]: "validating",
  [JOB_QUEUES.SPLITTING]: "splitting",
  [JOB_QUEUES.OCR]: "ocr",
  [JOB_QUEUES.CLEANING]: "cleaning",
  [JOB_QUEUES.GENERATION]: "generating",
};

export async function getJobStatus(
  config: PipelineConfig,
  jobId: string,
): Promise<{ stage: JobStage; progress: number } | null> {
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

export async function closeQueueConnections(): Promise<void> {
  for (const name of Object.keys(queues)) {
    const q = queues[name];
    if (q) {
      await q.close();
    }
    delete queues[name];
  }
  if (failedJobsQueue) {
    await failedJobsQueue.close();
    failedJobsQueue = null;
  }
  if (connection) {
    await connection.quit();
    connection = null;
  }
}
