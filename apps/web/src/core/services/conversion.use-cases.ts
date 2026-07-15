import { NotFoundError } from "@/shared/errors";
import { ownedWhere } from "@/core/authorization";
import type { AuthSession } from "@/domain/types";
import { LIMITS } from "@/shared/constants";
import type { Prisma } from "@/domain/repositories/prisma-types";
import type { IDocumentRepository } from "@/domain/repositories/document.repository.interface";
import type { IConversionJobRepository } from "@/domain/repositories/conversion-job.repository.interface";

export class ConversionUseCases {
  constructor(
    private readonly documentRepository: IDocumentRepository,
    private readonly conversionJobRepository: IConversionJobRepository,
  ) {}

  async startConversion(documentId: string, session: AuthSession) {
    const document = await this.documentRepository.findFirst(
      ownedWhere({ id: documentId, deletedAt: null }, session),
      { id: true, fileName: true, fileSize: true, mimeType: true, storageKey: true },
    );
    if (!document) throw new NotFoundError("المستند غير موجود");

    const { loadConfig, enqueueSplitting } = await import("@ibn-al-azhar-docs/pipeline");
    const config = loadConfig();

    const job = {
      id: document.id,
      documentId: document.id,
      userId: session.user.id,
      fileName: document.fileName,
      fileSize: Number(document.fileSize),
      mimeType: document.mimeType,
      storageKey: document.storageKey,
      status: "splitting" as const,
      progress: 0,
      createdAt: new Date().toISOString(),
    };

    await this.conversionJobRepository.create({
      id: document.id,
      userId: session.user.id,
      documentId: document.id,
      sourceFormat: document.mimeType,
      targetFormat: "md",
      status: "PROCESSING",
      progress: 0,
      inputKey: document.storageKey,
    });

    await enqueueSplitting(config, job);
    return { jobId: document.id };
  }

  async listJobs(
    session: AuthSession,
    filters: { page?: number; limit?: number; status?: string },
  ) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(
      LIMITS.MAX_PAGE_LIMIT,
      Math.max(1, filters.limit || LIMITS.DEFAULT_PAGE_LIMIT),
    );

    // كل مستخدم يرى وظائف التحويل الخاصة به فقط
    const where: Prisma.ConversionJobWhereInput = {
      userId: session.user.id,
    };
    if (filters.status) {
      (where as Record<string, unknown>).status = filters.status;
    }

    const [jobs, total] = await Promise.all([
      this.conversionJobRepository.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          documentId: true,
          sourceFormat: true,
          targetFormat: true,
          status: true,
          progress: true,
          error: true,
          startedAt: true,
          completedAt: true,
          createdAt: true,
          document: {
            select: { id: true, title: true, fileName: true },
          },
        },
      }),
      this.conversionJobRepository.count(where),
    ]);

    return {
      jobs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getJobStatus(id: string, session: AuthSession) {
    const document = await this.documentRepository.findFirst(ownedWhere({ id }, session), {
      id: true,
      status: true,
    });
    if (!document) throw new NotFoundError("المستند غير موجود");

    return document;
  }
}
