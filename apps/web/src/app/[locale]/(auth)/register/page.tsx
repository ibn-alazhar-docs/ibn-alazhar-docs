import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { generatePageMetadata } from "@/ui/metadata";
import { RegisterForm } from "@/ui/auth/register-form";
import { AuthPageShell } from "../auth-page-shell";

export const dynamic = "force-dynamic";

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
    <AuthPageShell
      title={t("registerTitle")}
      logoAlt={tApp("name")}
      subtitle={
        <>
          {t("hasAccount")}{" "}
          <Link
            href="/login"
            className="font-semibold text-gold underline underline-offset-4 decoration-1 decoration-gold/20 hover:decoration-gold/50 transition-colors"
          >
            {t("signIn")}
          </Link>
        </>
      }
    >
      <RegisterForm showGoogle={!!process.env.GOOGLE_CLIENT_ID} />
    </AuthPageShell>
  );
}
