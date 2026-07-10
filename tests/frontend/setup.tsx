import React from "react";
import { createContext, useContext } from "react";
import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Mock next-intl context
const NextIntlContext = createContext({
  locale: "ar",
  messages: {},
  formats: {},
  timeZone: "UTC",
  now: new Date(),
});

vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
  useLocale: () => "ar",
  useMessages: () => ({}),
  useTimeZone: () => "UTC",
  useNow: () => new Date(),
  useFormatter: () => ({ formatNumber: (n: number) => String(n) }),
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => (
    <NextIntlContext.Provider
      value={{ locale: "ar", messages: {}, formats: {}, timeZone: "UTC", now: new Date() }}
    >
      {children}
    </NextIntlContext.Provider>
  ),
}));

vi.mock("next-intl/client", () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
  useLocale: () => "ar",
  useMessages: () => ({}),
  useTimeZone: () => "UTC",
  useNow: () => new Date(),
  useFormatter: () => ({ formatNumber: (n: number) => String(n) }),
}));

vi.mock("next-intl/react", () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
  useLocale: () => "ar",
  useMessages: () => ({}),
  useTimeZone: () => "UTC",
  useNow: () => new Date(),
  useFormatter: () => ({ formatNumber: (n: number) => String(n) }),
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => (
    <NextIntlContext.Provider
      value={{ locale: "ar", messages: {}, formats: {}, timeZone: "UTC", now: new Date() }}
    >
      {children}
    </NextIntlContext.Provider>
  ),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: () => (key: string) => key,
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
