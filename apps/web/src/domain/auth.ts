export type Role = "ADMIN" | "STUDENT" | "TEACHER";

export const ROLE = {
  ADMIN: "ADMIN" as const,
  STUDENT: "STUDENT" as const,
  TEACHER: "TEACHER" as const,
} as const satisfies Record<string, Role>;

export function isAdminRole(role: string): boolean {
  return role === ROLE.ADMIN;
}

export function canViewUsers(role: string): boolean {
  return role === ROLE.ADMIN || role === ROLE.TEACHER;
}
