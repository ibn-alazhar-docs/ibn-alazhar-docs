import type { Prisma, WebhookSubscription, WebhookDelivery } from "@prisma/client";

export interface CreateWebhookInput {
  url: string;
  secret: string;
  events: string[];
}

export interface UpdateWebhookInput {
  url?: string;
  events?: string[];
  active?: boolean;
}

export interface WebhookEventPayload {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface IWebhookRepository {
  create(userId: string, data: CreateWebhookInput): Promise<WebhookSubscription>;
  findById(id: string, userId: string): Promise<WebhookSubscription | null>;
  findMany(
    userId: string,
    options?: Prisma.WebhookSubscriptionFindManyArgs,
  ): Promise<WebhookSubscription[]>;
  count(userId: string, where?: Prisma.WebhookSubscriptionWhereInput): Promise<number>;
  update(id: string, userId: string, data: UpdateWebhookInput): Promise<WebhookSubscription>;
  delete(id: string, userId: string): Promise<void>;
  findActiveByEvent(event: string): Promise<WebhookSubscription[]>;
  createDelivery(
    subscriptionId: string,
    event: string,
    payload: Prisma.InputJsonValue,
  ): Promise<WebhookDelivery>;
  updateDelivery(id: string, data: Prisma.WebhookDeliveryUpdateInput): Promise<WebhookDelivery>;
  findPendingDeliveries(limit?: number): Promise<WebhookDelivery[]>;
  getDeliveryStats(userId: string): Promise<{ total: number; delivered: number; failed: number }>;
}
