"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const LOCALE_MAP: Record<string, { lang: string; dir: "rtl" | "ltr" }> = {
  ar: { lang: "ar", dir: "rtl" },
  en: { lang: "en", dir: "ltr" },
};

const DEFAULT_LOCALE: { lang: string; dir: "rtl" | "ltr" } = { lang: "ar", dir: "rtl" };

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const pathname = usePathname();
  const locale = pathname.split("/")[1] ?? "ar";
  const resolved = LOCALE_MAP[locale] ?? DEFAULT_LOCALE;

  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang={resolved.lang} dir={resolved.dir}>
      <body>
        <div className="flex min-h-screen items-center justify-center bg-page">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="mb-6 text-6xl" aria-hidden>
              ⚠
            </div>
            <h1 className="text-2xl font-bold text-primary-color mb-2">خطأ عام</h1>
            <p className="text-muted-color mb-2">حدث خطأ</p>
            {error.digest && (
              <p className="text-xs text-muted-color/60 mb-6 font-mono"> digest: {error.digest}</p>
            )}
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={reset}
                className="rounded-lg bg-btn-primary px-6 py-3 text-sm font-medium text-btn-primary-text hover:opacity-90 transition-colors"
              >
                إعادة المحاولة
              </button>
              <a
                href="/"
                className="rounded-lg border border-line px-6 py-3 text-sm font-medium text-primary-color hover:bg-hover transition-colors"
              >
                الرئيسية
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
