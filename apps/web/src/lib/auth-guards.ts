import { cache } from "react";
import { auth } from "./auth";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

const DEFAULT_LOCALE = "ar";

export class AuthError extends Error {
  constructor(
    message: string,
    public code: "UNAUTHORIZED" | "FORBIDDEN" = "FORBIDDEN",
  ) {
    super(message);
    this.name = "AuthError";
  }
}

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
    throw new AuthError("ليس لديك صلاحية للوصول", "FORBIDDEN");
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
