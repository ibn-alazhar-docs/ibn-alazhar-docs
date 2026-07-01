import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { generatePageMetadata } from "@/lib/frontend/metadata";
import { RegisterForm } from "@/components/auth/register-form";

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
      <div className="mx-auto mb-6 h-1 w-12 rounded-full bg-gold" />
      <Link href="/" className="inline-block mb-8">
        <Image
          src="/logo.png"
          alt={tApp("name")}
          width={48}
          height={48}
          className="mx-auto h-12 w-auto"
          priority
        />
      </Link>
      <h2 className="text-lg font-bold tracking-[0.02em] text-primary-color sm:text-xl">
        {t("registerTitle")}
      </h2>
      <p className="mt-2 text-xs text-muted-color">
        {t("hasAccount")}{" "}
        <Link
          href="/login"
          className="font-semibold text-primary-color underline underline-offset-4 decoration-1 decoration-primary-color/20 hover:decoration-primary-color/50"
        >
          {t("signIn")}
        </Link>
      </p>
      <RegisterForm />
    </div>
  );
}
