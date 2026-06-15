import { getTranslations } from "next-intl/server";

interface BreadcrumbsProps {
  locale: string;
  category: string;
  categoryLabel: string;
  title: string;
}

export async function Breadcrumbs({ locale, category, categoryLabel, title }: BreadcrumbsProps) {
  const t = await getTranslations({ locale, namespace: "discovery" });
  return (
    <nav aria-label="breadcrumbs" className="breadcrumbs">
      <a href={`/${locale}`}>{t("home")}</a>
      <span className="separator" aria-hidden="true">
        ›
      </span>
      <a href={`/${locale}/docs`}>{t("breadcrumbLibrary")}</a>
      <span className="separator" aria-hidden="true">
        ›
      </span>
      <a href={`/${locale}/docs/${category}`}>{categoryLabel}</a>
      <span className="separator" aria-hidden="true">
        ›
      </span>
      <span className="current">{title}</span>
    </nav>
  );
}
