import { z } from "zod";
import { DURATIONS } from "../constants";

export const EXPIRATION_OPTIONS = ["never", "7days", "30days"] as const;
export type ExpirationOption = (typeof EXPIRATION_OPTIONS)[number];

export function expirationToMs(option: ExpirationOption): number | null {
  switch (option) {
    case "never":
      return null;
    case "7days":
      return DURATIONS.SEVEN_DAYS_MS;
    case "30days":
      return DURATIONS.THIRTY_DAYS_MS;
  }
}

export const createShareSchema = z
  .object({
    expiration: z
      .enum(EXPIRATION_OPTIONS, { error: "Invalid expiration" })
      .optional()
      .default("never"),
  })
  .strip();

export const SHARE_EXPORT_FORMATS = [
  "md",
  "txt",
  "json",
  "docx",
  "pdf",
  "epub",
  "searchable-pdf",
] as const;
export type ShareExportFormat = (typeof SHARE_EXPORT_FORMATS)[number];
