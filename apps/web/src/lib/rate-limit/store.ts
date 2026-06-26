const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_MAP_SIZE = 10000;
let cleanupStarted = false;

export function addToMap(key: string, value: { count: number; resetTime: number }) {
  if (rateLimitMap.size >= MAX_MAP_SIZE) {
    const oldestKey = rateLimitMap.keys().next().value;
    if (oldestKey !== undefined) {
      rateLimitMap.delete(oldestKey);
    }
  }
  rateLimitMap.set(key, value);
}

export function getFromMap(key: string): { count: number; resetTime: number } | undefined {
  return rateLimitMap.get(key);
}

export function incrementMap(key: string): void {
  const entry = rateLimitMap.get(key);
  if (entry) entry.count++;
}

export function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

export function startCleanupIfNeeded(): void {
  if (cleanupStarted) return;
  cleanupStarted = true;
  if (typeof setInterval !== "undefined") {
    setInterval(cleanupExpiredEntries, 60_000);
  }
}
