"use client";

import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LocaleToggle } from "@/components/locale/locale-toggle";
import { MenuIcon, CloseIcon, LogoutIcon } from "@/components/ui/icons";

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
      className="glass-header sticky top-0 z-30"
      style={{ viewTransitionName: "dashboard-header" }}
    >
      <div className="mx-auto flex h-16 max-w-full items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuToggle}
            className="inline-flex size-10 items-center justify-center rounded-lg text-muted-color hover:bg-hover hover:text-primary-color transition-colors lg:hidden"
            aria-label={isMenuOpen ? tUi("menuClose") : tUi("menuOpen")}
          >
            {isMenuOpen ? <CloseIcon className="size-5" /> : <MenuIcon className="size-5" />}
          </button>
          <Link href="/dashboard" className="hidden sm:flex sm:items-center sm:gap-2.5">
            <Image src="/logo.png" alt={t("name")} width={32} height={32} className="h-8 w-auto" />
            <span className="heading-display-sm text-xs font-bold tracking-tight text-primary-color">
              {t("name")}
            </span>
          </Link>
          {isAdmin && (
            <span className="hidden rounded-full bg-success/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success sm:inline-block">
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
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-color transition-all hover:bg-danger/5 hover:text-danger"
            aria-label={tCommon("logout")}
          >
            <LogoutIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{tCommon("logout")}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
