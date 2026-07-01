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
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950">
        <h2 className="mb-2 text-lg font-bold text-red-800 dark:text-red-200">حدث خطأ غير متوقع</h2>
        <p className="text-sm text-red-600 dark:text-red-400">
          {error.message || "حدث خطأ أثناء تحميل الصفحة"}
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-red-500">Error ID: {error.digest}</p>
        )}
      </div>
      <button
        onClick={reset}
        className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
      >
        حاول مرة أخرى
      </button>
    </div>
  );
}
