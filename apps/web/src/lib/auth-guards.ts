import { cache } from "react";
import { auth } from "./auth";
import { redirect } from "next/navigation";
import { NextResponse, NextRequest } from "next/server";
import { ForbiddenError } from "./errors";

const DEFAULT_LOCALE = "ar";

export interface AuthSession {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    role: string;
  };
}

const getCachedAuth = cache(auth);

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

export function isAdmin(session: AuthSession): boolean {
  return session.user.role === "ADMIN";
}

export function ownedWhere(
  baseWhere: Record<string, unknown>,
  session: AuthSession,
  userIdField = "userId",
): Record<string, unknown> {
  if (isAdmin(session)) return baseWhere;
  return { ...baseWhere, [userIdField]: session.user.id };
}

type AuthenticatedHandler = (
  request: NextRequest,
  context: { session: AuthSession; params: Record<string, string | undefined> },
) => Promise<NextResponse> | NextResponse;

export function withAuth(handler: AuthenticatedHandler) {
  return async (
    request: NextRequest,
    context?: { params: Promise<Record<string, string | undefined>> },
  ) => {
    const session = await requireAuth().catch(() => null);
    if (!session) return unauthorizedResponse();

    const params = context?.params ? await context.params : {};
    return handler(request, { session, params });
  };
}
