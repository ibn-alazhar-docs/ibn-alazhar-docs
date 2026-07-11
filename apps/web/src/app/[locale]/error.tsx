"use client";

import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function LocaleError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="rounded-lg border border-danger bg-danger/10 p-6">
        <h2 className="mb-2 text-lg font-bold text-danger">حدث خطأ</h2>
        <p className="text-sm text-danger">{error.message || "حدث خطأ أثناء تحميل الصفحة"}</p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-very-muted">Error ID: {error.digest}</p>
        )}
      </div>
      <button
        onClick={reset}
        className="rounded-lg border border-line px-4 py-2 text-sm text-primary-color hover:bg-hover transition-colors"
      >
        حاول مرة أخرى
      </button>
    </div>
  );
}
