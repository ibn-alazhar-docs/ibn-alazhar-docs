import { vi } from "vitest";
import React from "react";

vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
  useLocale: () => "ar",
  useMessages: () => ({}),
  useTimeZone: () => "UTC",
  useNow: () => new Date(),
  useFormatter: () => ({ formatNumber: (n: number) => String(n) }),
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
  getTranslations: () => (key: string) => key,
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
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("next-intl/server", () => ({
  getTranslations: () => (key: string) => key,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() },
}));

vi.mock("motion/react", () => {
  const passthrough = (tag: string) =>
    React.forwardRef(({ children, ...props }: any, ref: any) =>
      React.createElement(tag, { ref, ...props }, children),
    );
  return { motion: new Proxy({}, { get: (_t, tag) => passthrough(tag as string) }) };
});