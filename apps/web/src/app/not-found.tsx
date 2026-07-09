import { Container } from "@/ui/container";
import { Stack } from "@/ui/stack";
import { Heading } from "@/ui/heading";
import { Text } from "@/ui/text";

export default function RootNotFound() {
  return (
    <Container>
      <Stack gap={4} className="items-center justify-center py-20 text-center">
        <Heading level={1}>404</Heading>
        <Heading level={2}>غير موجود / Not found</Heading>
        <Text color="muted">الصفحة غير متوفرة — This page doesn&apos;t exist.</Text>
        <a
          href="/"
          className="rounded-lg bg-btn-primary px-4 py-2 text-sm font-medium text-btn-primary-text hover:opacity-90 transition-colors"
        >
          الرئيسية / Home
        </a>
      </Stack>
    </Container>
  );
}
