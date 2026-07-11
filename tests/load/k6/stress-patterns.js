import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend, Counter, Gauge } from "k6/metrics";

import {
  BASE_URL,
  authHeaders,
  authHeadersMultipart,
  errorRate,
  requestDuration,
  defaultCheck,
  trackMetrics,
  randomPick,
  randomInt,
  generateTestFile,
  generateArabicFilename,
  generateSearchQuery,
  generateBatchExportPayload,
  EXPORT_FORMATS,
} from "./helpers.js";

export const spikeDuration = new Trend("spike_duration");
export const soakDuration = new Trend("soak_duration");
export const burstDuration = new Trend("burst_duration");
export const mixedWorkloadDuration = new Trend("mixed_workload_duration");
export const rateLimitDuration = new Trend("rate_limit_duration");
export const rateLimitBurstDuration = new Trend("rate_limit_burst_duration");
export const status429Count = new Counter("status_429_count");
export const status200Count = new Counter("status_200_count");

const SEARCH_QUERIES = ["فقه", "نحو", "تفسير", "حديث", "توحيد"];

export const options = {
  scenarios: {
    spike_500_users: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 500 },
        { duration: "1m", target: 500 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "20s",
      exec: "spikeScenario",
      tags: { test_type: "spike", concurrency: "500" },
    },
    soak_50_users: {
      executor: "constant-vus",
      vus: 50,
      duration: "30m",
      exec: "soakScenario",
      tags: { test_type: "soak", duration: "30m" },
    },
    burst_5_cycles: {
      executor: "ramping-arrival-rate",
      startRate: 200,
      timeUnit: "30s",
      preAllocatedVUs: 200,
      maxVUs: 300,
      stages: [
        { duration: "30s", target: 200 },
        { duration: "30s", target: 0 },
        { duration: "30s", target: 200 },
        { duration: "30s", target: 0 },
        { duration: "30s", target: 200 },
        { duration: "30s", target: 0 },
        { duration: "30s", target: 200 },
        { duration: "30s", target: 0 },
        { duration: "30s", target: 200 },
        { duration: "30s", target: 0 },
      ],
      exec: "burstScenario",
      tags: { test_type: "burst", cycles: "5" },
    },
    mixed_workload: {
      executor: "constant-vus",
      vus: 50,
      duration: "3m",
      exec: "mixedWorkloadScenario",
      tags: { test_type: "mixed_workload" },
    },
    rate_limit_just_below: {
      executor: "constant-arrival-rate",
      rate: 18,
      timeUnit: "1s",
      duration: "5m",
      preAllocatedVUs: 10,
      maxVUs: 20,
      exec: "rateLimitJustBelow",
      tags: { test_type: "rate_limit_below" },
    },
    rate_limit_burst_above: {
      executor: "ramping-arrival-rate",
      startRate: 5,
      timeUnit: "1s",
      preAllocatedVUs: 20,
      maxVUs: 50,
      stages: [
        { duration: "10s", target: 50 },
        { duration: "30s", target: 50 },
        { duration: "10s", target: 5 },
      ],
      exec: "rateLimitBurstAbove",
      tags: { test_type: "rate_limit_burst" },
    },
  },
  thresholds: {
    errors: ["rate<0.05"],
    spike_duration: ["p(95)<5000"],
    soak_duration: ["p(95)<3000"],
    burst_duration: ["p(95)<5000"],
    mixed_workload_duration: ["p(95)<10000"],
    http_req_duration: ["p(95)<15000"],
  },
};

export function spikeScenario() {
  const q = randomPick(SEARCH_QUERIES);

  const res = http.get(`${BASE_URL}/api/search?q=${encodeURIComponent(q)}&page=1&limit=10`, {
    headers: authHeaders(),
  });

  check(res, {
    "spike search returns 200": (r) => r.status === 200,
  });

  errorRate.add(res.status >= 400);
  spikeDuration.add(res.timings.duration);
  trackMetrics(res, "spike_search");

  sleep(randomInt(1, 2));
}

export function soakScenario() {
  const q = randomPick(SEARCH_QUERIES);

  const res = http.get(`${BASE_URL}/api/search?q=${encodeURIComponent(q)}&page=1&limit=20`, {
    headers: authHeaders(),
  });

  check(res, {
    "soak search returns 200": (r) => r.status === 200,
  });

  errorRate.add(res.status !== 200);
  soakDuration.add(res.timings.duration);
  trackMetrics(res, "soak_search");

  sleep(randomInt(2, 4));
}

export function burstScenario() {
  const endpoints = [
    () => {
      const q = randomPick(SEARCH_QUERIES);
      return http.get(`${BASE_URL}/api/search?q=${encodeURIComponent(q)}&page=1&limit=20`, {
        headers: authHeaders(),
      });
    },
    () => {
      return http.get(`${BASE_URL}/api/documents?page=1&limit=20`, { headers: authHeaders() });
    },
    () => {
      return http.get(`${BASE_URL}/api/folders`, { headers: authHeaders() });
    },
    () => {
      return http.get(`${BASE_URL}/api/tags`, { headers: authHeaders() });
    },
  ];

  const fn = randomPick(endpoints);
  const res = fn();

  check(res, {
    "burst request succeeded": (r) => r.status === 200,
  });

  errorRate.add(res.status !== 200);
  burstDuration.add(res.timings.duration);
  trackMetrics(res, "burst");

  sleep(1);
}

export function mixedWorkloadScenario() {
  const workloadType = Math.random();

  group("Mixed workload", () => {
    if (workloadType < 0.33) {
      const fileContent = generateTestFile(500);
      const filename = generateArabicFilename("pdf");

      const res = http.post(
        `${BASE_URL}/api/upload`,
        {
          file: http.file(fileContent, filename, "application/pdf"),
        },
        {
          headers: authHeadersMultipart(),
          timeout: "30s",
        },
      );

      check(res, {
        "mixed upload accepted": (r) => r.status === 201,
      });
      errorRate.add(res.status !== 201);
      mixedWorkloadDuration.add(res.timings.duration);
      trackMetrics(res, "mixed_upload");
    } else if (workloadType < 0.66) {
      const docId = "test-doc-1001";
      const format = randomPick(EXPORT_FORMATS);

      const res = http.get(`${BASE_URL}/api/export/${docId}/${format}`, {
        headers: authHeaders(),
        timeout: "60s",
      });

      check(res, {
        "mixed export succeeded": (r) => r.status === 200,
      });
      errorRate.add(res.status !== 200);
      mixedWorkloadDuration.add(res.timings.duration);
      trackMetrics(res, "mixed_export");
    } else {
      const q = randomPick(SEARCH_QUERIES);

      const res = http.get(`${BASE_URL}/api/search?q=${encodeURIComponent(q)}&page=1&limit=20`, {
        headers: authHeaders(),
      });

      check(res, {
        "mixed search succeeded": (r) => r.status === 200,
      });
      errorRate.add(res.status !== 200);
      mixedWorkloadDuration.add(res.timings.duration);
      trackMetrics(res, "mixed_search");
    }
  });

  sleep(randomInt(2, 5));
}

export function rateLimitJustBelow() {
  const q = randomPick(SEARCH_QUERIES);

  const res = http.get(`${BASE_URL}/api/search?q=${encodeURIComponent(q)}&page=1&limit=20`, {
    headers: authHeaders(),
  });

  check(res, {
    "below-limit request succeeds": (r) => r.status === 200,
  });

  if (res.status === 200) status200Count.add(1);
  if (res.status === 429) status429Count.add(1);

  errorRate.add(res.status >= 400 && res.status !== 429);
  rateLimitDuration.add(res.timings.duration);
  trackMetrics(res, "rate_limit_below");

  sleep(1);
}

export function rateLimitBurstAbove() {
  const q = randomPick(SEARCH_QUERIES);

  const res = http.get(`${BASE_URL}/api/search?q=${encodeURIComponent(q)}&page=1&limit=20`, {
    headers: authHeaders(),
  });

  if (res.status === 429) {
    status429Count.add(1);

    check(res, {
      "rate limit response has Retry-After": (r) => r.headers["Retry-After"] !== undefined,
      "rate limit response is 429": (r) => r.status === 429,
    });

    const retryAfter = parseInt(res.headers["Retry-After"] || "1", 10);
    rateLimitBurstDuration.add(res.timings.duration);
    trackMetrics(res, "rate_limit_429");

    sleep(Math.min(retryAfter, 5));
    return;
  }

  check(res, {
    "burst request succeeded or rate limited": (r) => r.status === 200,
  });

  if (res.status === 200) status200Count.add(1);

  errorRate.add(res.status >= 400 && res.status !== 429);
  rateLimitBurstDuration.add(res.timings.duration);
  trackMetrics(res, "rate_limit_burst");

  sleep(1);
}
