import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { generatePageMetadata } from "@/ui/metadata";
import { ResetPasswordForm } from "@/ui/auth/reset-password-form";
import { AuthPageShell } from "../auth-page-shell";

interface ResetPasswordPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: ResetPasswordPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return generatePageMetadata({
    locale,
    title: t("resetPasswordTitle"),
    description: t("resetPasswordTitle"),
    path: "reset-password",
  });
}

export default async function ResetPasswordPage(props: ResetPasswordPageProps) {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "auth" });
  const tApp = await getTranslations({ locale, namespace: "app" });

  return (
    <AuthPageShell
      title={t("resetPasswordTitle")}
      logoAlt={tApp("name")}
      subtitle={t("resetPasswordDescription")}
    >
      <ResetPasswordForm />
    </AuthPageShell>
  );
}
