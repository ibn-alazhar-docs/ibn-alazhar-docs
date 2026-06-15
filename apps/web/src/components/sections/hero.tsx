import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";

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

interface HeroProps {
  locale?: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  cta?: string;
  isLoggedIn?: boolean;
}

export function Hero({ locale: localeProp, eyebrow, title, subtitle, cta, isLoggedIn }: HeroProps) {
  const t = useTranslations("section.hero");
  const localeFromHook = useLocale();
  const locale = localeProp || localeFromHook;

  return (
    <section className="relative isolate min-h-[90dvh] overflow-hidden pt-28 sm:pt-32">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--gold)_0%,_transparent_55%)] opacity-[0.04]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--btn-primary-bg)_0%,_transparent_55%)] opacity-[0.04]" />

        <div className="absolute -right-20 top-10 opacity-[0.04] sm:-right-32 sm:top-0 sm:opacity-[0.06]">
          <GeometricStar className="h-[400px] w-[400px] sm:h-[600px] sm:w-[600px] text-gold" />
        </div>

        <div className="absolute bottom-40 left-10 opacity-[0.03] hidden sm:block">
          <GeometricStar className="h-32 w-32 text-gold" />
        </div>
        <div className="absolute right-1/3 top-1/3 opacity-[0.02] hidden lg:block">
          <GeometricStar className="h-20 w-20 text-[var(--btn-primary-bg)]" />
        </div>

        <svg className="absolute inset-0 h-full w-full opacity-[0.012]" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M 80 0 L 0 0 0 80" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="mx-auto flex min-h-[70dvh] max-w-6xl flex-col items-start justify-center px-6">
        <div className="max-w-3xl">
          <div className="mb-8 flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--gold-border)] bg-[var(--gold-bg)] px-4 py-1.5 text-[0.625rem] font-semibold tracking-[0.12em] text-[var(--gold)] uppercase animate-fade-in-down">
              {eyebrow || t("eyebrow")}
            </span>
          </div>

          <h1 className="heading-display text-balance text-5xl font-bold leading-[1.1] tracking-tight text-primary-color sm:text-6xl lg:text-7xl xl:text-8xl animate-fade-in-up">
            {title || t("title")}
          </h1>

          <div className="geometric-divider my-8 max-w-md animate-fade-in-up delay-200">
            <svg
              viewBox="0 0 100 100"
              fill="none"
              className="geometric-star h-4 w-4"
              aria-hidden="true"
            >
              <polygon
                points="50,5 63,38 98,38 70,60 79,95 50,75 21,95 30,60 2,38 37,38"
                stroke="currentColor"
                strokeWidth="0.8"
                fill="none"
              />
            </svg>
          </div>

          <p className="max-w-xl text-balance text-base leading-relaxed text-muted-color sm:text-lg animate-fade-in-up delay-300">
            {subtitle || t("subtitle")}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4 animate-fade-in-up delay-500">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-3 rounded-xl bg-[var(--btn-primary-bg)] px-8 py-4 text-xs font-bold tracking-[0.1em] text-[var(--btn-primary-text)] no-underline transition-all hover:opacity-90 hover:translate-y-[-1px] hover:shadow-[0_6px_20px_rgba(26,92,58,0.25)]"
              >
                {t("dashboardCTA")}
                <span aria-hidden="true" className="text-sm">
                  {locale === "ar" ? "←" : "→"}
                </span>
              </Link>
            ) : (
              <Link
                href="/register"
                className="inline-flex items-center gap-3 rounded-xl bg-[var(--btn-primary-bg)] px-8 py-4 text-xs font-bold tracking-[0.1em] text-[var(--btn-primary-text)] no-underline transition-all hover:opacity-90 hover:translate-y-[-1px] hover:shadow-[0_6px_20px_rgba(26,92,58,0.25)]"
              >
                {cta || t("cta")}
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
