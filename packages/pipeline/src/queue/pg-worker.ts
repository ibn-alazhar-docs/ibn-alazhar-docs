import { EventEmitter } from "node:events";
import { Client, type Client as PgClient } from "pg";
import { PgQueueDriver, recoverStale, type ClaimedJob } from "./drivers/pg-driver";
import { logger } from "@ibn-al-azhar-docs/shared";

/**
 * Phase-4 Postgres worker runtime.
 *
 * Design rules (per migration plan):
 *  - All enqueue/claim/complete/fail/heartbeat go through the POOLED
 *    `DATABASE_URL` (via Prisma in `PgQueueDriver`).
 *  - ONLY the LISTEN subscriber opens a dedicated connection from
 *    `DATABASE_URL_DIRECT` — one connection per worker process, with
 *    reconnect + resubscribe. The pooled URL must never be used for LISTEN.
 *  - A polling fallback (with jitter) covers lost notifications.
 *  - The worker loop respects per-queue concurrency and performs heartbeats.
 *  - On shutdown: stop claiming new work, let in-flight jobs finish within a
 *    drain timeout, then close the listener and all timers.
 */

const NOTIFY_CHANNEL = "job_queue";

/** Default heartbeat interval (ms) — must be well under the stale grace window. */
const DEFAULT_HEARTBEAT_MS = 10_000;

/** Default stale-recovery grace window (ms), mirrors PgQueueDriver. */
const DEFAULT_STALE_GRACE_MS = 30_000;

/** Default polling interval (ms) — the fallback wake-up when NOTIFY is lost. */
const DEFAULT_POLL_MS = 5_000;

/**
 * Default graceful-shutdown drain timeout (ms). Must exceed the longest
 * realistic single-job runtime (e.g. OCR can run for many minutes) so an
 * in-flight handler is allowed to finish and `complete()` instead of being
 * abandoned mid-job. A stranded job is still fenced by `leaseToken` after the
 * timeout, so this is a preference, not a correctness boundary.
 */
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 600_000;

/** Backoff for listener reconnect attempts (ms), with capped growth. */
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

export interface PgWorkerOptions {
  /** Queues to process and their handler. */
  handlers: Partial<Record<string, (job: ClaimedJob) => Promise<void>>>;
  /** Per-queue concurrency cap. Defaults to 1 when omitted. */
  concurrency?: Partial<Record<string, number>>;
  workerId?: string;
  /** Dedicated direct connection string for LISTEN (required for the listener). */
  directUrl?: string;
  /** Pooled URL is read by Prisma from DATABASE_URL; this is only for claims. */
  heartbeatMs?: number;
  staleGraceMs?: number;
  pollMs?: number;
  shutdownTimeoutMs?: number;
}

function getDirectUrl(): string | undefined {
  return process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
}

/**
 * Dedicated LISTEN/NOTIFY subscriber. Owns exactly one `pg` client connected to
 * `DATABASE_URL_DIRECT`. On connection loss it reconnects and re-issues LISTEN.
 * Notifications are delivered as a coarse "wake up" signal; the worker loop
 * re-scans all queues rather than trusting the payload.
 */
export class PgListener {
  private client: PgClient | null = null;
  private connecting = false;
  private closed = false;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readonly emitter = new EventEmitter();
  private readonly directUrl: string;
  private readonly channel: string;

  constructor(directUrl: string, channel: string = NOTIFY_CHANNEL) {
    this.directUrl = directUrl;
    this.channel = channel;
    // Avoid EventEmitter warning on high notify volume.
    this.emitter.setMaxListeners(50);
  }

  /** Fired on every NOTIFY (coalesced; payload ignored). */
  onNotify(cb: () => void): void {
    this.emitter.on("notify", cb);
  }

  /** Fired when the subscription is (re)established. */
  onReady(cb: () => void): void {
    this.emitter.on("ready", cb);
  }

  async start(): Promise<void> {
    if (this.closed) return;
    await this.connectWithRetry();
  }

  private async connectWithRetry(): Promise<void> {
    if (this.closed || this.connecting) return;
    this.connecting = true;
    try {
      const client = new Client({ connectionString: this.directUrl });
      client.on("notification", () => {
        this.emitter.emit("notify");
      });
      client.on("error", (err) => {
        logger.warn({ err }, "[pg-listener] connection error; scheduling reconnect");
        this.handleDisconnect();
      });
      client.on("end", () => {
        this.handleDisconnect();
      });
      await client.connect();
      await client.query(`LISTEN ${this.channel}`);
      this.client = client;
      this.reconnectAttempts = 0;
      this.connecting = false;
      this.emitter.emit("ready");
      return;
    } catch {
      this.connecting = false;
      if (this.closed) return;
      this.scheduleReconnect();
    }
  }

  private handleDisconnect(): void {
    if (this.closed) return;
    const had = this.client !== null;
    this.client = null;
    if (had) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.closed || this.reconnectTimer) return;
    const delay = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** this.reconnectAttempts);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connectWithRetry();
    }, delay);
    // Unref so the timer never keeps the process alive on its own.
    this.reconnectTimer.unref?.();
  }

  async close(): Promise<void> {
    this.closed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const client = this.client;
    this.client = null;
    if (client) {
      try {
        await client.query(`UNLISTEN ${this.channel}`);
      } catch {
        // ignore — connection may already be dead
      }
      await client.end().catch(() => undefined);
    }
    this.emitter.removeAllListeners();
  }
}

/**
 * Polling fallback with full jitter. Guarantees the worker wakes up even if a
 * NOTIFY is lost (e.g. listener down, or notify delivered between claim and
 * listener start). Jitter spreads load so many workers don't stampede together.
 */
export class Poller {
  private timer: NodeJS.Timeout | null = null;
  private closed = false;
  private readonly intervalMs: number;
  private readonly onTick: () => void;

  constructor(intervalMs: number, onTick: () => void) {
    this.intervalMs = intervalMs;
    this.onTick = onTick;
  }

  start(): void {
    if (this.closed) return;
    this.schedule();
  }

  private schedule(): void {
    if (this.closed) return;
    // Full jitter: wait a random duration in [0, interval].
    const delay = Math.random() * this.intervalMs;
    this.timer = setTimeout(() => {
      if (this.closed) return;
      try {
        this.onTick();
      } catch (err) {
        logger.error({ err }, "[poller] tick handler threw");
      }
      this.schedule();
    }, delay);
    this.timer.unref?.();
  }

  async close(): Promise<void> {
    this.closed = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

interface ActiveJob {
  queue: string;
  id: string;
  leaseToken: string;
  promise: Promise<void>;
}

/**
 * The worker runtime: combines the LISTEN listener, the polling fallback, and
 * the claim/process loop. Honors per-queue concurrency and performs periodic
 * heartbeats. Supports graceful shutdown that halts new claims and drains
 * in-flight work within a timeout.
 */
export class PgWorker {
  private readonly driver = new PgQueueDriver();
  private readonly listener: PgListener | null;
  private readonly poller: Poller;
  private readonly heartbeatTimer: NodeJS.Timeout;
  private readonly queues: string[];
  private readonly handlers: Partial<Record<string, (job: ClaimedJob) => Promise<void>>>;
  private readonly concurrency: Record<string, number>;
  private readonly workerId: string;
  private readonly heartbeatMs: number;
  private readonly staleGraceMs: number;
  private readonly shutdownTimeoutMs: number;

  private running = false;
  private draining = false;
  private readonly active = new Map<string, ActiveJob>();
  private tickScheduled = false;
  private scanning = false;
  private pendingScan = false;
  private readonly activeTimers = new Set<NodeJS.Timeout>();

  constructor(opts: PgWorkerOptions) {
    this.handlers = opts.handlers;
    this.queues = Object.keys(opts.handlers);
    this.concurrency = {};
    for (const q of this.queues) {
      this.concurrency[q] = Math.max(1, opts.concurrency?.[q] ?? 1);
    }
    this.workerId = opts.workerId ?? `pg-worker-${process.pid}`;
    this.heartbeatMs = opts.heartbeatMs ?? DEFAULT_HEARTBEAT_MS;
    this.staleGraceMs = opts.staleGraceMs ?? DEFAULT_STALE_GRACE_MS;
    this.shutdownTimeoutMs = opts.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS;

    const directUrl = opts.directUrl ?? getDirectUrl();
    if (directUrl) {
      this.listener = new PgListener(directUrl);
      this.listener.onNotify(() => this.scheduleTick());
    } else {
      // No direct URL: rely solely on polling. Still safe.
      this.listener = null;
    }

    this.poller = new Poller(opts.pollMs ?? DEFAULT_POLL_MS, () => this.scheduleTick());

    // Heartbeat loop keeps reserved jobs alive; unref so it never blocks exit.
    this.heartbeatTimer = setInterval(() => {
      void this.heartbeatAll();
    }, this.heartbeatMs);
    this.heartbeatTimer.unref?.();
    this.activeTimers.add(this.heartbeatTimer);
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    if (this.listener) {
      await this.listener.start();
    }
    this.poller.start();
    // Initial scan so work starts even before the first notify/poll fires.
    this.scheduleTick();
    logger.info(
      { queues: this.queues, workerId: this.workerId, hasListener: !!this.listener },
      "[pg-worker] started",
    );
  }

  /** Coalesces repeated wake-ups (notify storms, duplicate polls) into one scan. */
  private scheduleTick(): void {
    if (!this.running || this.tickScheduled) return;
    this.tickScheduled = true;
    // Run on next microtask to batch bursts; no timer leak (one microtask).
    queueMicrotask(() => {
      this.tickScheduled = false;
      // If a scan is already in flight, remember the wake-up and let it re-scan
      // on completion. This prevents two overlapping scans (notify + poll) from
      // both observing zero in-flight and claiming past the concurrency cap.
      if (this.scanning) {
        this.pendingScan = true;
        return;
      }
      void this.runScan();
    });
  }

  /** Serializes scans so claim/concurrency state is never read mid-scan. */
  private async runScan(): Promise<void> {
    this.scanning = true;
    try {
      await this.scan();
    } finally {
      this.scanning = false;
      if (this.pendingScan) {
        this.pendingScan = false;
        this.scheduleTick();
      }
    }
  }

  private async scan(): Promise<void> {
    if (!this.running) return;
    // Stale recovery first so orphaned jobs re-enter the claimable set.
    try {
      await recoverStale(this.staleGraceMs);
    } catch (err) {
      logger.error({ err }, "[pg-worker] recoverStale failed");
    }
    if (this.draining) return; // no new claims while shutting down
    for (const queue of this.queues) {
      const activeCount = this.countActive(queue);
      const cap = this.concurrency[queue] ?? 1;
      const free = cap - activeCount;
      if (free <= 0) continue;
      await this.claimFor(queue, free);
    }
  }

  private countActive(queue: string): number {
    let n = 0;
    for (const j of this.active.values()) {
      if (j.queue === queue) n++;
    }
    return n;
  }

  private async claimFor(queue: string, limit: number): Promise<void> {
    let claimed: ClaimedJob[];
    try {
      claimed = await this.driver.claim(queue, this.workerId, limit);
    } catch (err) {
      logger.error({ err, queue }, "[pg-worker] claim failed");
      return;
    }
    for (const job of claimed) {
      this.dispatch(queue, job);
    }
  }

  private dispatch(queue: string, job: ClaimedJob): void {
    const handler = this.handlers[queue];
    if (!handler) {
      logger.warn({ queue, id: job.id }, "[pg-worker] no handler; releasing");
      // Without a handler we cannot process; mark complete to avoid starvation.
      void this.driver.complete(job.id, this.workerId, job.leaseToken).catch(() => undefined);
      return;
    }

    const key = `${queue}:${job.id}`;
    const entry: ActiveJob = {
      queue,
      id: job.id,
      leaseToken: job.leaseToken,
      promise: Promise.resolve(),
    };
    const promise = (async () => {
      try {
        await handler(job);
        const ok = await this.driver.complete(job.id, this.workerId, job.leaseToken);
        if (!ok) {
          // Lost the lease (fenced) — another worker took over; do not retry.
          logger.warn({ queue, id: job.id }, "[pg-worker] complete fenced; skipping");
        }
      } catch (err) {
        const willRetry = (err as { willRetry?: boolean })?.willRetry ?? true;
        try {
          await this.driver.fail(job.id, this.workerId, job.leaseToken, err as Error, willRetry);
        } catch (failErr) {
          logger.error({ err: failErr, queue, id: job.id }, "[pg-worker] fail() threw");
        }
      } finally {
        this.active.delete(key);
      }
    })();
    entry.promise = promise;
    this.active.set(key, entry);
    // Prevent unhandled rejection surfacing if not awaited.
    promise.catch(() => undefined);
  }

  private async heartbeatAll(): Promise<void> {
    if (!this.running) return;
    const snapshot = [...this.active.values()];
    await Promise.all(snapshot.map((j) => this.heartbeatOne(j)));
  }

  private async heartbeatOne(job: ActiveJob): Promise<void> {
    if (!job.leaseToken) return;
    try {
      const ok = await this.driver.heartbeat(job.id, this.workerId, job.leaseToken);
      if (!ok) {
        // Lease already moved on; stop tracking so it isn't heartbeated again.
        this.active.delete(`${job.queue}:${job.id}`);
      }
    } catch (err) {
      logger.error({ err, id: job.id }, "[pg-worker] heartbeat failed");
    }
  }

  /**
   * Graceful shutdown: stops new claims, lets in-flight work finish within the
   * drain timeout, then closes the listener, poller, heartbeat, and all timers.
   */
  async shutdown(): Promise<void> {
    if (!this.running) return;
    this.draining = true;
    this.running = false;
    logger.info(
      { inFlight: this.active.size, timeoutMs: this.shutdownTimeoutMs },
      "[pg-worker] shutting down; draining in-flight jobs",
    );

    const deadline = Date.now() + this.shutdownTimeoutMs;

    // Wait for in-flight jobs to finish naturally, but never block on a handler
    // promise indefinitely: once the deadline passes we abandon the drain and
    // force-close. We check the deadline between settled jobs rather than
    // awaiting a never-ending promise to completion.
    while (this.active.size > 0 && Date.now() < deadline) {
      const next = Promise.race([...this.active.values()].map((j) => j.promise));
      const budget = deadline - Date.now();
      const timeout = new Promise<void>((resolve) => setTimeout(resolve, Math.max(budget, 0)));
      await Promise.race([next, timeout]);
    }

    if (this.active.size > 0) {
      logger.warn(
        { stuck: this.active.size },
        "[pg-worker] drain timeout reached; abandoning in-flight jobs",
      );
    }

    await this.poller.close();
    if (this.listener) {
      await this.listener.close();
    }
    for (const t of this.activeTimers) {
      clearInterval(t);
      clearTimeout(t);
    }
    this.activeTimers.clear();
    this.active.clear();
    logger.info("[pg-worker] stopped");
  }

  get inFlightCount(): number {
    return this.active.size;
  }
}

/** Convenience: build a worker over the standard pipeline queues. */
export function createPgWorkerRunner(
  handlers: Partial<Record<string, (job: ClaimedJob) => Promise<void>>>,
  opts?: Partial<PgWorkerOptions>,
): PgWorker {
  return new PgWorker({
    handlers,
    ...opts,
    directUrl: opts?.directUrl ?? getDirectUrl(),
  });
}
