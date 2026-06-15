import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireAuth, unauthorizedResponse, ownedWhere } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { createShareSchema, expirationToMs } from "@/lib/validators/share";
import { logger } from "@/lib/logger";

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

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
    const document = await prisma.document.findFirst({
      where: ownedWhere({ id, deletedAt: null }, session),
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (document.status !== "COMPLETED") {
      return NextResponse.json({ error: "Document not ready" }, { status: 400 });
    }

    const existing = await prisma.shareLink.findFirst({
      where: ownedWhere({ documentId: id }, session),
    });

    if (existing) {
      const url = `${request.headers.get("origin") || "http://localhost:3000"}/share/${existing.token}`;
      return NextResponse.json({
        shareId: existing.id,
        token: existing.token,
        url,
        documentTitle: document.title,
        expiresAt: existing.expiresAt?.toISOString() ?? null,
        createdAt: existing.createdAt.toISOString(),
      });
    }

    const expirationMs = expirationToMs(parsed.data.expiration);
    const expiresAt = expirationMs ? new Date(Date.now() + expirationMs) : null;

    const share = await prisma.shareLink.create({
      data: {
        token: generateToken(),
        documentId: id,
        userId: session.user.id,
        expiresAt,
      },
    });

    const url = `${request.headers.get("origin") || "http://localhost:3000"}/share/${share.token}`;

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
    logger.error(error, "[share] Create failed:");
    return NextResponse.json({ error: "Failed to create share link" }, { status: 500 });
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth().catch(() => null);
  if (!session) return unauthorizedResponse();

  const { id } = await params;

  try {
    const share = await prisma.shareLink.findFirst({
      where: ownedWhere({ documentId: id }, session),
      include: { document: { select: { title: true } } },
    });

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
    return NextResponse.json({ error: "Failed to get share info" }, { status: 500 });
  }
}
