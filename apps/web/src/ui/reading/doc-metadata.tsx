import { getTranslations } from "next-intl/server";
import type { DocMetadata } from "@/shared/content/index";

interface DocMetadataBarProps {
  metadata: DocMetadata;
  locale: string;
  categoryLabel: string;
}

export async function DocMetadataBar({ metadata, locale, categoryLabel }: DocMetadataBarProps) {
  const t = await getTranslations({ locale, namespace: "discovery" });
  return (
    <div className="doc-metadata">
      <span className="doc-category">{categoryLabel}</span>
      <span className="reading-time">
        {metadata.readingTime} {t("readTime")}
      </span>
      <span className="doc-date">{metadata.date}</span>
    </div>
  );
}
