import { getTranslations } from "next-intl/server";

interface KnowledgeHeroProps {
  locale: string;
}

export async function KnowledgeHero({ locale }: KnowledgeHeroProps) {
  const t = await getTranslations({ locale, namespace: "discovery" });
  return (
    <div className="knowledge-hero">
      <h1>{t("library")}</h1>
      <p>{t("librarySubtitle")}</p>
    </div>
  );
}
