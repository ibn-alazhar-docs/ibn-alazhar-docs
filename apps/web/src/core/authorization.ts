import { isAdminRole } from "@/domain/auth";
import type { AuthSession } from "@/domain/types";

export function ownedWhere(
  baseWhere: Record<string, unknown>,
  session: AuthSession,
  userIdField = "userId",
): Record<string, unknown> {
  const where = isAdminRole(session.user.role)
    ? { ...baseWhere }
    : { ...baseWhere, [userIdField]: session.user.id };
  if (!("deletedAt" in where)) {
    where.deletedAt = null;
  }
  return where;
}
