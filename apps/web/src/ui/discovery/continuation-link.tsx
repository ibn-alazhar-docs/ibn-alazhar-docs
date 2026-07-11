import { getTranslations } from "next-intl/server";
import type { DocEntry } from "@/shared/content/index";

interface ContinuationLinkProps {
  doc: DocEntry | null;
  locale: string;
}

export async function ContinuationLink({ doc, locale }: ContinuationLinkProps) {
  const t = await getTranslations({ locale, namespace: "discovery" });
  if (!doc) return null;

  return (
    <div className="continuation-bar">
      <span className="text-xs font-medium text-gold-500">{t("journeyNext")}</span>
      <a
        href={`/${locale}/docs/${doc.category}/${doc.slug}`}
        className="font-semibold text-gold-700 underline underline-offset-2 hover:text-gold-800"
      >
        {doc.metadata.title}
      </a>
      <span className="ms-auto text-xs text-very-muted">
        {doc.metadata.readingTime} {t("minShort")}
      </span>
    </div>
  );
}
