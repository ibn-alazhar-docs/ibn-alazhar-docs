import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { generatePageMetadata } from "@/ui/metadata";
import { ForgotPasswordForm } from "@/ui/auth/forgot-password-form";
import { AuthPageShell } from "../auth-page-shell";

interface ForgotPasswordPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: ForgotPasswordPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return generatePageMetadata({
    locale,
    title: t("forgotPasswordTitle"),
    description: t("forgotPasswordTitle"),
    path: "forgot-password",
  });
}

export default async function ForgotPasswordPage(props: ForgotPasswordPageProps) {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "auth" });
  const tApp = await getTranslations({ locale, namespace: "app" });

  return (
    <AuthPageShell
      title={t("forgotPasswordTitle")}
      logoAlt={tApp("name")}
      subtitle={t("forgotPasswordDescription")}
    >
      <ForgotPasswordForm />
    </AuthPageShell>
  );
}
