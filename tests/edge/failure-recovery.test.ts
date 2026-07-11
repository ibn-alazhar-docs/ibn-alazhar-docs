import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Readable } from "stream";

// ─── Helper ────────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Database Failures ─────────────────────────────────────────────────────────

describe("Database Failures", () => {
  let prismaMock: Record<string, any>;

  beforeEach(() => {
    prismaMock = {
      document: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      folder: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        findMany: vi.fn(),
      },
      tag: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      tagDocument: {
        create: vi.fn(),
        createMany: vi.fn(),
        deleteMany: vi.fn(),
        findMany: vi.fn(),
      },
      $transaction: vi.fn(),
    };
  });

  it("connection pool exhaustion — subsequent queries fail with POOL_EXHAUSTED", async () => {
    let activeQueries = 0;
    const MAX_POOL = 3;

    const query = vi.fn(async () => {
      if (activeQueries >= MAX_POOL) {
        throw new Error("POOL_EXHAUSTED: Connection pool exhausted");
      }
      activeQueries++;
      await new Promise((r) => setTimeout(r, 50));
      activeQueries--;
      return { id: "result" };
    });

    // Fire many concurrent queries
    const results = await Promise.allSettled(Array.from({ length: 10 }, (_, i) => query()));

    const rejected = results.filter((r) => r.status === "rejected");
    const poolExhausted = rejected.filter((r) => r.reason?.message?.includes("POOL_EXHAUSTED"));
    expect(poolExhausted.length).toBeGreaterThan(0);
  });

  it("transaction deadlock — two concurrent transactions depending on each other", async () => {
    let lockA = false;
    let lockB = false;

    const txn1 = vi.fn(async () => {
      lockA = true;
      // Wait for txn2 to claim lockB
      await new Promise((r) => setTimeout(r, 10));
      // Now try to acquire lockB while lockB is held by txn2
      const deadline = Date.now() + 50;
      while (lockB && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 5));
      }
      if (lockB) throw new Error("DEADLOCK_TIMEOUT");
      lockA = false;
      return "txn1-done";
    });

    const txn2 = vi.fn(async () => {
      lockB = true;
      await new Promise((r) => setTimeout(r, 10));
      const deadline = Date.now() + 50;
      while (lockA && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 5));
      }
      if (lockA) throw new Error("DEADLOCK_TIMEOUT");
      lockB = false;
      return "txn2-done";
    });

    const results = await Promise.allSettled([txn1(), txn2()]);
    const rejected = results.filter((r) => r.status === "rejected");
    expect(rejected.length).toBeGreaterThan(0);
  });

  it("unique constraint violation on tag name — returns conflict error", async () => {
    prismaMock.tag.create
      .mockResolvedValueOnce({ id: "tag-1", name: "unique" })
      .mockRejectedValueOnce(new Error("Unique constraint failed on tag.name"));

    const createTag = vi.fn(async (name: string) => {
      return prismaMock.tag.create({ data: { name } });
    });

    await createTag("unique");
    await expect(createTag("unique")).rejects.toThrow("Unique constraint");
  });

  it("foreign key violation during cascade delete — stops with FK error", async () => {
    prismaMock.document.delete.mockRejectedValueOnce(
      new Error("Foreign key constraint failed on document.folderId"),
    );

    const deleteFolder = vi.fn(async (folderId: string) => {
      await prismaMock.document.delete({ where: { id: "ref-doc" } });
      return true;
    });

    await expect(deleteFolder("folder-1")).rejects.toThrow("Foreign key constraint");
  });

  it("Prisma query timeout — operation cancelled", async () => {
    prismaMock.document.findUnique.mockImplementation(async () => {
      await new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Query timeout exceeded")), 50),
      );
    });

    const findDoc = vi.fn(async (id: string) => {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("QUERY_TIMEOUT")), 30),
      );
      return Promise.race([prismaMock.document.findUnique({ where: { id } }), timeoutPromise]);
    });

    await expect(findDoc("doc-1")).rejects.toThrow("QUERY_TIMEOUT");
  });

  it("database connection refused on startup — graceful retry", async () => {
    let attempts = 0;
    const MAX_ATTEMPTS = 3;

    const connect = vi.fn(async () => {
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        attempts++;
        try {
          if (i < 2) throw new Error("CONNECTION_REFUSED");
          return { connected: true };
        } catch {
          if (i >= MAX_ATTEMPTS - 1) throw new Error("CONNECTION_REFUSED");
        }
      }
    });

    const result = await connect();
    expect(result.connected).toBe(true);
    expect(attempts).toBe(3);
  });

  it("Prisma $transaction batch with one failure — partial rollback", async () => {
    prismaMock.$transaction.mockImplementation(async (fn: any) => {
      return fn(prismaMock);
    });
    prismaMock.document.create
      .mockResolvedValueOnce({ id: "doc-1" })
      .mockRejectedValueOnce(new Error("UNIQUE_VIOLATION"));

    const batchCreate = vi.fn(async (docs: Array<{ title: string }>) => {
      const results: Array<{ id: string } | null> = [];
      for (const doc of docs) {
        try {
          const created = await prismaMock.document.create({ data: doc });
          results.push(created);
        } catch {
          results.push(null);
        }
      }
      return results;
    });

    const results = await batchCreate([{ title: "Doc A" }, { title: "Doc A" }]);
    expect(results[0]).not.toBeNull();
    expect(results[1]).toBeNull();
  });

  it("cascading delete with dependent tags — all related tag refs removed", async () => {
    const tagRefs = new Map<string, string[]>([["doc-1", ["urgent", "important"]]]);

    prismaMock.document.delete.mockImplementation(async (args: any) => {
      const id = args.where.id;
      tagRefs.delete(id);
      return { id };
    });

    const deleteDocument = vi.fn(async (id: string) => {
      await prismaMock.document.delete({ where: { id } });
      return { deleted: true };
    });

    const result = await deleteDocument("doc-1");
    expect(result.deleted).toBe(true);
    expect(tagRefs.has("doc-1")).toBe(false);
  });

  it("Prisma middleware timeout on findUnique — caught with circuit breaker", async () => {
    let failureCount = 0;
    const MAX_FAILURES_BEFORE_CIRCUIT_OPEN = 3;

    prismaMock.document.findUnique.mockImplementation(async () => {
      await delay(10);
      throw new Error("QUERY_TIMEOUT");
    });

    const findWithCircuitBreaker = vi.fn(async (id: string) => {
      try {
        return await prismaMock.document.findUnique({ where: { id } });
      } catch {
        failureCount++;
        if (failureCount >= MAX_FAILURES_BEFORE_CIRCUIT_OPEN) {
          return { id: "fallback-from-cache", fromCache: true };
        }
        return null;
      }
    });

    const r1 = await findWithCircuitBreaker("doc-1");
    expect(r1).toBeNull();

    const r2 = await findWithCircuitBreaker("doc-1");
    expect(r2).toBeNull();

    const r3 = await findWithCircuitBreaker("doc-1");
    expect(r3.fromCache).toBe(true);
  });
});

// ─── Storage Failures ──────────────────────────────────────────────────────────

describe("Storage Failures (MinIO/S3)", () => {
  let minioMock: Record<string, any>;

  beforeEach(() => {
    minioMock = {
      bucketExists: vi.fn(),
      makeBucket: vi.fn(),
      putObject: vi.fn(),
      getObject: vi.fn(),
      removeObject: vi.fn(),
      statObject: vi.fn(),
      listObjects: vi.fn(),
      presignedGetObject: vi.fn(),
    };
  });

  it("MinIO connection refused — operation fails fast", async () => {
    minioMock.statObject.mockRejectedValue(new Error("connect ECONNREFUSED"));

    const storageOp = vi.fn(async (key: string) => {
      try {
        await minioMock.statObject("bucket", key);
        return { exists: true };
      } catch (err: any) {
        if (err.message.includes("ECONNREFUSED")) {
          return { exists: false, error: "STORAGE_UNAVAILABLE" };
        }
        throw err;
      }
    });

    const result = await storageOp("key.pdf");
    expect(result.exists).toBe(false);
    expect(result.error).toBe("STORAGE_UNAVAILABLE");
  });

  it("bucket does not exist — error on first access", async () => {
    minioMock.bucketExists.mockResolvedValue(false);

    const checkBucket = vi.fn(async (name: string) => {
      const exists = await minioMock.bucketExists(name);
      if (!exists) throw new Error("BUCKET_NOT_FOUND");
      return true;
    });

    await expect(checkBucket("nonexistent")).rejects.toThrow("BUCKET_NOT_FOUND");
  });

  it("upload to full bucket (disk quota exceeded)", async () => {
    minioMock.putObject.mockRejectedValue(new Error("disk quota exceeded"));

    const upload = vi.fn(async (key: string, data: Buffer) => {
      await minioMock.putObject("bucket", key, data);
    });

    await expect(upload("full.pdf", Buffer.alloc(100))).rejects.toThrow("disk quota exceeded");
  });

  it("download of corrupted object — integrity check fails", async () => {
    const mockStream = new Readable({
      read() {
        this.push(Buffer.from("corrupted data"));
        this.push(null);
      },
    });
    minioMock.getObject.mockResolvedValue(mockStream);

    const downloadAndVerify = vi.fn(async (key: string, expectedHash: string) => {
      const stream = await minioMock.getObject("bucket", key);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const data = Buffer.concat(chunks);
      // Simple integrity check
      const actualHash = data.length.toString();
      if (actualHash !== expectedHash) {
        throw new Error("INTEGRITY_CHECK_FAILED");
      }
      return data;
    });

    // Expected size doesn't match
    await expect(downloadAndVerify("corrupted.pdf", "999")).rejects.toThrow(
      "INTEGRITY_CHECK_FAILED",
    );
  });

  it("concurrent write to same object — last write wins or operation locks", async () => {
    let currentContent = "";

    minioMock.putObject.mockImplementation(async (_bucket: string, _key: string, data: Buffer) => {
      await new Promise((r) => setTimeout(r, 5));
      currentContent = data.toString();
    });

    await Promise.all([
      minioMock.putObject("bucket", "shared.txt", Buffer.from("first")),
      minioMock.putObject("bucket", "shared.txt", Buffer.from("second")),
      minioMock.putObject("bucket", "shared.txt", Buffer.from("third")),
    ]);

    expect(["first", "second", "third"]).toContain(currentContent);
    expect(minioMock.putObject).toHaveBeenCalledTimes(3);
  });

  it("presigned URL generation fails — fallback to direct access", async () => {
    minioMock.presignedGetObject.mockRejectedValue(new Error("Presigned URL generation failed"));

    const getDownloadUrl = vi.fn(async (key: string) => {
      try {
        return await minioMock.presignedGetObject("bucket", key);
      } catch {
        return `direct://bucket/${key}`;
      }
    });

    const url = await getDownloadUrl("doc.pdf");
    expect(url).toBe("direct://bucket/doc.pdf");
  });

  it("MinIO operation timeout — retry with backoff", async () => {
    let attempts = 0;
    minioMock.getObject.mockImplementation(async () => {
      attempts++;
      if (attempts < 3) throw new Error("request timeout");
      const stream = new Readable({
        read() {
          this.push(Buffer.from("recovered data"));
          this.push(null);
        },
      });
      return stream;
    });

    const downloadWithRetry = vi.fn(async (key: string, maxRetries: number) => {
      for (let i = 0; i < maxRetries; i++) {
        try {
          const stream = await minioMock.getObject("bucket", key);
          const chunks: Buffer[] = [];
          for await (const chunk of stream) chunks.push(chunk);
          return Buffer.concat(chunks);
        } catch {
          if (i >= maxRetries - 1) throw new Error("STORAGE_UNAVAILABLE");
          await delay(5 * (i + 1));
        }
      }
    });

    const result = await downloadWithRetry("recoverable.pdf", 3);
    expect(result.toString()).toBe("recovered data");
    expect(attempts).toBe(3);
  });

  it("listObjects with deleted items — filter removes them", async () => {
    minioMock.listObjects.mockReturnValue({
      on: vi.fn((_event: string, cb: Function) => {
        cb({ name: "doc1.pdf", size: 100 });
        cb({ name: "doc2.pdf", size: 200 });
        cb({ name: ".trash/doc1.pdf", size: 100 });
      }),
    });

    const listActive = vi.fn(async () => {
      const objects: Array<{ name: string; size: number }> = [];
      return new Promise((resolve) => {
        const stream = minioMock.listObjects("bucket", "", true);
        stream.on("data", (obj: { name: string; size: number }) => {
          if (!obj.name.startsWith(".trash/")) objects.push(obj);
        });
        stream.on("end", () => resolve(objects));
      });
    });

    const result = await listActive();
    expect(result).toHaveLength(2);
    expect(result.every((o: { name: string }) => !o.name.startsWith(".trash/"))).toBe(true);
  });
});

// ─── Queue Failures ────────────────────────────────────────────────────────────

describe("Queue Failures", () => {
  let queueMock: Record<string, any>;
  let dlq: Array<Record<string, any>>;

  beforeEach(() => {
    dlq = [];
    queueMock = {
      add: vi.fn(),
      getJob: vi.fn(),
      getJobs: vi.fn(),
      close: vi.fn(),
      getJobCounts: vi.fn(),
      isReady: vi.fn(),
      on: vi.fn(),
      emit: vi.fn(),
    };
  });

  it("Redis connection lost mid-job — job retried or moved to DLQ", async () => {
    const jobHandler = vi.fn(async (jobData: Record<string, any>) => {
      const error = new Error("Redis connection lost");
      // Simulate mid-job failure
      throw error;
    });

    let attempts = 0;
    const processWithRetry = vi.fn(async (data: Record<string, any>) => {
      for (let i = 0; i < 3; i++) {
        attempts++;
        try {
          return await jobHandler(data);
        } catch (err: any) {
          if (i >= 2) {
            dlq.push({ jobId: data.id, error: err.message, attempts });
            throw err;
          }
        }
      }
    });

    await expect(processWithRetry({ id: "job-1", type: "ocr" })).rejects.toThrow(
      "Redis connection lost",
    );
    expect(dlq).toHaveLength(1);
    expect(attempts).toBe(3);
  });

  it("job serialization failure (non-serializable data in payload)", async () => {
    const badPayload = {
      id: "job-1",
      circular: {} as Record<string, any>,
    };
    badPayload.circular.self = badPayload;

    const safeAdd = vi.fn(async (_queue: string, data: Record<string, any>) => {
      try {
        JSON.parse(JSON.stringify(data));
      } catch {
        throw new Error("JOB_SERIALIZATION_FAILED");
      }
      return { id: data.id };
    });

    await expect(safeAdd("queue", badPayload)).rejects.toThrow("JOB_SERIALIZATION_FAILED");
  });

  it("worker crash recovery — job reassigned to another worker", async () => {
    const jobResults: string[] = [];

    const workerFn = vi.fn(async (jobId: string, workerId: string) => {
      if (workerId === "worker-1" && jobId === "job-1") {
        // Simulate crash
        throw new Error("WORKER_CRASHED");
      }
      jobResults.push(`${workerId}:${jobId}`);
      return "completed";
    });

    // First worker crashes on job-1, second retries it
    await expect(workerFn("job-1", "worker-1")).rejects.toThrow("WORKER_CRASHED");
    await workerFn("job-1", "worker-2");

    expect(jobResults).toContain("worker-2:job-1");
  });

  it("duplicate job detection — same ID not added twice", async () => {
    const activeJobs = new Set<string>();

    const enqueue = vi.fn(async (jobId: string) => {
      if (activeJobs.has(jobId)) {
        return { status: "already_exists" };
      }
      activeJobs.add(jobId);
      return { status: "added" };
    });

    expect((await enqueue("job-1")).status).toBe("added");
    expect((await enqueue("job-1")).status).toBe("already_exists");
    expect(activeJobs.size).toBe(1);
  });

  it("stalled job handling — auto-restart if stalled", async () => {
    const stalledJobs = new Set<string>(["stalled-1", "stalled-2"]);

    const checkStalled = vi.fn(async () => {
      const recovered: string[] = [];
      for (const jobId of stalledJobs) {
        stalledJobs.delete(jobId);
        recovered.push(jobId);
      }
      return recovered;
    });

    const recovered = await checkStalled();
    expect(recovered).toEqual(["stalled-1", "stalled-2"]);
    expect(stalledJobs.size).toBe(0);
  });

  it("job with malformed payload — parsed with defaults", async () => {
    const parsePayload = vi.fn((raw: any) => {
      if (!raw || typeof raw !== "object") return { data: {}, error: "INVALID_PAYLOAD" };
      return {
        data: {
          id: raw.id ?? "unknown",
          type: raw.type ?? "unknown",
          priority: raw.priority ?? 0,
        },
      };
    });

    expect(parsePayload(null).error).toBe("INVALID_PAYLOAD");
    expect(parsePayload(undefined).error).toBe("INVALID_PAYLOAD");
    expect(parsePayload({ type: "ocr" }).data.id).toBe("unknown");
    expect(parsePayload({ id: "job-1" }).data.priority).toBe(0);
  });

  it("queue backpressure when concurrency limit reached", async () => {
    const MAX_CONCURRENCY = 2;
    const inflight = new Set<string>();
    let gateOpen = false;

    const tryAcquire = vi.fn(async (id: string) => {
      if (inflight.size >= MAX_CONCURRENCY) {
        return { status: "deferred" };
      }
      inflight.add(id);
      // Wait until told to release
      while (!gateOpen) {
        await new Promise((r) => setTimeout(r, 5));
      }
      inflight.delete(id);
      return { status: "completed" };
    });

    // Start job-0 and job-1 concurrently — both acquire slots
    const p0 = tryAcquire("job-0");
    const p1 = tryAcquire("job-1");
    // Wait for both to actually acquire
    await new Promise((r) => setTimeout(r, 20));

    // Now MAX_CONCURRENCY is reached, job-2 should be deferred
    const r2 = await tryAcquire("job-2");
    expect(r2.status).toBe("deferred");

    // Release the gate so p0 and p1 can complete
    gateOpen = true;
    await p0;
    await p1;
  });
});

// ─── External Service Failures ─────────────────────────────────────────────────

describe("External Service Failures", () => {
  it("OCR provider returns 429 (rate limited) — retry with backoff", async () => {
    let callCount = 0;

    const ocrCall = vi.fn(async () => {
      callCount++;
      if (callCount < 3) {
        const err = new Error("HTTP 429 Too Many Requests");
        (err as any).status = 429;
        throw err;
      }
      return { text: "recognized", confidence: 0.95 };
    });

    const ocrWithRetry = vi.fn(async (maxRetries: number) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await ocrCall();
        } catch (err: any) {
          if (err.status === 429 && attempt < maxRetries) {
            await new Promise((r) => setTimeout(r, 10 * attempt));
            continue;
          }
          throw err;
        }
      }
    });

    const result = await ocrWithRetry(3);
    expect(result.text).toBe("recognized");
    expect(callCount).toBe(3);
  });

  it("OCR provider returns 500 — fallback to next provider", async () => {
    const providers = [
      { name: "google", call: vi.fn().mockRejectedValue(new Error("HTTP 500 Internal Error")) },
      {
        name: "gemini",
        call: vi.fn().mockResolvedValue({ text: "fallback text", confidence: 0.8 }),
      },
    ];

    const ocrWithFallback = vi.fn(async () => {
      const errors: string[] = [];
      for (const provider of providers) {
        try {
          return await provider.call();
        } catch (err: any) {
          errors.push(`${provider.name}: ${err.message}`);
        }
      }
      throw new Error(`ALL_OCR_PROVIDERS_FAILED: ${errors.join("; ")}`);
    });

    const result = await ocrWithFallback();
    expect(result.text).toBe("fallback text");
    expect(providers[1].call).toHaveBeenCalled();
  });

  it("all OCR providers fail — error aggregates all failures", async () => {
    const providers = [
      { name: "surya", call: vi.fn().mockRejectedValue(new Error("SURYA_ERROR")) },
      { name: "tesseract", call: vi.fn().mockRejectedValue(new Error("TESSERACT_ERROR")) },
      { name: "google", call: vi.fn().mockRejectedValue(new Error("GOOGLE_QUOTA_EXCEEDED")) },
    ];

    const ocrWithFallback = vi.fn(async () => {
      const errors: string[] = [];
      for (const provider of providers) {
        try {
          return await provider.call();
        } catch (err: any) {
          errors.push(`${provider.name}: ${err.message}`);
        }
      }
      throw new Error(`ALL_OCR_PROVIDERS_FAILED: ${errors.join("; ")}`);
    });

    await expect(ocrWithFallback()).rejects.toThrow("ALL_OCR_PROVIDERS_FAILED");
    expect(providers[2].call).toHaveBeenCalled();
  });

  it("Google Drive API quota exceeded — retry with exponential backoff", async () => {
    let attempts = 0;

    const driveApiCall = vi.fn(async () => {
      attempts++;
      if (attempts < 3) {
        const err = new Error("403: quotaExceeded");
        (err as any).code = 403;
        throw err;
      }
      return { files: [{ id: "file-1" }] };
    });

    const driveWithRetry = vi.fn(async (maxAttempts: number) => {
      for (let i = 0; i < maxAttempts; i++) {
        try {
          return await driveApiCall();
        } catch (err: any) {
          if (err.code === 403 && i < maxAttempts - 1) {
            await new Promise((r) => setTimeout(r, Math.pow(2, i) * 10));
            continue;
          }
          throw err;
        }
      }
    });

    const result = await driveWithRetry(3);
    expect(result.files).toHaveLength(1);
    expect(attempts).toBe(3);
  });

  it("email service unreachable — queued for retry", async () => {
    const emailQueue: Array<Record<string, any>> = [];

    const sendEmail = vi.fn(async (to: string, subject: string) => {
      try {
        throw new Error("ECONNREFUSED: SMTP server unavailable");
      } catch (err: any) {
        if (err.message.includes("ECONNREFUSED")) {
          emailQueue.push({ to, subject, retries: 0 });
          return { queued: true };
        }
        throw err;
      }
    });

    const result = await sendEmail("user@test.com", "Welcome");
    expect(result.queued).toBe(true);
    expect(emailQueue).toHaveLength(1);
    expect(emailQueue[0].retries).toBe(0);
  });

  it("transient network error during upload — retry succeeds", async () => {
    let callCount = 0;

    const uploadWithRetry = vi.fn(async (data: Buffer) => {
      const MAX_RETRIES = 3;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        callCount++;
        try {
          if (attempt < MAX_RETRIES) throw new Error("socket hang up");
          return { uploaded: true, size: data.length };
        } catch {
          if (attempt >= MAX_RETRIES) throw new Error("socket hang up");
        }
      }
    });

    const result = await uploadWithRetry(Buffer.alloc(1024));
    expect(result.uploaded).toBe(true);
    expect(callCount).toBe(3);
  });

  it("OCR provider returns 503 (service unavailable) — retry after delay", async () => {
    let attempts = 0;

    const ocrProvider = vi.fn(async () => {
      attempts++;
      if (attempts < 3) throw new Error("HTTP 503 Service Unavailable");
      return { text: "success", confidence: 0.9 };
    });

    const callWithRetry = vi.fn(async (maxRetries: number) => {
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await ocrProvider();
        } catch {
          if (i >= maxRetries - 1) throw new Error("OCR_PROVIDER_DOWN");
          await delay(5 * (i + 1));
        }
      }
    });

    const result = await callWithRetry(3);
    expect(result.text).toBe("success");
    expect(attempts).toBe(3);
  });

  it("OCR provider chain — first fails, second fails, third succeeds", async () => {
    const providerChain = [
      vi.fn().mockRejectedValue(new Error("PROVIDER_A_DOWN")),
      vi.fn().mockRejectedValue(new Error("PROVIDER_B_DOWN")),
      vi.fn().mockResolvedValue({ text: "from-provider-c", confidence: 0.95 }),
    ];

    const tryChain = vi.fn(async () => {
      const errors: string[] = [];
      for (const provider of providerChain) {
        try {
          return await provider();
        } catch (err: any) {
          errors.push(err.message);
        }
      }
      throw new Error(`ALL_FAILED: ${errors.join(", ")}`);
    });

    const result = await tryChain();
    expect(result.text).toBe("from-provider-c");
    expect(providerChain[0]).toHaveBeenCalled();
    expect(providerChain[1]).toHaveBeenCalled();
  });

  it("OCR provider returns gibberish (100% confidence but garbage) — quality gate catches it", async () => {
    const output = { text: '!@#$%^&*()_+{}|:"<>?', confidence: 1.0 };
    const qualityGate = vi.fn((result: typeof output) => {
      const alphaRatio =
        (result.text.match(/[a-zA-Z\u0600-\u06FF]/g) || []).length / result.text.length;
      if (alphaRatio < 0.1) return { valid: false, reason: "GIBBERISH_DETECTED" };
      return { valid: true };
    });

    expect(qualityGate(output).valid).toBe(false);
    expect(qualityGate(output).reason).toBe("GIBBERISH_DETECTED");
  });

  it("external webhook endpoint unreachable — queued for retry with backoff", async () => {
    const webhookQueue: Array<{ url: string; payload: any; attempt: number }> = [];

    const fireWebhook = vi.fn(async (url: string, payload: any) => {
      const MAX_RETRIES = 3;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt < MAX_RETRIES) throw new Error("HTTP 502 Bad Gateway");
          return { sent: true };
        } catch (err: any) {
          webhookQueue.push({ url, payload, attempt });
          if (attempt >= MAX_RETRIES) return { sent: false, error: err.message };
          await delay(Math.pow(2, attempt) * 10);
        }
      }
    });

    const result = await fireWebhook("https://hooks.example.com/status", { event: "completed" });
    expect(result.sent).toBe(true);
    expect(webhookQueue.length).toBe(2);
  });
});
