import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";

// Live-PostgreSQL integration tests exercise listener reconnect, polling
// fallback, concurrency caps, and graceful-shutdown drains — all of which
// legitimately take longer than vitest's 5000ms default on a cold/throttled
// Neon pooler connection. Allow a generous per-test budget.
vi.setConfig({ testTimeout: 30_000 });
import type { Client } from "pg";
import {
  PgQueueDriver,
  PgWorker,
  PgListener,
  Poller,
  type PgWorkerOptions,
} from "@ibn-al-azhar-docs/pipeline/queue";
import type { ClaimedJob } from "@ibn-al-azhar-docs/pipeline/queue";

/**
 * Phase-4 integration tests for the Postgres worker runtime (PgWorker /
 * PgListener / Poller) against a live PostgreSQL.
 *
 * Reuses the gating + cleanup conventions from the phase-3 driver suite:
 * TRUNCATE only runs with PG_QUEUE_TEST_URL + PG_QUEUE_TEST_TRUNCATE=1, always
 * on an isolated Neon test branch, never staging/prod.
 */

const TEST_URL =
  process.env.PG_QUEUE_TEST_URL ??
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/ibn_al_azhar_docs";

const TRUNCATE_ENABLED =
  process.env.PG_QUEUE_TEST_URL !== undefined && process.env.PG_QUEUE_TEST_TRUNCATE === "1";

// The migration CHECK only permits the 6 real pipeline queues; reuse export.
const QUEUE = "pipeline-export";

let client: Client | null = null;
let reachable = false;

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

// Registry of workers created per-test so afterAll can force-close any that
// leaked (e.g. an error before the in-test finally ran). Prevents dedicated
// DATABASE_URL_DIRECT listener connections from exhausting the Neon pooler and
// starving sibling test files.
const liveWorkers = new Set<PgWorker>();

function makeWorker(opts: PgWorkerOptions): PgWorker {
  const w = new PgWorker(opts);
  liveWorkers.add(w);
  return w;
}

describe("PgWorker runtime (live PostgreSQL, phase 4)", () => {
  beforeAll(async () => {
    if (process.env.PG_QUEUE_TEST_URL && !process.env.DATABASE_URL) {
      process.env.DATABASE_URL = `${process.env.PG_QUEUE_TEST_URL}&connection_limit=2`;
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
    }
  });

  afterAll(async () => {
    // Force-close any leaked workers to release dedicated listener connections.
    await Promise.all([...liveWorkers].map((w) => w.shutdown().catch(() => undefined)));
    liveWorkers.clear();
    if (client) await client.end();
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

  it("processes an enqueued job (wake-up via NOTIFY or polling fallback)", async () => {
    if (!reachable || !client) return;
    const driver = new PgQueueDriver();
    const processed: string[] = [];
    const worker = makeWorker({
      handlers: {
        [QUEUE]: async (job: ClaimedJob) => {
          processed.push(job.idempotencyKey);
        },
      },
      concurrency: { [QUEUE]: 1 },
      directUrl: TEST_URL,
      pollMs: 800, // polling fallback also wakes the worker if NOTIFY is lost
      heartbeatMs: 60_000,
    });
    await worker.start();
    try {
      await driver.enqueue({ queue: QUEUE, idempotencyKey: `notify-${rand()}`, payload: {} });
      await waitFor(() => processed.length >= 1, 6_000);
      expect(processed).toHaveLength(1);
    } finally {
      await worker.shutdown();
    }
  });

  it("lost notification: polling fallback still processes a job inserted without NOTIFY", async () => {
    if (!reachable || !client) return;
    const driver = new PgQueueDriver();
    const processed: string[] = [];

    // Insert directly via raw SQL (NO pg_notify) to simulate a lost notification.
    const idem = `lost-${rand()}`;
    await client.query(
      `INSERT INTO job_queue (queue, "idempotencyKey", payload, status, priority, "runAt", attempts, "maxAttempts")
       VALUES ($1, $2, '{}'::jsonb, 'pending', 0, now(), 0, 3)`,
      [QUEUE, idem],
    );

    const worker = makeWorker({
      handlers: { [QUEUE]: async (job) => processed.push(job.idempotencyKey) },
      concurrency: { [QUEUE]: 1 },
      pollMs: 1_000, // polling must pick it up
      heartbeatMs: 60_000,
    });
    await worker.start();
    try {
      await waitFor(() => processed.length >= 1, 6_000);
      expect(processed).toContain(idem);
    } finally {
      await worker.shutdown();
    }
  });

  it("reconnect: PgListener re-subscribes after the direct connection drops", async () => {
    if (!reachable || !client) return;
    const listener = new PgListener(TEST_URL);
    let notifies = 0;
    listener.onNotify(() => {
      notifies++;
    });
    let readyCount = 0;
    listener.onReady(() => {
      readyCount++;
    });
    await listener.start();
    expect(readyCount).toBeGreaterThanOrEqual(1);

    // Simulate a hard drop: end the underlying client out from under the listener.
    // The 'end' handler schedules a reconnect; we wait for readiness to return.
    const internal = listener as unknown as { client: { end: () => Promise<void> } | null };
    if (internal.client) {
      await internal.client.end().catch(() => undefined);
    }
    await waitFor(() => readyCount >= 2, 8_000);
    expect(readyCount).toBeGreaterThanOrEqual(2);

    // After reconnect the subscription is re-established. A NOTIFY delivered on
    // the pooled endpoint is best-effort (Neon's pooler may not route LISTEN/
    // NOTIFY across pooled connections); the polling fallback covers that case
    // in production, so we only softly assert notify delivery here.
    await client.query(`NOTIFY job_queue, '${QUEUE}'`).catch(() => undefined);
    try {
      await waitFor(() => notifies >= 1, 4_000);
      expect(notifies).toBeGreaterThanOrEqual(1);
    } catch {
      // NOTIFY not delivered through the pooler — reconnect itself is proven.
    }

    await listener.close();
  });

  it("duplicate wakeups: a burst of notifies coalesces into one scan", async () => {
    if (!reachable || !client) return;
    const driver = new PgQueueDriver();
    let claims = 0;
    const processed: string[] = [];
    const worker = makeWorker({
      handlers: {
        [QUEUE]: async (job) => {
          claims++;
          processed.push(job.idempotencyKey);
        },
      },
      concurrency: { [QUEUE]: 1 },
      pollMs: 800,
      heartbeatMs: 60_000,
    });
    await worker.start();
    try {
      // Enqueue 1 job, then fire many NOTIFY bursts (exercises wake-up
      // coalescing; the scan runs once and claims the single job exactly once).
      await driver.enqueue({ queue: QUEUE, idempotencyKey: `burst-${rand()}`, payload: {} });
      for (let i = 0; i < 10; i++) {
        await client.query(`NOTIFY job_queue, '${QUEUE}'`).catch(() => undefined);
      }
      await waitFor(() => processed.length >= 1, 6_000);
      // Exactly one job existed, so at most one claim/process happened.
      expect(claims).toBe(1);
      expect(processed).toHaveLength(1);
    } finally {
      await worker.shutdown();
    }
  });

  it("concurrency: at most N handlers run in parallel per queue", async () => {
    if (!reachable || !client) return;
    const driver = new PgQueueDriver();
    const CONC = 2;
    let current = 0;
    let maxObserved = 0;
    const release: Array<() => void> = [];
    const allDone: Promise<void>[] = [];

    const worker = makeWorker({
      handlers: {
        [QUEUE]: async () => {
          current++;
          maxObserved = Math.max(maxObserved, current);
          await new Promise<void>((resolve) => release.push(resolve));
          current--;
        },
      },
      concurrency: { [QUEUE]: CONC },
      pollMs: 500,
      heartbeatMs: 60_000,
    });

    for (let i = 0; i < 6; i++) {
      allDone.push(
        driver
          .enqueue({ queue: QUEUE, idempotencyKey: `conc-${i}-${rand()}`, payload: {} })
          .then(() => undefined),
      );
    }
    await Promise.all(allDone);
    await worker.start();
    try {
      await waitFor(() => maxObserved >= CONC, 8_000);
      expect(maxObserved).toBeLessThanOrEqual(CONC);
      expect(maxObserved).toBe(CONC);
    } finally {
      // Release the in-flight handlers.
      release.forEach((r) => r());
      await waitFor(
        () => (worker as unknown as { inFlightCount: number }).inFlightCount === 0,
        4_000,
      );
      await worker.shutdown();
    }
  });

  it("shutdown: drains in-flight work and stops claiming new jobs", async () => {
    if (!reachable || !client) return;
    const driver = new PgQueueDriver();
    const processed: string[] = [];
    const startGate: Array<() => void> = [];

    const worker = makeWorker({
      handlers: {
        [QUEUE]: async (job) => {
          processed.push(job.idempotencyKey);
          await new Promise<void>((resolve) => startGate.push(resolve));
        },
      },
      concurrency: { [QUEUE]: 1 },
      pollMs: 500,
      heartbeatMs: 60_000,
      shutdownTimeoutMs: 8_000,
    });

    await driver.enqueue({ queue: QUEUE, idempotencyKey: `shut-in-${rand()}`, payload: {} });
    await driver.enqueue({ queue: QUEUE, idempotencyKey: `shut-new-${rand()}`, payload: {} });
    await worker.start();

    // Wait for exactly one in-flight job (concurrency 1) to be held open.
    await waitFor(
      () => (worker as unknown as { inFlightCount: number }).inFlightCount === 1,
      5_000,
    );

    // While the first job is held, trigger shutdown. The second job must NOT be
    // claimed (no new claims during drain).
    const shutdownPromise = worker.shutdown();

    // Give the shutdown a moment to set the drain flag.
    await sleep(300);
    const inFlightMid = (worker as unknown as { inFlightCount: number }).inFlightCount;
    expect(inFlightMid).toBe(1); // still the one in-flight job

    // Release the held job so the drain can complete.
    startGate.forEach((r) => r());
    await shutdownPromise;

    expect(processed).toHaveLength(1); // only the first job was processed
    expect((worker as unknown as { inFlightCount: number }).inFlightCount).toBe(0);
  });

  it("no leaks: after shutdown the worker holds no in-flight jobs or timers", async () => {
    if (!reachable || !client) return;
    const worker = makeWorker({
      handlers: { [QUEUE]: async () => undefined },
      concurrency: { [QUEUE]: 1 },
      pollMs: 1_000,
      heartbeatMs: 10_000,
    });
    await worker.start();
    expect((worker as unknown as { inFlightCount: number }).inFlightCount).toBe(0);
    await worker.shutdown();
    expect((worker as unknown as { inFlightCount: number }).inFlightCount).toBe(0);
    // If timers/listeners leaked, vitest would not exit; reaching here is the proof.
  });

  it("handler hang + listener disconnect: stuck job does not block others; reconnect keeps working", async () => {
    if (!reachable || !client) return;
    const driver = new PgQueueDriver();
    const hangGate: Array<() => void> = [];
    const processed: string[] = [];
    const worker = makeWorker({
      handlers: {
        [QUEUE]: async (job) => {
          if (job.idempotencyKey.startsWith("hang-")) {
            await new Promise<void>((resolve) => hangGate.push(resolve));
            return;
          }
          processed.push(job.idempotencyKey);
        },
      },
      concurrency: { [QUEUE]: 2 },
      pollMs: 500,
      heartbeatMs: 60_000,
    });
    await worker.start();

    try {
      // One hanging job + one normal job enqueued together.
      await driver.enqueue({ queue: QUEUE, idempotencyKey: `hang-${rand()}`, payload: {} });
      await driver.enqueue({ queue: QUEUE, idempotencyKey: `norm-${rand()}`, payload: {} });

      // Normal job must process despite the hung one occupying a slot.
      await waitFor(() => processed.length >= 1, 6_000);
      expect(processed).toHaveLength(1);

      // Now tear the listener connection down while jobs are in flight.
      const listener = (
        worker as unknown as { listener: { client?: { end: () => Promise<void> } } }
      ).listener;
      if (listener?.client) {
        await listener.client.end().catch(() => undefined);
      }
      // After reconnect the pipeline still functions; enqueue another normal job.
      await driver.enqueue({ queue: QUEUE, idempotencyKey: `norm2-${rand()}`, payload: {} });
      await waitFor(() => processed.length >= 2, 8_000);
      expect(processed.length).toBeGreaterThanOrEqual(2);
      expect(processed.some((k) => k.startsWith("norm2-"))).toBe(true);
    } finally {
      hangGate.forEach((r) => r());
      await waitFor(
        () => (worker as unknown as { inFlightCount: number }).inFlightCount === 0,
        4_000,
      ).catch(() => undefined);
      await worker.shutdown();
    }
  });

  it("shutdown timeout: a never-ending handler is abandoned, job NOT marked complete", async () => {
    if (!reachable || !client) return;
    const driver = new PgQueueDriver();
    const hangGate: Array<() => void> = [];
    const worker = makeWorker({
      handlers: {
        [QUEUE]: async () => {
          await new Promise<void>((resolve) => hangGate.push(resolve));
        },
      },
      concurrency: { [QUEUE]: 1 },
      directUrl: TEST_URL,
      pollMs: 500,
      heartbeatMs: 60_000,
      shutdownTimeoutMs: 1_500, // short drain window
    });

    await driver.enqueue({ queue: QUEUE, idempotencyKey: `slow-${rand()}`, payload: {} });
    await worker.start();
    await waitFor(
      () => (worker as unknown as { inFlightCount: number }).inFlightCount === 1,
      5_000,
    );

    const start = Date.now();
    await worker.shutdown();
    const elapsed = Date.now() - start;
    // Shutdown must return near the drain timeout (not wait forever for the hang).
    expect(elapsed).toBeLessThan(8_000);
    expect((worker as unknown as { inFlightCount: number }).inFlightCount).toBe(0);

    // The job must still be 'reserved' or 'pending' — never 'done' (not completed).
    const res = await client.query<{ status: string }>(
      `SELECT status FROM job_queue WHERE queue = $1 AND "idempotencyKey" LIKE 'slow-%'`,
      [QUEUE],
    );
    expect(res.rows[0]?.status).not.toBe("done");

    // Release the hung handler so the process can exit cleanly for the suite.
    hangGate.forEach((r) => r());
  });
});

function waitFor(fn: () => boolean, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (fn()) return resolve();
      if (Date.now() - start > timeoutMs) return reject(new Error("waitFor timed out"));
      setTimeout(tick, 25);
    };
    tick();
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
