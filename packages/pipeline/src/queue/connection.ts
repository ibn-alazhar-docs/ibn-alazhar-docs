import { Queue } from "bullmq";
import IORedis from "ioredis";
import type { PipelineConfig } from "../types";

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
        // WHY: BullMQ requires null here — it handles retries internally via
        // job-level retry strategies, not per-command retries.
        maxRetriesPerRequest: null,
        retryStrategy: (times: number) => {
          if (times > 5) return null;
          return Math.min(1000 * 2 ** times, 10000);
        },
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
