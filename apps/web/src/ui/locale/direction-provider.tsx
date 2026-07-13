"use client";

import { useEffect, type ReactNode } from "react";
import { useLocale } from "next-intl";

interface DirectionProviderProps {
  children: ReactNode;
}

// The <html dir/lang> is set once on the server (root layout) and reinforced by
// the pre-paint inline script. However, switching locales via next-intl's SPA
// navigation does NOT re-render the root layout, so the document direction would
// stay stuck on the previous locale (e.g. Arabic rendered LTR after leaving
// English). This provider keeps <html dir/lang> in sync with the active locale
// on every change.
export function DirectionProvider({ children }: DirectionProviderProps) {
  const locale = useLocale();

  useEffect(() => {
    const isRtl = locale !== "en";
    const dir = isRtl ? "rtl" : "ltr";
    const el = document.documentElement;
    if (el.getAttribute("dir") !== dir) el.setAttribute("dir", dir);
    if (el.getAttribute("lang") !== locale) el.setAttribute("lang", locale);
  }, [locale]);

  return <>{children}</>;
}
