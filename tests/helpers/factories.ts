export function mockSession(overrides: Partial<{ id: string; role: string; name: string }> = {}) {
  return {
    user: {
      id: "test-user-id",
      name: "مستخدم اختبار",
      email: "test@example.com",
      image: null,
      role: "STUDENT",
      ...overrides,
    },
  };
}

export const TEST_USER_ID = "test-user-id";
export const ADMIN_USER_ID = "admin-user-id";

export function mockAdminSession() {
  return mockSession({ id: ADMIN_USER_ID, role: "ADMIN" });
}

export function makeTag(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "tag-1",
    userId: TEST_USER_ID,
    name: "تفسير",
    color: "#16A34A",
    createdAt: new Date("2025-01-01"),
    _count: { documents: 2 },
    ...overrides,
  };
}

export function req(url = "/api/test", method = "GET") {
  return new Request(url, { method });
}

export function params(overrides: Record<string, string> = {}) {
  return { ...overrides };
}
