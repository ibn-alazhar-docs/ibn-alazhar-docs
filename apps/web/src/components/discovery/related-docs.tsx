import { getTranslations } from "next-intl/server";
import type { DocEntry } from "@/lib/backend/content";
import { FileTextIcon } from "@/components/ui/icons";

interface RelatedDocsProps {
  docs: DocEntry[];
  locale: string;
}

export async function RelatedDocs({ docs, locale }: RelatedDocsProps) {
  const t = await getTranslations({ locale, namespace: "discovery" });
  if (docs.length === 0) return null;

  return (
    <div className="related-docs">
      <div className="related-docs-title">{t("relatedTitle")}</div>
      <div className="related-docs-list">
        {docs.map((doc) => (
          <a
            key={doc.slug}
            href={`/${locale}/docs/${doc.category}/${doc.slug}`}
            className="related-doc-link"
          >
            <span className="related-doc-icon flex items-center" aria-hidden="true">
              <FileTextIcon className="w-4 h-4 text-muted-color" />
            </span>
            <span className="related-doc-title">{doc.metadata.title}</span>
            <span className="related-doc-time">
              {doc.metadata.readingTime} {t("minShort")}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
