import type { ClaimedJob } from "./drivers/pg-driver";
import { PgQueueDriver } from "./drivers/pg-driver";
import { RedisQueueDriver } from "./drivers/redis-driver";

export type QueueDriverName = "redis" | "pg";

export interface JobEnvelope {
  queue: string;
  idempotencyKey: string;
  payload: unknown;
  priority?: number;
  runAt?: Date;
  maxAttempts?: number;
}

export interface QueueDriver {
  enqueue(job: JobEnvelope): Promise<void>;
  claim(queue: string, workerId: string, limit: number): Promise<ClaimedJob[]>;
  complete(id: string, workerId: string, leaseToken: string): Promise<boolean>;
  fail(
    id: string,
    workerId: string,
    leaseToken: string,
    error: Error,
    willRetry: boolean,
  ): Promise<boolean>;
  heartbeat(id: string, workerId: string, leaseToken: string): Promise<boolean>;
  getMetrics(): Promise<unknown>;
  listen(queue: string, onJob: () => void): Promise<() => void>;
}

/**
 * Returns the queue driver selected by the QUEUE_DRIVER flag. The default is
 * "redis" so current BullMQ behavior is preserved; the new Postgres driver is
 * additive and only engaged when explicitly set.
 */
export function getQueueDriver(): QueueDriver {
  const name = (process.env.QUEUE_DRIVER ?? "redis") as QueueDriverName;
  if (name === "pg") {
    return new PgQueueDriver();
  }
  return new RedisQueueDriver();
}
