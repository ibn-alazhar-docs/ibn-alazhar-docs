import type { PrismaClient, Prisma, WebhookSubscription, WebhookDelivery } from "@prisma/client";
import type {
  IWebhookRepository,
  CreateWebhookInput,
  UpdateWebhookInput,
} from "../../domain/repositories/webhook.repository.interface";

export class WebhookRepository implements IWebhookRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(userId: string, data: CreateWebhookInput): Promise<WebhookSubscription> {
    return this.prisma.webhookSubscription.create({
      data: {
        userId,
        url: data.url,
        secret: data.secret,
        events: data.events,
      },
    });
  }

  async findById(id: string, userId: string): Promise<WebhookSubscription | null> {
    return this.prisma.webhookSubscription.findFirst({
      where: { id, userId },
    });
  }

  async findMany(
    userId: string,
    options?: Prisma.WebhookSubscriptionFindManyArgs,
  ): Promise<WebhookSubscription[]> {
    return this.prisma.webhookSubscription.findMany({
      where: { userId, ...options?.where },
      orderBy: { createdAt: "desc" },
      ...options,
    });
  }

  async count(userId: string, where?: Prisma.WebhookSubscriptionWhereInput): Promise<number> {
    return this.prisma.webhookSubscription.count({
      where: { userId, ...where },
    });
  }

  async update(id: string, userId: string, data: UpdateWebhookInput): Promise<WebhookSubscription> {
    const existing = await this.findById(id, userId);
    if (!existing) throw new Error("Webhook not found");

    return this.prisma.webhookSubscription.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    const existing = await this.findById(id, userId);
    if (!existing) throw new Error("Webhook not found");

    await this.prisma.webhookSubscription.delete({ where: { id } });
  }

  async findActiveByEvent(event: string): Promise<WebhookSubscription[]> {
    return this.prisma.webhookSubscription.findMany({
      where: {
        active: true,
        events: { has: event },
      },
    });
  }

  async createDelivery(
    subscriptionId: string,
    event: string,
    payload: Prisma.InputJsonValue,
  ): Promise<WebhookDelivery> {
    return this.prisma.webhookDelivery.create({
      data: {
        subscriptionId,
        event,
        payload,
      },
    });
  }

  async updateDelivery(
    id: string,
    data: Prisma.WebhookDeliveryUpdateInput,
  ): Promise<WebhookDelivery> {
    return this.prisma.webhookDelivery.update({
      where: { id },
      data,
    });
  }

  async findPendingDeliveries(limit = 10): Promise<WebhookDelivery[]> {
    return this.prisma.webhookDelivery.findMany({
      where: {
        deliveredAt: null,
        attempts: { lt: 3 },
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }],
      },
      include: { subscription: true },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }

  async getDeliveryStats(
    userId: string,
  ): Promise<{ total: number; delivered: number; failed: number }> {
    const [total, delivered, failed] = await Promise.all([
      this.prisma.webhookDelivery.count({
        where: { subscription: { userId } },
      }),
      this.prisma.webhookDelivery.count({
        where: { subscription: { userId }, deliveredAt: { not: null } },
      }),
      this.prisma.webhookDelivery.count({
        where: {
          subscription: { userId },
          attempts: { gte: 3 },
          deliveredAt: null,
        },
      }),
    ]);

    return { total, delivered, failed };
  }
}
