import type { IWebhookRepository } from "../../domain/repositories/webhook.repository.interface";
import type { Prisma } from "@prisma/client";
import { NotFoundError } from "@/lib/shared/errors";
import { createHmac, randomBytes } from "crypto";
import { logger } from "@/lib/shared/logger";

const WEBHOOK_SECRET_LENGTH = 32;

export interface WebhookConfig {
  url: string;
  events: string[];
}

export interface WebhookTestResult {
  success: boolean;
  statusCode?: number;
  error?: string;
}

export class WebhookUseCases {
  constructor(private readonly webhookRepository: IWebhookRepository) {}

  async createWebhook(userId: string, config: WebhookConfig) {
    const secret = randomBytes(WEBHOOK_SECRET_LENGTH).toString("hex");

    const webhook = await this.webhookRepository.create(userId, {
      url: config.url,
      secret,
      events: config.events,
    });

    return {
      id: webhook.id,
      url: webhook.url,
      secret: webhook.secret,
      events: webhook.events,
      active: webhook.active,
      createdAt: webhook.createdAt,
    };
  }

  async getWebhooks(userId: string) {
    const webhooks = await this.webhookRepository.findMany(userId);
    return webhooks.map((w) => ({
      id: w.id,
      url: w.url,
      events: w.events,
      active: w.active,
      createdAt: w.createdAt,
    }));
  }

  async getWebhookById(id: string, userId: string) {
    const webhook = await this.webhookRepository.findById(id, userId);
    if (!webhook) throw new NotFoundError("الويب هوك غير موجود");

    return {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      active: webhook.active,
      createdAt: webhook.createdAt,
    };
  }

  async updateWebhook(
    id: string,
    userId: string,
    data: { url?: string; events?: string[]; active?: boolean },
  ) {
    const webhook = await this.webhookRepository.update(id, userId, data);
    return {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      active: webhook.active,
      createdAt: webhook.createdAt,
    };
  }

  async deleteWebhook(id: string, userId: string) {
    await this.webhookRepository.delete(id, userId);
  }

  async testWebhook(id: string, userId: string): Promise<WebhookTestResult> {
    const webhook = await this.webhookRepository.findById(id, userId);
    if (!webhook) throw new NotFoundError("الويب هوك غير موجود");

    const payload = JSON.stringify({
      event: "webhook.test",
      data: { message: "Test webhook delivery" },
      timestamp: new Date().toISOString(),
    });

    const signature = this.signPayload(payload, webhook.secret);

    try {
      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Event": "webhook.test",
        },
        body: payload,
        signal: AbortSignal.timeout(10_000),
      });

      return {
        success: response.ok,
        statusCode: response.status,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getDeliveryStats(userId: string) {
    return this.webhookRepository.getDeliveryStats(userId);
  }

  signPayload(payload: string, secret: string): string {
    return createHmac("sha256", secret).update(payload).digest("hex");
  }

  async dispatchEvent(event: string, data: Record<string, unknown>) {
    const subscriptions = await this.webhookRepository.findActiveByEvent(event);

    if (subscriptions.length === 0) return;

    const payload = JSON.stringify({
      event,
      data,
      timestamp: new Date().toISOString(),
    });

    for (const sub of subscriptions) {
      try {
        const delivery = await this.webhookRepository.createDelivery(
          sub.id,
          event,
          payload as unknown as Prisma.InputJsonValue,
        );
        const signature = this.signPayload(payload, sub.secret);

        const response = await fetch(sub.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Signature": signature,
            "X-Webhook-Event": event,
            "X-Webhook-Delivery-Id": delivery.id,
          },
          body: payload,
          signal: AbortSignal.timeout(15_000),
        });

        await this.webhookRepository.updateDelivery(delivery.id, {
          statusCode: response.status,
          response: response.statusText,
          attempts: { increment: 1 },
          deliveredAt: response.ok ? new Date() : null,
        });
      } catch (error) {
        logger.warn(error, "Webhook delivery failed:");
      }
    }
  }
}
