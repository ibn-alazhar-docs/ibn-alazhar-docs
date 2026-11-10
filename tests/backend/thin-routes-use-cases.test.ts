import { describe, it, expect, vi } from "vitest";

vi.mock("@ibn-al-azhar-docs/pipeline", () => ({
  loadConfig: vi.fn(() => ({ queue: {}, paths: {} })),
  enqueueViaDriver: vi.fn(async () => undefined),
  JOB_QUEUES: { VALIDATION: "pipeline-validation", EXPORT: "pipeline-export" },
}));

import { EmailVerificationUseCases } from "@/core/services/email-verification.use-cases";
import { DocumentReprocessUseCases } from "@/core/services/document-reprocess.use-cases";

describe("EmailVerificationUseCases", () => {
  it("returns verified=false for an unknown token", async () => {
    const userRepository = { updateByEmail: vi.fn() } as never;
    const verificationTokenRepository = {
      findByToken: vi.fn(async () => null),
      deleteByToken: vi.fn(),
    } as never;
    const useCase = new EmailVerificationUseCases(userRepository, verificationTokenRepository);

    const result = await useCase.verify("missing-token");

    expect(result).toEqual({ verified: false });
    expect(userRepository.updateByEmail).not.toHaveBeenCalled();
  });

  it("marks the user verified and deletes the token for a valid token", async () => {
    const updateByEmail = vi.fn(async () => undefined);
    const deleteByToken = vi.fn(async () => undefined);
    const userRepository = { updateByEmail } as never;
    const verificationTokenRepository = {
      findByToken: vi.fn(async () => ({
        identifier: "user@example.com",
        token: "good-token",
        expires: new Date(Date.now() + 60_000),
      })),
      deleteByToken,
    } as never;
    const useCase = new EmailVerificationUseCases(userRepository, verificationTokenRepository);

    const result = await useCase.verify("good-token");

    expect(result).toEqual({ verified: true, identifier: "user@example.com" });
    expect(updateByEmail).toHaveBeenCalledWith("user@example.com", {
      emailVerified: expect.any(Date),
    });
    expect(deleteByToken).toHaveBeenCalledWith("good-token");
  });
});

describe("DocumentReprocessUseCases", () => {
  it("returns 404 for a missing document", async () => {
    const documentRepository = {
      findFirst: vi.fn(async () => null),
      resetForReprocess: vi.fn(),
    } as never;
    const useCase = new DocumentReprocessUseCases(documentRepository);

    const result = await useCase.reprocess("doc-missing", "user-1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
    expect(documentRepository.resetForReprocess).not.toHaveBeenCalled();
  });

  it("returns 409 when the document is actively processing", async () => {
    const documentRepository = {
      findFirst: vi.fn(async () => ({ id: "doc-1", status: "PROCESSING" })),
      resetForReprocess: vi.fn(),
    } as never;
    const useCase = new DocumentReprocessUseCases(documentRepository);

    const result = await useCase.reprocess("doc-1", "user-1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(409);
    expect(documentRepository.resetForReprocess).not.toHaveBeenCalled();
  });
});
