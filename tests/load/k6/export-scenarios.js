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
  EXPORT_FORMATS,
  generateBatchExportPayload,
} from "./helpers.js";

export const exportDuration = new Trend("export_duration");
export const exportPdfDuration = new Trend("export_pdf_duration");
export const exportDocxDuration = new Trend("export_docx_duration");
export const exportBatchDuration = new Trend("export_batch_duration");
export const exportFormatCounter = new Trend("export_format_counter");

const FORMATS_WO_BATCH = ["md", "txt", "json", "pdf", "docx"];
const TEST_DOC_IDS = [
  "test-doc-1001",
  "test-doc-1002",
  "test-doc-1003",
  "test-doc-1004",
  "test-doc-1005",
  "test-doc-1006",
  "test-doc-1007",
  "test-doc-1008",
  "test-doc-1009",
  "test-doc-1010",
];

export const options = {
  scenarios: {
    pdf_export_20_users: {
      executor: "constant-vus",
      vus: 20,
      duration: "3m",
      exec: "exportPdf",
      tags: { test_type: "export_pdf", concurrency: "20" },
    },
    docx_export_20_users: {
      executor: "constant-vus",
      vus: 20,
      duration: "3m",
      exec: "exportDocx",
      tags: { test_type: "export_docx", concurrency: "20" },
    },
    mixed_export_30_users: {
      executor: "constant-vus",
      vus: 30,
      duration: "3m",
      exec: "exportMixed",
      tags: { test_type: "export_mixed", concurrency: "30" },
    },
    batch_export_10_users: {
      executor: "constant-vus",
      vus: 10,
      duration: "3m",
      exec: "exportBatch",
      tags: { test_type: "export_batch", concurrency: "10" },
    },
  },
  thresholds: {
    errors: ["rate<0.02"],
    export_duration: ["p(95)<10000"],
    export_pdf_duration: ["p(95)<15000"],
    export_docx_duration: ["p(95)<15000"],
    export_batch_duration: ["p(95)<20000"],
    http_req_duration: ["p(95)<20000"],
  },
};

function getTestDocId() {
  return randomPick(TEST_DOC_IDS);
}

export function exportPdf() {
  const docId = getTestDocId();
  const format = "pdf";

  const res = http.get(`${BASE_URL}/api/export/${docId}/${format}`, {
    headers: authHeaders(),
    timeout: "60s",
  });

  check(res, {
    "PDF export succeeded": (r) => r.status === 200,
    "PDF content type is correct": (r) => {
      const ct = r.headers["Content-Type"] || "";
      return ct.includes("pdf") || ct.includes("octet-stream") || ct.includes("application");
    },
    "PDF response has content": (r) => r.body.length > 0,
  });

  errorRate.add(res.status !== 200);
  exportPdfDuration.add(res.timings.duration);
  exportDuration.add(res.timings.duration);
  trackMetrics(res, "export_pdf");

  sleep(randomInt(2, 5));
}

export function exportDocx() {
  const docId = getTestDocId();
  const format = "docx";

  const res = http.get(`${BASE_URL}/api/export/${docId}/${format}`, {
    headers: authHeaders(),
    timeout: "60s",
  });

  check(res, {
    "DOCX export succeeded": (r) => r.status === 200,
    "DOCX content type is correct": (r) => {
      const ct = r.headers["Content-Type"] || "";
      return ct.includes("docx") || ct.includes("octet-stream") || ct.includes("zip");
    },
    "DOCX response has content": (r) => r.body.length > 0,
  });

  errorRate.add(res.status !== 200);
  exportDocxDuration.add(res.timings.duration);
  exportDuration.add(res.timings.duration);
  trackMetrics(res, "export_docx");

  sleep(randomInt(2, 5));
}

export function exportMixed() {
  const docId = getTestDocId();
  const format = randomPick(FORMATS_WO_BATCH);

  const res = http.get(`${BASE_URL}/api/export/${docId}/${format}`, {
    headers: authHeaders(),
    timeout: "60s",
  });

  check(res, {
    [`${format.toUpperCase()} export succeeded`]: (r) => r.status === 200,
    "export response has content": (r) => r.body.length > 0,
  });

  errorRate.add(res.status !== 200);
  exportDuration.add(res.timings.duration);
  trackMetrics(res, `export_${format}`);

  sleep(randomInt(1, 4));
}

export function exportBatch() {
  const docCount = randomInt(3, 10);
  const payload = generateBatchExportPayload(docCount);

  const res = http.post(`${BASE_URL}/api/export/batch`, payload, {
    headers: authHeaders(),
    timeout: "120s",
  });

  check(res, {
    "batch export succeeded": (r) => r.status === 200,
    "batch export returns zip": (r) => {
      const ct = r.headers["Content-Type"] || "";
      return ct.includes("zip") || ct.includes("octet-stream");
    },
    "batch export has content": (r) => r.body.length > 0,
  });

  errorRate.add(res.status !== 200);
  exportBatchDuration.add(res.timings.duration);
  exportDuration.add(res.timings.duration);
  trackMetrics(res, "export_batch");

  sleep(randomInt(3, 8));
}
