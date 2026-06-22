import { vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: () => Promise.resolve(data),
    })),
    redirect: vi.fn((url: string) => ({
      status: 302,
      headers: new Headers({ Location: url }),
    })),
  },
}));

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
