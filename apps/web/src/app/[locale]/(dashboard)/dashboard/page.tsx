import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/middleware/auth-guards";
import { prisma } from "@/transport/db";
import { DashboardContent } from "../dashboard-content";
import { PageTransition } from "@/ui/page-transition";

export const revalidate = 0;

interface DashboardPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: DashboardPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "nav" });
  return {
    title: t("home"),
  };
}

export default async function DashboardPage() {
  const session = await requireAuth();

  // SECURITY FIX: كل مستخدم يرى بياناته فقط (بغض النظر عن دوره)
  const docWhere = { userId: session.user.id, deletedAt: null };
  const folderWhere = { userId: session.user.id, deletedAt: null };
  const tagWhere = { userId: session.user.id };
  // FIX: Count processing documents, not conversion jobs
  const processingWhere = {
    userId: session.user.id,
    status: {
      in: ["UPLOADED", "VALIDATING", "SPLITTING", "OCR_PROCESSING", "CLEANING", "GENERATING"],
    },
    deletedAt: null,
  };

  const [documents, folders, tags, conversions, recentDocuments] = await Promise.all([
    prisma.document.count({ where: docWhere }),
    prisma.folder.count({ where: folderWhere }),
    prisma.tag.count({ where: tagWhere }),
    prisma.document.count({ where: processingWhere }), // FIX: Count documents being processed
    prisma.document.findMany({
      where: docWhere,
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, mimeType: true, status: true, createdAt: true },
    }),
  ]);

  return (
    <PageTransition>
      <DashboardContent
        counts={{ documents, folders, tags, conversions }}
        recentDocuments={recentDocuments}
      />
    </PageTransition>
  );
}
