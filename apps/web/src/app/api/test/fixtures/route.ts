import { NextResponse } from "next/server";
import { prisma } from "@/transport/db";

export async function GET(request: Request) {
  const apiKey = process.env.TEST_API_KEY;
  if (!apiKey || request.headers.get("x-api-key") !== apiKey) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid API Key" } },
      { status: 401 },
    );
  }

  try {
    const [document, folder, tag, share, conversionJob] = await Promise.all([
      prisma.document.findFirst({ select: { id: true } }),
      prisma.folder.findFirst({ select: { id: true } }),
      prisma.tag.findFirst({ select: { id: true } }),
      prisma.shareLink.findFirst({ select: { token: true } }),
      prisma.conversionJob.findFirst({ select: { id: true } }),
    ]);

    return NextResponse.json({
      documentId: document?.id || null,
      folderId: folder?.id || null,
      tagId: tag?.id || null,
      shareToken: share?.token || null,
      conversionJobId: conversionJob?.id || null,
    });
  } catch (error) {
    console.error("Failed to fetch fixtures:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch fixtures" } },
      { status: 500 },
    );
  }
}
