import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { generatePageMetadata } from "@/ui/metadata";
import { Container } from "@/ui/container";
import { getGuestTool } from "@/shared/tools/guest-limits";
import { GuestToolClient } from "@/ui/tools/guest-tool-client";

const TOOL_ID = "tashkeel" as const;

interface ToolPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateStaticParams(): Promise<{ locale: string }[]> {
  return [{ locale: "ar" }, { locale: "en" }];
}

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const { locale } = await params;
  const tool = getGuestTool(TOOL_ID)!;
  const t = await getTranslations({ locale, namespace: "tools" });
  return generatePageMetadata({
    locale,
    title: t("items." + tool.i18nKey + ".name"),
    description: t("items." + tool.i18nKey + ".tagline"),
    path: "/tools/" + tool.slug,
  });
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { locale } = await params;
  const tool = getGuestTool(TOOL_ID)!;
  const t = await getTranslations({ locale, namespace: "tools" });

  return (
    <div className="min-h-screen pt-24">
      <Container size="lg">
        <GuestToolClient
          tool={tool}
          name={t("items." + tool.i18nKey + ".name")}
          tagline={t("items." + tool.i18nKey + ".tagline")}
          cta={t("items." + tool.i18nKey + ".cta")}
        />
      </Container>
    </div>
  );
}
