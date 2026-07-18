import type { QueueDriver, JobEnvelope } from "../driver";

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

/** Builds the idempotency key scope: `queue + ':' + key`. */
export function buildIdempotencyKey(queue: string, key: string): string {
  return `${queue}:${key}`;
}

/** Exponential backoff: runAt = now + baseDelay * 2^attempts. */
export function nextRunAt(attempts: number, baseDelay: number): Date {
  return new Date(Date.now() + baseDelay * 2 ** attempts);
}

/** Fencing check: a mutation is valid only when exactly one row was affected. */
export function canMutate(affectedRows: number): boolean {
  return affectedRows === 1;
}

/**
 * Phase 3 will implement the Postgres-backed driver here. For now it is a
 * compile-time stub so the QUEUE_DRIVER=pg wiring is reachable and the factory
 * instantiates it without error. All operations throw until implemented.
 */
export class PgQueueDriver implements QueueDriver {
  async enqueue(_job: JobEnvelope): Promise<void> {
    throw new Error("PgQueueDriver.enqueue not implemented");
  }

  async claim(_queue: string, _workerId: string, _limit: number): Promise<ClaimedJob[]> {
    throw new Error("PgQueueDriver.claim not implemented");
  }

  async complete(_id: string, _workerId: string, _leaseToken: string): Promise<boolean> {
    throw new Error("PgQueueDriver.complete not implemented");
  }

  async fail(
    _id: string,
    _workerId: string,
    _leaseToken: string,
    _error: Error,
    _willRetry: boolean,
  ): Promise<boolean> {
    throw new Error("PgQueueDriver.fail not implemented");
  }

  async heartbeat(_id: string, _workerId: string, _leaseToken: string): Promise<boolean> {
    throw new Error("PgQueueDriver.heartbeat not implemented");
  }

  async getMetrics(): Promise<unknown> {
    throw new Error("PgQueueDriver.getMetrics not implemented");
  }

  async listen(_queue: string, _onJob: () => void): Promise<() => void> {
    throw new Error("PgQueueDriver.listen not implemented");
  }
}
