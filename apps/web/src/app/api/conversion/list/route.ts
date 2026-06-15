import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse, isAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await requireAuth().catch(() => null);
  if (!session) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};

  if (!isAdmin(session)) {
    where.userId = session.user.id;
  }

  if (status) {
    where.status = status;
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
}
