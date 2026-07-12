"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ThemeToggle } from "@/ui/theme/theme-toggle";
import { LocaleToggle } from "@/ui/locale/locale-toggle";
import { BRAND_NAME } from "@/ui/brand";

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
    <header
      role="banner"
      className="glass-header fixed inset-x-0 top-0 z-50"
      style={{ viewTransitionName: "public-header" }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3 no-underline">
          <Image
            src="/logo.png"
            alt={brand}
            width={40}
            height={40}
            className="h-10 w-auto"
            priority
          />
          <span className="heading-display-sm hidden truncate text-sm font-bold tracking-tight text-primary-color sm:inline">
            {brand}
          </span>
        </Link>
        <nav aria-label={t("mainNav")} className="flex items-center gap-2">
          <LocaleToggle />
          <ThemeToggle />
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="landing-btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold tracking-[0.08em] no-underline"
            >
              {t("home")}
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 text-xs font-semibold tracking-[0.06em] text-secondary-color no-underline transition-colors hover:text-primary-color"
              >
                {signInLabel || t("signIn")}
              </Link>
              <Link
                href="/register"
                className="landing-btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold tracking-[0.08em] no-underline"
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
