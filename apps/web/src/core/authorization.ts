import { isAdminRole } from "@/domain/auth";
import type { AuthSession } from "@/domain/types";

export function ownedWhere(
  baseWhere: Record<string, unknown>,
  session: AuthSession,
  userIdField = "userId",
): Record<string, unknown> {
  if (isAdminRole(session.user.role)) return baseWhere;
  return { ...baseWhere, [userIdField]: session.user.id };
}
