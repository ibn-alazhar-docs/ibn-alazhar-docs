"use client";

import { Container } from "@/components/ui/container";
import { Stack } from "@/components/ui/stack";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootError({ reset }: ErrorProps) {
  return (
    <Container>
      <div role="alert" aria-live="assertive">
        <Stack gap={4} className="items-center justify-center py-20 text-center">
          <Heading level={2}>خطأ / Error</Heading>
          <Text color="muted">تعذر تحميل الصفحة — Something went wrong.</Text>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-btn-primary px-4 py-2 text-sm font-medium text-btn-primary-text hover:opacity-90 transition-colors"
          >
            إعادة المحاولة / Try again
          </button>
        </Stack>
      </div>
    </Container>
  );
}
