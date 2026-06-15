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
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1A5C3A",
};

export default function RootLayout({ children }: Readonly<RootLayoutProps>) {
  return (
    <html suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
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
      <body className="bg-page">
        <a
          href="#main-content"
          className="fixed -translate-y-full left-4 top-2 z-[100] rounded-lg bg-btn-primary px-4 py-2 text-xs font-bold text-btn-primary-text no-underline transition-transform focus:translate-y-0 focus:outline-2 focus:outline-[var(--ring-focus)]"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
