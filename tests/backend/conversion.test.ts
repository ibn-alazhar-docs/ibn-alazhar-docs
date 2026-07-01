import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConversionUseCases } from "@/core/use-cases/conversion.use-cases";
import type { IDocumentRepository } from "@/domain/repositories/document.repository.interface";
import type { IConversionJobRepository } from "@/domain/repositories/conversion-job.repository.interface";
import { NotFoundError } from "@/lib/shared/errors";
import type { AuthSession } from "@/lib/backend/auth-guards";

vi.mock("@ibn-al-azhar-docs/pipeline", () => ({
  loadConfig: vi.fn(() => ({})),
  enqueueSplitting: vi.fn(),
}));

function makeSession(overrides: Record<string, unknown> = {}): AuthSession {
  return {
    user: { id: "user-1", role: "STUDENT", name: "Test", email: "t@t.com" },
    ...overrides,
  } as AuthSession;
}

describe("ConversionUseCases", () => {
  let documentRepo: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  let conversionJobRepo: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  let useCases: ConversionUseCases;

  beforeEach(() => {
    documentRepo = { findFirst: vi.fn() };
    conversionJobRepo = {
      findMany: vi.fn(),
      count: vi.fn(),
    };
    useCases = new ConversionUseCases(
      documentRepo as unknown as IDocumentRepository,
      conversionJobRepo as unknown as IConversionJobRepository,
    );
  });

  describe("getJobStatus", () => {
    it("returns document status", async () => {
      documentRepo.findFirst.mockResolvedValue({ id: "doc-1", status: "COMPLETED" });

      const result = await useCases.getJobStatus("doc-1", makeSession());

      expect(result.status).toBe("COMPLETED");
    });

    it("throws NotFoundError when document not found", async () => {
      documentRepo.findFirst.mockResolvedValue(null);

      await expect(useCases.getJobStatus("missing", makeSession())).rejects.toThrow(NotFoundError);
    });
  });

  describe("listJobs", () => {
    it("returns paginated jobs", async () => {
      conversionJobRepo.findMany.mockResolvedValue([]);
      conversionJobRepo.count.mockResolvedValue(0);

      const result = await useCases.listJobs(makeSession(), {});

      expect(result.pagination.total).toBe(0);
      expect(result.jobs).toEqual([]);
    });

    it("filters by status", async () => {
      conversionJobRepo.findMany.mockResolvedValue([]);
      conversionJobRepo.count.mockResolvedValue(0);

      await useCases.listJobs(makeSession(), { status: "COMPLETED" });

      expect(conversionJobRepo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "COMPLETED" }),
        }),
      );
    });

    it("admin sees all jobs", async () => {
      conversionJobRepo.findMany.mockResolvedValue([]);
      conversionJobRepo.count.mockResolvedValue(0);
      const adminSession = makeSession({ user: { id: "admin-1", role: "ADMIN" } });

      await useCases.listJobs(adminSession, {});

      expect(conversionJobRepo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ userId: expect.anything() }),
        }),
      );
    });
  });
});
