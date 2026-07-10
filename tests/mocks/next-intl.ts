import React from "react";

const NextIntlContext = React.createContext({
  locale: "ar",
  messages: {},
  formats: {},
  timeZone: "UTC",
  now: new Date(),
});

export function useTranslations(namespace?: string) {
  return (key: string) => (namespace ? `${namespace}.${key}` : key);
}

export function useLocale() {
  return "ar";
}

export function useMessages() {
  return {};
}

export function useTimeZone() {
  return "UTC";
}

export function useNow() {
  return new Date();
}

export function useFormatter() {
  return { formatNumber: (n: number) => String(n) };
}

export function NextIntlClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlContext.Provider value={{ locale: "ar", messages: {}, formats: {}, timeZone: "UTC", now: new Date() }}>
      {children}
    </NextIntlContext.Provider>
  );
}

export function getTranslations() {
  return (key: string) => key;
}

export default {
  useTranslations,
  useLocale,
  useMessages,
  useTimeZone,
  useNow,
  useFormatter,
  NextIntlClientProvider,
  getTranslations,
};