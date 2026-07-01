import { getTranslations } from "next-intl/server";
import type { DocEntry } from "@/lib/backend/content";

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
            <span className="related-doc-icon" aria-hidden="true">
              <svg
                className="w-4 h-4 text-muted-color"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
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
