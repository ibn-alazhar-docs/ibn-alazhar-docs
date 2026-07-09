import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "ar",
  NextIntlClientProvider: ({ children }: any) => children,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

// jsdom lacks matchMedia — used by theme-provider and prefers-reduced-motion checks.
if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

// jsdom lacks these DOM APIs used by some components / libs.
if (!("IntersectionObserver" in window)) {
  class IO {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    takeRecords = vi.fn(() => []);
    root = null;
    rootMargin = "";
    thresholds = [];
  }
  // @ts-expect-error test shim
  window.IntersectionObserver = IO;
  // @ts-expect-error test shim
  global.IntersectionObserver = IO;
}

if (!("ResizeObserver" in window)) {
  class RO {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  // @ts-expect-error test shim
  window.ResizeObserver = RO;
  // @ts-expect-error test shim
  global.ResizeObserver = RO;
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

if (!URL.createObjectURL) {
  // @ts-expect-error test shim
  URL.createObjectURL = vi.fn(() => "blob:mock");
  // @ts-expect-error test shim
  URL.revokeObjectURL = vi.fn();
}
