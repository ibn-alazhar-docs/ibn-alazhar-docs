"use client";

import { useTranslations } from "next-intl";

interface Breadcrumb {
  id: string;
  name: string;
}

interface BreadcrumbsProps {
  breadcrumbs: Breadcrumb[];
  onNavigate: (folderId: string | null) => void;
}

export function Breadcrumbs({ breadcrumbs, onNavigate }: BreadcrumbsProps) {
  const t = useTranslations("folders");

  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-color mb-4">
      <button
        type="button"
        className="hover:text-success transition-colors"
        onClick={() => onNavigate(null)}
      >
        {t("allFilesBreadcrumb")}
      </button>

      {breadcrumbs.map((crumb, index) => (
        <span key={crumb.id} className="flex items-center gap-1">
          <span className="text-very-muted inline-block rtl:rotate-180">›</span>
          <button
            type="button"
            className={`hover:text-success transition-colors ${
              index === breadcrumbs.length - 1 ? "text-primary-color font-medium" : ""
            }`}
            onClick={() => onNavigate(crumb.id)}
          >
            {crumb.name}
          </button>
        </span>
      ))}
    </nav>
  );
}
