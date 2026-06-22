import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { generatePageMetadata } from "@/lib/metadata";
import { auth } from "@/lib/auth";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { Hero } from "@/components/sections/hero";
import { KnowledgeAreas } from "@/components/sections/knowledge-areas";
import { Features } from "@/components/sections/features";
import { CTASection } from "@/components/sections/cta-section";

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
          <svg
            viewBox="0 0 100 100"
            fill="none"
            className="geometric-star h-4 w-4"
            aria-hidden="true"
          >
            <polygon
              points="50,5 63,38 98,38 70,60 79,95 50,75 21,95 30,60 2,38 37,38"
              stroke="currentColor"
              strokeWidth="0.8"
              fill="none"
            />
          </svg>
        </div>
        <KnowledgeAreas />
        <Features />
        <CTASection isLoggedIn={isLoggedIn} />
      </main>
      <PublicFooter locale={locale} tagline={tFooter("tagline")} copyright={tFooter("copyright")} />
    </div>
  );
}
