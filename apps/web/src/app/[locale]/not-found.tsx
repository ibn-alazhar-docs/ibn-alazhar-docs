import { Container } from "@/ui/container";
import { Stack } from "@/ui/stack";
import { Heading } from "@/ui/heading";
import { Text } from "@/ui/text";

export default function LocaleNotFound() {
  return (
    <Container>
      <Stack gap={4} className="items-center justify-center py-20 text-center">
        <Heading level={1}>404</Heading>
        <Heading level={2}>غير موجود</Heading>
        <Text color="muted">الصفحة غير متوفرة</Text>
        <a
          href="/"
          className="rounded-lg bg-btn-primary px-4 py-2 text-sm font-medium text-btn-primary-text hover:opacity-90 transition-colors"
        >
          الرئيسية
        </a>
      </Stack>
    </Container>
  );
}
