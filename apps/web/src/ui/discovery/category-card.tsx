import { getTranslations } from "next-intl/server";

interface CategoryCardProps {
  id: string;
  label: string;
  description: string;
  icon: string;
  docCount: number;
  totalReadingTime: number;
  locale: string;
}

export async function CategoryCard({
  id,
  label,
  description,
  icon,
  docCount,
  totalReadingTime,
  locale,
}: CategoryCardProps) {
  const t = await getTranslations({ locale, namespace: "discovery" });
  return (
    <a href={`/${locale}/docs/${id}`} className="category-card">
      <div className="category-card-header">
        <span className="category-card-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="category-card-title">{label}</span>
      </div>
      <p className="category-card-description">{description}</p>
      <div className="category-card-meta">
        <span>
          {docCount} {docCount === 1 ? t("documents") : t("documentsPlural")}
        </span>
        <span>
          ~{totalReadingTime} {t("minutes")}
        </span>
      </div>
    </a>
  );
}
