import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/backend/auth-guards";
import { AnalyticsContent } from "../analytics-content";
import { PageTransition } from "@/components/ui/page-transition";

export const revalidate = 0;

interface AnalyticsPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: AnalyticsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "nav" });
  return {
    title: t("analytics"),
  };
}

export default async function AnalyticsPage() {
  await requireAuth();

  return (
    <PageTransition>
      <AnalyticsContent />
    </PageTransition>
  );
}
