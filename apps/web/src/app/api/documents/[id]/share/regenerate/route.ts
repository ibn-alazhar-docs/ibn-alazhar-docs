import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireAuth, unauthorizedResponse, ownedWhere } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth().catch(() => null);
  if (!session) return unauthorizedResponse();

  const { id } = await params;

  try {
    const document = await prisma.document.findFirst({
      where: ownedWhere({ id, deletedAt: null }, session),
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const existing = await prisma.shareLink.findFirst({
      where: ownedWhere({ documentId: id }, session),
    });

    if (!existing) {
      return NextResponse.json(
        { error: "No share link exists" },
        { status: 404 },
      );
    }

    const newToken = generateToken();

    const updated = await prisma.shareLink.update({
      where: { id: existing.id },
      data: { token: newToken },
    });

    const url = `/share/${updated.token}`;

    return NextResponse.json({
      shareId: updated.id,
      token: updated.token,
      url,
      documentTitle: document.title,
      expiresAt: updated.expiresAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      message: "Link regenerated. Old link is now invalid.",
    });
  } catch (error: unknown) {
    logger.error(error, "[share] Regenerate failed:");
    return NextResponse.json({ error: "Failed to regenerate link" }, { status: 500 });
  }
}
