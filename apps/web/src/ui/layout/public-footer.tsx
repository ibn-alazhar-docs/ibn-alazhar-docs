"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BRAND_NAME } from "@/ui/brand";
import { GeometricStar } from "@/ui/geometric-star";
import { BrandLogo } from "@/ui/brand-logo";

interface PublicFooterProps {
  tagline?: string;
  copyright?: string;
}

export function PublicFooter({ tagline, copyright }: PublicFooterProps) {
  const t = useTranslations("footer");
  const brand = BRAND_NAME.ar;

  return (
    <footer
      className="border-t border-line bg-page"
      style={{ viewTransitionName: "public-footer" }}
    >
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
              <BrandLogo alt={brand} className="h-9 w-auto" priority />
              <span className="heading-display-sm text-sm">{brand}</span>
            </Link>
            <p className="mt-2 text-xs text-very-muted">{tagline || t("tagline")}</p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <p className="text-xs text-very-muted">{copyright || t("copyright")}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
