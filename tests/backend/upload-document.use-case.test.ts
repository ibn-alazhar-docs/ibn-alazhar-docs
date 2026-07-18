import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the pipeline package so we control enqueue + config without Redis.
vi.mock("@ibn-al-azhar-docs/pipeline", () => ({
  JOB_QUEUES: { VALIDATION: "pipeline-validation" },
  loadConfig: vi.fn(() => ({
    redis: { host: "localhost", port: 6379, password: undefined },
    storage: { driver: "local", localDir: "/data" },
  })),
  enqueueValidation: vi.fn(async () => ({ id: "doc-1" })),
  classifyError: vi.fn((err: unknown) => {
    const e = err instanceof Error ? err : new Error(String(err));
    return { code: e.message.includes("Redis") ? "REDIS_ERROR" : "UNKNOWN_ERROR" };
  }),
  recordJobFailure: vi.fn(async () => undefined),
}));

// Avoid real backoff sleeps in tests — run the operation exactly once.
vi.mock("@ibn-al-azhar-docs/shared", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    RetryExecutor: {
      retryWithBackoff: async (fn: () => Promise<unknown>) => fn(),
    },
  };
});

import { UploadDocumentUseCase } from "@/core/services/upload-document.use-case";
import type { IDocumentRepository } from "@/domain/repositories/document.repository.interface";
import type { IFolderRepository } from "@/domain/repositories/folder.repository.interface";
import type { IStorageRepository } from "@/domain/repositories/storage.repository.interface";
import { AppError } from "@/shared/errors";
import { ERROR_CODES } from "@/shared/constants";

function makeFile(size = 740050): File {
  const f = new File([new Uint8Array(Math.min(size, 16))], "lecture.pdf", {
    type: "application/pdf",
  });
  Object.defineProperty(f, "size", { value: size });
  return f;
}

function makeRepos(
  overrides: {
    createDocument?: (data: unknown) => Promise<unknown>;
    update?: (...args: unknown[]) => Promise<unknown>;
    findFolderById?: (...args: unknown[]) => Promise<unknown>;
    ensureBucket?: () => Promise<void>;
    uploadFile?: (...args: unknown[]) => Promise<void>;
    deleteFile?: (...args: unknown[]) => Promise<void>;
    uploadKey?: (...args: unknown[]) => string;
  } = {},
) {
  const documentRepository = {
    createDocument: overrides.createDocument ?? vi.fn(async (d: unknown) => d),
    update: overrides.update ?? vi.fn(async () => undefined),
  } as unknown as IDocumentRepository;
  const folderRepository = {
    findFolderById: overrides.findFolderById ?? vi.fn(async () => null),
  } as unknown as IFolderRepository;
  const storage = {
    ensureBucket: overrides.ensureBucket ?? vi.fn(async () => undefined),
    uploadFile: overrides.uploadFile ?? vi.fn(async () => undefined),
    deleteFile: overrides.deleteFile ?? vi.fn(async () => undefined),
    uploadKey: overrides.uploadKey ?? vi.fn((...a: unknown[]) => `docs/${String(a[1])}.pdf`),
  } as unknown as IStorageRepository;
  return { documentRepository, folderRepository, storage };
}

function makeUseCase(repos: ReturnType<typeof makeRepos>) {
  return new UploadDocumentUseCase(repos.documentRepository, repos.folderRepository, repos.storage);
}

describe("UploadDocumentUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads, persists and enqueues on success (201 path)", async () => {
    const repos = makeRepos();
    const uc = makeUseCase(repos);
    const { enqueueValidation } = await import("@ibn-al-azhar-docs/pipeline");

    const doc = await uc.execute({
      file: makeFile(),
      folderId: null,
      userId: "user-1",
      pageRange: null,
    });

    expect((repos.documentRepository as any).createDocument).toHaveBeenCalledTimes(1);
    expect((repos.storage as any).uploadFile).toHaveBeenCalledTimes(1);
    expect(enqueueValidation).toHaveBeenCalledTimes(1);
    // job id === document id so a manual retry cannot double-enqueue.
    const enqueued = (enqueueValidation as any).mock.calls[0][1];
    expect(enqueued.id).toBe(doc.id);
    expect(doc.status).toBe("UPLOADED");
  });

  it("does not create a DB row or enqueue when storage write fails", async () => {
    const repos = makeRepos({
      uploadFile: vi.fn(async () => {
        throw new Error("S3 503");
      }),
    });
    const uc = makeUseCase(repos);
    const { enqueueValidation } = await import("@ibn-al-azhar-docs/pipeline");

    await expect(
      uc.execute({ file: makeFile(), folderId: null, userId: "user-1", pageRange: null }),
    ).rejects.toBeInstanceOf(AppError);

    expect((repos.documentRepository as any).createDocument).not.toHaveBeenCalled();
    expect(enqueueValidation).not.toHaveBeenCalled();
    // the staged temp file is cleaned up regardless of failure.
    expect((repos.storage as any).deleteFile).not.toHaveBeenCalled();
  });

  it("keeps the file but marks the doc FAILED when enqueue fails after storage", async () => {
    const repos = makeRepos();
    const uc = makeUseCase(repos);
    const pipeline = await import("@ibn-al-azhar-docs/pipeline");
    (pipeline.enqueueValidation as any)
      .mockRejectedValueOnce(new Error("Redis connection failed: ECONNREFUSED"))
      .mockRejectedValueOnce(new Error("Redis connection failed: ECONNREFUSED")); // delayed retry also fails

    await expect(
      uc.execute({ file: makeFile(), folderId: null, userId: "user-1", pageRange: null }),
    ).rejects.toMatchObject({
      code: ERROR_CODES.UPLOAD_ENQUEUE_FAILED,
    });

    // File retained (no deleteFile), DB row exists, status set to FAILED.
    expect((repos.storage as any).deleteFile).not.toHaveBeenCalled();
    expect((repos.documentRepository as any).createDocument).toHaveBeenCalledTimes(1);
    const updateCall = (repos.documentRepository as any).update;
    expect(updateCall).toHaveBeenCalledTimes(1);
    expect(updateCall.mock.calls[0][2]).toMatchObject({ status: "FAILED" });
    expect(pipeline.recordJobFailure).toHaveBeenCalledTimes(1);
    expect((pipeline.enqueueValidation as any).mock.calls.length).toBe(2);
  });

  it("requeues with a delay and sets PENDING when immediate enqueue fails", async () => {
    const repos = makeRepos();
    const uc = makeUseCase(repos);
    const pipeline = await import("@ibn-al-azhar-docs/pipeline");
    (pipeline.enqueueValidation as any)
      .mockRejectedValueOnce(new Error("Redis connection failed: ECONNREFUSED"))
      .mockResolvedValueOnce({ id: "doc-1" }); // delayed retry succeeds

    const doc = await uc.execute({
      file: makeFile(),
      folderId: null,
      userId: "user-1",
      pageRange: null,
    });

    expect((pipeline.enqueueValidation as any).mock.calls.length).toBe(2);
    const delayedOpts = (pipeline.enqueueValidation as any).mock.calls[1][2];
    expect(delayedOpts).toMatchObject({ delay: 15_000 });
    // The delayed job is queued, so we must NOT mark the doc FAILED, and we keep
    // it in the canonical UPLOADED (awaiting worker pickup) state — no status
    // mutation, no duplicate job.
    expect((repos.documentRepository as any).update).not.toHaveBeenCalled();
    expect(doc.status).toBe("UPLOADED");
  });

  it("does not create a duplicate job on a single execute call", async () => {
    const repos = makeRepos();
    const uc = makeUseCase(repos);
    const { enqueueValidation } = await import("@ibn-al-azhar-docs/pipeline");

    await uc.execute({ file: makeFile(), folderId: null, userId: "user-1", pageRange: null });

    // Exactly one enqueue per upload — the reprocess endpoint reuses the same
    // document id, so BullMQ deduplicates rather than creating a second job.
    expect(enqueueValidation).toHaveBeenCalledTimes(1);
  });
});
