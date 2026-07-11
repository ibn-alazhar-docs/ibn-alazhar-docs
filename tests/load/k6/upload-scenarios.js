import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

import {
  BASE_URL,
  authHeadersMultipart,
  generateTestFile,
  generateDocumentTitle,
  generateArabicFilename,
  errorRate,
  requestDuration,
  defaultCheck,
  trackMetrics,
  randomInt,
  randomPick,
} from "./helpers.js";

export const uploadDurationSmall = new Trend("upload_duration_small");
export const uploadDurationMedium = new Trend("upload_duration_medium");
export const uploadDurationLarge = new Trend("upload_duration_large");
export const uploadSize = new Counter("upload_size_bytes");
export const uploadTimeouts = new Counter("upload_timeouts");

export const options = {
  scenarios: {
    small_files_10_users: {
      executor: "constant-vus",
      vus: 10,
      duration: "2m",
      exec: "uploadSmallFile",
      tags: { test_type: "small_upload", concurrency: "10" },
    },
    medium_files_50_users: {
      executor: "constant-vus",
      vus: 50,
      duration: "2m",
      exec: "uploadMediumFile",
      tags: { test_type: "medium_upload", concurrency: "50" },
    },
    large_files_5_users: {
      executor: "constant-vus",
      vus: 5,
      duration: "3m",
      exec: "uploadLargeFile",
      tags: { test_type: "large_upload", concurrency: "5" },
    },
    ramp_up_50_users: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 50 },
        { duration: "1m", target: 50 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "10s",
      exec: "uploadSmallFile",
      tags: { test_type: "ramp_up", concurrency: "ramp" },
    },
    stress_ramp_200: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 200 },
        { duration: "1m", target: 200 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "15s",
      exec: "uploadSmallFile",
      tags: { test_type: "stress", concurrency: "200" },
    },
  },
  thresholds: {
    errors: ["rate<0.01"],
    upload_duration_small: ["p(95)<5000"],
    upload_duration_medium: ["p(95)<5000"],
    upload_duration_large: ["p(95)<15000"],
    http_req_duration: ["p(95)<15000"],
    upload_timeouts: ["count<1"],
  },
};

export function uploadSmallFile() {
  const fileContent = generateTestFile(1024);
  const filename = generateArabicFilename("pdf");

  const body = {
    file: http.file(fileContent, filename, "application/pdf"),
    folderId: null,
  };

  const res = http.post(`${BASE_URL}/api/upload`, body, {
    headers: authHeadersMultipart(),
    timeout: "30s",
  });

  check(res, {
    "small file upload accepted": (r) => r.status === 201,
    "response has job ID": (r) => {
      try {
        return JSON.parse(r.body).jobId !== undefined;
      } catch {
        return false;
      }
    },
    "no timeout": (r) => r.status !== 0,
  });

  if (res.status === 0) {
    uploadTimeouts.add(1);
  }

  errorRate.add(res.status !== 201);
  uploadDurationSmall.add(res.timings.duration);
  uploadSize.add(1024 * 1024);
  trackMetrics(res, "upload_small");

  sleep(randomInt(1, 3));
}

export function uploadMediumFile() {
  const fileContent = generateTestFile(100);
  const filename = generateArabicFilename("pdf");

  const body = {
    file: http.file(fileContent, filename, "application/pdf"),
    folderId: null,
  };

  const res = http.post(`${BASE_URL}/api/upload`, body, {
    headers: authHeadersMultipart(),
    timeout: "30s",
  });

  check(res, {
    "medium file upload accepted": (r) => r.status === 201,
    "response has job ID": (r) => {
      try {
        return JSON.parse(r.body).jobId !== undefined;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(res.status !== 201);
  uploadDurationMedium.add(res.timings.duration);
  uploadSize.add(100 * 1024);
  trackMetrics(res, "upload_medium");

  sleep(randomInt(1, 2));
}

export function uploadLargeFile() {
  const fileContent = generateTestFile(10240);
  const filename = generateArabicFilename("pdf");

  const body = {
    file: http.file(fileContent, filename, "application/pdf"),
    folderId: null,
  };

  const res = http.post(`${BASE_URL}/api/upload`, body, {
    headers: authHeadersMultipart(),
    timeout: "60s",
  });

  check(res, {
    "large file upload accepted": (r) => r.status === 201,
    "response has job ID": (r) => {
      try {
        return JSON.parse(r.body).jobId !== undefined;
      } catch {
        return false;
      }
    },
  });

  if (res.status === 0) {
    uploadTimeouts.add(1);
  }

  errorRate.add(res.status !== 201);
  uploadDurationLarge.add(res.timings.duration);
  uploadSize.add(10 * 1024 * 1024);
  trackMetrics(res, "upload_large");

  sleep(randomInt(2, 5));
}
