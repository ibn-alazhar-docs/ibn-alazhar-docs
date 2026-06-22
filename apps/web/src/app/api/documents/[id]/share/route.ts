import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-guards";
import { createShareSchema } from "@/lib/validators/share";
import { documentUseCases } from "@/core/use-cases/document.use-cases";
import { logger } from "@/lib/logger";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth().catch(() => null);
  if (!session) return unauthorizedResponse();

  const { id } = await params;
  const body = await request.json();
  const parsed = createShareSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid data",
          details: parsed.error.issues,
        },
      },
      { status: 400 },
    );
  }

  try {
    const share = await documentUseCases.createShareLink(
      id,
      session.user.id,
      parsed.data.expiration || null,
    );
    const url = `${request.headers.get("origin") || "http://localhost:3000"}/share/${share.token}`;

    // We fetch the document title just for the response, since createShareLink doesn't return it
    const document = await documentUseCases.getDocumentById(id, session.user.id);

    return NextResponse.json(
      {
        shareId: share.id,
        token: share.token,
        url,
        documentTitle: document.title,
        expiresAt: share.expiresAt?.toISOString() ?? null,
        createdAt: share.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    if ((error as Error).message === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Document not found" } },
        { status: 404 },
      );
    }
    if ((error as Error).message === "NOT_READY") {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Document not ready" } },
        { status: 400 },
      );
    }
    logger.error(error, "[share] Create failed:");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create share link" } },
      { status: 500 },
    );
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth().catch(() => null);
  if (!session) return unauthorizedResponse();

  const { id } = await params;

  try {
    const share = await documentUseCases.getShareLink(id, session.user.id);

    if (!share) {
      return NextResponse.json({ shared: false }, { status: 200 });
    }

    const isExpired = share.expiresAt && new Date() > share.expiresAt;

    return NextResponse.json({
      shared: true,
      shareId: share.id,
      token: share.token,
      url: `/share/${share.token}`,
      documentTitle: share.document.title,
      expiresAt: share.expiresAt?.toISOString() ?? null,
      isExpired,
      createdAt: share.createdAt.toISOString(),
    });
  } catch (error: unknown) {
    logger.error(error, "[share] Get failed:");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to get share info" } },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth().catch(() => null);
  if (!session) return unauthorizedResponse();

  const { id } = await params;

  try {
    await documentUseCases.deleteShareLink(id, session.user.id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    if ((error as Error).message === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Document not found" } },
        { status: 404 },
      );
    }
    if ((error as Error).message === "NO_SHARE_LINK") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "No share link exists" } },
        { status: 404 },
      );
    }
    logger.error(error, "[share] Delete failed:");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete share link" } },
      { status: 500 },
    );
  }
}
