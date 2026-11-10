import { vi } from "vitest";

vi.mock("@/lib/backend/auth", () => ({
  auth: vi.fn(),
}));

// Single implementation lives in tests/mocks/next-server.ts — kept out of this
// file so the alias (`next/server` -> that module) and every project's setup
// cannot drift into two different response shapes.
vi.mock("next/server", async () => {
  const { NextResponse } = await import("./mocks/next-server");
  return { NextResponse };
});

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  })),
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));
