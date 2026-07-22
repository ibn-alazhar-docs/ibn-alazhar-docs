import type { OcrEngineType } from "./types";

export interface ProviderHealthRecord {
  provider: OcrEngineType;
  successes: number;
  failures: number;
  consecutiveFailures: number;
  lastError?: string;
  lastSuccessAt?: number;
  lastFailureAt?: number;
  avgLatencyMs: number;
  totalLatencyMs: number;
  calls: number;
}

export type ProviderState = "healthy" | "degraded" | "open";

export interface ProviderHealth {
  records: Map<OcrEngineType, ProviderHealthRecord>;
  /** epoch ms */
  createdAt: number;
}

export interface ProviderHealthOptions {
  /** Consecutive failures within windowMs triggers OPEN state */
  failureThreshold: number;
  /** Time window for counting consecutive failures */
  windowMs: number;
  /** OPEN state cooldown duration */
  cooldownMs: number;
}

export const DEFAULT_PROVIDER_HEALTH_OPTIONS: ProviderHealthOptions = {
  failureThreshold: 3,
  windowMs: 5 * 60 * 1000, // 5 minutes
  cooldownMs: 30_000, // 30 seconds
};

export function createProviderHealth(): ProviderHealth {
  return {
    records: new Map(),
    createdAt: Date.now(),
  };
}

export function getOrCreateRecord(
  health: ProviderHealth,
  provider: OcrEngineType,
): ProviderHealthRecord {
  const existing = health.records.get(provider);
  if (existing) return existing;

  const record: ProviderHealthRecord = {
    provider,
    successes: 0,
    failures: 0,
    consecutiveFailures: 0,
    avgLatencyMs: 0,
    totalLatencyMs: 0,
    calls: 0,
  };
  health.records.set(provider, record);
  return record;
}

export function recordProviderSuccess(
  health: ProviderHealth,
  provider: OcrEngineType,
  latencyMs: number,
): void {
  const record = getOrCreateRecord(health, provider);
  record.successes += 1;
  record.consecutiveFailures = 0;
  record.lastSuccessAt = Date.now();
  record.totalLatencyMs += latencyMs;
  record.calls += 1;
  record.avgLatencyMs = Math.round(record.totalLatencyMs / record.calls);
}

export function recordProviderFailure(
  health: ProviderHealth,
  provider: OcrEngineType,
  error: string,
  latencyMs: number,
): void {
  const record = getOrCreateRecord(health, provider);
  record.failures += 1;
  record.consecutiveFailures += 1;
  record.lastFailureAt = Date.now();
  record.lastError = error;
  record.totalLatencyMs += latencyMs;
  record.calls += 1;
  record.avgLatencyMs = Math.round(record.totalLatencyMs / record.calls);
}

export function getProviderState(
  health: ProviderHealth,
  provider: OcrEngineType,
  options: ProviderHealthOptions = DEFAULT_PROVIDER_HEALTH_OPTIONS,
): ProviderState {
  const record = health.records.get(provider);
  if (!record) return "healthy";

  const now = Date.now();

  // If previously open, check cooldown
  if (record.consecutiveFailures >= options.failureThreshold) {
    const lastFailure = record.lastFailureAt ?? 0;
    if (now - lastFailure < options.cooldownMs) {
      return "open";
    }
    // Cooldown expired — reset and allow probe
    record.consecutiveFailures = 0;
    return "degraded";
  }

  // Within failure window but below threshold = degraded
  const recentFailures = record.consecutiveFailures > 0 ? 1 : 0;
  if (
    recentFailures > 0 &&
    record.consecutiveFailures >= Math.max(1, options.failureThreshold - 1)
  ) {
    return "degraded";
  }

  return "healthy";
}

export function scoreProvider(
  health: ProviderHealth,
  provider: OcrEngineType,
  options: ProviderHealthOptions = DEFAULT_PROVIDER_HEALTH_OPTIONS,
): number {
  const record = health.records.get(provider);
  const state = getProviderState(health, provider, options);

  if (state === "open") return -Infinity;

  if (!record || record.calls === 0) return 1.0;

  const successRate = record.successes / record.calls;
  const latencyPenalty = Math.min(record.avgLatencyMs / 10_000, 1); // cap at 1
  const consecutivePenalty = record.consecutiveFailures * 0.1;

  return Math.max(0, successRate * (1 - latencyPenalty) - consecutivePenalty);
}

export function sortProvidersByHealth(
  health: ProviderHealth,
  providers: OcrEngineType[],
  options: ProviderHealthOptions = DEFAULT_PROVIDER_HEALTH_OPTIONS,
): OcrEngineType[] {
  return [...providers].sort(
    (a, b) => scoreProvider(health, b, options) - scoreProvider(health, a, options),
  );
}
