import type { AuthSession } from "@/domain/types";

export function ownedWhere(
  baseWhere: Record<string, unknown>,
  session: AuthSession,
  userIdField = "userId",
): Record<string, unknown> {
  // كل مستخدم يرى بياناته فقط، بغض النظر عن دوره
  const where = { ...baseWhere, [userIdField]: session.user.id };
  if (!("deletedAt" in where)) {
    where.deletedAt = null;
  }
  return where;
}
