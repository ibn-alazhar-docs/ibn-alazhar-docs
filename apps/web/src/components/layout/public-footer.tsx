"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BRAND_NAME } from "@/lib/frontend/brand";

function GeometricStar({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className} aria-hidden="true">
      <polygon
        points="50,5 63,38 98,38 70,60 79,95 50,75 21,95 30,60 2,38 37,38"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      <polygon
        points="50,15 58,35 80,35 63,50 69,72 50,58 31,72 37,50 20,35 42,35"
        stroke="currentColor"
        strokeWidth="0.5"
        fill="none"
        opacity="0.5"
      />
    </svg>
  );
}

interface PublicFooterProps {
  locale: string;
  tagline?: string;
  copyright?: string;
}

export function PublicFooter({ locale, tagline, copyright }: PublicFooterProps) {
  const t = useTranslations("footer");
  const brand = BRAND_NAME[locale as keyof typeof BRAND_NAME] ?? BRAND_NAME.en;

  return (
    <footer className="border-t border-line bg-page">
      <div className="geometric-divider py-6">
        <GeometricStar className="geometric-star h-4 w-4" />
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-16">
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
          <div>
            <Link
              href="/"
              className="flex items-center gap-3 text-sm font-bold tracking-tight text-primary-color no-underline"
            >
              <img src="/logo.png" alt={brand} className="h-9 w-auto" />
              <span className="heading-display-sm text-sm">{brand}</span>
            </Link>
            <p className="mt-2 text-xs text-very-muted">{tagline || t("tagline")}</p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <p className="text-xs text-very-muted">&copy; {copyright || t("copyright")}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
