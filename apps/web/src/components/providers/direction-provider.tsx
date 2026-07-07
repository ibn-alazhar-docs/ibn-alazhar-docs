"use client";

import { useLocale } from "next-intl";
import { useEffect } from "react";

export function DirectionProvider({ children }: { children?: React.ReactNode }) {
  const locale = useLocale();

  useEffect(() => {
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = locale;
  }, [locale]);

  return <>{children || null}</>;
}
