"use client";

import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LocaleToggle } from "@/components/locale/locale-toggle";

interface HeaderProps {
  onMenuToggle: () => void;
  isMenuOpen: boolean;
  role: string;
}

export function Header({ onMenuToggle, isMenuOpen, role }: HeaderProps) {
  const t = useTranslations("app");
  const tUi = useTranslations("ui");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const isAdmin = role === "ADMIN";

  return (
    <header
      role="banner"
      className="glass-header sticky top-0 z-50"
      style={{ viewTransitionName: "dashboard-header" }}
    >
      <div className="mx-auto flex h-16 max-w-full items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuToggle}
            className="inline-flex size-10 items-center justify-center rounded-lg text-muted-color hover:bg-hover hover:text-primary-color lg:hidden"
            aria-label={isMenuOpen ? tUi("menuClose") : tUi("menuOpen")}
          >
            <svg
              className="size-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              )}
            </svg>
          </button>
          <Link href="/dashboard" className="hidden sm:flex sm:items-center sm:gap-2">
            <Image src="/logo.png" alt={t("name")} width={32} height={32} className="h-8 w-auto" />
            <span className="heading-display-sm text-xs font-bold tracking-tight text-primary-color">
              {t("name")}
            </span>
          </Link>
          {isAdmin && (
            <span className="hidden rounded-full bg-[var(--success-bg)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--success)] sm:inline-block">
              Admin
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <span className="hidden text-xs text-very-muted sm:inline">{t("tagline")}</span>
          <LocaleToggle />
          <ThemeToggle />
          <button
            onClick={() => signOut({ callbackUrl: `/${locale}` })}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-color transition-all hover:bg-hover hover:text-[var(--danger)]"
            title={tCommon("logout")}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
              />
            </svg>
            <span className="hidden sm:inline">{tCommon("logout")}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
