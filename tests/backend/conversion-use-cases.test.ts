import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/core/authorization", () => ({
  ownedWhere: vi.fn((base: Record<string, unknown>) => base),
}));

vi.mock("@ibn-al-azhar-docs/pipeline", () => ({
  loadConfig: vi.fn(() => ({ queue: { splitting: "splitting" } })),
  enqueueSplitting: vi.fn(async () => ({ id: "job-1" })),
}));

import { ConversionUseCases } from "@/core/services/conversion.use-cases";
import type { IDocumentRepository } from "@/domain/repositories/document.repository.interface";
import type { IConversionJobRepository } from "@/domain/repositories/conversion-job.repository.interface";
import type { AuthSession } from "@/domain/types";
import { NotFoundError } from "@/shared/errors";

function makeSession(role: string): AuthSession {
  return {
    user: { id: "user-1", role, name: "Test", email: "t@t.com" },
  } as unknown as AuthSession;
}

const sampleDoc = {
  id: "doc-1",
  fileName: "lecture.pdf",
  fileSize: 1024,
  mimeType: "application/pdf",
  storageKey: "docs/doc-1.pdf",
};

function makeRepos(doc: unknown, jobs: unknown[] = []) {
  const documentRepository = {
    findFirst: vi.fn(async () => doc),
  } as unknown as IDocumentRepository;
  const conversionJobRepository = {
    create: vi.fn(async (data: unknown) => data),
    findMany: vi.fn(async () => jobs),
    count: vi.fn(async () => jobs.length),
  } as unknown as IConversionJobRepository;
  return { documentRepository, conversionJobRepository };
}

describe("ConversionUseCases.startConversion", () => {
  let useCases: ConversionUseCases;
  let documentRepository: IDocumentRepository;
  let conversionJobRepository: IConversionJobRepository;

  beforeEach(() => {
    const repos = makeRepos(sampleDoc);
    documentRepository = repos.documentRepository;
    conversionJobRepository = repos.conversionJobRepository;
    useCases = new ConversionUseCases(documentRepository, conversionJobRepository);
  });

  it("persists a ConversionJob row before enqueuing", async () => {
    const { enqueueSplitting } = await import("@ibn-al-azhar-docs/pipeline");
    const result = await useCases.startConversion("doc-1", makeSession("STUDENT"));

    expect(result.jobId).toBe("doc-1");
    expect(conversionJobRepository.create).toHaveBeenCalledTimes(1);
    const created = (conversionJobRepository.create as unknown as vi.Mock).mock.calls[0]![0];
    expect(created.documentId).toBe("doc-1");
    expect(created.userId).toBe("user-1");
    expect(created.status).toBe("PROCESSING");
    expect(created.inputKey).toBe("docs/doc-1.pdf");
    expect(enqueueSplitting).toHaveBeenCalledTimes(1);
  });

  it("throws NotFoundError when the document does not exist", async () => {
    const repos = makeRepos(null);
    const uc = new ConversionUseCases(repos.documentRepository, repos.conversionJobRepository);
    await expect(uc.startConversion("missing", makeSession("STUDENT"))).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(
      (repos.conversionJobRepository as unknown as IConversionJobRepository).create,
    ).not.toHaveBeenCalled();
  });
});

describe("ConversionUseCases.listJobs", () => {
  it("scopes results to the requesting user for non-admins", async () => {
    const repos = makeRepos(sampleDoc, [{ id: "job-1", userId: "user-1" }]);
    const uc = new ConversionUseCases(repos.documentRepository, repos.conversionJobRepository);
    await uc.listJobs(makeSession("STUDENT"), { page: 1, limit: 10 });

    const where = (repos.conversionJobRepository as unknown as IConversionJobRepository).findMany!
      .mock.calls[0]![0].where as Record<string, unknown>;
    expect(where.userId).toBe("user-1");
  });

  it("does not scope by user for admins", async () => {
    const repos = makeRepos(sampleDoc, [{ id: "job-1", userId: "user-1" }]);
    const uc = new ConversionUseCases(repos.documentRepository, repos.conversionJobRepository);
    await uc.listJobs(makeSession("ADMIN"), { page: 1, limit: 10 });

    const where = (repos.conversionJobRepository as unknown as IConversionJobRepository).findMany!
      .mock.calls[0]![0].where as Record<string, unknown>;
    expect(where.userId).toBeUndefined();
  });
});
