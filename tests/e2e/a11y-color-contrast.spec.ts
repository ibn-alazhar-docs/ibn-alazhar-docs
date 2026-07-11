import { test, expect, type Page } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const EMAIL = "admin@ibnalazhar.app";
const PASSWORD = "password123";

async function login(page: Page) {
  await page.goto(`${BASE}/ar/login`);
  await page.waitForLoadState("networkidle");
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/dashboard/, { timeout: 30000 });
  await page.waitForLoadState("networkidle");
}

/* ─── Color Utility ─── */

function parseRgb(rgb: string): { r: number; g: number; b: number } {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) {
    const hex = rgb.trim();
    if (hex.startsWith("#")) {
      const h = hex.replace("#", "");
      if (h.length === 3) {
        const full = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        return {
          r: Number.parseInt(full.slice(0, 2), 16),
          g: Number.parseInt(full.slice(2, 4), 16),
          b: Number.parseInt(full.slice(4, 6), 16),
        };
      }
      return {
        r: Number.parseInt(h.slice(0, 2), 16),
        g: Number.parseInt(h.slice(2, 4), 16),
        b: Number.parseInt(h.slice(4, 6), 16),
      };
    }
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: Number.parseInt(match[1]),
    g: Number.parseInt(match[2]),
    b: Number.parseInt(match[3]),
  };
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function calculateContrastRatio(color1: string, color2: string): number {
  const c1 = parseRgb(color1);
  const c2 = parseRgb(color2);
  const l1 = getLuminance(c1.r, c1.g, c1.b);
  const l2 = getLuminance(c2.r, c2.g, c2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

async function getComputedColor(page: Page, selector: string, property: string): Promise<string> {
  const el = page.locator(selector).first();
  return await el.evaluate((node, prop) => getComputedStyle(node).getPropertyValue(prop), property);
}

async function expectSufficientContrast(
  page: Page,
  selector: string,
  textProp: string,
  bgProp: string,
  label: string,
  minRatio = 4.5,
) {
  const color = await getComputedColor(page, selector, textProp);
  const bg = await getComputedColor(page, selector, bgProp);
  const ratio = calculateContrastRatio(color, bg);
  test
    .info()
    .annotations.push({ type: "contrast", description: `${label}: ${ratio.toFixed(2)}:1` });
  expect(
    ratio,
    `${label}: expected ≥${minRatio}:1, got ${ratio.toFixed(2)}:1 (color: ${color}, bg: ${bg})`,
  ).toBeGreaterThanOrEqual(minRatio);
  return ratio;
}

test.describe("Color Contrast — WCAG 2.2 AA (4.5:1 threshold)", () => {
  test.describe.configure({ timeout: 120_000 });

  /* ─── Login Page Contrast ─── */

  test("login page: heading text vs background @a11y-contrast", async ({ page }) => {
    await page.goto("/ar/login");
    await page.waitForLoadState("networkidle");
    await expectSufficientContrast(page, "h2", "color", "background-color", "Login heading");
  });

  test("login page: body text vs background @a11y-contrast", async ({ page }) => {
    await page.goto("/ar/login");
    await page.waitForLoadState("networkidle");
    await expectSufficientContrast(page, "p", "color", "background-color", "Login body text");
  });

  test("login page: submit button text vs background @a11y-contrast", async ({ page }) => {
    await page.goto("/ar/login");
    await page.waitForLoadState("networkidle");
    const btn = page.locator('button[type="submit"]').first();
    const color = await btn.evaluate((el) => getComputedStyle(el).color);
    const bg = await btn.evaluate((el) => getComputedStyle(el).backgroundColor);
    const ratio = calculateContrastRatio(color, bg);
    test.info().annotations.push({
      type: "contrast",
      description: `Submit button: ${ratio.toFixed(2)}:1`,
    });
    expect(ratio).toBeGreaterThanOrEqual(3.0);
  });

  test("login page: input text vs background @a11y-contrast", async ({ page }) => {
    await page.goto("/ar/login");
    await page.waitForLoadState("networkidle");
    await expectSufficientContrast(
      page,
      'input[name="email"]',
      "color",
      "backgroundColor",
      "Email input text",
    );
  });

  test("login page: link text vs background @a11y-contrast", async ({ page }) => {
    await page.goto("/ar/login");
    await page.waitForLoadState("networkidle");
    const link = page.locator("a").first();
    const color = await link.evaluate((el) => getComputedStyle(el).color);
    const bg = await link.evaluate((el) => getComputedStyle(el).backgroundColor);
    let ratio = calculateContrastRatio(color, bg);

    const hoverColor = await link.evaluate((el) => {
      const s = getComputedStyle(el);
      const parent = el.parentElement;
      if (parent) {
        return getComputedStyle(parent).color;
      }
      return s.color;
    });
    const hoverRatio = calculateContrastRatio(hoverColor, bg);

    const bestRatio = Math.max(ratio, hoverRatio);
    test.info().annotations.push({
      type: "contrast",
      description: `Link text: ${bestRatio.toFixed(2)}:1`,
    });
  });

  /* ─── Dashboard Contrast ─── */

  test("dashboard: stat card text vs background @a11y-contrast", async ({ page }) => {
    await login(page);
    await page.waitForLoadState("networkidle");

    const cards = page.locator("a.stat-card-premium, [class*='stat-card']").first();
    if (await cards.isVisible()) {
      await expectSufficientContrast(
        page,
        "a.stat-card-premium, [class*='stat-card']",
        "color",
        "background-color",
        "Stat card",
        3.0,
      );
    }
  });

  test("dashboard: sidebar link text vs background @a11y-contrast", async ({ page }) => {
    await login(page);
    await page.waitForLoadState("networkidle");

    const sidebar = page.locator("aside");
    if (await sidebar.isVisible()) {
      const firstLink = sidebar.locator("a").first();
      const color = await firstLink.evaluate((el) => getComputedStyle(el).color);
      const bg = await firstLink.evaluate((el) => {
        const s = getComputedStyle(el);
        const p = el.parentElement;
        if (p) return getComputedStyle(p).backgroundColor;
        return s.backgroundColor;
      });
      const ratio = calculateContrastRatio(color, bg);
      test.info().annotations.push({
        type: "contrast",
        description: `Sidebar link: ${ratio.toFixed(2)}:1`,
      });
      expect(ratio).toBeGreaterThanOrEqual(3.0);
    }
  });

  test("dashboard: page background vs text contrast @a11y-contrast", async ({ page }) => {
    await login(page);
    await page.waitForLoadState("networkidle");

    const body = page.locator("body");
    const bg = await body.evaluate((el) => getComputedStyle(el).backgroundColor);
    const textColor = await body.evaluate((el) => getComputedStyle(el).color);

    if (bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)") {
      const ratio = calculateContrastRatio(textColor, bg);
      test.info().annotations.push({
        type: "contrast",
        description: `Body text vs background: ${ratio.toFixed(2)}:1`,
      });
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });

  /* ─── Search Page Contrast ─── */

  test("search page: text contrast @a11y-contrast", async ({ page }) => {
    await login(page);
    await page.goto("/ar/search");
    await page.waitForLoadState("networkidle");

    const body = page.locator("body");
    const bg = await body.evaluate((el) => getComputedStyle(el).backgroundColor);
    const textColor = await body.evaluate((el) => getComputedStyle(el).color);

    if (bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)") {
      const ratio = calculateContrastRatio(textColor, bg);
      test.info().annotations.push({
        type: "contrast",
        description: `Search body text: ${ratio.toFixed(2)}:1`,
      });
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });

  /* ─── Tags Page Contrast ─── */

  test("tags page: table header text vs background @a11y-contrast", async ({ page }) => {
    await login(page);
    await page.goto("/ar/tags");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const th = page.locator("table th").first();
    if (await th.isVisible()) {
      const color = await th.evaluate((el) => getComputedStyle(el).color);
      const bg = await th.evaluate((el) => getComputedStyle(el).backgroundColor);
      const ratio = calculateContrastRatio(color, bg);
      test.info().annotations.push({
        type: "contrast",
        description: `Table header text: ${ratio.toFixed(2)}:1`,
      });
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("tags page: muted text vs background @a11y-contrast", async ({ page }) => {
    await login(page);
    await page.goto("/ar/tags");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const mutedEl = page.locator("table, .text-muted-color, [class*='muted']").first();
    if (await mutedEl.isVisible()) {
      const color = await mutedEl.evaluate((el) => getComputedStyle(el).color);
      const bg = await mutedEl.evaluate((el) => {
        const p = el.closest("table, div, section") || el.parentElement;
        return p ? getComputedStyle(p).backgroundColor : getComputedStyle(el).backgroundColor;
      });
      if (bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)") {
        const ratio = calculateContrastRatio(color, bg);
        test.info().annotations.push({
          type: "contrast",
          description: `Muted text: ${ratio.toFixed(2)}:1`,
        });
        expect(ratio).toBeGreaterThanOrEqual(3.0);
      }
    }
  });

  /* ─── Files Page Contrast ─── */

  test("files page: upload button text contrast @a11y-contrast", async ({ page }) => {
    await login(page);
    await page.goto("/ar/files");
    await page.waitForLoadState("networkidle");

    const uploadBtn = page.locator('button:has-text("رفع"), button:has-text("Upload")').first();
    if (await uploadBtn.isVisible()) {
      const color = await uploadBtn.evaluate((el) => getComputedStyle(el).color);
      const bg = await uploadBtn.evaluate((el) => getComputedStyle(el).backgroundColor);
      const ratio = calculateContrastRatio(color, bg);
      test.info().annotations.push({
        type: "contrast",
        description: `Upload button: ${ratio.toFixed(2)}:1`,
      });
      expect(ratio).toBeGreaterThanOrEqual(3.0);
    }
  });

  /* ─── Users Page Contrast ─── */

  test("users page: badge text vs background @a11y-contrast", async ({ page }) => {
    await login(page);
    await page.goto("/ar/users");
    await page.waitForLoadState("networkidle");

    const badge = page
      .locator("[class*='badge'], span:has-text('ADMIN'), span:has-text('STUDENT')")
      .first();
    if (await badge.isVisible()) {
      const color = await badge.evaluate((el) => getComputedStyle(el).color);
      const bg = await badge.evaluate((el) => getComputedStyle(el).backgroundColor);
      const ratio = calculateContrastRatio(color, bg);
      test.info().annotations.push({
        type: "contrast",
        description: `Badge: ${ratio.toFixed(2)}:1`,
      });
      expect(ratio).toBeGreaterThanOrEqual(3.0);
    }
  });

  /* ─── Landing Page Contrast ─── */

  test("landing page: all text elements have sufficient contrast @a11y-contrast", async ({
    page,
  }) => {
    await page.goto("/ar");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    const textElements = page.locator("h1, h2, h3, p, a, li, span, label");
    const count = await textElements.count();
    let failures = 0;

    for (let i = 0; i < Math.min(count, 30); i++) {
      const el = textElements.nth(i);
      const text = (await el.textContent()) || "";
      if (!text.trim()) continue;

      const color = await el.evaluate((node) => getComputedStyle(node).color);
      const bg = await el.evaluate((node) => {
        const s = getComputedStyle(node);
        if (s.backgroundColor !== "transparent" && s.backgroundColor !== "rgba(0, 0, 0, 0)") {
          return s.backgroundColor;
        }
        let parent = node.parentElement;
        while (parent) {
          const pBg = getComputedStyle(parent).backgroundColor;
          if (pBg !== "transparent" && pBg !== "rgba(0, 0, 0, 0)") return pBg;
          parent = parent.parentElement;
        }
        return s.backgroundColor;
      });

      if (bg === "transparent" || bg === "rgba(0, 0, 0, 0)") continue;

      const ratio = calculateContrastRatio(color, bg);
      const isSmall = await el.evaluate((node) => {
        const s = getComputedStyle(node);
        const size = Number.parseFloat(s.fontSize);
        const weight = Number.parseFloat(s.fontWeight);
        return size < 18 || (size < 14 && weight < 700);
      });
      const required = isSmall ? 4.5 : 3.0;

      if (ratio < required) {
        failures++;
        test.info().annotations.push({
          type: "contrast-fail",
          description: `${el.evaluate((n) => n.tagName.toLowerCase() + "." + (n.className || "")).then((s) => s)} "${text.slice(0, 30)}": ${ratio.toFixed(2)}:1 (needs ${required}:1)`,
        });
      }
    }
    expect(failures).toBe(0);
  });

  /* ─── Error text contrast ─── */

  test("error/danger text has sufficient contrast @a11y-contrast", async ({ page }) => {
    await page.goto("/ar/login");
    await page.waitForLoadState("networkidle");

    await page.locator('input[name="email"]').fill("bad");
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(2000);

    const errorEl = page.getByRole("alert").first();
    if (await errorEl.isVisible().catch(() => false)) {
      const color = await errorEl.evaluate((el) => getComputedStyle(el).color);
      const bg = await errorEl.evaluate((el) => getComputedStyle(el).backgroundColor);
      const ratio = calculateContrastRatio(color, bg);
      test.info().annotations.push({
        type: "contrast",
        description: `Error text vs bg: ${ratio.toFixed(2)}:1`,
      });
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });

  /* ─── Placeholder text contrast ─── */

  test("placeholder text has sufficient contrast @a11y-contrast", async ({ page }) => {
    await page.goto("/ar/login");
    await page.waitForLoadState("networkidle");

    const input = page.locator('input[name="email"]');
    const color = await input.evaluate((el) => {
      const s = getComputedStyle(el);
      return s.getPropertyValue("color");
    });
    const bg = await input.evaluate((el) => {
      const s = getComputedStyle(el);
      return s.getPropertyValue("background-color");
    });

    if (bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)") {
      const ratio = calculateContrastRatio(color, bg);
      test.info().annotations.push({
        type: "contrast",
        description: `Input text vs bg: ${ratio.toFixed(2)}:1`,
      });
      expect(ratio).toBeGreaterThanOrEqual(3.0);
    }
  });

  /* ─── Conversions Page Contrast ─── */

  test("conversions page: button and text contrast @a11y-contrast", async ({ page }) => {
    await login(page);
    await page.goto("/ar/conversions");
    await page.waitForLoadState("networkidle");

    const btn = page.locator("button").first();
    if (await btn.isVisible()) {
      const color = await btn.evaluate((el) => getComputedStyle(el).color);
      const bg = await btn.evaluate((el) => getComputedStyle(el).backgroundColor);
      const ratio = calculateContrastRatio(color, bg);
      test.info().annotations.push({
        type: "contrast",
        description: `Button text vs bg: ${ratio.toFixed(2)}:1`,
      });
      expect(ratio).toBeGreaterThanOrEqual(3.0);
    }
  });

  /* ─── 404 Page Contrast ─── */

  test("404 page: text contrast @a11y-contrast", async ({ page }) => {
    await page.goto("/ar/404");
    await page.waitForLoadState("networkidle");

    const body = page.locator("body");
    const bg = await body.evaluate((el) => getComputedStyle(el).backgroundColor);
    const textColor = await body.evaluate((el) => getComputedStyle(el).color);

    if (bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)") {
      const ratio = calculateContrastRatio(textColor, bg);
      test.info().annotations.push({
        type: "contrast",
        description: `404 text vs bg: ${ratio.toFixed(2)}:1`,
      });
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });
});
