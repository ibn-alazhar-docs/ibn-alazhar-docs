import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

import {
  BASE_URL,
  authHeaders,
  errorRate,
  requestDuration,
  defaultCheck,
  trackMetrics,
  randomPick,
  randomInt,
  generateArabicName,
  generateArabicEmail,
  generateArabicPassword,
  registerTestUser,
} from "./helpers.js";

export const getDuration = new Trend("get_duration");
export const postDuration = new Trend("post_duration");
export const dashboardDuration = new Trend("dashboard_duration");
export const documentsDuration = new Trend("documents_duration");
export const searchDuration = new Trend("search_api_duration");
export const foldersDuration = new Trend("folders_duration");
export const tagsDuration = new Trend("tags_duration");
export const authDuration = new Trend("auth_duration");

const SEARCH_QUERIES = ["التوحيد", "الفقه", "النحو", "الحديث", "التفسير", "بلاغة", "عقيدة"];

export const options = {
  scenarios: {
    mixed_100_users: {
      executor: "constant-vus",
      vus: 100,
      duration: "3m",
      exec: "mixedReadWrite",
      tags: { test_type: "mixed", concurrency: "100" },
    },
    read_heavy_80_20: {
      executor: "constant-vus",
      vus: 100,
      duration: "3m",
      exec: "readHeavy",
      tags: { test_type: "read_heavy", ratio: "80_20" },
    },
    write_heavy_30_70: {
      executor: "constant-vus",
      vus: 50,
      duration: "3m",
      exec: "writeHeavy",
      tags: { test_type: "write_heavy", ratio: "30_70" },
    },
    peak_get_500_users: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 500 },
        { duration: "2m", target: 500 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "15s",
      exec: "peakGet",
      tags: { test_type: "peak_get", concurrency: "500" },
    },
  },
  thresholds: {
    errors: ["rate<0.001"],
    get_duration: ["p(95)<2000"],
    post_duration: ["p(95)<5000"],
    dashboard_duration: ["p(95)<2000"],
    documents_duration: ["p(95)<2000"],
    search_api_duration: ["p(95)<2000"],
    folders_duration: ["p(95)<2000"],
    tags_duration: ["p(95)<2000"],
    auth_duration: ["p(95)<5000"],
    http_req_duration: ["p(95)<5000"],
  },
};

function getDashboard() {
  const res = http.get(`${BASE_URL}/api/dashboard`, { headers: authHeaders() });
  defaultCheck(res, "GET /api/dashboard");
  dashboardDuration.add(res.timings.duration);
  return res;
}

function getDocuments() {
  const params = { page: randomInt(1, 5), limit: 20 };
  const res = http.get(`${BASE_URL}/api/documents?page=${params.page}&limit=${params.limit}`, {
    headers: authHeaders(),
  });
  defaultCheck(res, "GET /api/documents");
  documentsDuration.add(res.timings.duration);
  return res;
}

function getSearch() {
  const q = randomPick(SEARCH_QUERIES);
  const res = http.get(`${BASE_URL}/api/search?q=${encodeURIComponent(q)}&page=1&limit=20`, {
    headers: authHeaders(),
  });
  defaultCheck(res, "GET /api/search");
  searchDuration.add(res.timings.duration);
  return res;
}

function getFolders() {
  const res = http.get(`${BASE_URL}/api/folders`, { headers: authHeaders() });
  defaultCheck(res, "GET /api/folders");
  foldersDuration.add(res.timings.duration);
  return res;
}

function getTags() {
  const res = http.get(`${BASE_URL}/api/tags`, { headers: authHeaders() });
  defaultCheck(res, "GET /api/tags");
  tagsDuration.add(res.timings.duration);
  return res;
}

function postRegister() {
  const name = generateArabicName();
  const email = generateArabicEmail();
  const password = generateArabicPassword();

  const res = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify({
      name,
      email,
      password,
      confirmPassword: password,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
  defaultCheck(res, "POST /api/auth/register", 200);
  authDuration.add(res.timings.duration);
  return res;
}

function postLogin() {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: "admin@ibnalazhar.app",
      password: "Admin@123456",
    }),
    { headers: { "Content-Type": "application/json" } },
  );
  defaultCheck(res, "POST /api/auth/login");
  authDuration.add(res.timings.duration);
  return res;
}

const GET_ENDPOINTS = [getDashboard, getDocuments, getSearch, getFolders, getTags];
const POST_ENDPOINTS = [postRegister, postLogin];

function runRandomGet() {
  const fn = randomPick(GET_ENDPOINTS);
  fn();
}

function runRandomPost() {
  const fn = randomPick(POST_ENDPOINTS);
  fn();
}

export function mixedReadWrite() {
  const groupName = "Mixed 100 users (50/50)";
  group(groupName, () => {
    if (Math.random() < 0.5) {
      runRandomGet();
    } else {
      runRandomPost();
    }
  });

  trackMetrics({ timings: { duration: 0 }, status: 200 }, "mixed_vu_tick");
  sleep(randomInt(1, 3));
}

export function readHeavy() {
  const groupName = "Read-heavy 100 users (80/20)";
  group(groupName, () => {
    if (Math.random() < 0.8) {
      runRandomGet();
    } else {
      runRandomPost();
    }
  });

  sleep(randomInt(1, 2));
}

export function writeHeavy() {
  const groupName = "Write-heavy 50 users (30/70)";
  group(groupName, () => {
    if (Math.random() < 0.3) {
      runRandomGet();
    } else {
      runRandomPost();
    }
  });

  sleep(randomInt(1, 3));
}

export function peakGet() {
  const groupName = "Peak GET 500 users";
  group(groupName, () => {
    runRandomGet();
  });

  sleep(randomInt(1, 2));
}
