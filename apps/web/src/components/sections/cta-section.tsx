"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { GeometricStar } from "@/components/ui/geometric-star";

export function CTASection({ isLoggedIn }: { isLoggedIn?: boolean }) {
  const t = useTranslations("section.cta");
  const locale = useLocale();

  return (
    <section className="relative isolate overflow-hidden bg-[var(--text-primary)]">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--gold)_0%,_transparent_50%)] opacity-[0.04]" />
        <div className="absolute -left-20 -top-20 opacity-[0.04]">
          <GeometricStar className="h-64 w-64 text-gold" />
        </div>
        <div className="absolute -bottom-20 -right-20 opacity-[0.04]">
          <GeometricStar className="h-48 w-48 text-[var(--page-bg)]" />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-32 sm:py-40">
        <div className="max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--page-bg)]/10 bg-[var(--page-bg)]/[0.04] px-4 py-1.5 text-[0.625rem] font-semibold tracking-[0.12em] text-[var(--page-bg)]/60 uppercase">
            {t("title")}
          </div>
          <h2 className="heading-display text-balance text-4xl font-bold tracking-tight text-[var(--page-bg)] sm:text-5xl lg:text-6xl">
            {t("title")}
          </h2>
          <p className="mt-6 max-w-lg text-balance text-base leading-relaxed text-[var(--page-bg)]/60 sm:text-lg">
            {t("subtitle")}
          </p>
          <div className="mt-12">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="glass inline-flex items-center gap-3 rounded-xl px-8 py-4 text-xs font-bold tracking-[0.1em] text-[var(--text-primary)] no-underline transition-all hover:bg-[var(--page-bg)]/90 hover:shadow-xl"
              >
                {t("dashboardCTA")}
                <span aria-hidden="true" className="text-sm">
                  {locale === "ar" ? "←" : "→"}
                </span>
              </Link>
            ) : (
              <Link
                href="/register"
                className="glass inline-flex items-center gap-3 rounded-xl px-8 py-4 text-xs font-bold tracking-[0.1em] text-[var(--text-primary)] no-underline transition-all hover:bg-[var(--page-bg)]/90 hover:shadow-xl"
              >
                {t("button")}
                <span aria-hidden="true" className="text-sm">
                  {locale === "ar" ? "←" : "→"}
                </span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
