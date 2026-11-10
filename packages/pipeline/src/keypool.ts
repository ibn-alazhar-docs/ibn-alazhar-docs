/**
 * keypool.ts — إدارة مفاتيح Gemini وحصصها لتحويل آلاف الصفحات يوميًا مجانًا.
 *
 * نقل من SKILLS/arabic-pdf-to-book/scripts/keypool.py (v2.9.0، 121 سطرًا).
 *
 * الحصة المجانية: 20 طلبًا/يوم لكل موديل، والطلب ≤10 صفحات
 *   20 × 10 = 200 صفحة/موديل/مفتاح. مع 8 موديلات = 1,600 صفحة/مفتاح/يوم،
 *   ومع 5 مفاتيح = 8,000 صفحة/يوم. الباقي يُحوَّل بـTesseract محليًا (بلا حصة).
 *
 * اكتشاف المفاتيح (بالترتيب، مكرّرات محذوفة):
 *   GEMINI_API_KEY_1..N (مرتبة) ← ~/.config/ocr/gemini_keys (سطر لكل مفتاح، # تعليق)
 *   ← GEMINI_API_KEY ← ~/.config/ocr/gemini_key (قديم)
 * الحالة: ~/.cache/pdf2book/keypool.json (ذرّية، تُصفَّر يوميًا).
 *
 * فروق مقصودة عن الأصل:
 *   - بصمة المفتاح = sha256(key).slice(0,12) بدل آخر 6 حروف (تصادم + تسريب بصمة).
 *   - consume() يحتفظ بمعنى الأصل: +1 طلب فقط مهما كان عدد الصفحات
 *     (الحصة تُحسب بالطلبات لا الصفحات) — تُبقى pages للتوافق التوقيعي.
 *   - الحدود والمسارات قابلة للحقن (اختبارات/عمال) مع نفس الافتراضيات.
 *   - لا تُسجَّل المفاتيح كاملة أبدًا؛ لا في الحالة ولا في السجلات.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const KEYPOOL_DEFAULT_STATE = join(homedir(), ".cache", "pdf2book", "keypool.json");
export const GEMINI_KEYS_FILE = join(homedir(), ".config", "ocr", "gemini_keys");
export const GEMINI_KEY_LEGACY_FILE = join(homedir(), ".config", "ocr", "gemini_key");

export const DEFAULT_DAILY_LIMIT = 20; // طلب/موديل/يوم
export const DEFAULT_PAGES_PER_REQ = 10; // صفحة/طلب

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function dailyLimit(): number {
  return envInt("GEMINI_DAILY_LIMIT", DEFAULT_DAILY_LIMIT);
}

export function pagesPerReq(): number {
  return envInt("GEMINI_PAGES_PER_REQ", DEFAULT_PAGES_PER_REQ);
}

/** اكتشاف المفاتيح بنفس ترتيب keypool.py:load_keys. */
export function loadGeminiKeys(): string[] {
  const keys: string[] = [];

  const numbered = Object.entries(process.env)
    .filter(([k, v]) => k.startsWith("GEMINI_API_KEY_") && v)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v as string);
  keys.push(...numbered);

  if (existsSync(GEMINI_KEYS_FILE)) {
    keys.push(
      ...readFileSync(GEMINI_KEYS_FILE, "utf-8")
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#")),
    );
  }

  const single = process.env.GEMINI_API_KEY ?? "";
  if (single) keys.push(single);

  if (existsSync(GEMINI_KEY_LEGACY_FILE)) {
    keys.push(readFileSync(GEMINI_KEY_LEGACY_FILE, "utf-8").trim());
  }

  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of keys) {
    if (k && !seen.has(k)) {
      seen.add(k);
      out.push(k);
    }
  }
  return out;
}

/** بصمة آمنة للمفتاح — لا تُستخدم المفاتيح كاملة كمفاتيح حالة. */
export function keyFingerprint(key: string): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 12);
}

export interface KeySlot {
  key: string;
  model: string;
  used: number;
  left: number;
}

export interface KeyPoolCapacity {
  keys: number;
  models: number;
  requestsLeft: number;
  pagesLeft: number;
  perKeyPerDay: number;
}

export interface KeyPoolOptions {
  models: string[];
  keys?: string[];
  statePath?: string;
  limit?: number;
  pagesPerRequest?: number;
}

interface KeyPoolState {
  day: string;
  used: Record<string, number>;
}

export class KeyPool {
  readonly models: string[];
  readonly keys: string[];
  readonly statePath: string;
  readonly limit: number;
  readonly pagesPerRequest: number;
  private data: KeyPoolState;

  constructor(opts: KeyPoolOptions) {
    this.models = opts.models;
    this.keys = opts.keys ?? loadGeminiKeys();
    this.statePath = opts.statePath ?? KEYPOOL_DEFAULT_STATE;
    this.limit = opts.limit ?? dailyLimit();
    this.pagesPerRequest = opts.pagesPerRequest ?? pagesPerReq();
    this.data = this.load();
  }

  private load(): KeyPoolState {
    const today = new Date().toISOString().slice(0, 10);
    let parsed: Partial<KeyPoolState> = {};
    try {
      parsed = JSON.parse(readFileSync(this.statePath, "utf-8")) as Partial<KeyPoolState>;
    } catch {
      parsed = {};
    }
    if (parsed.day !== today || typeof parsed.used !== "object" || parsed.used === null) {
      return { day: today, used: {} };
    }
    return { day: today, used: parsed.used as Record<string, number> };
  }

  private save(): void {
    mkdirSync(dirname(this.statePath), { recursive: true });
    const tmp = `${this.statePath}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.data), "utf-8");
    renameSync(tmp, this.statePath); // ذرّية على Linux (مكافئ os.replace)
  }

  private slotKey(key: string, model: string): string {
    return `${keyFingerprint(key)}:${model}`;
  }

  /** كل الخانات المتاحة اليوم، الأقل استهلاكًا أولًا (توزيع عادل). */
  plan(): KeySlot[] {
    const slots: KeySlot[] = [];
    for (const key of this.keys) {
      for (const model of this.models) {
        const used = this.data.used[this.slotKey(key, model)] ?? 0;
        if (used < this.limit) {
          slots.push({ key, model, used, left: Math.max(0, this.limit - used) });
        }
      }
    }
    slots.sort((a, b) => a.used - b.used);
    return slots;
  }

  /**
   * استهلاك طلب واحد. `pages` لا تؤثر في العداد — الحصة بالطلبات كما في الأصل.
   */
  consume(key: string, model: string, _pages: number = this.pagesPerRequest): void {
    void _pages;
    const k = this.slotKey(key, model);
    this.data.used[k] = (this.data.used[k] ?? 0) + 1;
    this.save();
  }

  capacity(): KeyPoolCapacity {
    const slots = this.plan();
    const requestsLeft = slots.reduce((sum, s) => sum + s.left, 0);
    return {
      keys: this.keys.length,
      models: this.models.length,
      requestsLeft,
      pagesLeft: requestsLeft * this.pagesPerRequest,
      perKeyPerDay: this.limit * this.pagesPerRequest * this.models.length,
    };
  }

  static isQuotaError(err: unknown): boolean {
    const s = String(err).toLowerCase();
    return ["429", "resource_exhausted", "quota", "exceeded"].some((x) => s.includes(x));
  }

  static isKeyError(err: unknown): boolean {
    const s = String(err).toLowerCase();
    return ["403", "api key", "permission", "invalid key", "401"].some((x) => s.includes(x));
  }
}
