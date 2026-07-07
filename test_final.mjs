import { chromium } from "@playwright/test";

async function run() {
  console.log("Running final visual check...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: "ar-EG",
  });
  const page = await context.newPage();
  const artifactDir = "/home/abed/.gemini/antigravity/brain/d9b9a167-58d2-46dc-bf6b-b299570efe3e";

  try {
    await page.goto("http://localhost:3000/ar", { waitUntil: "load", timeout: 30000 });
    await page.waitForSelector("main", { timeout: 10000 });

    // Toggle to Dark Mode
    const isDarkInitially = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    if (!isDarkInitially) {
      await page.click('button[aria-label*="الوضع"]');
      await page.waitForTimeout(1000);
    }

    // Scroll to bottom slowly to trigger inView
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    for (let offset = 0; offset < bodyHeight; offset += 200) {
      await page.evaluate((y) => window.scrollTo(0, y), offset);
      await page.waitForTimeout(100);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(2000);

    await page.screenshot({ path: `${artifactDir}/landing_ar_dark_final.png`, fullPage: true });
    console.log("Screenshot captured successfully.");
  } catch (error) {
    console.error("Error during screenshots:", error);
  } finally {
    await browser.close();
  }
}

run();
