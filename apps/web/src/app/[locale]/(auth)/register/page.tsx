import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { generatePageMetadata } from "@/ui/metadata";
import { RegisterForm } from "@/ui/auth/register-form";

interface RegisterPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: RegisterPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return generatePageMetadata({
    locale,
    title: t("registerTitle"),
    description: t("registerTitle"),
    path: "register",
  });
}

export default async function RegisterPage(props: RegisterPageProps) {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "auth" });
  const tApp = await getTranslations({ locale, namespace: "app" });

  return (
    <div className="text-center">
      <Link href="/" className="inline-block mb-6">
        <Image
          src="/logo.png"
          alt={tApp("name")}
          width={48}
          height={48}
          className="mx-auto h-12 w-auto"
          priority
        />
      </Link>
      <div className="gold-divider mx-auto mb-6" />
      <h2 className="heading-display text-xl font-bold tracking-[0.02em] text-primary-color sm:text-2xl">
        {t("registerTitle")}
      </h2>
      <p className="mt-2 text-sm text-muted-color">
        {t("hasAccount")}{" "}
        <Link
          href="/login"
          className="font-semibold text-gold underline underline-offset-4 decoration-1 decoration-gold/20 hover:decoration-gold/50 transition-colors"
        >
          {t("signIn")}
        </Link>
      </p>
      <RegisterForm />
    </div>
  );
}
