/**
 * Cloud OCR cost guard — prevents runaway cloud-OCR spend.
 *
 * Tracks pages processed by cloud providers (Gemini / Google Drive OCR)
 * against a daily budget. When the budget is exhausted, cloud providers
 * are skipped in favor of local engines.
 */

export interface CloudCostGuardOptions {
  /** Max cloud-OCR pages per day. */
  dailyBudget: number;
  /** Redis key prefix for counter. */
  keyPrefix: string;
}

export interface CloudCostGuard {
  checkBudget(provider: string, pages: number): Promise<{ allowed: boolean; remaining: number }>;
  recordUsage(provider: string, pages: number): Promise<void>;
  resetIfNewDay(): Promise<void>;
}

/**
 * In-memory fallback when Redis is unavailable.
 * Suitable for single-worker deployments; not shared across processes.
 */
export interface MemoryCounter {
  date: string;
  pages: number;
}

let memoryCounter: MemoryCounter | null = null;

export function createCloudCostGuard(
  options: CloudCostGuardOptions,
  redis?: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string, ex?: number) => Promise<string | null>;
  },
): CloudCostGuard {
  const today = new Date().toISOString().slice(0, 10);

  async function getCount(provider: string): Promise<number> {
    if (redis) {
      const key = `${options.keyPrefix}:${provider}:${today}`;
      const raw = await redis.get(key);
      return raw ? Number(raw) : 0;
    }

    // Memory fallback
    if (!memoryCounter || memoryCounter.date !== today) {
      memoryCounter = { date: today, pages: 0 };
    }
    return memoryCounter.pages;
  }

  async function increment(provider: string, pages: number): Promise<void> {
    if (redis) {
      const key = `${options.keyPrefix}:${provider}:${today}`;
      await redis.set(key, String(pages), 24 * 60 * 60); // 24h TTL
      return;
    }

    if (!memoryCounter || memoryCounter.date !== today) {
      memoryCounter = { date: today, pages: 0 };
    }
    memoryCounter.pages += pages;
  }

  async function resetIfNewDay(): Promise<void> {
    const currentToday = new Date().toISOString().slice(0, 10);
    if (memoryCounter && memoryCounter.date !== currentToday) {
      memoryCounter = { date: currentToday, pages: 0 };
    }
    if (redis) {
      // Redis keys have TTL, no manual cleanup needed
    }
  }

  return {
    async checkBudget(provider: string, pages: number) {
      await resetIfNewDay();
      const used = await getCount(provider);
      const remaining = Math.max(0, options.dailyBudget - used);
      return {
        allowed: remaining >= pages,
        remaining,
      };
    },

  async recordUsage(provider: string, pages: number) {
    await increment(provider, pages);
  },

  async resetIfNewDay() {
    await resetIfNewDay();
  },
}

const PROVIDER_BUDGETS: Record<string, number> = {
  gemini: 0,
  google: 0,
};

let providerBudgetDate = new Date().toISOString().slice(0, 10);

function ensureProviderBudgetState(): void {
  const today = new Date().toISOString().slice(0, 10);
  if (providerBudgetDate !== today) {
    providerBudgetDate = today;
    PROVIDER_BUDGETS.gemini = 0;
    PROVIDER_BUDGETS.google = 0;
  }
}

export function getCloudOcrRemainingBudget(provider: "gemini" | "google", dailyBudget: number): number {
  ensureProviderBudgetState();
  const used = PROVIDER_BUDGETS[provider] ?? 0;
  return Math.max(0, dailyBudget - used);
}

export function recordCloudOcrUsage(provider: "gemini" | "google", pages: number): void {
  ensureProviderBudgetState();
  PROVIDER_BUDGETS[provider] = (PROVIDER_BUDGETS[provider] ?? 0) + pages;
}
