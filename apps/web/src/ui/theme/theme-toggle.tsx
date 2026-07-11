"use client";

import { SunIcon, MoonIcon } from "@/ui/icons";
import { useTheme } from "@/ui/theme/theme-provider";
import { useTranslations } from "next-intl";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const t = useTranslations("theme");

  return (
    <button
      onClick={toggle}
      className="flex items-center justify-center rounded-lg p-1.5 text-muted-color transition-colors hover:bg-hover hover:text-[var(--text-primary)]"
      aria-label={theme === "dark" ? t("toggleLight") : t("toggleDark")}
    >
      {theme === "dark" ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
    </button>
  );
}
