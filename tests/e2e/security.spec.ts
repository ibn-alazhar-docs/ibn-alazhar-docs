import { test, expect, request as playwrightRequest } from "@playwright/test";
import path from "path";
import fs from "fs";

const BASE = "http://localhost:3000";

test.describe.configure({ mode: "serial" });

test.describe("Security Test Suite — Vulnerability Scans", () => {
  let hackerContext: any;
  let victimContext: any;

  let victimFolderId = "";

  const hackerEmail = `hacker_${Date.now()}@ibnalazhar.app`;
  const victimEmail = `victim_${Date.now()}@ibnalazhar.app`;
  const password = "Password123!";

  test.beforeAll(async ({ request }) => {
    // 1. Create Hacker
    await request.post(`${BASE}/api/auth/register`, {
      headers: { Origin: BASE },
      data: { name: "Hacker", email: hackerEmail, password, confirmPassword: password },
    });
    // 2. Create Victim
    await request.post(`${BASE}/api/auth/register`, {
      headers: { Origin: BASE },
      data: { name: "Victim", email: victimEmail, password, confirmPassword: password },
    });
  });

  // Helper to login via UI to get the NextAuth session cookies
  async function loginAndGetContext(browser: any, email: string) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${BASE}/ar/login`);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.locator('button[type="submit"]').first().click({ force: true });
    await page.waitForURL(/\/ar\/dashboard/);
    return { context, page };
  }

  test("1. Authentication & Session Bypass", async ({ browser, request }) => {
    // Attempt to access API without token
    const res1 = await request.get(`${BASE}/api/folders`);
    expect([401, 403]).toContain(res1.status());

    // Login to get valid cookies
    const victimSession = await loginAndGetContext(browser, victimEmail);
    victimContext = victimSession.context;
    const hackerSession = await loginAndGetContext(browser, hackerEmail);
    hackerContext = hackerSession.context;

    // Tamper with session cookie
    const cookies = await hackerContext.cookies();
    const sessionCookie = cookies.find((c: any) => c.name.includes("session-token"));
    expect(sessionCookie).toBeDefined();

    const tamperedContext = await playwrightRequest.newContext();
    const res2 = await tamperedContext.get(`${BASE}/api/folders`, {
      headers: {
        Cookie: `${sessionCookie.name}=tampered_invalid_token_12345;`,
      },
    });
    expect([401, 403]).toContain(res2.status());

    await victimSession.page.close();
    await hackerSession.page.close();
  });

  test("2. Authorization & IDOR (Cross-User Access)", async ({ request }) => {
    const victimReq = await victimContext.request;
    const hackerReq = await hackerContext.request;

    // Victim creates a folder
    const createRes = await victimReq.post(`${BASE}/api/folders`, {
      headers: { Origin: BASE },
      data: { name: "Victim Secret Folder", color: "#FF0000" },
    });
    const createText = await createRes.text();
    expect(createRes.status(), createText).toBe(201);
    const folder = JSON.parse(createText);
    victimFolderId = folder.id;

    // Hacker attempts to read victim's folder
    const readRes = await hackerReq.get(`${BASE}/api/folders/${victimFolderId}`);
    expect([401, 403, 404]).toContain(readRes.status());

    // Hacker attempts to update victim's folder
    const updateRes = await hackerReq.patch(`${BASE}/api/folders/${victimFolderId}`, {
      headers: { Origin: BASE },
      data: { name: "Hacked Folder" },
    });
    expect([401, 403, 404]).toContain(updateRes.status());

    // Hacker attempts to delete victim's folder
    const deleteRes = await hackerReq.delete(`${BASE}/api/folders/${victimFolderId}`, {
      headers: { Origin: BASE },
    });
    expect([401, 403, 404]).toContain(deleteRes.status());
  });

  test("3. Input Validation & SQL Injection", async ({ request }) => {
    // Attempt SQLi on Login
    const sqlRes = await request.post(`${BASE}/api/auth/callback/credentials`, {
      headers: { Origin: BASE },
      form: {
        email: "admin@ibnalazhar.app' OR '1'='1",
        password: "password",
      },
    });
    // NextAuth might return 200 with an error payload. As long as it's not 500, we're safe.
    expect(sqlRes.status()).not.toBe(500);

    const hackerReq = await hackerContext.request;

    // Attempt SQLi on Folder Creation
    const sqliFolderRes = await hackerReq.post(`${BASE}/api/folders`, {
      headers: { Origin: BASE },
      data: { name: "Folder'); DROP TABLE Folders;--", color: "#000000" },
    });
    // Should either create the folder literally or reject it, but not 500
    expect(sqliFolderRes.status()).not.toBe(500);
  });

  test("4. Cross-Site Scripting (XSS)", async ({ browser }) => {
    const hackerReq = await hackerContext.request;
    const xssPayload = `<script>alert('XSS')</script><img src="x" onerror="alert('XSS')">`;

    // Create a folder with XSS payload
    const createRes = await hackerReq.post(`${BASE}/api/folders`, {
      headers: { Origin: BASE },
      data: { name: xssPayload, color: "#000000" },
    });
    expect([201, 400]).toContain(createRes.status());

    // Verify UI escapes it
    const page = await hackerContext.newPage();
    await page.goto(`${BASE}/ar/folders`);

    // Playwright locator will fail to find it if it rendered as raw HTML
    // But we can check the innerHTML of the page to ensure no raw script tags executed
    const content = await page.content();
    // In React, it should be escaped as &lt;script&gt;
    const isEscaped =
      content.includes("&lt;script&gt;") || !content.includes("<script>alert('XSS')</script>");
    expect(isEscaped).toBeTruthy();

    await page.close();
  });

  test("5. File Upload Security", async ({ request }) => {
    const hackerReq = await hackerContext.request;

    // Test: Invalid MIME type (PHP masquerading as PDF)
    const fakePhpFile = Buffer.from("<?php echo 'Hacked'; ?>");
    const uploadRes = await hackerReq.post(`${BASE}/api/upload`, {
      headers: { Origin: BASE },
      multipart: {
        file: {
          name: "shell.php.pdf",
          mimeType: "application/pdf", // Spoofing MIME
          buffer: fakePhpFile,
        },
      },
    });

    expect(uploadRes.status()).not.toBe(500);

    // Test: Oversized Upload
    const largeBuffer = Buffer.alloc(1024 * 1024 * 6); // 6MB
    const largeUploadRes = await hackerReq.post(`${BASE}/api/upload`, {
      multipart: {
        file: {
          name: "large.pdf",
          mimeType: "application/pdf",
          buffer: largeBuffer,
        },
      },
    });
    expect(largeUploadRes.status()).not.toBe(500);
  });

  test("6. Share Link Attacks", async ({ request }) => {
    // Guessing invalid token
    const guessRes = await request.get(`${BASE}/api/share/token_that_does_not_exist_12345`);
    expect([401, 403, 404]).toContain(guessRes.status());

    // Check if the UI leaks anything for an invalid share link
    const page = await hackerContext.newPage();
    const response = await page.goto(`${BASE}/s/token_that_does_not_exist_12345`);
    const status = response?.status() ?? 500;
    expect([404, 400]).toContain(status);
    await page.close();
  });

  test("7. Path Traversal & Unauthorized API Access", async () => {
    const hackerReq = await hackerContext.request;

    // Path Traversal Attempt
    const traversalRes = await hackerReq.get(`${BASE}/api/documents/../../../../etc/passwd`);
    expect([400, 404, 401, 403]).toContain(traversalRes.status());

    // Check Metrics API (Unauthorized)
    const metricsRes = await hackerReq.get(`${BASE}/api/metrics`);
    expect([401, 403, 404]).toContain(metricsRes.status());
  });

  test.afterAll(async () => {
    if (hackerContext) await hackerContext.close();
    if (victimContext) await victimContext.close();
  });
});
