import { getTranslations } from "next-intl/server";
import type { DocEntry } from "@/lib/backend/content";
import { InfoIcon } from "@/components/ui/icons";

interface PrerequisiteBannerProps {
  docs: DocEntry[];
  locale: string;
}

export async function PrerequisiteBanner({ docs, locale }: PrerequisiteBannerProps) {
  const t = await getTranslations({ locale, namespace: "discovery" });
  if (docs.length === 0) return null;

  return (
    <div className="prerequisite-banner">
      <span className="prerequisite-banner-icon flex items-center" aria-hidden="true">
        <InfoIcon className="w-4 h-4 text-info" />
      </span>
      <span>
        {t("prerequisitePrefix")}
        {docs.map((doc, i) => (
          <span key={doc.slug}>
            {" "}
            <a href={`/${locale}/docs/${doc.category}/${doc.slug}`}>{doc.metadata.title}</a>
            {i < docs.length - 1 && "، "}
          </span>
        ))}{" "}
        {t("prerequisiteSuffix")}
      </span>
    </div>
  );
}
