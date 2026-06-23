const LOCALE_MAP: Record<string, string> = { ar: "ar-EG", en: "en-US" };

export function formatDate(
  date: Date | string,
  locale: string,
  opts?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const localeCode = LOCALE_MAP[locale] ?? "en-US";
  return d.toLocaleDateString(
    localeCode,
    opts ?? { year: "numeric", month: "short", day: "numeric" },
  );
}

export function formatDateTime(date: Date | string, locale: string): string {
  return formatDate(date, locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
