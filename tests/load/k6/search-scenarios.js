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
  generateSearchQuery,
  generatePartialQuery,
  ARABIC_NOUNS,
  ARABIC_ADJECTIVES,
  DOC_STATUSES,
} from "./helpers.js";

export const searchDuration = new Trend("search_duration");
export const searchShortDuration = new Trend("search_short_duration");
export const searchArabicDuration = new Trend("search_arabic_duration");
export const searchEmptyDuration = new Trend("search_empty_duration");
export const searchSuggestDuration = new Trend("search_suggest_duration");
export const searchFilteredDuration = new Trend("search_filtered_duration");

const SHORT_QUERIES = ["فقه", "نحو", "تفسير", "حديث", "توحيد", "بلاغة", "أصول", "عقيدة"];
const ARABIC_PHRASES = [
  "التوحيد وأقسامه",
  "الفقه الإسلامي",
  "النحو والصرف",
  "علوم القرآن",
  "مصطلح الحديث",
  "أصول الفقه الميسر",
  "قواعد الإعراب",
  "المدخل إلى علم الكلام",
];
const EMPTY_QUERIES = [
  "xyznonexistent",
  "zzz999nothing",
  "qwertyuiop",
  "12345abcde",
  "docnotfoundxyz",
];
const PARTIAL_INPUTS = ["تو", "ف", "ال", "مح", "عب", "كت", "عل", "قوا"];

export const options = {
  scenarios: {
    short_queries: {
      executor: "constant-vus",
      vus: 20,
      duration: "2m",
      exec: "searchShortQuery",
      tags: { test_type: "search_short", concurrency: "20" },
    },
    arabic_queries: {
      executor: "constant-vus",
      vus: 30,
      duration: "2m",
      exec: "searchArabicQuery",
      tags: { test_type: "search_arabic", concurrency: "30" },
    },
    empty_results: {
      executor: "constant-vus",
      vus: 10,
      duration: "2m",
      exec: "searchEmptyResult",
      tags: { test_type: "search_empty", concurrency: "10" },
    },
    suggestions: {
      executor: "constant-vus",
      vus: 20,
      duration: "2m",
      exec: "searchSuggestions",
      tags: { test_type: "search_suggest", concurrency: "20" },
    },
    filtered_search: {
      executor: "constant-vus",
      vus: 15,
      duration: "2m",
      exec: "searchFiltered",
      tags: { test_type: "search_filtered", concurrency: "15" },
    },
  },
  thresholds: {
    errors: ["rate<0.001"],
    search_duration: ["p(95)<1000"],
    search_short_duration: ["p(95)<1000"],
    search_arabic_duration: ["p(95)<1000"],
    search_empty_duration: ["p(95)<1000"],
    search_suggest_duration: ["p(95)<500"],
    search_filtered_duration: ["p(95)<1000"],
    http_req_duration: ["p(95)<1000"],
  },
};

export function searchShortQuery() {
  const q = randomPick(SHORT_QUERIES);

  const res = http.get(`${BASE_URL}/api/search?q=${encodeURIComponent(q)}&page=1&limit=20`, {
    headers: authHeaders(),
  });

  check(res, {
    "short search status is 200": (r) => r.status === 200,
    "short search returns results array": (r) => {
      try {
        const body = JSON.parse(r.body);
        return (
          Array.isArray(body.documents) || Array.isArray(body.results) || body.total !== undefined
        );
      } catch {
        return false;
      }
    },
    "short search completes quickly": (r) => r.timings.duration < 5000,
  });

  errorRate.add(res.status !== 200);
  searchShortDuration.add(res.timings.duration);
  searchDuration.add(res.timings.duration);
  trackMetrics(res, "search_short");

  sleep(randomInt(1, 2));
}

export function searchArabicQuery() {
  const q = randomPick(ARABIC_PHRASES);
  const encoded = encodeURIComponent(q);

  const res = http.get(`${BASE_URL}/api/search?q=${encoded}&page=1&limit=20`, {
    headers: authHeaders(),
  });

  check(res, {
    "arabic search status is 200": (r) => r.status === 200,
    "arabic search handles RTL text": (r) => r.status === 200,
  });

  errorRate.add(res.status !== 200);
  searchArabicDuration.add(res.timings.duration);
  searchDuration.add(res.timings.duration);
  trackMetrics(res, "search_arabic");

  sleep(randomInt(1, 3));
}

export function searchEmptyResult() {
  const q = randomPick(EMPTY_QUERIES);

  const res = http.get(`${BASE_URL}/api/search?q=${encodeURIComponent(q)}&page=1&limit=20`, {
    headers: authHeaders(),
  });

  check(res, {
    "empty search returns 200, not 404": (r) => r.status === 200,
    "empty search returns empty array": (r) => {
      try {
        const body = JSON.parse(r.body);
        const items = body.documents || body.results || [];
        return items.length === 0;
      } catch {
        return false;
      }
    },
    "empty search has total of 0": (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.total === 0;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(res.status !== 200);
  searchEmptyDuration.add(res.timings.duration);
  searchDuration.add(res.timings.duration);
  trackMetrics(res, "search_empty");

  sleep(randomInt(1, 2));
}

export function searchSuggestions() {
  const q = randomPick(PARTIAL_INPUTS);

  const res = http.get(`${BASE_URL}/api/search/suggest?q=${encodeURIComponent(q)}`, {
    headers: authHeaders(),
  });

  check(res, {
    "suggest endpoint returns 200": (r) => r.status === 200,
    "suggest returns array": (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.suggestions !== undefined;
      } catch {
        return false;
      }
    },
    "suggest responds fast": (r) => r.timings.duration < 2000,
  });

  errorRate.add(res.status !== 200);
  searchSuggestDuration.add(res.timings.duration);
  trackMetrics(res, "search_suggest");

  sleep(randomInt(1, 2));
}

export function searchFiltered() {
  const q = randomPick(SHORT_QUERIES);
  const status = randomPick(DOC_STATUSES);

  let url = `${BASE_URL}/api/search?q=${encodeURIComponent(q)}&page=1&limit=20`;

  if (Math.random() < 0.5) {
    url += `&status=${status}`;
  }

  if (Math.random() < 0.3) {
    url += "&type=title";
  }

  if (Math.random() < 0.2) {
    url += "&type=folder";
  }

  const res = http.get(url, { headers: authHeaders() });

  check(res, {
    "filtered search status is 200": (r) => r.status === 200,
    "filtered search returns results": (r) => {
      try {
        return JSON.parse(r.body) !== null;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(res.status !== 200);
  searchFilteredDuration.add(res.timings.duration);
  searchDuration.add(res.timings.duration);
  trackMetrics(res, "search_filtered");

  sleep(randomInt(1, 3));
}
