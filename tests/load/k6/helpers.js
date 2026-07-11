import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend, Counter, Gauge } from "k6/metrics";

export const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
export const AUTH_EMAIL = __ENV.AUTH_EMAIL;
export const AUTH_PASSWORD = __ENV.AUTH_PASSWORD;

export const errorRate = new Rate("errors");
export const requestDuration = new Trend("request_duration");
export const rateLimitHits = new Counter("rate_limit_hits");
export const activeUsers = new Gauge("active_users");

export const ARABIC_FIRST_NAMES = [
  "أحمد",
  "محمد",
  "علي",
  "إبراهيم",
  "يوسف",
  "عمر",
  "خالد",
  "عبدالله",
  "مصطفى",
  "حسن",
  "حسين",
  "كريم",
  "طه",
  "نور",
  "سامي",
  "بسام",
  "صلاح",
  "أيمن",
  "عمرو",
  "زياد",
  "هاني",
  "مازن",
  "رامي",
  "ليث",
];

export const ARABIC_LAST_NAMES = [
  "الشافعي",
  "المالكي",
  "الحنبلي",
  "الحنفي",
  "السعدي",
  "الهاشمي",
  "القريشي",
  "الأزهري",
  "السلفي",
  "النابلسي",
  "الدمشقي",
  "البغدادي",
  "المصري",
  "اليمني",
  "الحجازي",
  "النجدي",
  "المكي",
  "المدني",
];

export const ARABIC_NOUNS = [
  "التوحيد",
  "الفقه",
  "النحو",
  "البلاغة",
  "التفسير",
  "الحديث",
  "العقيدة",
  "الفرائض",
  "أصول الفقه",
  "مصطلح الحديث",
  "علوم القرآن",
  "التجويد",
  "السيرة",
  "الرقائق",
  "التصوف",
  "المنطق",
  "علم الكلام",
  "الجدل",
];

export const ARABIC_ADJECTIVES = [
  "الميسر",
  "الواضح",
  "المختصر",
  "الكافي",
  "الشامل",
  "الجامع",
  "المفيد",
  "المنهجي",
  "التطبيقي",
  "النظري",
  "الأساسي",
  "المتقدم",
  "التمهيدي",
];

export const DOC_STATUSES = ["UPLOADED", "PROCESSING", "COMPLETED", "FAILED"];

export const EXPORT_FORMATS = ["md", "txt", "json", "docx", "epub", "pdf", "searchable-pdf"];

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomPicks(arr, count) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function generateArabicName() {
  const first = randomPick(ARABIC_FIRST_NAMES);
  const last = randomPick(ARABIC_LAST_NAMES);
  return `${first} ${last}`;
}

export function generateArabicEmail() {
  const first = randomPick(ARABIC_FIRST_NAMES);
  const num = Date.now().toString(36).slice(-6);
  return `${first}.${num}@test.ibn`;
}

export function generateArabicPassword() {
  return `Test@${randomInt(100000, 999999)}`;
}

export function generateDocumentTitle() {
  const noun = randomPick(ARABIC_NOUNS);
  const adj = randomPick(ARABIC_ADJECTIVES);
  return `كتاب ${noun} ${adj}`;
}

export function generateArabicFilename(ext = "pdf") {
  const noun = randomPick(ARABIC_NOUNS);
  const id = Date.now().toString(36).slice(-4);
  return encodeURIComponent(`${noun}-${id}.${ext}`);
}

export function generateSearchQuery() {
  if (Math.random() < 0.3) {
    const noun = randomPick(ARABIC_NOUNS);
    return noun;
  }
  if (Math.random() < 0.5) {
    const adj = randomPick(ARABIC_ADJECTIVES);
    return adj;
  }
  const words = randomPicks(ARABIC_NOUNS, 2);
  return words.join(" ");
}

export function generatePartialQuery() {
  const word = randomPick(ARABIC_NOUNS);
  return word.slice(0, randomInt(2, word.length - 1));
}

let authToken = null;
let tokenExpiry = 0;

export function login() {
  const email = AUTH_EMAIL || "admin@ibnalazhar.app";
  const password = AUTH_PASSWORD || "Admin@123456";

  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email,
      password,
    }),
    {
      headers: { "Content-Type": "application/json" },
    },
  );

  check(res, {
    "login succeeded": (r) => r.status === 200,
  });

  if (res.status === 200) {
    authToken = res.json("token") || res.json("accessToken");
    tokenExpiry = Date.now() + 55 * 60 * 1000;
  }
  return authToken;
}

export function getAuthToken() {
  if (!authToken || Date.now() > tokenExpiry) {
    return login();
  }
  return authToken;
}

export function authHeaders() {
  const token = getAuthToken();
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

export function authHeadersMultipart() {
  const token = getAuthToken();
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
}

export function registerTestUser() {
  const email = generateArabicEmail();
  const password = generateArabicPassword();
  const name = generateArabicName();

  const res = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify({
      name,
      email,
      password,
      confirmPassword: password,
    }),
    {
      headers: { "Content-Type": "application/json" },
    },
  );

  return {
    success: res.status === 200 || res.status === 201,
    email,
    password,
    name,
    response: res,
  };
}

let rateLimitBackoff = 0;

export function rateLimitAwareRequest(url, params = {}, retries = 3) {
  if (Date.now() < rateLimitBackoff) {
    sleep((rateLimitBackoff - Date.now()) / 1000);
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    const res = http.get(url, params);

    if (res.status === 429) {
      rateLimitHits.add(1);
      const retryAfter = parseInt(res.headers["Retry-After"] || "5", 10);
      rateLimitBackoff = Date.now() + retryAfter * 1000;
      sleep(retryAfter);
      continue;
    }

    return res;
  }

  return null;
}

export function rateLimitAwarePost(url, body, params = {}, retries = 3) {
  if (Date.now() < rateLimitBackoff) {
    sleep((rateLimitBackoff - Date.now()) / 1000);
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    const res = http.post(url, body, params);

    if (res.status === 429) {
      rateLimitHits.add(1);
      const retryAfter = parseInt(res.headers["Retry-After"] || "5", 10);
      rateLimitBackoff = Date.now() + retryAfter * 1000;
      sleep(retryAfter);
      continue;
    }

    return res;
  }

  return null;
}

export function generateTestFile(sizeKB) {
  const size = sizeKB * 1024;
  const chunk = "أبجد هوز حطي كلمن سعفص قرشت ثخذ ضظغ\n";
  const repeats = Math.ceil(size / chunk.length);
  return chunk.repeat(repeats).slice(0, size);
}

export function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

export function trackMetrics(res, label) {
  errorRate.add(res.status >= 400);
  requestDuration.add(res.timings.duration, { endpoint: label });
}

export function defaultCheck(res, label, expectedStatus = 200) {
  const checks = {
    [`${label} status ${expectedStatus}`]: (r) => r.status === expectedStatus,
  };
  check(res, checks);
  trackMetrics(res, label);
}

export function generateBatchExportPayload(docCount = 5) {
  const docIds = Array.from({ length: docCount }, (_, i) => `test-doc-${1000 + i}`);
  const format = randomPick(EXPORT_FORMATS);
  return JSON.stringify({
    documentIds: docIds,
    format,
    profile: "research",
    includeSource: false,
  });
}
