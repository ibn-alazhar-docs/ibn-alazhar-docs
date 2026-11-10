import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { Client } from "pg";

/**
 * Phase-1/2 integration verification of the PostgreSQL job_queue migration.
 *
 * These tests validate the MIGRATION ARTIFACTS (table shape, CHECK constraints,
 * UNIQUE(queue, idempotencyKey) idempotency, nullable heartbeatAt) against a
 * live PostgreSQL. They deliberately do NOT exercise the PgQueueDriver claim/
 * complete logic — that is Phase-3 work and the driver is currently a stub.
 *
 * The suite connects to `PG_QUEUE_TEST_URL` (preferred) or `DATABASE_URL`.
 * When neither points at a reachable PostgreSQL it skips gracefully (the
 * `beforeAll` probe fails, each test returns early) — no local Postgres in CI.
 */
const TEST_URL =
  process.env.PG_QUEUE_TEST_URL ??
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/ibn_al_azhar_docs";

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

describe("job_queue migration (live PostgreSQL)", () => {
  beforeAll(async () => {
    reachable = await postgresReachable();
    if (reachable) {
      const { Client: ClientCtor } = await import("pg");
      client = new ClientCtor({ connectionString: TEST_URL });
      await client.connect();
    }
  });

  afterAll(async () => {
    if (client) {
      await client.end();
    }
  });

  // Idempotent re-runs: fixed keys ('c5', 'dup') would otherwise collide with
  // rows left behind by a previous run (UNIQUE(queue, idempotencyKey)).
  beforeEach(async () => {
    if (reachable && client) {
      await client.query(
        `DELETE FROM job_queue WHERE "idempotencyKey" IN ('c1','c2','c3','c4','c5','dup')`,
      );
    }
  });

  it("creates job_queue with expected columns and nullable heartbeatAt", async () => {
    if (!reachable || !client) return;
    const res = await client.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'job_queue' ORDER BY ordinal_position`,
    );
    const cols = res.rows.map((r) => r.column_name);
    for (const expected of [
      "id",
      "queue",
      "idempotencyKey",
      "payload",
      "status",
      "priority",
      "runAt",
      "attempts",
      "maxAttempts",
      "lastError",
      "leaseToken",
      "lockedBy",
      "lockedAt",
      "heartbeatAt",
      "deadLetterState",
      "createdAt",
      "updatedAt",
    ]) {
      expect(cols, `missing column ${expected}`).toContain(expected);
    }
    const nullable = await client.query<{ is_nullable: string }>(
      `SELECT is_nullable FROM information_schema.columns WHERE table_name='job_queue' AND column_name='heartbeatAt'`,
    );
    expect(nullable.rows[0]?.is_nullable).toBe("YES");
  });

  it("CHECK constraints enforce domain rules", async () => {
    if (!reachable || !client) return;
    await expect(
      client.query(
        `INSERT INTO job_queue (queue, "idempotencyKey", payload, status, "createdAt", "updatedAt") VALUES ('pipeline-ocr','c1','{}','bogus', now(), now())`,
      ),
    ).rejects.toThrow(/job_queue_status_check/);

    await expect(
      client.query(
        `INSERT INTO job_queue (queue, "idempotencyKey", payload, attempts, "createdAt", "updatedAt") VALUES ('pipeline-ocr','c2','{}',-1, now(), now())`,
      ),
    ).rejects.toThrow(/job_queue_attempts_check/);

    await expect(
      client.query(
        `INSERT INTO job_queue (queue, "idempotencyKey", payload, "maxAttempts", "createdAt", "updatedAt") VALUES ('pipeline-ocr','c3','{}',0, now(), now())`,
      ),
    ).rejects.toThrow(/job_queue_max_attempts_check/);

    await expect(
      client.query(
        `INSERT INTO job_queue (queue, "idempotencyKey", payload, "createdAt", "updatedAt") VALUES ('pipeline-bogus','c4','{}', now(), now())`,
      ),
    ).rejects.toThrow(/job_queue_queue_name_check/);

    await client.query(
      // 'done' (not 'pending') so this fixture row is never claimable by a
      // sibling suite's worker while it sits in the table.
      `INSERT INTO job_queue (queue, "idempotencyKey", payload, status, attempts, "maxAttempts", "createdAt", "updatedAt") VALUES ('pipeline-ocr','c5','{}','done',0,3, now(), now())`,
    );
  });

  it("UNIQUE(queue, idempotencyKey) keeps a single row on re-enqueue", async () => {
    if (!reachable || !client) return;
    await client.query(
      `INSERT INTO job_queue (queue, "idempotencyKey", payload, status, "createdAt", "updatedAt") VALUES ('pipeline-export','dup','{}','done', now(), now())`,
    );
    await client.query(
      `INSERT INTO job_queue (queue, "idempotencyKey", payload, status, "createdAt", "updatedAt") VALUES ('pipeline-export','dup','{}','pending', now(), now()) ON CONFLICT (queue, "idempotencyKey") DO NOTHING`,
    );
    const res = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM job_queue WHERE queue='pipeline-export' AND "idempotencyKey"='dup'`,
    );
    expect(Number(res.rows[0].count)).toBe(1);
  });
});
