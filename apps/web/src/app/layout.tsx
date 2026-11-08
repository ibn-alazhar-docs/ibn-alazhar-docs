import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { firaCode, almarai, amiri } from "@/ui/fonts";
import { BRAND_NAME, BRAND_OG_IMAGE, BRAND_POSITIONING } from "@/ui/brand";
import "@/styles/globals.css";

interface RootLayoutProps {
  children: ReactNode;
}

const siteUrl =
  process.env.APP_URL ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://ibnalazhar-docs.hf.space");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  openGraph: {
    siteName: BRAND_NAME.ar,
    type: "website",
    locale: "ar_AR",
    images: [{ url: BRAND_OG_IMAGE, width: 1200, height: 630, alt: BRAND_POSITIONING }],
  },
  twitter: {
    card: "summary_large_image",
    images: [BRAND_OG_IMAGE],
  },
  icons: {
    icon: [
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon-64.png", sizes: "64x64", type: "image/png" },
    ],
    shortcut: "/brand/favicon-64.png",
    apple: "/brand/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#127E87",
  colorScheme: "light dark",
};

function getDirFromLocale(): string {
  return "rtl";
}

function getLangFromLocale(): string {
  return "ar";
}

export default async function RootLayout({ children }: Readonly<RootLayoutProps>) {
  await headers();
  const dir = getDirFromLocale();
  const lang = getLangFromLocale();

  return (
    <html
      lang={lang}
      dir={dir}
      className={`${firaCode.variable} ${almarai.variable} ${amiri.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var path = window.location.pathname;
                  var match = path.match(/^\\/(ar)(\\/|$)/);
                  var locale = match ? match[1] : 'ar';
                  document.documentElement.lang = locale;
                  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
                  var stored = localStorage.getItem('theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var isDark = stored === 'dark' || ((stored === 'system' || !stored) && prefersDark);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  }
                  if ('serviceWorker' in navigator) {
                    window.addEventListener('load', function() {
                      navigator.serviceWorker.register('/sw.js').catch(function(err) {});
                    });
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-page font-body min-h-screen antialiased">{children}</body>
    </html>
  );
}
