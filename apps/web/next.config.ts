import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";
import bundleAnalyzer from "@next/bundle-analyzer";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    // Serve images unoptimized: avoids the Next image optimizer 400 on the
    // HuggingFace Spaces proxy (no upstream to optimize) and works with the
    // static SVG logo shipped in public/.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "*.ibnalazhardocs.workers.dev" },
    ],
  },
  experimental: {
    viewTransition: true,
    // Force a single serial build worker. On the HuggingFace cpu-basic build
    // machine, parallel webpack workers (memoryBasedWorkersCount) blow past
    // the RAM limit and the build is OOM-killed (exit 137). A single worker
    // uses far less peak memory at the cost of a slower build.
    cpus: 1,
    memoryBasedWorkersCount: false,
  },
  serverExternalPackages: [
    "@ibn-al-azhar-docs/pipeline",
    "@ibn-al-azhar-docs/database",
    "@ibn-al-azhar-docs/shared",
    "pg",
    "pg-promise",
    "ioredis",
    "redis",
    "google-auth-library",
    "googleapis",
    "@google-cloud/storage",
    "pdfmake",
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.woff2?$/,
      type: "asset/resource",
    });
    // Only the server build may externalize Node builtins / native packages —
    // the browser bundle must keep its own polyfills.
    const isServer = typeof config.target === "string" && config.target.includes("node");
    if (isServer) {
      // Heavy native deps that webpack cannot bundle (they require Node core
      // builtins like http/https/path/crypto). They are required normally at
      // runtime by Node, which resolves node: builtins fine. The
      // @ibn-al-azhar-docs/* workspace packages are handled by
      // `serverExternalPackages` (the standalone server loads those correctly)
      // — do NOT externalize them here or Next's runtime throws
      // "Native module not found".
      const externalPackages = [
        "pg",
        "pg-promise",
        "ioredis",
        "redis",
        "bullmq",
        "google-auth-library",
        "googleapis",
        "@googleapis/drive",
        "@google-cloud/storage",
        "https-proxy-agent",
        "agent-base",
        "gaxios",
      ];
      // All Node core builtins (bare form, e.g. "crypto", "stream", "path").
      // Externalizing them makes webpack emit `require("crypto")` which Node
      // resolves at runtime. We intentionally do NOT externalize the
      // "node:"-prefixed form (Next's standalone loader rejects that).
      let builtins: Set<string> = new Set();
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        builtins = new Set(require("node:module").builtinModules);
      } catch {
        builtins = new Set();
      }
      config.externals = config.externals || [];
      config.externals.push(({ request }, callback) => {
        if (!request) return callback();
        if (builtins.has(request)) {
          return callback(null, "commonjs " + request);
        }
        if (externalPackages.includes(request)) {
          return callback(null, "commonjs " + request);
        }
        return callback();
      });
    }
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
              `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' blob: data: https://*.r2.cloudflarestorage.com https://*.ibnalazhardocs.workers.dev https://lh3.googleusercontent.com",
              "font-src 'self' data:",
              `connect-src 'self' https:${process.env.NODE_ENV === "development" ? " http://localhost:* ws://localhost:*" : ""}`,
              "frame-src 'none'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self' https://accounts.google.com",
              "object-src 'none'",
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

const enableSentry = process.env.DISABLE_SENTRY !== "1";

const sentried = enableSentry
  ? withSentryConfig(withNextIntl(nextConfig), {
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      release: {
        name: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA || undefined,
      },
      widenClientFileUpload: true,
      sourcemaps: {
        deleteSourcemapsAfterUpload: true,
      },
      disableLogger: true,
      automaticVercelMonitors: true,
    })
  : withNextIntl(nextConfig);

export default withBundleAnalyzer(sentried);
