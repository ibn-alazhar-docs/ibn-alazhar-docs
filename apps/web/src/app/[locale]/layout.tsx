import type { ReactNode } from "react";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { cairo, amiri } from "@/lib/fonts";
import arMessages from "@/messages/ar.json";
import enMessages from "@/messages/en.json";
import { ThemeWrapper } from "@/components/theme/theme-wrapper";
import { generatePageMetadata } from "@/lib/metadata";

const messagesMap: Record<string, typeof arMessages> = {
  ar: arMessages,
  en: enMessages,
};

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "app" });
  return generatePageMetadata({
    locale,
    title: t("name"),
    description: t("tagline"),
  });
}

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const resolved = await params;
  const locale = resolved.locale as "ar" | "en";

  if (!routing.locales.includes(locale)) {
    notFound();
  }

  const messages = messagesMap[locale]!;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Ibn Al-Azhar",
    description: "Document processing and text search",
    url: `https://ibnalazhar-docs.vercel.app/${locale}`,
    inLanguage: locale === "ar" ? "ar" : "en",
    publisher: {
      "@type": "Organization",
      name: "Ibn Al-Azhar",
    },
  };

  return (
    <div className={`${amiri.variable} ${cairo.variable}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <NextIntlClientProvider locale={locale} messages={messages}>
        <ThemeWrapper>{children}</ThemeWrapper>
      </NextIntlClientProvider>
    </div>
  );
}
