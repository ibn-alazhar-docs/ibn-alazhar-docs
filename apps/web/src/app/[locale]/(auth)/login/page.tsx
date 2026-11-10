import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { generatePageMetadata } from "@/ui/metadata";
import { LoginForm } from "@/ui/auth/login-form";
import { AuthPageShell } from "../auth-page-shell";

export const dynamic = "force-dynamic";

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
    <AuthPageShell
      title={t("loginTitle")}
      logoAlt={tApp("name")}
      subtitle={
        <>
          {t("noAccount")}{" "}
          <Link
            href="/register"
            className="font-semibold text-gold underline underline-offset-4 decoration-1 decoration-gold/20 hover:decoration-gold/50 transition-colors"
          >
            {t("signUp")}
          </Link>
        </>
      }
    >
      <LoginForm showGoogle={!!process.env.GOOGLE_CLIENT_ID} />
    </AuthPageShell>
  );
}
