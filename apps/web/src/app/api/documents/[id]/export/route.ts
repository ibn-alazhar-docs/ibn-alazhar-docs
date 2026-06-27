import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { useCases } from "@/core/composition-root";
import { enqueueExport, loadConfig } from "@ibn-al-azhar-docs/pipeline";

export const POST = withAuth(async (request, { session, params }) => {
  const id = params.id!;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON" } },
      { status: 400 },
    );
  }

  const exportSchema = z.object({
    format: z.enum(["md", "txt", "docx", "epub", "json", "pdf", "searchable-pdf"], {
      message: "Format must be md, txt, docx, epub, json, pdf, or searchable-pdf",
    }),
    options: z.record(z.string(), z.unknown()).optional(),
  });

  const validation = exportSchema.safeParse(body);
  if (!validation.success) {
    const firstError = validation.error.issues[0];
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: firstError?.message || "Invalid payload",
        },
      },
      { status: 400 },
    );
  }

  const { format, options } = validation.data;

  try {
    const document = await useCases.documentCrud.getDocumentById(id, session.user.id);

    if (document.status !== "COMPLETED") {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Document processing is not completed" } },
        { status: 400 },
      );
    }

    if (options?.destination === "drive") {
      const { prisma } = await import("@/lib/prisma");
      const account = await prisma.account.findFirst({
        where: { userId: session.user.id, provider: "google" },
      });
      if (!account || !account.access_token || !account.refresh_token) {
        return NextResponse.json(
          {
            error: {
              code: "NOT_LINKED",
              message:
                "يجب ربط حساب Google الخاص بك من الإعدادات أولاً لتتمكن من التصدير إلى Drive.",
            },
          },
          { status: 400 },
        );
      }
    }

    const config = loadConfig();

    const jobId = document.id;

    const textKey = `${config.paths.ocrResults}/${document.id}/cleaned.json`;
    const outputKey = `${config.paths.exports}/${document.id}/export.${format}`;

    if (format === "searchable-pdf") {
      return NextResponse.json({ success: true, jobId: document.id, message: "Export ready" });
    }

    await enqueueExport(config, {
      jobId,
      documentId: document.id,
      userId: session.user.id,
      format: format as "md" | "txt" | "docx" | "epub" | "json" | "pdf",
      textKey,
      outputKey,
      pageCount: document.pageCount || undefined,
      options,
    });

    return NextResponse.json({ success: true, jobId, message: "Export job enqueued" });
  } catch (error: unknown) {
    return handleRouteError(error, "documents/export/POST", "حدث خطأ داخلي");
  }
});
