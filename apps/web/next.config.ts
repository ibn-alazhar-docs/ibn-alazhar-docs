import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "*.ibnalazhardocs.workers.dev" },
    ],
  },
  experimental: {
    viewTransition: true,
  },
  serverExternalPackages: ["@ibn-al-azhar-docs/pipeline", "pdfmake"],
  typescript: {
    ignoreBuildErrors: false,
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.woff2?$/,
      type: "asset/resource",
    });
    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src 'self'${process.env.NODE_ENV === "development" ? " 'unsafe-inline' 'unsafe-eval'" : ""}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' blob: data: https://*.r2.cloudflarestorage.com https://*.ibnalazhardocs.workers.dev",
              "font-src 'self' data:",
              `connect-src 'self' https:${process.env.NODE_ENV === "development" ? " http://localhost:*" : ""}`,
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
      {
        source: "/favicon.svg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, immutable",
          },
        ],
      },
    ];
  },
};

// Cloudflare Workers dev support — only import when running under wrangler
if (process.env.CLOUDFLARE_WORKERS) {
  import("@opennextjs/cloudflare")
    .then((mod) => {
      mod.initOpenNextCloudflareForDev();
    })
    .catch(() => {
      // Not in Cloudflare environment or failed to load — skip
    });
}

export default withSentryConfig(withNextIntl(nextConfig), {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
});
