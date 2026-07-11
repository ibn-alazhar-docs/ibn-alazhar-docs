import type { IWebhookRepository } from "../../domain/repositories/webhook.repository.interface";
import type { Prisma } from "@/domain/repositories/prisma-types";
import { NotFoundError, AppError } from "@/shared/errors";
import { createHmac, randomBytes } from "crypto";
import { logger } from "@/shared/logger";

const WEBHOOK_SECRET_LENGTH = 32;
const MAX_RESPONSE_BODY_CHARS = 2000;

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

  private isSafeUrl(urlString: string): boolean {
    try {
      const url = new URL(urlString);
      if (url.protocol !== "https:" && url.protocol !== "http:") return false;
      const hostname = url.hostname.toLowerCase();
      if (
        hostname === "localhost" ||
        hostname.startsWith("127.") ||
        hostname.startsWith("10.") ||
        hostname.startsWith("192.168.") ||
        hostname.startsWith("169.254.") ||
        hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) ||
        hostname === "::1" ||
        hostname.endsWith(".local") ||
        hostname.endsWith(".internal")
      ) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  async createWebhook(userId: string, config: WebhookConfig) {
    if (!this.isSafeUrl(config.url)) {
      throw new AppError("Invalid or unsafe webhook URL", "VALIDATION_ERROR", 400);
    }
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
    if (data.url && !this.isSafeUrl(data.url)) {
      throw new AppError("Invalid or unsafe webhook URL", "VALIDATION_ERROR", 400);
    }
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

        let responseBody: string | null = null;
        try {
          const text = await response.text();
          responseBody = text.length > 0 ? text.slice(0, MAX_RESPONSE_BODY_CHARS) : null;
        } catch {
          responseBody = null;
        }

        await this.webhookRepository.updateDelivery(delivery.id, {
          statusCode: response.status,
          response: responseBody ?? undefined,
          attempts: { increment: 1 },
          deliveredAt: response.ok ? new Date() : null,
        });
      } catch (error) {
        logger.warn(error, "Webhook delivery failed:");
      }
    }
  }
}
