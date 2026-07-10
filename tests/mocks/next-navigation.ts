import { vi } from "vitest";

export const useSearchParams = vi.fn(() => ({ get: () => null }));
export const useRouter = vi.fn(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  refresh: vi.fn(),
}));
export const usePathname = vi.fn(() => "/");
export const redirect = vi.fn();
export const notFound = vi.fn();
