"use client";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center bg-page">
          <div className="text-center max-w-md mx-auto p-8">
            <h1 className="text-2xl font-bold text-primary-color mb-2">
              خطأ عام / Global Error
            </h1>
            <p className="text-muted-color mb-6">
              حدث خطأ غير متوقع — An unexpected error occurred.
            </p>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg bg-btn-primary px-6 py-3 text-sm font-medium text-btn-primary-text hover:opacity-90 transition-colors"
            >
              إعادة المحاولة / Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
