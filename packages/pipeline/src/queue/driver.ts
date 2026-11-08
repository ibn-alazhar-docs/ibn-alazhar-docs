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

export interface ClaimedJob {
  id: string;
  queue: string;
  idempotencyKey: string;
  payload: unknown;
  priority: number;
  attempts: number;
  maxAttempts: number;
  leaseToken: string;
  lockedBy: string;
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
 * Resolves the active queue driver name from QUEUE_DRIVER.
 * Defaults to "redis" so current BullMQ behavior is preserved. Any value
 * other than the explicit "pg" falls back to "redis" (parity with the
 * historical `?? "redis"` + `=== "pg"` checks scattered across the queue
 * layer). Infra must never set QUEUE_DRIVER at runtime; unset is the only
 * supported production state and means redis.
 */
export function getQueueDriverName(): QueueDriverName {
  return process.env.QUEUE_DRIVER === "pg" ? "pg" : "redis";
}

/** True when the Postgres-backed driver is selected. */
export function isPgDriver(): boolean {
  return getQueueDriverName() === "pg";
}

/**
 * Direct (non-pooled) Postgres URL for LISTEN/NOTIFY subscriptions.
 * Falls back to DATABASE_URL so single-URL setups still work; the pooled
 * URL must never be used for LISTEN when a direct URL is available.
 */
export function getPgDirectUrl(): string | undefined {
  return process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
}

/**
 * Returns the queue driver selected by the QUEUE_DRIVER flag.
 */
export function getQueueDriver(): QueueDriver {
  if (getQueueDriverName() === "pg") {
    return new PgQueueDriver();
  }
  return new RedisQueueDriver();
}
