import { z } from "zod";

export const WEBHOOK_EVENTS = [
  "document.created",
  "document.processed",
  "document.completed",
  "document.failed",
  "document.deleted",
  "export.completed",
  "export.failed",
  "share.created",
  "share.deleted",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export const createWebhookSchema = z
  .object({
    url: z.string().url("رابط غير صحيح").max(500),
    events: z.array(z.enum(WEBHOOK_EVENTS)).min(1, "اخترحدثاً واحداً على الأقل").max(20),
  })
  .strip();

export const updateWebhookSchema = z
  .object({
    url: z.string().url("رابط غير صحيح").max(500).optional(),
    events: z.array(z.enum(WEBHOOK_EVENTS)).min(1).max(20).optional(),
    active: z.boolean().optional(),
  })
  .strip();
