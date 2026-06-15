import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { isAdmin, requireAuth } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { DashboardContent } from "../dashboard-content";

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
  const admin = isAdmin(session);
  const docWhere = admin ? { deletedAt: null } : { userId: session.user.id, deletedAt: null };
  const folderWhere = admin ? { deletedAt: null } : { userId: session.user.id, deletedAt: null };
  const tagWhere = admin ? {} : { userId: session.user.id };
  const conversionWhere = admin ? {} : { userId: session.user.id };

  const [documents, folders, tags, conversions, recentDocuments] = await Promise.all([
    prisma.document.count({ where: docWhere }),
    prisma.folder.count({ where: folderWhere }),
    prisma.tag.count({ where: tagWhere }),
    prisma.conversionJob.count({ where: conversionWhere }),
    prisma.document.findMany({
      where: docWhere,
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, mimeType: true, status: true, createdAt: true },
    }),
  ]);

  return (
    <DashboardContent
      counts={{ documents, folders, tags, conversions }}
      recentDocuments={recentDocuments}
    />
  );
}
