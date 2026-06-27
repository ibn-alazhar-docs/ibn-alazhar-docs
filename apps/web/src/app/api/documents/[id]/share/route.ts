import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-guards";
import { handleRouteError } from "@/lib/route-helpers";
import { createShareSchema } from "@/lib/validators/share";
import { useCases } from "@/core/composition-root";

export const POST = withAuth(async (request, { session, params }) => {
  try {
    const id = params.id!;
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

    const share = await useCases.documentShare.createShareLink(
      id,
      session.user.id,
      parsed.data.expiration || null,
    );
    const url = `${request.headers.get("origin") || "http://localhost:3000"}/share/${share.token}`;

    // We fetch the document title just for the response, since createShareLink doesn't return it
    const document = await useCases.documentCrud.getDocumentById(id, session.user.id);

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
    return handleRouteError(
      error,
      "documents/[id]/share/POST",
      "حدث خطأ أثناء إنشاء رابط المشاركة",
    );
  }
});

export const GET = withAuth(async (_request, { session, params }) => {
  const id = params.id!;

  try {
    const share = await useCases.documentShare.getShareLink(id, session.user.id);

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
    return handleRouteError(
      error,
      "documents/[id]/share/GET",
      "حدث خطأ أثناء جلب معلومات المشاركة",
    );
  }
});

export const DELETE = withAuth(async (_request, { session, params }) => {
  const id = params.id!;

  try {
    await useCases.documentShare.deleteShareLink(id, session.user.id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(
      error,
      "documents/[id]/share/DELETE",
      "حدث خطأ أثناء حذف رابط المشاركة",
    );
  }
});
