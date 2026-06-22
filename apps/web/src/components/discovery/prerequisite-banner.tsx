import { getTranslations } from "next-intl/server";
import type { DocEntry } from "@/lib/content";

interface PrerequisiteBannerProps {
  docs: DocEntry[];
  locale: string;
}

export async function PrerequisiteBanner({ docs, locale }: PrerequisiteBannerProps) {
  const t = await getTranslations({ locale, namespace: "discovery" });
  if (docs.length === 0) return null;

  return (
    <div className="prerequisite-banner">
      <span className="prerequisite-banner-icon" aria-hidden="true">
        <svg className="w-4 h-4 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
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
