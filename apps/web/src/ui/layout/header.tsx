"use client";

import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "@/ui/theme/theme-toggle";
import { LocaleToggle } from "@/ui/locale/locale-toggle";
import { SearchBar } from "@/ui/search/search-bar";
import { useRouter } from "@/i18n/navigation";
import { MenuIcon, CloseIcon, LogoutIcon } from "@/ui/icons";

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
  const router = useRouter();

  const isAdmin = role === "ADMIN";

  return (
    <header
      role="banner"
      className="glass-header sticky top-0 z-30"
      style={{ viewTransitionName: "dashboard-header" }}
    >
      <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 lg:px-8">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onMenuToggle}
            className="inline-flex size-8 sm:size-10 items-center justify-center rounded-lg text-muted-color hover:bg-hover hover:text-primary-color transition-colors lg:hidden shrink-0"
            aria-label={isMenuOpen ? tUi("menuClose") : tUi("menuOpen")}
          >
            {isMenuOpen ? (
              <CloseIcon className="size-4 sm:size-5" />
            ) : (
              <MenuIcon className="size-4 sm:size-5" />
            )}
          </button>
          <Link
            href="/dashboard"
            className="hidden sm:flex sm:items-center sm:gap-2 lg:gap-2.5 min-w-0"
          >
            <Image
              src="/logo.png"
              alt={t("name")}
              width={32}
              height={32}
              className="h-6 sm:h-7 lg:h-8 w-auto shrink-0"
            />
            <span className="heading-display-sm text-[10px] sm:text-xs font-bold tracking-tight text-primary-color truncate max-w-[100px] sm:max-w-[120px] lg:max-w-none">
              {t("name")}
            </span>
          </Link>
          {isAdmin && (
            <span className="hidden lg:inline-block rounded-full bg-success/10 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-success shrink-0">
              Admin
            </span>
          )}
        </div>

        <div className="hidden md:flex flex-1 max-w-lg lg:max-w-xl mx-4 lg:mx-6">
          <SearchBar onSearch={(query) => router.push(`/search?q=${encodeURIComponent(query)}`)} />
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1">
          <span className="hidden lg:inline text-[10px] sm:text-xs text-very-muted truncate max-w-[100px]">
            {t("tagline")}
          </span>
          <LocaleToggle />
          <ThemeToggle />
          <button
            onClick={() => signOut({ callbackUrl: `/${locale}` })}
            className="flex items-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold text-muted-color transition-all hover:bg-danger/5 hover:text-danger shrink-0"
            aria-label={tCommon("logout")}
          >
            <LogoutIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline truncate">{tCommon("logout")}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
