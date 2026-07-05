"use client";

import { SunIcon, MoonIcon } from "@/components/ui/icons";
import { useTheme } from "@/components/theme/theme-provider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="flex items-center justify-center rounded-lg p-1.5 text-muted-color transition-colors hover:bg-hover hover:text-[var(--text-primary)]"
      aria-label={theme === "dark" ? "التبديل إلى الوضع الفاتح" : "التبديل إلى الوضع الداكن"}
    >
      {theme === "dark" ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
    </button>
  );
}
