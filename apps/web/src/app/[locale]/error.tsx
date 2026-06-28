"use client";

import { useEffect } from "react";
import { Container } from "@/components/ui/container";
import { Stack } from "@/components/ui/stack";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";

interface LocaleErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function LocaleError({ error, reset }: LocaleErrorProps) {
  useEffect(() => {
    console.error("[LocaleError]", error);
  }, [error]);

  return (
    <Container>
      <div role="alert" aria-live="assertive">
        <Stack gap={4} className="items-center justify-center py-20 text-center">
          <Heading level={2}>خطأ / Error</Heading>
          <Text color="muted">تعذر تحميل الصفحة — Something went wrong.</Text>
          {error.digest && (
            <Text color="muted" className="text-xs font-mono">
              digest: {error.digest}
            </Text>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-lg bg-btn-primary px-4 py-2 text-sm font-medium text-btn-primary-text hover:opacity-90 transition-colors"
            >
              إعادة المحاولة / Try again
            </button>
            <a
              href="/"
              className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-primary-color hover:bg-hover transition-colors"
            >
              الرئيسية / Home
            </a>
          </div>
        </Stack>
      </div>
    </Container>
  );
}
