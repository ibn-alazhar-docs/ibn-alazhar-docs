"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

interface AuthErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AuthError({ error, reset }: AuthErrorProps) {
  const t = useTranslations("auth");

  useEffect(() => {
    console.error("[AuthError]", error);
  }, [error]);

  return (
    <div role="alert" aria-live="assertive" className="text-center">
      <h2 className="heading-display text-xl font-bold text-primary-color">{t("loginTitle")}</h2>
      <p className="mt-2 text-sm text-muted-color">تعذر تحميل الصفحة</p>
      {error.digest && (
        <p className="mt-1 text-xs font-mono text-very-muted">digest: {error.digest}</p>
      )}
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-lg bg-btn-primary px-4 py-2 text-sm font-medium text-btn-primary-text hover:opacity-90 transition-colors"
      >
        إعادة المحاولة
      </button>
    </div>
  );
}
