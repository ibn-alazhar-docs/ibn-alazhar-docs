import { NextResponse } from "next/server";
import { prisma } from "@/lib/backend/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/backend/rate-limit";
import { auditLog, AUDIT_ACTIONS } from "@/lib/backend/audit";

const SUPPORTED_LOCALES = ["ar", "en"] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

function resolveLocale(request: Request, tokenLocale: string | null): Locale {
  if (tokenLocale && (SUPPORTED_LOCALES as readonly string[]).includes(tokenLocale)) {
    return tokenLocale as Locale;
  }

  const acceptLanguage = request.headers.get("accept-language");
  if (acceptLanguage) {
    const preferred = acceptLanguage
      .split(",")
      .map((part) => part.split(";")[0]?.trim().slice(0, 2).toLowerCase());
    for (const lang of preferred) {
      if (lang && (SUPPORTED_LOCALES as readonly string[]).includes(lang)) {
        return lang as Locale;
      }
    }
  }

  return "ar";
}

function loginRedirect(request: Request, locale: Locale, verified: 0 | 1): NextResponse {
  const params = new URLSearchParams({ verified: String(verified) });
  const path = `/${locale}/login?${params.toString()}`;
  return NextResponse.redirect(new URL(path, request.url));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const localeParam = url.searchParams.get("locale");
  const locale = resolveLocale(request, localeParam);

  const rateLimitResult = await checkRateLimit("/api/auth/verify-email", request);
  if (!rateLimitResult.allowed) {
    return rateLimitResponse(rateLimitResult.retryAfterMs);
  }

  if (!token) {
    return loginRedirect(request, locale, 0);
  }

  try {
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken || verificationToken.expires < new Date()) {
      return loginRedirect(request, locale, 0);
    }

    await prisma.user.update({
      where: { email: verificationToken.identifier },
      data: { emailVerified: new Date() },
    });

    await prisma.verificationToken.delete({
      where: { token },
    });

    await auditLog({
      action: AUDIT_ACTIONS.EMAIL_VERIFIED,
      entity: "user",
      entityId: verificationToken.identifier,
      ipAddress:
        request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return loginRedirect(request, locale, 1);
  } catch {
    // Any failure (e.g. user missing, DB error) must not leak details — send
    // the user back to login with a failure flag.
    return loginRedirect(request, locale, 0);
  }
}
