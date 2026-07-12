import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/middleware/auth";
import { PublicHeader } from "@/ui/layout/public-header";
import { PublicFooter } from "@/ui/layout/public-footer";

interface SiteLayoutProps {
  children: ReactNode;
}

export default async function SiteLayout({ children }: SiteLayoutProps) {
  const locale = await getLocale();
  const [tNav, tFooter] = await Promise.all([
    getTranslations({ locale, namespace: "nav" }),
    getTranslations({ locale, namespace: "footer" }),
  ]);

  const session = await auth();
  const isLoggedIn = !!session?.user;

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <PublicHeader
        locale={locale}
        signInLabel={tNav("signIn")}
        signUpLabel={tNav("signUp")}
        mainNavLabel={tNav("mainNav")}
        isLoggedIn={isLoggedIn}
      />
      <div className="flex-1">{children}</div>
      <PublicFooter locale={locale} tagline={tFooter("tagline")} copyright={tFooter("copyright")} />
    </div>
  );
}
