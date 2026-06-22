import { getTranslations } from "next-intl/server";
import type { DocEntry } from "@/lib/content";

interface DocNavigationProps {
  prev: DocEntry | null;
  next: DocEntry | null;
  locale: string;
}

export async function DocNavigation({ prev, next, locale }: DocNavigationProps) {
  const t = await getTranslations({ locale, namespace: "discovery" });
  return (
    <nav className="doc-nav" aria-label={t("docNavLabel")}>
      {prev ? (
        <a href={`/${locale}/docs/${prev.category}/${prev.slug}`} className="doc-nav-link prev">
          <span className="doc-nav-label">
            <span aria-hidden="true">{locale === "ar" ? "→" : "←"}</span> {t("prev")}
          </span>
          <span className="doc-nav-title">{prev.metadata.title}</span>
        </a>
      ) : (
        <div className="nav-placeholder" />
      )}
      {next ? (
        <a href={`/${locale}/docs/${next.category}/${next.slug}`} className="doc-nav-link next">
          <span className="doc-nav-label">
            {t("next")} <span aria-hidden="true">{locale === "ar" ? "←" : "→"}</span>
          </span>
          <span className="doc-nav-title">{next.metadata.title}</span>
        </a>
      ) : (
        <div className="nav-placeholder" />
      )}
    </nav>
  );
}
