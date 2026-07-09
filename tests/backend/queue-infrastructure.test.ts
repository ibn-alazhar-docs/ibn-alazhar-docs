import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

import {
  getConnection,
  getQueue,
  closeQueueConnections,
} from "../../packages/pipeline/src/queue/connection";
import {
  enqueueValidation,
  enqueueSplitting,
  enqueueOcr,
  enqueueCleaning,
  enqueueGeneration,
  enqueueExport,
} from "../../packages/pipeline/src/queue/enqueue";
import {
  getRetryConfigForQueue,
  getDefaultJobOptions,
} from "../../packages/pipeline/src/queue/workers";
import {
  setupDlq,
  recordFailedJob,
  getFailedJobs,
  cleanupFailedJob,
} from "../../packages/pipeline/src/queue/dlq";
import {
  getJobStatus,
  getQueueMetrics,
  getAllQueueMetrics,
  getStuckJobs,
} from "../../packages/pipeline/src/queue/metrics";
import {
  JOB_QUEUES,
  JOB_TIMEOUTS,
  JOB_CONCURRENCY,
  type PipelineConfig,
  type ProcessingJob,
  type FailedJob,
  type ExportRequest,
} from "../../packages/pipeline/src/types";

const CFG: PipelineConfig = {
  minio: {
    endpoint: "localhost",
    port: 9000,
    useSSL: false,
    accessKey: "minio",
    secretKey: "minio123",
    bucket: "test",
  },
  redis: { host: "localhost", port: 6379, password: undefined, tls: undefined },
  google: { serviceAccountEmail: "test@test.com", privateKey: "key" },
  gemini: { apiKey: "test", model: "gemini-pro" },
  ocr: { dpi: 300, language: "ara", maxRetries: 3, provider: "google", providers: ["google"] },
  paths: { uploads: "/tmp", pages: "/tmp", ocrResults: "/tmp", exports: "/tmp", temp: "/tmp" },
};

const REDIS_2: PipelineConfig = {
  ...CFG,
  redis: { host: "other.example.com", port: 6380, password: "p", tls: false },
};

const JOB: ProcessingJob = {
  id: "job-001",
  documentId: "doc-001",
  userId: "user-001",
  fileName: "test.pdf",
  fileSize: 1024,
  mimeType: "application/pdf",
  status: "pending",
  progress: 0,
  createdAt: new Date().toISOString(),
};

const EXPORT_REQ: ExportRequest = {
  jobId: "job-001",
  documentId: "doc-001",
  userId: "user-001",
  format: "md",
  textKey: "text/key.md",
  outputKey: "output/key.md",
};

const FAILED: FailedJob = {
  jobId: "job-001",
  queue: "pipeline-ocr",
  originalData: { page: 1 },
  error: "OCR failed",
  errorCode: "OCR_NO_TEXT",
  failureCategory: "transient",
  attempts: 2,
  lastAttemptAt: new Date().toISOString(),
  failedAt: new Date().toISOString(),
};

const PIPELINE_QUEUES = [
  JOB_QUEUES.VALIDATION,
  JOB_QUEUES.SPLITTING,
  JOB_QUEUES.OCR,
  JOB_QUEUES.CLEANING,
  JOB_QUEUES.GENERATION,
];

function resetSpies() {
  const all = [...Object.values(JOB_QUEUES)];
  for (const name of all) {
    try {
      const q = getQueue(name, CFG);
      vi.spyOn(q, "add").mockResolvedValue(undefined as any);
      vi.spyOn(q, "close").mockResolvedValue(undefined);
      vi.spyOn(q, "getJobCounts").mockResolvedValue({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      } as any);
      vi.spyOn(q, "getJobs").mockResolvedValue([]);
      vi.spyOn(q, "getJob").mockResolvedValue(null);
    } catch {}
  }
}

beforeEach(async () => {
  await closeQueueConnections();
});

afterEach(async () => {
  await closeQueueConnections();
});

describe("connection — getConnection", () => {
  it("returns object with disconnect/quit", () => {
    const c = getConnection(CFG);
    expect(typeof c.disconnect).toBe("function");
    expect(typeof c.quit).toBe("function");
  });

  it("same instance on repeat calls (singleton)", () => {
    const a = getConnection(CFG);
    const b = getConnection(CFG);
    expect(a).toBe(b);
  });

  it("new connection when host changes", () => {
    const a = getConnection(CFG);
    const b = getConnection(REDIS_2);
    expect(a).not.toBe(b);
  });

  it("disconnects old when host changes", () => {
    const a = getConnection(CFG);
    const spy = vi.spyOn(a, "disconnect");
    getConnection(REDIS_2);
    expect(spy).toHaveBeenCalled();
  });

  it("disconnects old when port changes", () => {
    const cfg = { ...CFG, redis: { ...CFG.redis, port: 6380 } };
    const a = getConnection(CFG);
    const spy = vi.spyOn(a, "disconnect");
    getConnection(cfg);
    expect(spy).toHaveBeenCalled();
  });
});

describe("connection — getQueue", () => {
  it("returns object with add/close", () => {
    const q = getQueue("t", CFG);
    expect(typeof q.add).toBe("function");
    expect(typeof q.close).toBe("function");
  });

  it("same instance for same name (cached)", () => {
    const a = getQueue("t", CFG);
    const b = getQueue("t", CFG);
    expect(a).toBe(b);
  });

  it("caches per name", () => {
    const a = getQueue("a", CFG);
    const b = getQueue("b", CFG);
    expect(a).not.toBe(b);
  });

  it("no close when config unchanged", () => {
    const q = getQueue("t", CFG);
    const spy = vi.spyOn(q, "close").mockResolvedValue(undefined);
    getQueue("t", CFG);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("connection — closeQueueConnections", () => {
  it("closes all cached queues", async () => {
    const a = getQueue("qa", CFG);
    const b = getQueue("qb", CFG);
    const sa = vi.spyOn(a, "close").mockResolvedValue(undefined);
    const sb = vi.spyOn(b, "close").mockResolvedValue(undefined);
    await closeQueueConnections();
    expect(sa).toHaveBeenCalled();
    expect(sb).toHaveBeenCalled();
  });

  it("quits redis connection", async () => {
    const c = getConnection(CFG);
    const spy = vi.spyOn(c, "quit").mockResolvedValue(undefined);
    await closeQueueConnections();
    expect(spy).toHaveBeenCalled();
  });

  it("allows new connection after close", async () => {
    const a = getConnection(CFG);
    await closeQueueConnections();
    const b = getConnection(CFG);
    expect(a).not.toBe(b);
  });

  it("safe when no connection", async () => {
    await closeQueueConnections();
    await closeQueueConnections();
  });
});

describe("enqueue — calls queue.add with correct args", () => {
  it("enqueueValidation → VALIDATION", async () => {
    const q = getQueue(JOB_QUEUES.VALIDATION, CFG);
    const spy = vi.spyOn(q, "add").mockResolvedValue(undefined as any);
    await enqueueValidation(CFG, JOB);
    expect(spy).toHaveBeenCalledWith(JOB.id, JOB, expect.any(Object));
  });

  it("enqueueSplitting → SPLITTING", async () => {
    const q = getQueue(JOB_QUEUES.SPLITTING, CFG);
    const spy = vi.spyOn(q, "add").mockResolvedValue(undefined as any);
    await enqueueSplitting(CFG, JOB);
    expect(spy).toHaveBeenCalledWith(JOB.id, JOB, expect.any(Object));
  });

  it("enqueueOcr → OCR", async () => {
    const q = getQueue(JOB_QUEUES.OCR, CFG);
    const spy = vi.spyOn(q, "add").mockResolvedValue(undefined as any);
    await enqueueOcr(CFG, JOB);
    expect(spy).toHaveBeenCalledWith(JOB.id, JOB, expect.any(Object));
  });

  it("enqueueCleaning → CLEANING", async () => {
    const q = getQueue(JOB_QUEUES.CLEANING, CFG);
    const spy = vi.spyOn(q, "add").mockResolvedValue(undefined as any);
    await enqueueCleaning(CFG, JOB);
    expect(spy).toHaveBeenCalledWith(JOB.id, JOB, expect.any(Object));
  });

  it("enqueueGeneration → GENERATION", async () => {
    const q = getQueue(JOB_QUEUES.GENERATION, CFG);
    const spy = vi.spyOn(q, "add").mockResolvedValue(undefined as any);
    await enqueueGeneration(CFG, JOB);
    expect(spy).toHaveBeenCalledWith(JOB.id, JOB, expect.any(Object));
  });

  it("enqueueExport → EXPORT with req.jobId", async () => {
    const q = getQueue(JOB_QUEUES.EXPORT, CFG);
    const spy = vi.spyOn(q, "add").mockResolvedValue(undefined as any);
    await enqueueExport(CFG, EXPORT_REQ);
    expect(spy).toHaveBeenCalledWith(EXPORT_REQ.jobId, EXPORT_REQ, expect.any(Object));
  });

  it("passes overrides to queue.add", async () => {
    const q = getQueue(JOB_QUEUES.VALIDATION, CFG);
    const spy = vi.spyOn(q, "add").mockResolvedValue(undefined as any);
    await enqueueValidation(CFG, JOB, { priority: 10, delay: 5000 });
    expect(spy.mock.calls[0][2]).toMatchObject({ priority: 10, delay: 5000 });
  });

  it("merges defaultOptions + retryConfig + overrides", async () => {
    const q = getQueue(JOB_QUEUES.OCR, CFG);
    const spy = vi.spyOn(q, "add").mockResolvedValue(undefined as any);
    await enqueueOcr(CFG, JOB, { delay: 999 });
    const opts = spy.mock.calls[0][2];
    expect(opts).toHaveProperty("timeout");
    expect(opts).toHaveProperty("attempts");
    expect(opts).toHaveProperty("backoff");
    expect(opts.delay).toBe(999);
  });

  it("overrides can override defaults", async () => {
    const q = getQueue(JOB_QUEUES.VALIDATION, CFG);
    const spy = vi.spyOn(q, "add").mockResolvedValue(undefined as any);
    await enqueueValidation(CFG, JOB, { timeout: 9999, attempts: 10 });
    expect(spy.mock.calls[0][2].timeout).toBe(9999);
    expect(spy.mock.calls[0][2].attempts).toBe(10);
  });
});

describe("workers — getRetryConfigForQueue", () => {
  it("base: 3 attempts exponential 2s", () => {
    expect(getRetryConfigForQueue(JOB_QUEUES.VALIDATION)).toEqual({
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
    });
  });

  it("SPLITTING uses base", () => {
    expect(getRetryConfigForQueue(JOB_QUEUES.SPLITTING)).toEqual({
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
    });
  });

  it("CLEANING uses base", () => {
    expect(getRetryConfigForQueue(JOB_QUEUES.CLEANING)).toEqual({
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
    });
  });

  it("GENERATION uses base", () => {
    expect(getRetryConfigForQueue(JOB_QUEUES.GENERATION)).toEqual({
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
    });
  });

  it("EXPORT uses base", () => {
    expect(getRetryConfigForQueue(JOB_QUEUES.EXPORT)).toEqual({
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
    });
  });

  it("OCR has 5s backoff", () => {
    expect(getRetryConfigForQueue(JOB_QUEUES.OCR).backoff).toEqual({
      type: "exponential",
      delay: 5000,
    });
  });

  it("OCR reads OCR_MAX_RETRIES", () => {
    vi.stubEnv("OCR_MAX_RETRIES", "7");
    expect(getRetryConfigForQueue(JOB_QUEUES.OCR).attempts).toBe(7);
    vi.unstubAllEnvs();
  });

  it("OCR defaults to 3 when OCR_MAX_RETRIES invalid", () => {
    vi.stubEnv("OCR_MAX_RETRIES", "abc");
    expect(getRetryConfigForQueue(JOB_QUEUES.OCR).attempts).toBe(3);
    vi.unstubAllEnvs();
  });

  it("OCR floor 1 when negative", () => {
    vi.stubEnv("OCR_MAX_RETRIES", "-5");
    expect(getRetryConfigForQueue(JOB_QUEUES.OCR).attempts).toBe(1);
    vi.unstubAllEnvs();
  });

  it("unknown queue uses base", () => {
    expect(getRetryConfigForQueue("unknown")).toEqual({
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
    });
  });
});

describe("workers — getDefaultJobOptions", () => {
  it("VALIDATION", () =>
    expect(getDefaultJobOptions(JOB_QUEUES.VALIDATION)).toEqual({ timeout: 60_000 }));
  it("SPLITTING", () =>
    expect(getDefaultJobOptions(JOB_QUEUES.SPLITTING)).toEqual({ timeout: 600_000 }));
  it("OCR", () => expect(getDefaultJobOptions(JOB_QUEUES.OCR)).toEqual({ timeout: 7_200_000 }));
  it("CLEANING", () =>
    expect(getDefaultJobOptions(JOB_QUEUES.CLEANING)).toEqual({ timeout: 180_000 }));
  it("GENERATION", () =>
    expect(getDefaultJobOptions(JOB_QUEUES.GENERATION)).toEqual({ timeout: 600_000 }));
  it("EXPORT", () => expect(getDefaultJobOptions(JOB_QUEUES.EXPORT)).toEqual({ timeout: 300_000 }));
  it("unknown", () => expect(getDefaultJobOptions("x")).toEqual({}));
  it("FAILED", () => expect(getDefaultJobOptions(JOB_QUEUES.FAILED)).toEqual({}));
});

describe("dlq — setup & recordFailedJob", () => {
  beforeEach(async () => {
    await setupDlq(CFG, vi.fn());
  });

  it("setupDlq creates FAILED queue", async () => {
    const q = getQueue(JOB_QUEUES.FAILED, CFG);
    expect(q).toBeDefined();
  });

  it("recordFailedJob adds to FAILED with jobId", async () => {
    const q = getQueue(JOB_QUEUES.FAILED, CFG);
    const spy = vi.spyOn(q, "add").mockResolvedValue(undefined as any);
    await recordFailedJob(CFG, FAILED);
    expect(spy).toHaveBeenCalledWith(FAILED.jobId, FAILED);
  });

  it("recordFailedJob calls handler when setupDlq called", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    await setupDlq(CFG, handler);
    const q = getQueue(JOB_QUEUES.FAILED, CFG);
    vi.spyOn(q, "add").mockResolvedValue(undefined as any);
    await recordFailedJob(CFG, FAILED);
    expect(handler).toHaveBeenCalledWith(FAILED);
  });
});

describe("dlq — getFailedJobs & cleanupFailedJob", () => {
  it("returns mapped jobs", async () => {
    const q = getQueue(JOB_QUEUES.FAILED, CFG);
    const spy = vi
      .spyOn(q, "getJobs")
      .mockResolvedValue([{ data: FAILED }, { data: { ...FAILED, jobId: "j2" } }] as any);
    const r = await getFailedJobs(CFG);
    expect(r).toHaveLength(2);
    expect(r[0]).toEqual(FAILED);
    expect(r[1].jobId).toBe("j2");
  });

  it("queries all job states", async () => {
    const q = getQueue(JOB_QUEUES.FAILED, CFG);
    const spy = vi.spyOn(q, "getJobs").mockResolvedValue([]);
    await getFailedJobs(CFG);
    expect(spy).toHaveBeenCalledWith(["waiting", "active", "completed", "failed"]);
  });

  it("returns empty when none exist", async () => {
    const q = getQueue(JOB_QUEUES.FAILED, CFG);
    vi.spyOn(q, "getJobs").mockResolvedValue([]);
    expect(await getFailedJobs(CFG)).toEqual([]);
  });

  it("cleanup removes job when found", async () => {
    const q = getQueue(JOB_QUEUES.FAILED, CFG);
    const rm = { remove: vi.fn().mockResolvedValue(undefined) };
    vi.spyOn(q, "getJob").mockResolvedValue(rm as any);
    await cleanupFailedJob(CFG, "job-001");
    expect(rm.remove).toHaveBeenCalled();
  });

  it("cleanup no-ops when job missing", async () => {
    const q = getQueue(JOB_QUEUES.FAILED, CFG);
    vi.spyOn(q, "getJob").mockResolvedValue(null);
    await cleanupFailedJob(CFG, "missing");
  });
});

describe("metrics — getJobStatus", () => {
  beforeEach(() => resetSpies());

  it("null when job not found", async () => {
    expect(await getJobStatus(CFG, "x")).toBeNull();
  });

  it("returns stage+progress for active job", async () => {
    const q = getQueue(JOB_QUEUES.VALIDATION, CFG);
    vi.spyOn(q, "getJob").mockResolvedValue({
      isCompleted: vi.fn().mockResolvedValue(false),
      isFailed: vi.fn().mockResolvedValue(false),
      progress: 42,
    } as any);
    expect(await getJobStatus(CFG, "x")).toEqual({ stage: "validating", progress: 42 });
  });

  it("skips completed jobs", async () => {
    resetSpies();
    const qv = getQueue(JOB_QUEUES.VALIDATION, CFG);
    const qs = getQueue(JOB_QUEUES.SPLITTING, CFG);
    vi.spyOn(qv, "getJob").mockResolvedValue({
      isCompleted: vi.fn().mockResolvedValue(true),
      isFailed: vi.fn().mockResolvedValue(false),
      progress: 100,
    } as any);
    vi.spyOn(qs, "getJob").mockResolvedValue({
      isCompleted: vi.fn().mockResolvedValue(false),
      isFailed: vi.fn().mockResolvedValue(false),
      progress: 50,
    } as any);
    expect(await getJobStatus(CFG, "x")).toEqual({ stage: "splitting", progress: 50 });
  });

  it("skips failed jobs", async () => {
    resetSpies();
    const qv = getQueue(JOB_QUEUES.VALIDATION, CFG);
    const qo = getQueue(JOB_QUEUES.OCR, CFG);
    vi.spyOn(qv, "getJob").mockResolvedValue({
      isCompleted: vi.fn().mockResolvedValue(false),
      isFailed: vi.fn().mockResolvedValue(true),
      progress: 0,
    } as any);
    vi.spyOn(qo, "getJob").mockResolvedValue({
      isCompleted: vi.fn().mockResolvedValue(false),
      isFailed: vi.fn().mockResolvedValue(false),
      progress: 75,
    } as any);
    expect(await getJobStatus(CFG, "x")).toEqual({ stage: "ocr", progress: 75 });
  });

  it("defaults to progress 0 when non-numeric", async () => {
    const q = getQueue(JOB_QUEUES.VALIDATION, CFG);
    vi.spyOn(q, "getJob").mockResolvedValue({
      isCompleted: vi.fn().mockResolvedValue(false),
      isFailed: vi.fn().mockResolvedValue(false),
      progress: "halfway",
    } as any);
    expect(await getJobStatus(CFG, "x")).toEqual({ stage: "validating", progress: 0 });
  });
});

describe("metrics — getQueueMetrics", () => {
  it("returns shaped counts", async () => {
    const q = getQueue(JOB_QUEUES.OCR, CFG);
    vi.spyOn(q, "getJobCounts").mockResolvedValue({
      waiting: 1,
      active: 2,
      completed: 3,
      failed: 4,
      delayed: 5,
    } as any);
    expect(await getQueueMetrics(CFG)).toEqual({
      waiting: 1,
      active: 2,
      completed: 3,
      failed: 4,
      delayed: 5,
    });
  });

  it("defaults missing to 0", async () => {
    const q = getQueue(JOB_QUEUES.OCR, CFG);
    vi.spyOn(q, "getJobCounts").mockResolvedValue({} as any);
    expect(await getQueueMetrics(CFG)).toEqual({
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    });
  });

  it("partial response", async () => {
    const q = getQueue(JOB_QUEUES.OCR, CFG);
    vi.spyOn(q, "getJobCounts").mockResolvedValue({ waiting: 3, completed: 50 } as any);
    const r = await getQueueMetrics(CFG);
    expect(r.waiting).toBe(3);
    expect(r.completed).toBe(50);
    expect(r.active).toBe(0);
  });
});

describe("metrics — getAllQueueMetrics", () => {
  beforeEach(() => {
    resetSpies();
  });

  it("includes all queues except FAILED", async () => {
    const r = await getAllQueueMetrics(CFG);
    const keys = Object.keys(r);
    expect(keys).not.toContain(JOB_QUEUES.FAILED);
    expect(keys).toContain(JOB_QUEUES.VALIDATION);
    expect(keys).toContain(JOB_QUEUES.SPLITTING);
    expect(keys).toContain(JOB_QUEUES.OCR);
    expect(keys).toContain(JOB_QUEUES.CLEANING);
    expect(keys).toContain(JOB_QUEUES.GENERATION);
    expect(keys).toContain(JOB_QUEUES.EXPORT);
  });

  it("each entry has correct shape", async () => {
    const r = await getAllQueueMetrics(CFG);
    for (const k of Object.keys(r)) {
      expect(r[k]).toMatchObject({ waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 });
    }
  });
});

describe("metrics — getStuckJobs", () => {
  beforeEach(() => resetSpies());

  it("empty when no active jobs", async () => {
    expect(await getStuckJobs(CFG)).toEqual([]);
  });

  it("finds jobs > 2x timeout", async () => {
    const q = getQueue(JOB_QUEUES.VALIDATION, CFG);
    vi.spyOn(q, "getJobs").mockResolvedValue([
      { id: "stuck", timestamp: Date.now() - 200_000, data: {} },
    ] as any);
    const r = await getStuckJobs(CFG);
    expect(r.length).toBeGreaterThanOrEqual(1);
    expect(r.some((s) => s.jobId === "stuck")).toBe(true);
  });

  it("does not report jobs within timeout", async () => {
    const q = getQueue(JOB_QUEUES.VALIDATION, CFG);
    vi.spyOn(q, "getJobs").mockResolvedValue([
      { id: "fresh", timestamp: Date.now() - 10_000, data: {} },
    ] as any);
    expect(await getStuckJobs(CFG)).toEqual([]);
  });

  it("handles job without timestamp", async () => {
    const q = getQueue(JOB_QUEUES.VALIDATION, CFG);
    vi.spyOn(q, "getJobs").mockResolvedValue([{ id: "no-ts", data: {} }] as any);
    expect(await getStuckJobs(CFG)).toEqual([]);
  });
});

describe("JOB_QUEUES constants", () => {
  it("VALIDATION", () => expect(JOB_QUEUES.VALIDATION).toBe("pipeline-validation"));
  it("SPLITTING", () => expect(JOB_QUEUES.SPLITTING).toBe("pipeline-splitting"));
  it("OCR", () => expect(JOB_QUEUES.OCR).toBe("pipeline-ocr"));
  it("CLEANING", () => expect(JOB_QUEUES.CLEANING).toBe("pipeline-cleaning"));
  it("GENERATION", () => expect(JOB_QUEUES.GENERATION).toBe("pipeline-generation"));
  it("EXPORT", () => expect(JOB_QUEUES.EXPORT).toBe("pipeline-export"));
  it("FAILED", () => expect(JOB_QUEUES.FAILED).toBe("pipeline-failed"));
  it("7 entries", () => expect(Object.keys(JOB_QUEUES)).toHaveLength(7));
});

describe("JOB_TIMEOUTS constants", () => {
  it("VALIDATION", () => expect(JOB_TIMEOUTS[JOB_QUEUES.VALIDATION]).toBe(60_000));
  it("SPLITTING", () => expect(JOB_TIMEOUTS[JOB_QUEUES.SPLITTING]).toBe(600_000));
  it("OCR", () => expect(JOB_TIMEOUTS[JOB_QUEUES.OCR]).toBe(7_200_000));
  it("CLEANING", () => expect(JOB_TIMEOUTS[JOB_QUEUES.CLEANING]).toBe(180_000));
  it("GENERATION", () => expect(JOB_TIMEOUTS[JOB_QUEUES.GENERATION]).toBe(600_000));
  it("EXPORT", () => expect(JOB_TIMEOUTS[JOB_QUEUES.EXPORT]).toBe(300_000));
});

describe("JOB_CONCURRENCY constants", () => {
  it("VALIDATION", () => expect(JOB_CONCURRENCY[JOB_QUEUES.VALIDATION]).toBe(5));
  it("SPLITTING", () => expect(JOB_CONCURRENCY[JOB_QUEUES.SPLITTING]).toBe(2));
  it("OCR", () => expect(JOB_CONCURRENCY[JOB_QUEUES.OCR]).toBe(3));
  it("CLEANING", () => expect(JOB_CONCURRENCY[JOB_QUEUES.CLEANING]).toBe(5));
  it("GENERATION", () => expect(JOB_CONCURRENCY[JOB_QUEUES.GENERATION]).toBe(3));
  it("EXPORT", () => expect(JOB_CONCURRENCY[JOB_QUEUES.EXPORT]).toBe(3));
});
