"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ThemeToggle } from "@/ui/theme/theme-toggle";
import { LocaleToggle } from "@/ui/locale/locale-toggle";
import { BRAND_NAME } from "@/ui/brand";
import { BrandLogo } from "@/ui/brand-logo";

interface PublicHeaderProps {
  locale: string;
  signInLabel?: string;
  signUpLabel?: string;
  mainNavLabel?: string;
  isLoggedIn?: boolean;
}

export function PublicHeader({ locale, signInLabel, signUpLabel, isLoggedIn }: PublicHeaderProps) {
  const t = useTranslations("nav");
  const tTools = useTranslations("tools");
  const brand = BRAND_NAME[locale as keyof typeof BRAND_NAME] ?? BRAND_NAME.en;

  return (
    <header
      role="banner"
      className="glass-header fixed inset-x-0 top-0 z-50"
      style={{ viewTransitionName: "public-header" }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3 no-underline">
          <BrandLogo alt={brand} className="h-10 w-auto" priority />
          <span className="heading-display-sm hidden truncate text-sm font-bold tracking-tight text-primary-color sm:inline">
            {brand}
          </span>
        </Link>
        <nav aria-label={t("mainNav")} className="flex items-center gap-2">
          <Link
            href="/tools"
            className="px-2 py-2 sm:px-4 text-[10px] sm:text-xs font-semibold tracking-[0.06em] text-secondary-color no-underline transition-colors hover:text-primary-color whitespace-nowrap"
          >
            {t("tools")}
          </Link>
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
                className="px-2 py-2 sm:px-4 text-[10px] sm:text-xs font-semibold tracking-[0.06em] text-secondary-color no-underline transition-colors hover:text-primary-color whitespace-nowrap"
              >
                {signInLabel || t("signIn")}
              </Link>
              <Link
                href="/register"
                className="landing-btn-primary inline-flex items-center gap-1 sm:gap-2 rounded-lg sm:rounded-xl px-3 py-2 sm:px-5 sm:py-2.5 text-[10px] sm:text-xs font-bold tracking-[0.08em] no-underline whitespace-nowrap"
              >
                {signUpLabel || t("signUp")}
              </Link>
            </>
          )}
        </nav>
      </div>
      <div className="border-t border-line/60">
        <nav
          aria-label={tTools("title")}
          className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-1 gap-y-0.5 px-4 py-1.5 sm:gap-x-2 sm:px-6"
        >
          <Link
            href="/tools/pdf-to-word"
            className="rounded-full px-2 py-1 text-[10px] sm:text-xs font-semibold text-secondary-color no-underline transition-colors hover:text-primary-color whitespace-nowrap"
          >
            {tTools("items.pdf-to-word.name")}
          </Link>
          <Link
            href="/tools/ocr"
            className="rounded-full px-2 py-1 text-[10px] sm:text-xs font-semibold text-secondary-color no-underline transition-colors hover:text-primary-color whitespace-nowrap"
          >
            {tTools("items.ocr.name")}
          </Link>
          <Link
            href="/tools/tashkeel"
            className="rounded-full px-2 py-1 text-[10px] sm:text-xs font-semibold text-secondary-color no-underline transition-colors hover:text-primary-color whitespace-nowrap"
          >
            {tTools("items.tashkeel.name")}
          </Link>
          <Link
            href="/tools/transcription"
            className="rounded-full px-2 py-1 text-[10px] sm:text-xs font-semibold text-secondary-color no-underline transition-colors hover:text-primary-color whitespace-nowrap"
          >
            {tTools("items.transcription.name")}
          </Link>
        </nav>
      </div>
    </header>
  );
}
