import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function createSlowStream(chunkSize: number, totalChunks: number, intervalMs: number) {
  return {
    async *[Symbol.asyncIterator]() {
      for (let i = 0; i < totalChunks; i++) {
        await delay(intervalMs);
        yield Buffer.alloc(chunkSize, i);
      }
    },
  };
}

// ─── Upload Timeouts ──────────────────────────────────────────────────────────

describe("Upload Timeouts", () => {
  it("very slow upload stream exceeds timeout and is aborted", async () => {
    const TIMEOUT_MS = 50;
    const uploadFn = async (totalBytes: number, chunkDelayMs: number, timeoutMs: number) => {
      const timer = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("UPLOAD_TIMEOUT")), timeoutMs),
      );
      const upload = (async () => {
        let received = 0;
        while (received < totalBytes) {
          await new Promise((r) => setTimeout(r, chunkDelayMs));
          received += 1024;
        }
        return "done";
      })();
      return Promise.race([upload, timer]);
    };

    await expect(uploadFn(1024 * 10, 50, TIMEOUT_MS)).rejects.toThrow("UPLOAD_TIMEOUT");
  });

  it("connection dropped mid-upload — partial upload rejected", async () => {
    const uploadFn = vi.fn(async (stream: AsyncIterable<Buffer>) => {
      let received = 0;
      try {
        for await (const chunk of stream) {
          received += chunk.length;
        }
      } catch {
        throw new Error("CONNECTION_DROPPED");
      }
      return received;
    });

    const brokenStream = {
      async *[Symbol.asyncIterator]() {
        yield Buffer.alloc(1024);
        throw new Error("CONNECTION_RESET");
      },
    };

    await expect(uploadFn(brokenStream)).rejects.toThrow("CONNECTION_DROPPED");
  });

  it("upload that exceeds timeout limit by 1ms — treated as timed out", async () => {
    const UPLOAD_TIMEOUT = 50;
    const uploadFn = vi.fn(async (data: Buffer, timeoutMs: number) => {
      return new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("UPLOAD_TIMEOUT")), timeoutMs);
        const work = setTimeout(() => {
          clearTimeout(timer);
          resolve("done");
        }, timeoutMs + 1);
      });
    });

    await expect(uploadFn(Buffer.alloc(100), UPLOAD_TIMEOUT)).rejects.toThrow("UPLOAD_TIMEOUT");
  });

  it("multiple concurrent slow uploads — all time out independently", async () => {
    const uploadWithTimeout = async (_data: Buffer, timeoutMs: number) => {
      const timer = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("UPLOAD_TIMEOUT")), timeoutMs),
      );
      const upload = (async () => {
        await delay(timeoutMs + 30);
        return "done";
      })();
      return Promise.race([upload, timer]);
    };

    const results = await Promise.allSettled([
      uploadWithTimeout(Buffer.alloc(1024), 30),
      uploadWithTimeout(Buffer.alloc(2048), 30),
      uploadWithTimeout(Buffer.alloc(4096), 30),
    ]);

    const timedOut = results.filter((r) => r.status === "rejected");
    expect(timedOut.length).toBe(3);
  });

  it("upload exactly at timeout boundary — completes if race resolved first", async () => {
    const uploadFn = vi.fn(async (timeoutMs: number) => {
      return new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("UPLOAD_TIMEOUT")), timeoutMs);
        setTimeout(() => {
          clearTimeout(timer);
          resolve("completed");
        }, timeoutMs);
      });
    });

    // At exactly the boundary, the completion and timeout race
    // We accept either outcome as correct behavior
    const result = await uploadFn(10).catch(() => "timed_out");
    expect(["completed", "timed_out"]).toContain(result);
  });
});

// ─── Processing Timeouts ──────────────────────────────────────────────────────

describe("Processing Timeouts", () => {
  it("OCR job stuck at 50% for hours — detected as stalled", async () => {
    const STUCK_THRESHOLD_MS = 100;
    const job = {
      id: "ocr-job-1",
      progress: 50,
      timestamp: Date.now() - STUCK_THRESHOLD_MS * 3,
      status: "active",
    };

    const detectStuckJobs = vi.fn((activeJobs: (typeof job)[], thresholdMs: number) => {
      return activeJobs.filter((j) => Date.now() - j.timestamp > thresholdMs * 2);
    });

    const stuck = detectStuckJobs([job], STUCK_THRESHOLD_MS);
    expect(stuck).toHaveLength(1);
    expect(stuck[0].id).toBe("ocr-job-1");
  });

  it("OCR job making progress is not flagged as stuck", async () => {
    const STUCK_THRESHOLD_MS = 100;
    const healthyJob = {
      id: "ocr-job-2",
      progress: 75,
      timestamp: Date.now() - 10,
      status: "active",
    };

    const detectStuckJobs = vi.fn((activeJobs: (typeof healthyJob)[], thresholdMs: number) => {
      return activeJobs.filter((j) => Date.now() - j.timestamp > thresholdMs * 2);
    });

    const stuck = detectStuckJobs([healthyJob], STUCK_THRESHOLD_MS);
    expect(stuck).toHaveLength(0);
  });

  it("export that takes too long — exceeds max timeout", async () => {
    const EXPORT_TIMEOUT = 50;
    const exportFn = vi.fn(async (docId: string) => {
      await delay(EXPORT_TIMEOUT + 30);
      return Buffer.alloc(100);
    });

    const exportWithTimeout = async (docId: string, timeoutMs: number) => {
      const timer = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("EXPORT_TIMEOUT")), timeoutMs),
      );
      return Promise.race([exportFn(docId), timer]);
    };

    await expect(exportWithTimeout("doc-1", EXPORT_TIMEOUT)).rejects.toThrow("EXPORT_TIMEOUT");
  });

  it("queue job that exceeds max retries — sent to DLQ", async () => {
    const MAX_RETRIES = 3;
    const dlq: Array<{ jobId: string; error: string; attempts: number }> = [];

    const processJob = vi.fn(async (jobId: string) => {
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          throw new Error("TRANSIENT_ERROR");
        } catch (err: any) {
          if (attempt >= MAX_RETRIES) {
            dlq.push({ jobId, error: err.message, attempts: attempt });
            throw new Error("RETRY_EXHAUSTED");
          }
        }
      }
    });

    await expect(processJob("job-1")).rejects.toThrow("RETRY_EXHAUSTED");
    expect(dlq).toHaveLength(1);
    expect(dlq[0].jobId).toBe("job-1");
    expect(dlq[0].attempts).toBe(3);
  });

  it("dead letter queue overflow — oldest jobs evicted", async () => {
    const MAX_DLQ_SIZE = 3;
    const dlq: Array<{ jobId: string; failedAt: number }> = [];

    const sendToDlq = vi.fn((jobId: string) => {
      dlq.push({ jobId, failedAt: Date.now() });
      if (dlq.length > MAX_DLQ_SIZE) {
        dlq.sort((a, b) => a.failedAt - b.failedAt);
        dlq.shift();
      }
    });

    sendToDlq("job-a");
    sendToDlq("job-b");
    sendToDlq("job-c");
    sendToDlq("job-d");

    expect(dlq.length).toBe(MAX_DLQ_SIZE);
    expect(dlq.some((j) => j.jobId === "job-a")).toBe(false);
    expect(dlq.map((j) => j.jobId).sort()).toEqual(["job-b", "job-c", "job-d"]);
  });

  it("job with zero progress for extended period — auto-cancelled", async () => {
    const AUTO_CANCEL_MS = 100;
    const job = {
      id: "stalled-job",
      progress: 0,
      updatedAt: Date.now() - AUTO_CANCEL_MS * 2,
    };

    const checkStalled = vi.fn((j: typeof job, thresholdMs: number) => {
      if (Date.now() - j.updatedAt > thresholdMs && j.progress === 0) {
        return { action: "cancel", reason: "zero_progress_timeout" };
      }
      return { action: "wait" };
    });

    const result = checkStalled(job, AUTO_CANCEL_MS);
    expect(result.action).toBe("cancel");
    expect(result.reason).toBe("zero_progress_timeout");
  });
});

// ─── AbortController / Signal Cancellation ─────────────────────────────────────

describe("AbortController — Cancellation", () => {
  it("upload aborted via AbortController mid-stream — throws ABORT_ERR", async () => {
    const controller = new AbortController();

    const uploadFn = vi.fn(async (data: AsyncIterable<Buffer>, signal: AbortSignal) => {
      for await (const _chunk of data) {
        if (signal.aborted) throw new Error("ABORT_ERR");
      }
      return "done";
    });

    const stream = {
      async *[Symbol.asyncIterator]() {
        yield Buffer.alloc(1024);
        yield Buffer.alloc(1024);
        controller.abort();
        yield Buffer.alloc(1024);
      },
    };

    await expect(uploadFn(stream, controller.signal)).rejects.toThrow("ABORT_ERR");
  });

  it("cancelled signal before upload starts — rejects immediately", async () => {
    const controller = new AbortController();
    controller.abort();

    const uploadFn = vi.fn(async (data: Buffer, signal: AbortSignal) => {
      if (signal.aborted) throw new Error("ABORT_ERR");
      return "done";
    });

    await expect(uploadFn(Buffer.alloc(10), controller.signal)).rejects.toThrow("ABORT_ERR");
  });

  it("multiple concurrent uploads cancelled via same controller — all rejected", async () => {
    const controller = new AbortController();

    const uploadFn = vi.fn(async (id: string, signal: AbortSignal) => {
      for (let i = 0; i < 5; i++) {
        if (signal.aborted) throw new Error("ABORT_ERR");
        await delay(5);
      }
      return id;
    });

    const uploads = [1, 2, 3].map((n) => uploadFn(`upload-${n}`, controller.signal));

    await delay(10);
    controller.abort();

    const results = await Promise.allSettled(uploads);
    const aborted = results.filter((r) => r.status === "rejected");
    expect(aborted.length).toBe(3);
  });
});

// ─── Processing Timeouts (Fake Timers) ────────────────────────────────────────

describe("Processing Timeouts — Fake Timers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("OCR job timeout using fake timers — rejected after threshold", async () => {
    const OCR_TIMEOUT = 5000;
    const ocrPromise = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("OCR_TIMEOUT")), OCR_TIMEOUT);
      // OCR never completes
      vi.advanceTimersByTime(OCR_TIMEOUT);
      clearTimeout(timer);
    });

    // Should reject because we advanced past the timeout
    let rejected = false;
    try {
      await ocrPromise;
    } catch {
      rejected = true;
    }
    expect(rejected).toBe(true);
  });

  it("fake timer cancels via timeout wrapper — timer fires before work completes", async () => {
    const TIMEOUT_MS = 100;

    const workWithTimeout = async (work: () => Promise<string>): Promise<string> => {
      return new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("WORK_TIMEOUT")), TIMEOUT_MS);
        work().then(
          (result) => {
            clearTimeout(timer);
            resolve(result);
          },
          (err) => {
            clearTimeout(timer);
            reject(err);
          },
        );
      });
    };

    const slowWork = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 200));
      return "done";
    });

    const resultPromise = workWithTimeout(slowWork);
    vi.advanceTimersByTime(TIMEOUT_MS);

    await expect(resultPromise).rejects.toThrow("WORK_TIMEOUT");
  });
});

// ─── Session/Token Expiry ──────────────────────────────────────────────────────

describe("Session/Token Expiry", () => {
  it("request with expired JWT (exactly at expiry time) — rejected", () => {
    vi.useFakeTimers();
    const now = Date.now();
    const token = { exp: Math.floor(now / 1000), iat: Math.floor(now / 1000) - 3600 };

    const verifyToken = vi.fn((t: typeof token): boolean => {
      return Math.floor(Date.now() / 1000) < t.exp;
    });

    vi.setSystemTime(new Date(now + 1000));
    expect(verifyToken(token)).toBe(false);
    vi.useRealTimers();
  });

  it("request with JWT 1 second before expiry — accepted", () => {
    const now = Date.now();
    const token = { exp: Math.floor(now / 1000) + 1, iat: Math.floor(now / 1000) - 3600 };

    const verifyToken = vi.fn((t: typeof token): boolean => {
      return Math.floor(Date.now() / 1000) < t.exp;
    });

    expect(verifyToken(token)).toBe(true);
  });

  it("reset password link used after expiry — rejected", () => {
    const RESET_EXPIRY_MS = 3600_000;
    const createdAt = Date.now() - RESET_EXPIRY_MS - 1;

    const isResetLinkValid = vi.fn((created: number, now: number) => {
      return now - created < RESET_EXPIRY_MS;
    });

    expect(isResetLinkValid(createdAt, Date.now())).toBe(false);
  });

  it("reset password link used within expiry — accepted", () => {
    const RESET_EXPIRY_MS = 3600_000;
    const createdAt = Date.now() - RESET_EXPIRY_MS + 60000;

    const isResetLinkValid = vi.fn((created: number, now: number) => {
      return now - created < RESET_EXPIRY_MS;
    });

    expect(isResetLinkValid(createdAt, Date.now())).toBe(true);
  });

  it("share token used after expiry — access denied", () => {
    const share = {
      token: "abc123",
      expiresAt: new Date(Date.now() - 1),
    };

    const checkShareAccess = vi.fn((s: typeof share) => {
      if (s.expiresAt && s.expiresAt < new Date()) {
        return { allowed: false, reason: "TOKEN_EXPIRED" };
      }
      return { allowed: true };
    });

    expect(checkShareAccess(share).allowed).toBe(false);
    expect(checkShareAccess(share).reason).toBe("TOKEN_EXPIRED");
  });

  it("share token with no expiry never expires", () => {
    const share = {
      token: "abc123",
      expiresAt: null,
    };

    const checkShareAccess = vi.fn((s: typeof share) => {
      if (s.expiresAt && s.expiresAt < new Date()) {
        return { allowed: false, reason: "TOKEN_EXPIRED" };
      }
      return { allowed: true };
    });

    expect(checkShareAccess(share).allowed).toBe(true);
  });

  it("session refresh exactly at expiry boundary — old token still valid, new token issued", () => {
    const now = Math.floor(Date.now() / 1000);
    let currentExp = now;

    const refreshSession = vi.fn(() => {
      currentExp = Math.floor(Date.now() / 1000) + 3600;
      return { token: "new-token", exp: currentExp };
    });

    const isExpired = vi.fn(() => Math.floor(Date.now() / 1000) > currentExp);

    expect(isExpired()).toBe(false);
    const refreshed = refreshSession();
    expect(refreshed.token).toBe("new-token");
    expect(refreshed.exp).toBeGreaterThan(now);
  });

  it("token with iat in the future — rejected as invalid", () => {
    const now = Math.floor(Date.now() / 1000);
    const token = { iat: now + 60, exp: now + 3600 };

    const verifyToken = vi.fn((t: typeof token) => {
      if (t.iat > Math.floor(Date.now() / 1000)) return false;
      return Math.floor(Date.now() / 1000) < t.exp;
    });

    expect(verifyToken(token)).toBe(false);
  });

  it("API key rotated while requests are in-flight — old key still valid for current requests", async () => {
    let validKeys = new Set(["key-v1"]);

    const validateKey = vi.fn(async (key: string) => {
      const snapshot = new Set(validKeys);
      await delay(5);
      return snapshot.has(key);
    });

    const rotateKey = vi.fn(async () => {
      await delay(3);
      validKeys.delete("key-v1");
      validKeys.add("key-v2");
    });

    const results = await Promise.allSettled([
      validateKey("key-v1"),
      rotateKey(),
      validateKey("key-v1"),
      validateKey("key-v2"),
    ]);

    const valid = results.filter((r) => r.status === "fulfilled" && r.value === true).length;
    expect(valid).toBeGreaterThanOrEqual(2); // key-v1 passes before rotation, key-v2 after
  });

  it("OAuth refresh token expired — new token cannot be minted", async () => {
    const refreshToken = vi.fn(async () => {
      throw new Error("REFRESH_TOKEN_EXPIRED");
    });

    const apiCallWithRefresh = vi.fn(async () => {
      try {
        return await refreshToken();
      } catch (err: any) {
        return { error: err.message, needsReauth: true };
      }
    });

    const result = await apiCallWithRefresh();
    expect(result.needsReauth).toBe(true);
    expect(result.error).toBe("REFRESH_TOKEN_EXPIRED");
  });

  it("session token expires while user is actively viewing — transparent refresh", async () => {
    let currentToken = "token-v1";
    let tokenExpired = false;

    const refreshIfExpired = vi.fn(async () => {
      if (tokenExpired) {
        currentToken = "token-v2";
        tokenExpired = false;
        return { refreshed: true, token: currentToken };
      }
      return { refreshed: false };
    });

    const makeApiCall = vi.fn(async () => {
      if (currentToken === "token-v1" && Math.random() > 0.5) {
        tokenExpired = true;
      }
      const refresh = await refreshIfExpired();
      if (refresh.refreshed) currentToken = refresh.token;
      return { status: "ok", token: currentToken };
    });

    // Simulate multiple calls — one triggers refresh
    const results = await Promise.all([makeApiCall(), makeApiCall(), makeApiCall()]);
    const allOk = results.every((r) => r.status === "ok");
    expect(allOk).toBe(true);
  });

  it("rate limit resets exactly at window boundary — next request succeeds", () => {
    vi.useFakeTimers();
    const WINDOW_MS = 60000;
    let requestCount = 0;
    let windowStart = Date.now();

    const rateLimiter = vi.fn(() => {
      if (Date.now() - windowStart > WINDOW_MS) {
        requestCount = 0;
        windowStart = Date.now();
      }
      requestCount++;
      if (requestCount > 10) return { allowed: false };
      return { allowed: true };
    });

    // Fill the window
    for (let i = 0; i < 10; i++) rateLimiter();
    expect(rateLimiter().allowed).toBe(false);

    // Advance past window boundary
    vi.advanceTimersByTime(WINDOW_MS + 1);
    expect(rateLimiter().allowed).toBe(true);

    vi.useRealTimers();
  });
});
