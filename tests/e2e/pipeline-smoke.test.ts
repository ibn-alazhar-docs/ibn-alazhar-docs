import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = "http://127.0.0.1:3000";
const EMAIL = "admin@ibnalazhar.app";
const PASSWORD = "password123";

const SOURCE_DIR = path.resolve(__dirname, "../../test-data/source");
const PDF_PATH = (() => {
  const files = fs.readdirSync(SOURCE_DIR).filter((f) => f.toLowerCase().endsWith(".pdf"));
  if (files.length === 0) throw new Error("no sample PDF found in test-data/source");
  return path.join(SOURCE_DIR, files[0]);
})();
const PDF_NAME = path.basename(PDF_PATH);

async function login(page: Page): Promise<void> {
  await page.goto(`${BASE}/ar/login`);
  await page.waitForLoadState("networkidle");
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/dashboard/, { timeout: 30000 });
}

async function uploadPdf(context: APIRequestContext): Promise<string> {
  const buffer = fs.readFileSync(PDF_PATH);

  const csrfResp = await context.request.get("/api/csrf");
  const csrfBody = await csrfResp.json();
  const csrfToken = csrfBody.csrfToken as string;
  expect(csrfToken, "csrf token issued").toBeTruthy();

  const resp = await context.request.post("/api/upload", {
    headers: { "X-CSRF-Token": csrfToken },
    multipart: { file: { name: PDF_NAME, mimeType: "application/pdf", buffer } },
  });
  expect(resp.status(), `upload status ${resp.status()}`).toBe(201);
  const body = await resp.json();
  expect(body.success, JSON.stringify(body)).toBe(true);
  expect(body.documentId).toBeTruthy();
  return body.documentId as string;
}

async function waitForCompletion(
  context: APIRequestContext,
  id: string,
  timeoutMs = 240_000,
): Promise<string> {
  const start = Date.now();
  let last = "";
  while (Date.now() - start < timeoutMs) {
    const r = await context.request.get(`/api/conversion/${id}/status`);
    if (r.ok()) {
      const b = await r.json();
      last = b.status;
      if (b.status === "completed") return "completed";
      if (b.status === "failed") return "failed";
    }
    await new Promise((res) => setTimeout(res, 3000));
  }
  throw new Error(`timed out waiting for completion; last status=${last}`);
}

test.describe("Ibn Al-Azhar Docs — Pipeline E2E", () => {
  test.describe.configure({ timeout: 300_000 });

  test("uploads a PDF and runs it through the OCR conversion pipeline to completion", async ({
    page,
    context,
  }) => {
    await login(page);

    const documentId = await uploadPdf(context);
    console.log(`PASS: upload enqueued validation — documentId=${documentId}`);

    const finalStatus = await waitForCompletion(context, documentId);
    expect(finalStatus, "conversion should complete").toBe("completed");
    console.log(`PASS: conversion reached 'completed' for ${documentId}`);

    const statusResp = await context.request.get(`/api/conversion/${documentId}/status`);
    const statusBody = await statusResp.json();
    expect(statusBody.readyForExport).toBe(true);
    console.log(`PASS: outputs readyForExport=${statusBody.readyForExport}`);
  });

  test("SSE stream connects and disconnects cleanly for an owned document", async ({
    page,
    context,
  }) => {
    await login(page);
    const documentId = await uploadPdf(context);
    console.log(`PASS: uploaded doc ${documentId} for SSE test`);

    const cookies = await context.cookies(BASE);
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    const resp = await fetch(`${BASE}/api/stream?jobId=${documentId}`, {
      headers: { cookie: cookieHeader, accept: "text/event-stream" },
    });
    expect(resp.status, `sse status ${resp.status}`).toBe(200);
    expect(resp.headers.get("content-type")).toBe("text/event-stream");

    const reader = resp.body!.getReader();
    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);
    expect(text, "first SSE frame").toContain("connected");
    expect(text).toContain(documentId);
    console.log("PASS: SSE connected event received");

    await reader.cancel();
    console.log("PASS: SSE client disconnected (server should decrement connections)");
  });
});
