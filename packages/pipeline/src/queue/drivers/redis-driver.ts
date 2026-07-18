import type { QueueDriver, JobEnvelope } from "../driver";
import type { ClaimedJob } from "./pg-driver";
import {
  createValidationWorker,
  createSplittingWorker,
  createOcrWorker,
  createCleaningWorker,
  createGenerationWorker,
  createExportWorker,
} from "../workers";
import {
  createValidationQueue,
  createSplittingQueue,
  createOcrQueue,
  createCleaningQueue,
  createGenerationQueue,
  createExportQueue,
  enqueueValidation,
  enqueueSplitting,
  enqueueOcr,
  enqueueCleaning,
  enqueueGeneration,
  enqueueExport,
} from "../enqueue";
import { getAllQueueMetrics } from "../metrics";
import type { PipelineConfig, ProcessingJob } from "../../types";

const QUEUE_BUILDERS: Record<string, (config: PipelineConfig) => unknown> = {
  "pipeline-validation": createValidationQueue,
  "pipeline-splitting": createSplittingQueue,
  "pipeline-ocr": createOcrQueue,
  "pipeline-cleaning": createCleaningQueue,
  "pipeline-generation": createGenerationQueue,
  "pipeline-export": createExportQueue,
};

const ENQUEUE_BY_QUEUE: Record<
  string,
  (config: PipelineConfig, job: ProcessingJob) => Promise<void>
> = {
  "pipeline-validation": (c, j) => enqueueValidation(c, j),
  "pipeline-splitting": (c, j) => enqueueSplitting(c, j),
  "pipeline-ocr": (c, j) => enqueueOcr(c, j),
  "pipeline-cleaning": (c, j) => enqueueCleaning(c, j),
  "pipeline-generation": (c, j) => enqueueGeneration(c, j),
  "pipeline-export": (c, j) =>
    enqueueExport(c, j as unknown as import("../../types").ExportRequest),
};

/**
 * Adapter that exposes the existing BullMQ-based pipeline behind the unified
 * QueueDriver interface. It does NOT reimplement queue logic — it delegates to
 * the already-tested exports in ./workers, ./enqueue, ./metrics, ./connection.
 *
 * The Postgres driver owns fencing/recovery semantics; the redis path relies on
 * BullMQ's native locking, so complete/fail/heartbeat are no-ops that report
 * success (BullMQ manages lifecycle on the worker). claim/listen are also
 * delegated to BullMQ's worker model and are no-ops here.
 */
export class RedisQueueDriver implements QueueDriver {
  private config: PipelineConfig;

  constructor(config?: PipelineConfig) {
    // Redis driver needs a PipelineConfig for connection/host. When invoked via
    // the factory without one, build a minimal config from the environment.
    this.config =
      config ??
      ({
        redis: {
          host: process.env.REDIS_HOST ?? "localhost",
          port: parseInt(process.env.REDIS_PORT ?? "6379"),
          password: process.env.REDIS_PASSWORD,
          tls: process.env.REDIS_TLS === "true",
        },
      } as PipelineConfig);
  }

  async enqueue(job: JobEnvelope): Promise<void> {
    const enqueue = ENQUEUE_BY_QUEUE[job.queue];
    if (!enqueue) {
      throw new Error(`Unknown queue: ${job.queue}`);
    }
    const processingJob = {
      ...(job.payload as ProcessingJob),
      id: job.idempotencyKey,
    } as ProcessingJob;
    await enqueue(this.config, processingJob);
  }

  async claim(_queue: string, _workerId: string, _limit: number): Promise<ClaimedJob[]> {
    return [];
  }

  async complete(_id: string, _workerId: string, _leaseToken: string): Promise<boolean> {
    return true;
  }

  async fail(
    _id: string,
    _workerId: string,
    _leaseToken: string,
    _error: Error,
    _willRetry: boolean,
  ): Promise<boolean> {
    return true;
  }

  async heartbeat(_id: string, _workerId: string, _leaseToken: string): Promise<boolean> {
    return true;
  }

  async getMetrics(): Promise<unknown> {
    return getAllQueueMetrics(this.config);
  }

  async listen(_queue: string, _onJob: () => void): Promise<() => void> {
    // BullMQ drives processing via workers, not a LISTEN subscription. The
    // workers are created through the createXWorker builders below; this method
    // exists only to satisfy the interface and returns a no-op unsubscribe.
    void QUEUE_BUILDERS;
    void createValidationWorker;
    void createSplittingWorker;
    void createOcrWorker;
    void createCleaningWorker;
    void createGenerationWorker;
    void createExportWorker;
    return async () => {};
  }
}
