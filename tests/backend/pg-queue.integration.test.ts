import { describe, it, expect, beforeAll, afterAll } from "vitest";
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
        `INSERT INTO job_queue (queue, "idempotencyKey", payload, status) VALUES ('pipeline-ocr','c1','{}','bogus')`,
      ),
    ).rejects.toThrow(/job_queue_status_check/);

    await expect(
      client.query(
        `INSERT INTO job_queue (queue, "idempotencyKey", payload, attempts) VALUES ('pipeline-ocr','c2','{}',-1)`,
      ),
    ).rejects.toThrow(/job_queue_attempts_check/);

    await expect(
      client.query(
        `INSERT INTO job_queue (queue, "idempotencyKey", payload, "maxAttempts") VALUES ('pipeline-ocr','c3','{}',0)`,
      ),
    ).rejects.toThrow(/job_queue_max_attempts_check/);

    await expect(
      client.query(
        `INSERT INTO job_queue (queue, "idempotencyKey", payload) VALUES ('pipeline-bogus','c4','{}')`,
      ),
    ).rejects.toThrow(/job_queue_queue_name_check/);

    await client.query(
      `INSERT INTO job_queue (queue, "idempotencyKey", payload, status, attempts, "maxAttempts") VALUES ('pipeline-ocr','c5','{}','pending',0,3)`,
    );
  });

  it("UNIQUE(queue, idempotencyKey) keeps a single row on re-enqueue", async () => {
    if (!reachable || !client) return;
    await client.query(
      `INSERT INTO job_queue (queue, "idempotencyKey", payload, status) VALUES ('pipeline-export','dup','{}','done')`,
    );
    await client.query(
      `INSERT INTO job_queue (queue, "idempotencyKey", payload, status) VALUES ('pipeline-export','dup','{}','pending') ON CONFLICT (queue, "idempotencyKey") DO NOTHING`,
    );
    const res = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM job_queue WHERE queue='pipeline-export' AND "idempotencyKey"='dup'`,
    );
    expect(Number(res.rows[0].count)).toBe(1);
  });
});
