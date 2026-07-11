import { describe, it } from "vitest";
import { requireAuth } from "@/middleware/auth-guards";
import { auth } from "@/middleware/auth";

vi.mock("@/middleware/auth", () => ({
  auth: vi.fn(),
}));

describe("Cache test", () => {
  it("should not cache", async () => {
    const mockedAuth = vi.mocked(auth);

    mockedAuth.mockResolvedValue({ user: { id: "1", role: "admin" } } as any);
    console.log("NODE_ENV:", process.env.NODE_ENV);
    console.log("First call:", await requireAuth());

    mockedAuth.mockResolvedValue(null as any);
    console.log("Second call:", await requireAuth().catch(() => null));
  });
});
