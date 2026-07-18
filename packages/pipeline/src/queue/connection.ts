import { Queue } from "bullmq";
import IORedis from "ioredis";
import type { PipelineConfig } from "../types";
import { logger } from "@ibn-al-azhar-docs/shared";

// WHY: Singleton connection — BullMQ creates a new connection per Queue instance.
// Multiple connections would exhaust Redis maxclients on small VPS instances.
let connection: IORedis | null = null;
let lastRedisHost = "";
let lastRedisPort = 0;
let lastRedisPassword: string | undefined = undefined;
// Last connection-level error surfaced by ioredis. We capture it so a failing
// enqueue can report the REAL cause (NOAUTH / WRONGPASS / ECONNREFUSED) instead
// of the generic "Connection is closed." that BullMQ throws after ioredis'
// retry budget is exhausted.
let lastConnectionError: Error | null = null;

const queues: Record<string, Queue> = {};

// WHY: A connection that has entered `status === "end"` (ioredis closes the
// client after retryStrategy returns null on the 5th failure) is PERMANENTLY
// dead. The previous implementation cached it forever because the host/port
// hadn't changed, so every subsequent queue.add() hung ~31s and then rejected
// with "Connection is closed." — surfacing as UPLOAD_ENQUEUE_FAILED 202. We now
// detect the dead state and rebuild a fresh client, making the singleton
// self-healing instead of permanently broken for the life of the process.
function isConnectionUsable(client: IORedis | null): boolean {
  if (!client) return false;
  const status = (client as unknown as { status?: string }).status;
  return status !== "end" && status !== "close";
}

export function getConnection(config: PipelineConfig): IORedis {
  const hostChanged =
    !connection ||
    lastRedisHost !== config.redis.host ||
    lastRedisPort !== config.redis.port ||
    lastRedisPassword !== config.redis.password;

  // Rebuild if there is no client, the config changed, or the existing client
  // has died (status "end"/"close"). This is what makes the singleton recover
  // after a transient Redis outage without a process restart.
  if (hostChanged || !isConnectionUsable(connection)) {
    if (connection && isConnectionUsable(connection)) {
      connection.disconnect();
    }
    connection = new IORedis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      // WHY: Upstash Redis uses rediss:// URLs which require TLS.
      tls: config.redis.tls ? {} : undefined,
      // WHY: BullMQ requires null here — it handles retries internally via
      // job-level retry strategies, not per-command retries.
      maxRetriesPerRequest: null,
      // WHY: We keep a bounded retry so a briefly-down Redis recovers, but we
      // stop after a few attempts so a genuinely-broken config (wrong password,
      // unreachable host) fails fast instead of hanging the request for ~31s.
      // retryStrategy returning null closes the client, which we detect on the
      // next getConnection call and rebuild — so recovery is automatic.
      retryStrategy: (times: number) => {
        if (times > 3) {
          logger.error(
            { host: config.redis.host, port: config.redis.port },
            "[redis] Connection retries exhausted — queue unavailable",
          );
          return null;
        }
        return Math.min(1000 * 2 ** times, 8000);
      },
    });
    // WHY: ioredis emits an `error` event when a connection drops or auth
    // fails; without a listener Node treats it as an unhandled exception and
    // can crash the worker. We capture the real cause for diagnostics.
    connection.on("error", (err: Error) => {
      lastConnectionError = err;
      logger.warn({ error: err.message }, "[redis] Connection error");
    });
    lastRedisHost = config.redis.host;
    lastRedisPort = config.redis.port;
    lastRedisPassword = config.redis.password;
  }
  return connection!;
}

export function getLastConnectionError(): Error | null {
  return lastConnectionError;
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
    queues[queueName] = new Queue(queueName, {
      connection: conn as unknown as import("bullmq").ConnectionOptions,
    });
  }
  return queues[queueName];
}

export async function closeQueueConnections(): Promise<void> {
  for (const name of Object.keys(queues)) {
    const q = queues[name];
    if (q) {
      await q.close();
    }
    delete queues[name];
  }
  if (connection) {
    await connection.quit();
    connection = null;
  }
}

/**
 * Health probe for the Redis dependency. Returns `false` (never throws) so it
 * can be safely composed into liveness/readiness and actuator endpoints.
 *
 * Uses a short-lived, isolated connection with a hard timeout — we must NEVER
 * hang the health endpoint (or block startup) when Redis is unreachable. The
 * shared singleton connection is intentionally not used here because it keeps
 * retrying in the background and its in-flight `ping()` would not resolve until
 * its retry budget is exhausted.
 */
export async function isRedisHealthy(config: PipelineConfig): Promise<boolean> {
  const probe = new IORedis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    tls: config.redis.tls ? {} : undefined,
    lazyConnect: true,
    connectTimeout: 1500,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });
  try {
    const ping = probe.ping();
    const timeout = new Promise<"TIMEOUT">((resolve) => setTimeout(() => resolve("TIMEOUT"), 2000));
    const result = await Promise.race([ping, timeout]);
    return result === "PONG";
  } catch {
    return false;
  } finally {
    probe.disconnect();
  }
}
