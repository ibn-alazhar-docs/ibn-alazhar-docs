import type { ReactNode } from "react";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { cairo, amiri } from "@/lib/frontend/fonts";
import { ThemeWrapper } from "@/components/theme/theme-wrapper";
import { generatePageMetadata } from "@/lib/frontend/metadata";
import { Toaster } from "sonner";

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

  const messages = await getMessages();

  const t = await getTranslations({ locale, namespace: "a11y" });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Ibn Al-Azhar Docs",
    description: "Document processing and text search",
    url: `https://ibnalazhar-docs.vercel.app/${locale}`,
    inLanguage: locale === "ar" ? "ar" : "en",
    publisher: {
      "@type": "Organization",
      name: "Ibn Al-Azhar Docs",
    },
  };

  return (
    <div className={`${amiri.variable} ${cairo.variable}`}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:bg-[var(--color-primary-600)] focus:text-white focus:px-4 focus:py-2 focus:rounded"
      >
        {t("skipToContent")}
      </a>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <NextIntlClientProvider locale={locale} messages={messages}>
        <ThemeWrapper>{children}</ThemeWrapper>
        <Toaster
          position="top-center"
          dir={locale === "ar" ? "rtl" : "ltr"}
          toastOptions={{
            style: {
              fontFamily: locale === "ar" ? "Cairo, sans-serif" : "inherit",
            },
          }}
        />
      </NextIntlClientProvider>
    </div>
  );
}
