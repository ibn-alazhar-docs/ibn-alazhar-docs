import type { AuthSession } from "@/domain/types";

export function ownedWhere(
  baseWhere: Record<string, unknown>,
  session: AuthSession,
  userIdField = "userId",
): Record<string, unknown> {
  const where = { ...baseWhere };

  // Regular users only see their own data. Admins retain oversight visibility
  // and must not be scoped by a user ID.
  if (session.user.role === "ADMIN") {
    delete where[userIdField];
  } else {
    where[userIdField] = session.user.id;
  }

  if (!("deletedAt" in where)) {
    where.deletedAt = null;
  }
  return where;
}
