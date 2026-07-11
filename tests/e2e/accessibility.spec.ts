import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("WCAG 2.2 Accessibility Scans", () => {
  // Test the Landing Page in Arabic
  test("Home Page should not have any automatically detectable accessibility issues", async ({
    page,
  }) => {
    await page.goto("/ar/");

    // Wait for animations to settle
    await page.waitForTimeout(1000);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["bypass"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  // Test the Login Page in Arabic
  test("Login Page should not have any automatically detectable accessibility issues", async ({
    page,
  }) => {
    await page.goto("/ar/login");

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["bypass"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  // Test the Register Page in Arabic
  test("Register Page should not have any automatically detectable accessibility issues", async ({
    page,
  }) => {
    await page.goto("/ar/register");

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["bypass"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
