"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTransition } from "react";

export function LocaleToggle() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const [isPending, startTransition] = useTransition();

  const nextLocale = locale === "ar" ? "en" : "ar";

  function switchLocale() {
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <button
      onClick={switchLocale}
      disabled={isPending}
      className="flex items-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-semibold tracking-[0.06em] text-muted-color transition-all hover:bg-hover hover:text-primary-color disabled:opacity-40"
      aria-label={nextLocale === "ar" ? "Switch to Arabic" : "Switch to English"}
    >
      {locale === "ar" ? "EN" : "AR"}
    </button>
  );
}
