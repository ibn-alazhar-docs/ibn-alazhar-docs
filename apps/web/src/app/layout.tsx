import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { firaCode, cairo, amiri } from "@/ui/fonts";
import "@/styles/globals.css";

interface RootLayoutProps {
  children: ReactNode;
}

const siteUrl = "https://ibnalazhar-docs.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#16A34A",
  colorScheme: "light dark",
};

function getDirFromLocale(locale: string): string {
  return locale === "en" ? "ltr" : "rtl";
}

function getLangFromLocale(locale: string): string {
  return locale === "en" ? "en" : "ar";
}

export default async function RootLayout({ children }: Readonly<RootLayoutProps>) {
  const h = await headers();
  const locale = h.get("x-locale") ?? "ar";
  const dir = getDirFromLocale(locale);
  const lang = getLangFromLocale(locale);

  return (
    <html lang={lang} dir={dir} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var path = window.location.pathname;
                  var match = path.match(/^\\/(ar|en)(\\/|$)/);
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
      <body className={`${firaCode.variable} ${cairo.variable} ${amiri.variable} bg-page animated-bg min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  );
}
