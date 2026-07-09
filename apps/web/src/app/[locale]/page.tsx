import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { generatePageMetadata } from "@/ui/metadata";
import { auth } from "@/middleware/auth";
import { PublicHeader } from "@/ui/layout/public-header";
import { PublicFooter } from "@/ui/layout/public-footer";
import { Hero } from "@/ui/sections/hero";
import { KnowledgeAreas } from "@/ui/sections/knowledge-areas";
import { Features } from "@/ui/sections/features";
import { CTASection } from "@/ui/sections/cta-section";
import { GeometricStar } from "@/ui/geometric-star";

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "app" });
  return generatePageMetadata({
    locale,
    title: t("name"),
    description: t("tagline"),
    path: "",
  });
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;

  const [tNav, tFooter, tHero] = await Promise.all([
    getTranslations({ locale, namespace: "nav" }),
    getTranslations({ locale, namespace: "footer" }),
    getTranslations({ locale, namespace: "section.hero" }),
  ]);

  const session = await auth();
  const isLoggedIn = !!session?.user;

  return (
    <div className="landing-page min-h-screen overflow-x-hidden">
      <PublicHeader
        locale={locale}
        signInLabel={tNav("signIn")}
        signUpLabel={tNav("signUp")}
        mainNavLabel={tNav("mainNav")}
        isLoggedIn={isLoggedIn}
      />
      <main id="main-content">
        <Hero
          locale={locale}
          eyebrow={tHero("eyebrow")}
          title={tHero("title")}
          subtitle={tHero("subtitle")}
          cta={tHero("cta")}
          isLoggedIn={isLoggedIn}
        />
        <div className="geometric-divider py-2">
          <GeometricStar className="geometric-star h-4 w-4" />
        </div>
        <KnowledgeAreas />
        <Features />
        <CTASection isLoggedIn={isLoggedIn} />
      </main>
      <PublicFooter locale={locale} tagline={tFooter("tagline")} copyright={tFooter("copyright")} />
    </div>
  );
}
