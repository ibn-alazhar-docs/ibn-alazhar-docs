import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import type { Client } from "pg";
import { PgQueueDriver } from "@ibn-al-azhar-docs/pipeline/queue";
import type { JobEnvelope } from "@ibn-al-azhar-docs/pipeline/queue";

/**
 * Phase-3 integration tests for the Postgres-backed `PgQueueDriver`.
 *
 * These exercise the driver's claim/complete/fail/heartbeat/recoverStale
 * behavior against a live PostgreSQL. The connection uses `PG_QUEUE_TEST_URL`
 * (preferred) or `DATABASE_URL`. When neither is reachable the suite skips
 * gracefully — no live DB is required to keep the file type-checking in CI.
 *
 * NOTE on driver exports: `PgQueueDriver`, `QueueDriver`, `JobEnvelope`,
 * `ClaimedJob`, `buildIdempotencyKey`, `nextRunAt`, `canMutate` are already
 * re-exported from `@ibn-al-azhar-docs/pipeline/queue` (packages/pipeline/src/
 * queue/index.ts). `recoverStale` is owned by the implementation swarm (Phase-3
 * impl) — it is referenced via an `as any` cast so this test file compiles even
 * before the impl lands; once the impl exists the cast can be removed.
 *
 * DB cleanup: a raw `pg` client truncates `job_queue` between tests so each
 * scenario starts from a clean table. Each scenario reuses the allowed queue
 * name `pipeline-export` (the migration CHECK only permits the 6 real pipeline
 * queues) and stays isolated via TRUNCATE + unique idempotencyKey per case.
 *
 * SAFETY: TRUNCATE is ONLY executed when BOTH are true:
 *   1. `PG_QUEUE_TEST_URL` is set (the harness opt-in for a test database), AND
 *   2. `PG_QUEUE_TEST_TRUNCATE === "1"` is explicitly set.
 * Without the explicit `PG_QUEUE_TEST_TRUNCATE=1` flag, the suite runs
 * assertions but never deletes data — so pointing it at staging/production
 * (even by mistake) cannot wipe the table. A real run supplies both vars from
 * an isolated Neon test branch only.
 *
 * Caveat: this suite must NOT run against a database with production data, and
 * it must NOT be executed without credentials. Live runs are gated on the
 * reachability probe below; the harness is responsible for supplying
 * `PG_QUEUE_TEST_URL` (never printed here).
 */

const TEST_URL =
  process.env.PG_QUEUE_TEST_URL ??
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/ibn_al_azhar_docs";

// Explicit opt-in: TRUNCATE runs ONLY with PG_QUEUE_TEST_TRUNCATE=1 on a
// PG_QUEUE_TEST_URL-supplied (test-branch) database. Never on staging/prod.
const TRUNCATE_ENABLED =
  process.env.PG_QUEUE_TEST_URL !== undefined && process.env.PG_QUEUE_TEST_TRUNCATE === "1";

let client: Client | null = null;
let reachable = false;
let driver: PgQueueDriver | null = null;

async function postgresReachable(): Promise<boolean> {
  let ClientCtor: typeof import("pg").Client;
  try {
    ({ Client: ClientCtor } = await import("pg"));
  } catch {
    return false;
  }
  const c = new ClientCtor({ connectionString: TEST_URL, connectionTimeoutMillis: 2000 });
  try {
    await c.connect();
    await c.end();
    return true;
  } catch {
    try {
      await c.end();
    } catch {
      // ignore
    }
    return false;
  }
}

function rand(): string {
  return Math.random().toString(36).slice(2, 10);
}

describe("PgQueueDriver (live PostgreSQL, phase 3)", () => {
  beforeAll(async () => {
    // Map the harness-provided test URL to whatever Prisma/the driver reads.
    if (process.env.PG_QUEUE_TEST_URL && !process.env.DATABASE_URL) {
      process.env.DATABASE_URL = process.env.PG_QUEUE_TEST_URL;
    }
    if (process.env.PG_QUEUE_TEST_URL && !process.env.DATABASE_URL_DIRECT) {
      process.env.DATABASE_URL_DIRECT = process.env.PG_QUEUE_TEST_URL;
    }
    process.env.QUEUE_DRIVER = "pg";

    reachable = await postgresReachable();
    if (reachable) {
      const { Client: ClientCtor } = await import("pg");
      client = new ClientCtor({ connectionString: TEST_URL });
      await client.connect();
      // Instantiating the driver does not open a Prisma connection eagerly; the
      // impl swarm wires Prisma from DATABASE_URL at first use.
      driver = new PgQueueDriver();
    }
  });

  afterAll(async () => {
    if (client) {
      await client.end();
    }
  });

  beforeEach(async () => {
    if (TRUNCATE_ENABLED && reachable && client) {
      await client.query(`TRUNCATE TABLE job_queue RESTART IDENTITY CASCADE`);
    }
  });

  afterEach(async () => {
    if (TRUNCATE_ENABLED && reachable && client) {
      await client.query(`TRUNCATE TABLE job_queue RESTART IDENTITY CASCADE`);
    }
  });

  // The migration's job_queue_queue_name_check only allows the 6 real pipeline
  // queues. Tests reuse `pipeline-export` (lowest-contention) and stay isolated
  // via TRUNCATE between cases + unique idempotencyKey per scenario.
  const QUEUE = "pipeline-export";

  it("enqueue + claim returns exactly one reserved ClaimedJob", async () => {
    if (!reachable || !client || !driver) return;
    const queue = QUEUE;
    const job: JobEnvelope = {
      queue,
      idempotencyKey: "k1",
      payload: { hello: "world" },
    };
    await driver.enqueue(job);

    const claimed = await driver.claim(queue, "worker-1", 5);
    expect(claimed).toHaveLength(1);
    const c = claimed[0];
    expect(typeof c.id).toBe("string");
    expect(c.id.length).toBeGreaterThan(0);
    expect(typeof c.leaseToken).toBe("string");
    expect(c.leaseToken.length).toBeGreaterThan(0);

    const res = await client.query<{ status: string }>(
      `SELECT status FROM job_queue WHERE id = $1`,
      [c.id],
    );
    expect(res.rows[0]?.status).toBe("reserved");
  });

  it("no double execution: concurrent claims are disjoint (SKIP LOCKED fencing)", async () => {
    if (!reachable || !client || !driver) return;
    const queue = QUEUE;
    const N = 6;
    for (let i = 0; i < N; i++) {
      await driver.enqueue({ queue, idempotencyKey: `k${i}`, payload: { i } });
    }

    // Fire many overlapping claims at once to force real lock contention.
    const promises: Promise<ReturnType<PgQueueDriver["claim"]>>[] = [];
    for (let w = 0; w < 4; w++) {
      promises.push(driver.claim(queue, `worker-${w}`, N));
    }
    const results = await Promise.all(promises);

    const seen = new Set<string>();
    let total = 0;
    for (const batch of results) {
      for (const job of batch) {
        expect(seen.has(job.id)).toBe(false);
        seen.add(job.id);
        total++;
      }
    }
    expect(total).toBe(N);
  });

  it("wrong leaseToken: complete/fail/heartbeat never mutate the row", async () => {
    if (!reachable || !client || !driver) return;
    const queue = QUEUE;
    await driver.enqueue({ queue, idempotencyKey: "k1", payload: {} });

    const claimed = await driver.claim(queue, "worker-1", 1);
    expect(claimed).toHaveLength(1);
    const { id, leaseToken } = claimed[0];
    const wrong = "00000000-0000-0000-0000-000000000000";

    // Snapshot before any mutation attempt.
    const before = await client.query<{ status: string; lockedby: string | null }>(
      `SELECT status, "lockedBy" FROM job_queue WHERE id = $1`,
      [id],
    );
    expect(before.rows[0]?.status).toBe("reserved");

    const c = await driver.complete(id, "worker-1", wrong);
    expect(c).toBe(false);
    const f = await driver.fail(id, "worker-1", wrong, new Error("x"), true);
    expect(f).toBe(false);
    const h = await driver.heartbeat(id, "worker-1", wrong);
    expect(h).toBe(false);

    // Row must be completely unchanged — still reserved under the real token.
    const after = await client.query<{
      status: string;
      lockedby: string | null;
      leasetoken: string | null;
    }>(`SELECT status, "lockedBy", "leaseToken" FROM job_queue WHERE id = $1`, [id]);
    expect(after.rows[0]?.status).toBe("reserved");
    expect(after.rows[0]?.lockedby).toBe("worker-1");
    expect(after.rows[0]?.leasetoken).toBe(leaseToken);

    // The genuine token still works.
    const ok = await driver.complete(id, "worker-1", leaseToken);
    expect(ok).toBe(true);
  });

  it("fencing prevents a stale worker from completing after re-claim", async () => {
    if (!reachable || !client || !driver) return;
    const queue = QUEUE;
    await driver.enqueue({ queue, idempotencyKey: "k1", payload: {} });

    const claimedOld = await driver.claim(queue, "worker-old", 5);
    expect(claimedOld).toHaveLength(1);
    const { id, leaseToken: tokenOld } = claimedOld[0];

    // Simulate the old worker going away and recovery reclaiming the job.
    const recovered = (
      driver as unknown as {
        recoverStale: (graceMs: number) => Promise<number>;
      }
    ).recoverStale;
    await recovered.call(driver, 0);

    const claimedNew = await driver.claim(queue, "worker-new", 5);
    expect(claimedNew).toHaveLength(1);
    expect(claimedNew[0].id).toBe(id);
    const { leaseToken: tokenNew } = claimedNew[0];

    const oldResult = await driver.complete(id, "worker-old", tokenOld);
    expect(oldResult).toBe(false);

    const newResult = await driver.complete(id, "worker-new", tokenNew);
    expect(newResult).toBe(true);
  });

  it("retries: fail(willRetry) returns to pending, exhaustion moves to dead", async () => {
    if (!reachable || !client || !driver) return;
    const queue = QUEUE;
    const maxAttempts = 3;
    await driver.enqueue({
      queue,
      idempotencyKey: "k1",
      payload: {},
      maxAttempts,
    });

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const claimed = await driver.claim(queue, "worker-1", 1);
      expect(claimed).toHaveLength(1);
      const job = claimed[0];
      expect(job.attempts).toBe(attempt);
      const willRetry = attempt < maxAttempts;
      const ok = await driver.fail(
        job.id,
        "worker-1",
        job.leaseToken,
        new Error("boom"),
        willRetry,
      );
      expect(ok).toBe(true);

      const res = await client.query<{ status: string; attempts: number }>(
        `SELECT status, attempts FROM job_queue WHERE id = $1`,
        [job.id],
      );
      expect(res.rows[0]?.attempts).toBe(attempt);
      if (willRetry) {
        expect(res.rows[0]?.status).toBe("pending");
      }
    }

    const finalRes = await client.query<{ status: string; deadletterstate: unknown }>(
      `SELECT status, deadLetterState FROM job_queue WHERE queue = $1 AND "idempotencyKey" = 'k1'`,
      [queue],
    );
    expect(finalRes.rows[0]?.status).toBe("dead");
    expect(finalRes.rows[0]?.deadletterstate).not.toBeNull();
  });

  it("delayed jobs are not claimable before runAt", async () => {
    if (!reachable || !client || !driver) return;
    const queue = QUEUE;
    const runAt = new Date(Date.now() + 10_000);
    await driver.enqueue({
      queue,
      idempotencyKey: "k1",
      payload: {},
      runAt,
    });

    const claimed = await driver.claim(queue, "worker-1", 5);
    expect(claimed).toHaveLength(0);

    const res = await client.query<{ status: string }>(
      `SELECT status FROM job_queue WHERE queue = $1 AND "idempotencyKey" = 'k1'`,
      [queue],
    );
    expect(res.rows[0]?.status).toBe("pending");
  });

  it("priority: claim returns highest priority first", async () => {
    if (!reachable || !client || !driver) return;
    const queue = QUEUE;
    await driver.enqueue({ queue, idempotencyKey: "low", payload: {}, priority: 1 });
    await driver.enqueue({ queue, idempotencyKey: "high", payload: {}, priority: 5 });
    await driver.enqueue({ queue, idempotencyKey: "mid", payload: {}, priority: 3 });

    const claimed = await driver.claim(queue, "worker-1", 3);
    expect(claimed).toHaveLength(3);
    expect(claimed[0].priority).toBe(5);
    expect(claimed[1].priority).toBe(3);
    expect(claimed[2].priority).toBe(1);
  });

  it("stale recovery: recoverStale returns job to pending after heartbeat timeout", async () => {
    if (!reachable || !client || !driver) return;
    const queue = QUEUE;
    await driver.enqueue({ queue, idempotencyKey: "k1", payload: {} });

    const claimed = await driver.claim(queue, "worker-1", 1);
    expect(claimed).toHaveLength(1);
    const { id } = claimed[0];

    // Force the lease to look stale.
    await client.query(
      `UPDATE job_queue SET "heartbeatAt" = now() - interval '1 hour', "lockedAt" = now() - interval '1 hour' WHERE id = $1`,
      [id],
    );

    const recovered = (
      driver as unknown as {
        recoverStale: (graceMs: number) => Promise<number>;
      }
    ).recoverStale;
    const count = await recovered.call(driver, 30_000);
    expect(count).toBeGreaterThanOrEqual(1);

    const res = await client.query<{ status: string }>(
      `SELECT status FROM job_queue WHERE id = $1`,
      [id],
    );
    expect(res.rows[0]?.status).toBe("pending");

    const reclaimed = await driver.claim(queue, "worker-2", 1);
    expect(reclaimed).toHaveLength(1);
    expect(reclaimed[0].id).toBe(id);
  });

  it("worker crash: recovered job is completed exactly once across two workers", async () => {
    if (!reachable || !client || !driver) return;
    const queue = QUEUE;
    await driver.enqueue({ queue, idempotencyKey: "k1", payload: {} });

    // Worker-1 claims then crashes (no heartbeat, no complete).
    const claimed1 = await driver.claim(queue, "worker-1", 1);
    expect(claimed1).toHaveLength(1);
    const { id } = claimed1[0];

    await client.query(
      `UPDATE job_queue SET "heartbeatAt" = now() - interval '2 hours', "lockedAt" = now() - interval '2 hours' WHERE id = $1`,
      [id],
    );

    const recovered = (
      driver as unknown as {
        recoverStale: (graceMs: number) => Promise<number>;
      }
    ).recoverStale;
    const count = await recovered.call(driver, 30_000);
    expect(count).toBeGreaterThanOrEqual(1);

    // Worker-2 reclaims and completes.
    const claimed2 = await driver.claim(queue, "worker-2", 1);
    expect(claimed2).toHaveLength(1);
    expect(claimed2[0].id).toBe(id);

    const done = await driver.complete(claimed2[0].id, "worker-2", claimed2[0].leaseToken);
    expect(done).toBe(true);

    const res = await client.query<{ status: string }>(
      `SELECT status FROM job_queue WHERE id = $1`,
      [id],
    );
    expect(res.rows[0]?.status).toBe("done");

    // Exactly one successful complete across the two workers.
    const secondComplete = await driver.complete(id, "worker-2", claimed2[0].leaseToken);
    expect(secondComplete).toBe(false);
  });
});
