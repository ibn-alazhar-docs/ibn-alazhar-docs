import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";

interface RootLayoutProps {
  children: ReactNode;
}

const siteUrl = "https://ibnalazhar-docs.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1A5C3A",
  colorScheme: "light dark",
};

export default function RootLayout({ children }: Readonly<RootLayoutProps>) {
  return (
    <html lang="ar" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        {/* Inline script sets lang/dir before first paint since root layout has no locale context. DirectionProvider in [locale]/layout.tsx keeps it in sync. */}
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
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-page">{children}</body>
    </html>
  );
}
