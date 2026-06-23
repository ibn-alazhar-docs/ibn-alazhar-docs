import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/errors";
import { ownedWhere, type AuthSession } from "@/lib/auth-guards";
import type { Prisma } from "@prisma/client";

export class ConversionUseCases {
  async startConversion(documentId: string, session: AuthSession) {
    const document = await prisma.document.findFirst({
      where: ownedWhere({ id: documentId, deletedAt: null }, session),
      select: { id: true, fileName: true, fileSize: true, mimeType: true, storageKey: true },
    });
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

    await enqueueSplitting(config, job);
    return { jobId: document.id };
  }

  async listJobs(
    session: AuthSession,
    filters: { page?: number; limit?: number; status?: string },
  ) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 50));

    const where: Prisma.ConversionJobWhereInput = {};
    if (session.user.role !== "ADMIN") {
      where.userId = session.user.id;
    }
    if (filters.status) {
      (where as Record<string, unknown>).status = filters.status;
    }

    const [jobs, total] = await Promise.all([
      prisma.conversionJob.findMany({
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
      prisma.conversionJob.count({ where }),
    ]);

    return {
      jobs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getJobStatus(id: string, session: AuthSession) {
    const document = await prisma.document.findFirst({
      where: ownedWhere({ id }, session),
      select: { id: true, status: true },
    });
    if (!document) throw new NotFoundError("المستند غير موجود");

    return document;
  }
}

export const conversionUseCases = new ConversionUseCases();
