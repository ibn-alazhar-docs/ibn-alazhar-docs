import type { ReactNode } from "react";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { ThemeWrapper } from "@/ui/theme/theme-wrapper";
import { RouteProgress } from "@/ui/layout/route-progress";
import { generatePageMetadata } from "@/ui/metadata";
import { BRAND_NAME, BRAND_POSITIONING } from "@/ui/brand";
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
  const locale = resolved.locale as "ar";

  if (!routing.locales.includes(locale)) {
    notFound();
  }

  const messages = await getMessages();

  const t = await getTranslations({ locale, namespace: "a11y" });

  const appUrl =
    process.env.APP_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://ibnalazhar-docs.hf.space");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND_NAME.ar,
    description: BRAND_POSITIONING,
    url: `${appUrl}/${locale}`,
    inLanguage: "ar",
    publisher: {
      "@type": "Organization",
      name: BRAND_NAME.ar,
    },
  };

  return (
    <div>
      <a
        href="#main-content"
        className="fixed -top-96 start-4 z-[9999] rounded bg-[var(--color-primary-600)] ps-4 pe-4 py-2 text-white opacity-0 transition-all focus:top-4 focus:opacity-100"
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
          dir="rtl"
          toastOptions={{
            style: {
              // Toasts portal to <body>, so they need the brand token spelled out.
              // "Cairo" here was a pre-brandbook leftover and matched no loaded face.
              fontFamily: "var(--font-family-body)",
            },
          }}
        />
        <RouteProgress />
      </NextIntlClientProvider>
    </div>
  );
}
