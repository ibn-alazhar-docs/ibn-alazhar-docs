import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { checkRateLimit } from "@/clients/redis";
import { generateRequestId } from "@/shared/logger";

const handleI18nRouting = createMiddleware(routing);

// CSRF double-submit cookie defense-in-depth
const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "X-CSRF-Token";

// Generate a 32-byte random hex token (edge-runtime safe via Web Crypto)
function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Ensure a csrf_token cookie is set once per session (if not already present).
// NOT httpOnly so the SPA can read it and echo it as the X-CSRF-Token header.
function ensureCsrfCookie(response: NextResponse, request: NextRequest): NextResponse {
  if (request.cookies.has(CSRF_COOKIE_NAME)) return response;
  response.cookies.set(CSRF_COOKIE_NAME, generateCsrfToken(), {
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: false,
    path: "/",
  });
  return response;
}

// Routes that require authentication
const protectedRoutes = [
  "/dashboard",
  "/files",
  "/folders",
  "/tags",
  "/search",
  "/conversions",
  "/settings",
  "/preview",
  "/users",
];

// Routes that should NOT be accessible when logged in
const guestOnlyRoutes = ["/login", "/register"];

function getLocaleFromRequest(request: NextRequest): string {
  // Check Accept-Language header
  const acceptLanguage = request.headers.get("accept-language");
  if (acceptLanguage?.startsWith("en")) return "en";
  return "ar";
}

function hasSessionCookie(request: NextRequest): boolean {
  // Auth.js renames the session cookie to `__Secure-next-auth.session-token`
  // when cookies are set with `secure: true` (production). Match both names so
  // page-route auth gating and the CSRF session fallback are not silently skipped.
  return (
    request.cookies.has("next-auth.session-token") ||
    request.cookies.has("__Secure-next-auth.session-token") ||
    request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Generate request ID for tracing
  const requestId = request.headers.get("x-request-id") || generateRequestId();

  // Skip static/internal Next.js paths (only skip actual file extensions, not dots in paths)
  if (pathname.startsWith("/_next") || /\.[a-zA-Z0-9]{2,5}$/.test(pathname)) {
    return NextResponse.next();
  }

  // Handle API routes: CSRF check + rate limiting, no i18n routing
  if (pathname.startsWith("/api")) {
    if (
      ["POST", "PUT", "PATCH", "DELETE"].includes(request.method) &&
      !pathname.startsWith("/api/auth")
    ) {
      const csrfCookie = request.cookies.get(CSRF_COOKIE_NAME)?.value;
      if (csrfCookie) {
        // Double-submit cookie enforcement (defense-in-depth, stronger than Origin check)
        const csrfHeader = request.headers.get(CSRF_HEADER_NAME);
        if (!csrfHeader || csrfHeader !== csrfCookie) {
          return NextResponse.json(
            {
              error: {
                code: "CSRF_ERROR",
                message: "Forbidden: CSRF token mismatch",
              },
            },
            { status: 403 },
          );
        }
      } else {
        // Legacy fallback: existing Origin/Referer check (cookie not yet issued)
        const origin = request.headers.get("origin");
        const referer = request.headers.get("referer");
        if (origin) {
          try {
            const originUrl = new URL(origin);
            const expectedHost = process.env.APP_URL
              ? new URL(process.env.APP_URL).host
              : request.nextUrl.host;
            if (originUrl.host !== expectedHost) {
              return NextResponse.json(
                { error: { code: "CSRF_ERROR", message: "Forbidden: CSRF check failed" } },
                { status: 403 },
              );
            }
          } catch {
            return NextResponse.json(
              { error: { code: "CSRF_ERROR", message: "Forbidden: Invalid origin header" } },
              { status: 403 },
            );
          }
        } else if (referer) {
          try {
            const refererUrl = new URL(referer);
            const expectedHost = process.env.APP_URL
              ? new URL(process.env.APP_URL).host
              : request.nextUrl.host;
            if (refererUrl.host !== expectedHost) {
              return NextResponse.json(
                { error: { code: "CSRF_ERROR", message: "Forbidden: CSRF check failed" } },
                { status: 403 },
              );
            }
          } catch {
            return NextResponse.json(
              { error: { code: "CSRF_ERROR", message: "Forbidden: Invalid referer header" } },
              { status: 403 },
            );
          }
        } else if (hasSessionCookie(request)) {
          return NextResponse.json(
            {
              error: {
                code: "CSRF_ERROR",
                message: "Forbidden: CSRF protection requires origin or referer header",
              },
            },
            { status: 403 },
          );
        }
      }
    }

    const { allowed, retryAfterMs } = await checkRateLimit(pathname, request);
    if (!allowed) {
      return NextResponse.json(
        {
          error: { code: "RATE_LIMITED", message: "Rate limit exceeded. Try again later." },
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((retryAfterMs ?? 60_000) / 1000)),
          },
        },
      );
    }

    // Default Cache-Control for API routes — private, no-store unless overridden by route
    const response = NextResponse.next();
    if (request.method === "GET" && pathname !== "/api/csrf") {
      ensureCsrfCookie(response, request);
      response.headers.set("Cache-Control", "private, max-age=10, stale-while-revalidate=30");
    } else {
      response.headers.set("Cache-Control", "private, no-store");
    }
    // Security headers for API routes
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    return response;
  }

  const isLoggedIn = hasSessionCookie(request);

  // Extract locale from URL (e.g., /ar/files -> ar)
  const urlLocale = pathname.split("/")[1];
  const locale = urlLocale === "ar" || urlLocale === "en" ? urlLocale : undefined;
  const pathnameWithoutLocale = locale ? pathname.slice(`/${locale}`.length) || "/" : pathname;

  // If logged in and trying to access guest-only routes, redirect to dashboard
  if (isLoggedIn && guestOnlyRoutes.some((route) => pathnameWithoutLocale.startsWith(route))) {
    const targetLocale = locale || getLocaleFromRequest(request);
    return NextResponse.redirect(new URL(`/${targetLocale}/dashboard`, request.url));
  }

  // If NOT logged in and trying to access protected routes (and not on auth page), redirect to login
  if (
    !isLoggedIn &&
    protectedRoutes.some(
      (route) => pathnameWithoutLocale === route || pathnameWithoutLocale.startsWith(route + "/"),
    )
  ) {
    const targetLocale = locale || getLocaleFromRequest(request);
    return NextResponse.redirect(new URL(`/${targetLocale}/login`, request.url));
  }

  // Handle i18n routing (locale prefix, detection, etc.)
  const response = handleI18nRouting(request);

  // Pass locale info via header for server components
  const detectedLocale = locale || getLocaleFromRequest(request);
  response.headers.set("x-locale", detectedLocale);
  response.headers.set("x-request-id", requestId);

  // Issue the CSRF cookie for the SPA (read client-side to echo as header)
  ensureCsrfCookie(response, request);

  // Security headers
  const isDev = process.env.NODE_ENV === "development";
  const cspHeader = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    "img-src 'self' blob: data: https://*.r2.cloudflarestorage.com https://*.ibnalazhardocs.workers.dev",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  response.headers.set("Content-Security-Policy", cspHeader);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (!isDev) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  return response;
}

export const config = {
  matcher: [
    // Match all pathnames except static files
    "/((?!_next|favicon.ico|logo.png|manifest.webmanifest|robots.ts|sitemap.ts).*)",
  ],
};
