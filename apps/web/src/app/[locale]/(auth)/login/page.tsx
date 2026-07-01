import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { generatePageMetadata } from "@/lib/frontend/metadata";
import { LoginForm } from "@/components/auth/login-form";

interface LoginPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: LoginPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return generatePageMetadata({
    locale,
    title: t("loginTitle"),
    description: t("loginTitle"),
    path: "login",
  });
}

export default async function LoginPage(props: LoginPageProps) {
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
        {t("loginTitle")}
      </h2>
      <p className="mt-2 text-xs text-muted-color">
        {t("noAccount")}{" "}
        <Link
          href="/register"
          className="font-semibold text-primary-color underline underline-offset-4 decoration-1 decoration-primary-color/20 hover:decoration-primary-color/50"
        >
          {t("signUp")}
        </Link>
      </p>
      <LoginForm />
    </div>
  );
}
