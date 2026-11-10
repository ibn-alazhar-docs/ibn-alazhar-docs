import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
const APP_DIR = path.resolve("apps/web/src/app");
const PLACEHOLDER = "smoke-sample-id";
function toUrl(file: string): string {
  const rel = path.relative(APP_DIR, path.dirname(file));
  const segs = rel
    .split(path.sep)
    .filter((s) => s !== "" && s !== "." && !s.startsWith("(") && !s.startsWith("[..."))
    .map((s) => (s === "[locale]" ? "ar" : /^\[.*\]$/.test(s) ? PLACEHOLDER : s));
  return "/" + segs.join("/");
}
function collect(): { pages: string[]; routes: string[] } {
  const pages: string[] = [];
  const routes: string[] = [];
  function walk(dir: string): void {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === "page.tsx") pages.push(toUrl(p));
      else if (e.name === "route.ts") routes.push(toUrl(p));
    }
  }
  walk(APP_DIR);
  return { pages: pages.sort(), routes: routes.sort() };
}
const { pages, routes } = collect();
test.describe("Routes smoke — every page and route, fail on errors", () => {
  for (const url of pages) {
    test(`page ${url}`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      page.on("console", (m) => {
        if (m.type() === "error" && !/favicon/i.test(m.text())) errors.push(m.text());
      });
      const resp = await page.goto(url);
      expect(resp?.status() ?? 0).toBeLessThan(500);
      await page.waitForTimeout(250);
      expect(errors).toEqual([]);
    });
  }
  for (const url of routes) {
    test(`api ${url}`, async ({ request }) => {
      const resp = await request.get(url);
      expect(resp.status()).toBeLessThan(500);
    });
  }
});
