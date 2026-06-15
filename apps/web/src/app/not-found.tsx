import { Container } from "@/components/ui/container";
import { Stack } from "@/components/ui/stack";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";

export default function RootNotFound() {
  return (
    <Container>
      <Stack gap={4} className="items-center justify-center py-20 text-center">
        <Heading level={1}>404</Heading>
        <Heading level={2}>غير موجود / Not found</Heading>
        <Text color="muted">الصفحة غير متوفرة — This page doesn&apos;t exist.</Text>
      </Stack>
    </Container>
  );
}
