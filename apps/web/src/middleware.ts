import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { checkRateLimit } from "./lib/rate-limit";
import { generateRequestId } from "./lib/logger";

const handleI18nRouting = createMiddleware(routing);

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
  return request.cookies.has("next-auth.session-token");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Generate request ID for tracing
  const requestId = request.headers.get("x-request-id") || generateRequestId();

  // Skip static/internal Next.js paths
  if (pathname.startsWith("/_next") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // Handle API routes: CSRF check + rate limiting, no i18n routing
  if (pathname.startsWith("/api")) {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
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

    return NextResponse.next();
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

  // Security headers
  const isDev = process.env.NODE_ENV === "development";
  const cspHeader = [
    "default-src 'self'",
    `script-src 'self' ${isDev ? "'unsafe-inline' 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    "img-src 'self' blob: data:",
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

  return response;
}

export const config = {
  matcher: [
    // Match all pathnames except static files
    "/((?!_next|favicon.ico|logo.png|manifest.webmanifest|robots.ts|sitemap.ts).*)",
  ],
};
