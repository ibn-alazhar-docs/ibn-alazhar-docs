"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LocaleToggle } from "@/components/locale/locale-toggle";

const BRAND_NAME = { ar: "ابن الأزهر", en: "Ibn Al-Azhar" } as const;

interface PublicHeaderProps {
  locale: string;
  signInLabel?: string;
  signUpLabel?: string;
  mainNavLabel?: string;
  isLoggedIn?: boolean;
}

export function PublicHeader({ locale, signInLabel, signUpLabel, isLoggedIn }: PublicHeaderProps) {
  const t = useTranslations("nav");
  const brand = BRAND_NAME[locale as keyof typeof BRAND_NAME] ?? BRAND_NAME.en;

  return (
    <header role="banner" className="glass-header fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3 no-underline">
          <Image
            src="/logo.png"
            alt={brand}
            width={40}
            height={40}
            className="h-10 w-auto"
            priority
          />
          <span className="heading-display-sm text-sm font-bold tracking-tight text-primary-color">
            {brand}
          </span>
        </Link>
        <nav aria-label={t("mainNav")} className="flex items-center gap-1">
          <LocaleToggle />
          <ThemeToggle />
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--btn-primary-bg)] px-5 py-2.5 text-xs font-bold tracking-[0.08em] text-[var(--btn-primary-text)] no-underline transition-all hover:opacity-90"
            >
              {t("home")}
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 text-xs font-semibold tracking-[0.06em] text-muted-color no-underline transition-colors hover:text-primary-color"
              >
                {signInLabel || t("signIn")}
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--btn-primary-bg)] px-5 py-2.5 text-xs font-bold tracking-[0.08em] text-[var(--btn-primary-text)] no-underline transition-all hover:opacity-90"
              >
                {signUpLabel || t("signUp")}
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
