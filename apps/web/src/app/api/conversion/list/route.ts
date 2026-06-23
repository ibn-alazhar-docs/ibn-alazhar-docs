import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireAuth, unauthorizedResponse, isAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { handleRouteError } from "@/lib/route-helpers";

export async function GET(request: Request) {
  const session = await requireAuth().catch(() => null);
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const status = searchParams.get("status");

    const where: Prisma.ConversionJobWhereInput = {};

    if (!isAdmin(session)) {
      where.userId = session.user.id;
    }

    if (status) {
      (where as Record<string, unknown>).status = status;
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
            select: {
              id: true,
              title: true,
              fileName: true,
            },
          },
        },
      }),
      prisma.conversionJob.count({ where }),
    ]);

    return NextResponse.json({
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    return handleRouteError(error, "conversion/list", "فشل تحميل قائمة التحويلات");
  }
}
