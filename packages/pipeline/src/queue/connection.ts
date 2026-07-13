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
let connectionLock = false;

const queues: Record<string, Queue> = {};

// WHY: connectionLock prevents race condition when multiple workers call getConnection
// simultaneously during the reconnection window (e.g. after config reload).
export function getConnection(config: PipelineConfig): IORedis {
  if (connectionLock) {
    if (connection) return connection;
  }

  if (
    !connection ||
    lastRedisHost !== config.redis.host ||
    lastRedisPort !== config.redis.port ||
    lastRedisPassword !== config.redis.password
  ) {
    connectionLock = true;
    try {
      if (connection) {
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
        retryStrategy: (times: number) => {
          if (times > 5) {
            logger.error(
              { host: config.redis.host, port: config.redis.port },
              "[redis] Connection retries exhausted — queues unavailable",
            );
            return null;
          }
          return Math.min(1000 * 2 ** times, 10000);
        },
      });
      // WHY: ioredis emits an `error` event when a connection drops; without a
      // listener Node treats it as an unhandled exception and can crash the
      // worker. We log and let BullMQ's retry/backoff handle recovery.
      connection.on("error", (err: Error) => {
        logger.warn({ error: err.message }, "[redis] Connection error");
      });
      lastRedisHost = config.redis.host;
      lastRedisPort = config.redis.port;
      lastRedisPassword = config.redis.password;
    } finally {
      connectionLock = false;
    }
  }
  return connection!;
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
