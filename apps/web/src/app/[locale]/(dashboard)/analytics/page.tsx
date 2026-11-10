import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/middleware/auth-guards";
import { AnalyticsContent } from "../analytics-content";
import { PageTransition } from "@/ui/page-transition";
import { useCases } from "@/core/composition-root";

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
  const session = await requireAuth();
  const initialData = await useCases.analytics.getAnalytics(session, 30);

  return (
    <PageTransition>
      <AnalyticsContent initialData={initialData} initialDays={30} />
    </PageTransition>
  );
}
