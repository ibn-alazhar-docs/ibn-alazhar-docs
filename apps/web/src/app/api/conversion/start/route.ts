import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse, ownedWhere } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const startConversionSchema = z.object({
  documentId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const session = await requireAuth().catch(() => null);
    if (!session) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const parsed = startConversionSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: firstError?.message || "documentId مطلوب" } },
        { status: 400 },
      );
    }

    const { documentId } = parsed.data;

    // Verify document ownership — never trust client-supplied storageKey/fileName
    const document = await prisma.document.findFirst({
      where: ownedWhere({ id: documentId, deletedAt: null }, session),
      select: { id: true, fileName: true, fileSize: true, mimeType: true, storageKey: true },
    });

    if (!document) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "المستند غير موجود" } },
        { status: 404 },
      );
    }

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

    return NextResponse.json({
      success: true,
      jobId: document.id,
      status: "splitting",
      message: "بدأت معالجة التحويل",
    });
  } catch (error: unknown) {
    logger.error(error, "[conversion/start] Failed:");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "فشل بدء التحويل" } },
      { status: 500 },
    );
  }
}
