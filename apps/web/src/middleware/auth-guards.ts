import { cache } from "react";
import { auth } from "./auth";
import { redirect } from "next/navigation";
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/transport/db";
import { ForbiddenError } from "@/shared/errors";
import { handleRouteError } from "@/shared/route-helpers";
import { isAdminRole, ROLE } from "@/domain/auth";
import type { AuthSession } from "@/domain/types";

export type { AuthSession } from "@/domain/types";
export { ownedWhere } from "@/core/authorization";

const DEFAULT_LOCALE = "ar";

const getCachedAuth = process.env.NODE_ENV === "test" ? auth : cache(auth);

export async function requireAuth(): Promise<AuthSession> {
  const session = await getCachedAuth();

  if (!session?.user) {
    redirect(`/${DEFAULT_LOCALE}/login`);
  }

  return session as AuthSession;
}

export async function requireRole(role: string): Promise<AuthSession> {
  const session = await requireAuth();

  if (session.user.role !== role) {
    throw new ForbiddenError();
  }

  return session;
}

export function unauthorizedResponse(message = "يجب تسجيل الدخول") {
  return NextResponse.json({ error: { code: "UNAUTHORIZED", message } }, { status: 401 });
}

export function forbiddenResponse(message = "ليس لديك صلاحية للوصول") {
  return NextResponse.json({ error: { code: "FORBIDDEN", message } }, { status: 403 });
}

type AuthenticatedHandler = (
  request: NextRequest,
  context: { session: AuthSession; params: Record<string, string | undefined> },
) => Promise<NextResponse | Response> | NextResponse | Response;

async function applyTestApiKeyBypass(
  request: NextRequest,
  session: AuthSession | null,
): Promise<AuthSession | null> {
  // SECURITY FIX: Only allow TEST_API_KEY in development/test environments
  const apiKey = process.env.TEST_API_KEY;
  const isDevelopment = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
  if (!session && apiKey && isDevelopment && request.headers.get("x-api-key") === apiKey) {
    const admin = await prisma.user.findFirst({ where: { role: ROLE.ADMIN } });
    if (admin) {
      return {
        user: { id: admin.id, role: admin.role, email: admin.email, name: admin.name },
      } as AuthSession;
    }
  }
  return session;
}

export function withAuth(handler: AuthenticatedHandler) {
  return async (
    request: NextRequest,
    context: { params: Promise<Record<string, string | undefined>> },
  ): Promise<Response> => {
    let session = await requireAuth().catch(() => null);
    session = await applyTestApiKeyBypass(request, session);

    if (!session) return unauthorizedResponse();

    const params = context?.params ? await context.params : {};
    try {
      return await handler(request, { session, params });
    } catch (error) {
      const requestId = request.headers.get("x-request-id")?.split(",")[0]?.trim() || undefined;
      return handleRouteError(error, "api", "تعذر تنفيذ العملية", { requestId });
    }
  };
}

export function withAdminAuth(handler: AuthenticatedHandler) {
  return async (
    request: NextRequest,
    context: { params: Promise<Record<string, string | undefined>> },
  ): Promise<Response> => {
    let session = await requireAuth().catch(() => null);
    session = await applyTestApiKeyBypass(request, session);

    if (!session) return unauthorizedResponse();
    if (!isAdminRole(session.user.role)) return forbiddenResponse();

    const params = context?.params ? await context.params : {};
    try {
      return await handler(request, { session, params });
    } catch (error) {
      const requestId = request.headers.get("x-request-id")?.split(",")[0]?.trim() || undefined;
      return handleRouteError(error, "api", "تعذر تنفيذ العملية", { requestId });
    }
  };
}
