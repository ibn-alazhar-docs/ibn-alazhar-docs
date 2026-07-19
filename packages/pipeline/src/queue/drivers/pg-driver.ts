import { Prisma } from "@prisma/client";
import { prisma } from "@ibn-al-azhar-docs/database";
import type { QueueDriver, JobEnvelope } from "../driver";
import { JOB_QUEUES } from "../../types";

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
 * The only queue names the migration's `job_queue_queue_name_check` permits.
 * Derived from JOB_QUEUES so a new queue requires exactly one edit here plus a
 * migration; no string is duplicated across the driver.
 */
export const ALLOWED_QUEUES: ReadonlyArray<string> = Object.values(JOB_QUEUES);

/**
 * Per-queue base backoff delay (ms). Mirrors the BullMQ retry config in
 * `queue/workers.ts`: OCR uses a longer delay (5000ms), every other queue
 * uses the default 2000ms.
 */
const QUEUE_BASE_DELAY_MS: Readonly<Partial<Record<string, number>>> = {
  [JOB_QUEUES.OCR]: 5000,
};

const DEFAULT_BASE_DELAY_MS = 2000;

/** Default stale-recovery grace window (ms) — heartbeat-driven, not the 2h OCR lease. */
const DEFAULT_STALE_GRACE_MS = 30_000;

function baseDelayFor(queue: string): number {
  return QUEUE_BASE_DELAY_MS[queue] ?? DEFAULT_BASE_DELAY_MS;
}

/**
 * Postgres-backed queue driver. All mutations go through the pooled Prisma
 * client. The `id` column is a BigInt, so it is converted to/from string at
 * the boundaries and never passed to `JSON.stringify` directly.
 */
export class PgQueueDriver implements QueueDriver {
  async enqueue(job: JobEnvelope): Promise<void> {
    if (!ALLOWED_QUEUES.includes(job.queue)) {
      throw new Error(
        `PgQueueDriver.enqueue: queue "${job.queue}" is not in ALLOWED_QUEUES ` +
          `(add it to JOB_QUEUES and ship a migration before enqueueing)`,
      );
    }
    const idempotencyKey = job.idempotencyKey;
    const payload = job.payload ?? Prisma.JsonNull;
    const priority = job.priority ?? 0;
    const maxAttempts = job.maxAttempts ?? 3;
    const runAt = job.runAt ?? new Date();

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`
        INSERT INTO job_queue (
          queue, "idempotencyKey", payload, status, priority, "runAt", attempts, "maxAttempts"
        ) VALUES (
          ${job.queue}, ${idempotencyKey}, ${payload}, 'pending', ${priority}, ${runAt}, 0, ${maxAttempts}
        )
        ON CONFLICT (queue, "idempotencyKey") DO UPDATE
        SET status = 'pending',
            "runAt" = EXCLUDED."runAt",
            priority = EXCLUDED.priority,
            payload = EXCLUDED.payload,
            attempts = 0,
            "maxAttempts" = EXCLUDED."maxAttempts",
            "lockedBy" = NULL,
            "lockedAt" = NULL,
            "heartbeatAt" = NULL,
            "leaseToken" = NULL,
            "deadLetterState" = NULL
        WHERE job_queue.status IN ('done', 'dead');
      `;
      // $executeRaw does not deserialize the void result row (Prisma 6 would
      // throw on `SELECT pg_notify(...)`'s void column). The notify fires
      // inside the same transaction so subscribers wake only after commit.
      await tx.$executeRaw`SELECT pg_notify('job_queue', ${job.queue})`;
    });
  }

  async claim(queue: string, workerId: string, limit: number): Promise<ClaimedJob[]> {
    const rows = await prisma.$queryRaw<RawJobRow[]>`
      WITH claimed AS (
        SELECT id FROM job_queue
        WHERE queue = ${queue}
          AND status = 'pending'
          AND "runAt" <= now()
        ORDER BY priority DESC, "runAt" ASC, id ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE job_queue
      SET status = 'reserved',
          "lockedBy" = ${workerId},
          "lockedAt" = now(),
          "heartbeatAt" = now(),
          "leaseToken" = ${crypto.randomUUID()},
          attempts = attempts + 1
      WHERE id IN (SELECT id FROM claimed)
      RETURNING *;
    `;

    // RETURNING order is not guaranteed to match the CTE's ORDER BY, so sort
    // the claimed jobs by the same priority/runAt/id tie-break the worker uses.
    rows.sort(
      (a, b) =>
        Number(b.priority) - Number(a.priority) ||
        new Date(a.runAt).getTime() - new Date(b.runAt).getTime() ||
        Number(a.id) - Number(b.id),
    );

    return rows.map(mapRowToClaimedJob);
  }

  async complete(id: string, workerId: string, leaseToken: string): Promise<boolean> {
    const rowCount = await prisma.$executeRaw`
      UPDATE job_queue
      SET status = 'done',
          "leaseToken" = NULL,
          "lockedBy" = NULL,
          "lockedAt" = NULL,
          "heartbeatAt" = NULL
      WHERE id = ${BigInt(id)}
        AND status = 'reserved'
        AND "lockedBy" = ${workerId}
        AND "leaseToken" = ${leaseToken};
    `;

    return canMutate(rowCount);
  }

  async fail(
    id: string,
    workerId: string,
    leaseToken: string,
    error: Error,
    willRetry: boolean,
  ): Promise<boolean> {
    const rowCount = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const current = await tx.jobQueue.findFirst({
        where: {
          id: BigInt(id),
          status: "reserved",
          lockedBy: workerId,
          leaseToken,
        },
        select: { attempts: true, maxAttempts: true, queue: true },
      });

      if (!current) {
        return 0;
      }

      const shouldRetry = willRetry && current.attempts < current.maxAttempts;

      if (shouldRetry) {
        return tx.$executeRaw`
          UPDATE job_queue
          SET status = 'pending',
              "runAt" = ${nextRunAt(current.attempts, baseDelayFor(current.queue))},
              "leaseToken" = NULL,
              "lockedBy" = NULL,
              "lockedAt" = NULL,
              "heartbeatAt" = NULL,
              "lastError" = ${error.message}
          WHERE id = ${BigInt(id)}
            AND status = 'reserved'
            AND "lockedBy" = ${workerId}
            AND "leaseToken" = ${leaseToken};
        `;
      }

      return tx.$executeRaw`
        UPDATE job_queue
        SET status = 'dead',
            "deadLetterState" = ${Prisma.sql`json_build_object(
              'error', ${error.message},
              'stack', ${error.stack ?? ""},
              'at', now()
            )`},
            "leaseToken" = NULL,
            "lockedBy" = NULL,
            "lockedAt" = NULL,
            "heartbeatAt" = NULL,
            "lastError" = ${error.message}
        WHERE id = ${BigInt(id)}
          AND status = 'reserved'
          AND "lockedBy" = ${workerId}
          AND "leaseToken" = ${leaseToken};
      `;
    });

    return canMutate(rowCount);
  }

  async heartbeat(id: string, workerId: string, leaseToken: string): Promise<boolean> {
    const rowCount = await prisma.$executeRaw`
      UPDATE job_queue
      SET "heartbeatAt" = now()
      WHERE id = ${BigInt(id)}
        AND status = 'reserved'
        AND "lockedBy" = ${workerId}
        AND "leaseToken" = ${leaseToken};
    `;

    return canMutate(rowCount);
  }

  async getMetrics(): Promise<unknown> {
    const rows = await prisma.$queryRaw<MetricRow[]>`
      SELECT queue,
             status,
             COUNT(*)::int AS count
      FROM job_queue
      GROUP BY queue, status
      ORDER BY queue, status;
    `;

    const byQueue: Record<string, Record<string, number>> = {};
    for (const row of rows) {
      if (!byQueue[row.queue]) {
        byQueue[row.queue] = {};
      }
      byQueue[row.queue][row.status] = Number(row.count);
    }

    const reserved = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM job_queue
      WHERE status = 'reserved';
    `;

    const stuck = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM job_queue
      WHERE status = 'pending'
        AND "runAt" <= now() - (interval '1 minute' * 5);
    `;

    return {
      byQueue,
      reservedCount: Number(reserved[0]?.count ?? 0),
      stuckCount: Number(stuck[0]?.count ?? 0),
    };
  }

  async listen(_queue: string, onJob: () => void): Promise<() => void> {
    const { PgListener } = await import("../pg-worker");
    const directUrl = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
    if (!directUrl) {
      // No dedicated direct connection available; NOTIFY cannot be subscribed.
      // The polling fallback in PgWorker covers this case. Return a no-op.
      return async () => {};
    }
    const listener = new PgListener(directUrl);
    listener.onNotify(() => {
      try {
        onJob();
      } catch {
        // never let a handler throw break the listener
      }
    });
    await listener.start();
    return async () => {
      await listener.close();
    };
  }
}

/** Stale recovery: re-queue reserved jobs whose heartbeat/lock exceeded the grace window. */
export async function recoverStale(graceMs: number = DEFAULT_STALE_GRACE_MS): Promise<number> {
  const rowCount = await prisma.$executeRaw`
    UPDATE job_queue
    SET status = 'pending',
        "lockedBy" = NULL,
        "leaseToken" = NULL,
        "lockedAt" = NULL,
        "heartbeatAt" = NULL
    WHERE status = 'reserved'
      AND "heartbeatAt" < now() - (${graceMs} * interval '1 millisecond')
      AND "lockedAt" < now() - (${graceMs} * interval '1 millisecond');
  `;

  return Number(rowCount);
}

interface RawJobRow {
  id: bigint;
  queue: string;
  idempotencyKey: string;
  payload: unknown;
  priority: number;
  attempts: number;
  maxAttempts: number;
  leaseToken: string;
  lockedBy: string;
  status: string;
  runAt: Date;
  lastError: string | null;
  deadLetterState: unknown;
  createdAt: Date;
  updatedAt: Date;
}

interface MetricRow {
  queue: string;
  status: string;
  count: bigint;
}

function mapRowToClaimedJob(row: RawJobRow): ClaimedJob {
  return {
    id: String(row.id),
    queue: row.queue,
    idempotencyKey: row.idempotencyKey,
    payload: row.payload,
    priority: row.priority,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    leaseToken: row.leaseToken,
    lockedBy: row.lockedBy,
  };
}
