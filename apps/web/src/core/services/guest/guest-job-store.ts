import { createHash, randomBytes } from "node:crypto";
import { logger } from "@/shared/logger";
import { GUEST_TOOLS_LIMITS } from "@/shared/tools/guest-limits";
import type { GuestToolId } from "@/shared/tools/guest-limits";
import type {
  GuestFailureCode,
  GuestJobRecord,
  GuestJobResult,
  GuestQueueReason,
} from "@/domain/guest-tools";
import { deleteGuestInput, guestInputPath, isGuestJobId } from "./guest-temp-files";

/**
 * In-process ephemeral store for guest tool jobs.
 *
 * WHY in process: the guest hub must not create Document/ConversionJob rows, and
 * the repo has no table for 30-minute ephemeral results — adding a Prisma
 * migration for a guest queue would put permanent structure on data that is
 * required to vanish. The repo already uses this exact pattern for the
 * rate-limiter fallback (`apps/web/src/clients/redis/rate-limit/store.ts`), and
 * it is the only variant that also works on the Postgres queue driver, where no
 * Redis is provisioned at all.
 *
 * Consequence (documented, not silent): limits are per server instance. With
 * several web instances a guest could get up to N concurrent jobs instead of 1
 * per IP, and a restart drops pending guest jobs — the UI degrades with a clear
 * "job not found" message rather than a fake result. Wiring Redis/PG-backed
 * slots is a follow-up (docs/IMPLEMENTATION_TOOLS.md §9).
 *
 * State is hung off `globalThis` so Next's dev double-compile cannot create two
 * competing registries.
 */

/** A job that has not produced a terminal state by then is failed and cleaned. */
const GUEST_JOB_DEADLINE_MS = 15 * 60 * 1000;
/** How often expired jobs are swept. */
const SWEEP_INTERVAL_MS = 60 * 1000;

interface GuestJobStoreState {
  jobs: Map<string, GuestJobRecord>;
  sweeperStarted: boolean;
  sweeperTimer?: ReturnType<typeof setInterval>;
}

const globalStore = globalThis as typeof globalThis & {
  __ibnGuestJobStore?: GuestJobStoreState;
};

function state(): GuestJobStoreState {
  if (!globalStore.__ibnGuestJobStore) {
    globalStore.__ibnGuestJobStore = {
      jobs: new Map<string, GuestJobRecord>(),
      sweeperStarted: false,
    };
  }
  return globalStore.__ibnGuestJobStore;
}

/** Random, unguessable job token (128 bits of entropy, hex). */
export function generateGuestJobId(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Queue-key identity for a guest. The raw IP is never retained — only a digest,
 * so the store cannot become an IP log of anonymous visitors.
 */
export function hashGuestIp(ip: string): string {
  return createHash("sha256").update(`guest-job:${ip}`).digest("hex").slice(0, 32);
}

const ACTIVE_STATUSES: ReadonlySet<GuestJobRecord["status"]> = new Set(["queued", "processing"]);
const TERMINAL_STATUSES: ReadonlySet<GuestJobRecord["status"]> = new Set(["completed", "failed"]);

function isActive(job: GuestJobRecord): boolean {
  return ACTIVE_STATUSES.has(job.status);
}

export interface GuestQueueCounts {
  total: number;
  perTool: Record<string, number>;
  perIp: Record<string, number>;
}

export function guestQueueCounts(now = Date.now()): GuestQueueCounts {
  const counts: GuestQueueCounts = { total: 0, perTool: {}, perIp: {} };
  for (const job of state().jobs.values()) {
    if (!isActive(job) || job.expiresAtMs <= now) continue;
    counts.total += 1;
    counts.perTool[job.toolId] = (counts.perTool[job.toolId] ?? 0) + 1;
    counts.perIp[job.ipKey] = (counts.perIp[job.ipKey] ?? 0) + 1;
  }
  return counts;
}

/**
 * When could a slot in the given scope free up? Uses the active jobs' own
 * deadlines so the Retry-After hint is honest (clamped by the caller).
 */
export function nextFreeSlotMs(
  scope: { ipKey?: string; toolId?: string },
  now = Date.now(),
): number | null {
  let earliest: number | null = null;
  for (const job of state().jobs.values()) {
    if (!isActive(job) || job.expiresAtMs <= now) continue;
    if (scope.ipKey !== undefined && job.ipKey !== scope.ipKey) continue;
    if (scope.toolId !== undefined && job.toolId !== scope.toolId) continue;
    const remaining = job.expiresAtMs - now;
    if (earliest === null || remaining < earliest) earliest = remaining;
  }
  return earliest;
}

export type GuestReservation =
  | { ok: true; job: GuestJobRecord }
  | { ok: false; reason: GuestQueueReason; active: number; limit: number };

export interface GuestJobInput {
  id: string;
  toolId: GuestToolId;
  ipKey: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  pageCount: number;
}

/**
 * Reserve one queue slot and register the job atomically (single-threaded, so
 * the read-modify-write below needs no lock). Limits are checked in the order
 * IP -> tool -> total so the returned reason is the tightest one.
 */
export function reserveGuestJob(input: GuestJobInput): GuestReservation {
  const store = state();
  const now = Date.now();
  const counts = guestQueueCounts(now);

  const perIp = counts.perIp[input.ipKey] ?? 0;
  if (perIp >= GUEST_TOOLS_LIMITS.maxConcurrentJobsPerIp) {
    return {
      ok: false,
      reason: "PER_IP",
      active: perIp,
      limit: GUEST_TOOLS_LIMITS.maxConcurrentJobsPerIp,
    };
  }
  const perTool = counts.perTool[input.toolId] ?? 0;
  if (perTool >= GUEST_TOOLS_LIMITS.maxConcurrentJobsPerTool) {
    return {
      ok: false,
      reason: "PER_TOOL",
      active: perTool,
      limit: GUEST_TOOLS_LIMITS.maxConcurrentJobsPerTool,
    };
  }
  if (counts.total >= GUEST_TOOLS_LIMITS.maxConcurrentJobsTotal) {
    return {
      ok: false,
      reason: "TOTAL",
      active: counts.total,
      limit: GUEST_TOOLS_LIMITS.maxConcurrentJobsTotal,
    };
  }

  const job: GuestJobRecord = {
    id: input.id,
    toolId: input.toolId,
    ipKey: input.ipKey,
    fileName: input.fileName,
    mimeType: input.mimeType,
    fileSize: input.fileSize,
    pageCount: input.pageCount,
    status: "queued",
    createdAtMs: now,
    // While pending, expiresAtMs is the hard deadline for the whole run.
    expiresAtMs: now + GUEST_JOB_DEADLINE_MS,
    inputPath: guestInputPath(input.id),
    inputDeleted: false,
    progress: 0,
  };
  store.jobs.set(job.id, job);
  startGuestJobSweeper();
  return { ok: true, job };
}

export function getGuestJob(id: string): GuestJobRecord | undefined {
  if (!isGuestJobId(id)) return undefined;
  return state().jobs.get(id);
}

export function markGuestJobProcessing(id: string, progress = 5): void {
  const job = state().jobs.get(id);
  if (!job || !isActive(job)) return;
  job.status = "processing";
  job.startedAtMs = Date.now();
  job.progress = progress;
}

export function setGuestJobProgress(id: string, progress: number): void {
  const job = state().jobs.get(id);
  if (!job || job.status !== "processing") return;
  job.progress = Math.max(0, Math.min(100, Math.round(progress)));
}

/**
 * Terminal transitions recompute `expiresAtMs` as "result TTL from now", so a
 * slow 12-minute job still leaves its guest the full 30 minutes with the result.
 * Returns false when the record is gone (the user deleted it mid-run) or already
 * terminal — the first verdict wins, so a run that finishes after the sweeper
 * timed it out cannot silently rewrite `TIMEOUT` into `completed`.
 */
export function completeGuestJob(id: string, result: GuestJobResult): boolean {
  const store = state();
  const job = store.jobs.get(id);
  if (!job || TERMINAL_STATUSES.has(job.status)) return false;
  const now = Date.now();
  job.status = "completed";
  job.finishedAtMs = now;
  job.progress = 100;
  job.result = result;
  job.expiresAtMs = now + GUEST_TOOLS_LIMITS.resultTtlMinutes * 60_000;
  return true;
}

export function failGuestJob(
  id: string,
  code: GuestFailureCode | string,
  message: string,
): boolean {
  const store = state();
  const job = store.jobs.get(id);
  if (!job || TERMINAL_STATUSES.has(job.status)) return false;
  const now = Date.now();
  job.status = "failed";
  job.finishedAtMs = now;
  job.error = { code, message };
  // A failed job keeps its (empty) result slot for the same TTL so the browser
  // can still read the failure reason instead of an unexplained 404.
  job.expiresAtMs = now + GUEST_TOOLS_LIMITS.resultTtlMinutes * 60_000;
  return true;
}

/**
 * Remove a job and free its queue slot. The upload is deleted here too, so no
 * exit path (finish, user delete, TTL, deadline) can leave a guest file behind.
 */
export async function dropGuestJob(id: string): Promise<GuestJobRecord | undefined> {
  const store = state();
  const job = store.jobs.get(id);
  if (!job) return undefined;
  store.jobs.delete(id);
  if (!job.inputDeleted) {
    await deleteGuestInput(job.inputPath);
    job.inputDeleted = true;
  }
  return job;
}

/**
 * Delete only the upload, keeping the record readable. Used when a run blows
 * past its deadline: the file must go immediately, but the guest still needs to
 * see why the job failed.
 */
export async function dropGuestInputOnly(id: string): Promise<void> {
  const job = state().jobs.get(id);
  if (!job || job.inputDeleted) return;
  await deleteGuestInput(job.inputPath);
  job.inputDeleted = true;
}

export interface GuestSweepResult {
  expired: string[];
  timedOut: string[];
}

/**
 * Drop results past their TTL and fail runs past their deadline.
 * Called by the interval sweeper and lazily on every read, so a deployment with
 * no cron still honors "results live 30 minutes" (docs/MERGE_PLAN.md).
 */
export async function sweepGuestJobs(now = Date.now()): Promise<GuestSweepResult> {
  const store = state();
  const result: GuestSweepResult = { expired: [], timedOut: [] };
  for (const job of [...store.jobs.values()]) {
    if (job.expiresAtMs > now) continue;
    if (isActive(job)) {
      // Keep the record and fail it, so a polling client reads TIMEOUT instead
      // of an unexplained 404 mid-run; the next sweep expires it with the TTL.
      result.timedOut.push(job.id);
      await dropGuestInputOnly(job.id);
      failGuestJob(job.id, "TIMEOUT", "guest job exceeded its processing deadline");
    } else {
      result.expired.push(job.id);
      await dropGuestJob(job.id);
    }
  }
  if (result.expired.length > 0 || result.timedOut.length > 0) {
    logger.warn(
      { expired: result.expired.length, timedOut: result.timedOut.length },
      "Guest job sweep removed ephemeral results",
    );
  }
  return result;
}

export function startGuestJobSweeper(): void {
  const store = state();
  if (store.sweeperStarted || typeof setInterval !== "function") return;
  store.sweeperStarted = true;
  const timer = setInterval(() => {
    void sweepGuestJobs().catch((err: unknown) => {
      logger.error(err, "Guest job sweep failed");
    });
  }, SWEEP_INTERVAL_MS);
  // Never keep the process (or a test worker) alive for the guest sweeper.
  timer.unref?.();
  store.sweeperTimer = timer;
}

export function guestJobTtlMs(): number {
  return GUEST_TOOLS_LIMITS.resultTtlMinutes * 60_000;
}

export function guestJobDeadlineMs(): number {
  return GUEST_JOB_DEADLINE_MS;
}

/**
 * Test-only: clear every job (and their uploads) and stop the sweeper. Follows
 * the `__resetRedisState()` precedent in `clients/redis/rate-limit/redis.ts`.
 */
export async function __resetGuestJobStore(): Promise<void> {
  const store = state();
  if (store.sweeperTimer) {
    clearInterval(store.sweeperTimer);
    store.sweeperTimer = undefined;
  }
  store.sweeperStarted = false;
  for (const job of [...store.jobs.values()]) {
    if (!job.inputDeleted) {
      await deleteGuestInput(job.inputPath);
    }
    store.jobs.delete(job.id);
  }
}
