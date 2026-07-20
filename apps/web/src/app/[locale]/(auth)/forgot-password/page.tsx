import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { generatePageMetadata } from "@/ui/metadata";
import { ForgotPasswordForm } from "@/ui/auth/forgot-password-form";

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
    <div className="text-center">
      <Link href="/" className="inline-block mb-6">
        <Image
          src="/logo.svg"
          alt={tApp("name")}
          width={48}
          height={48}
          className="mx-auto h-12 w-auto"
          priority
        />
      </Link>
      <div className="gold-divider mx-auto mb-6" />
      <h2 className="heading-display text-xl font-bold tracking-[0.02em] text-primary-color sm:text-2xl">
        {t("forgotPasswordTitle")}
      </h2>
      <p className="mt-2 text-sm text-muted-color">{t("forgotPasswordDescription")}</p>
      <ForgotPasswordForm />
    </div>
  );
}
