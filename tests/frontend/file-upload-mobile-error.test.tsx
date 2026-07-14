/**
 * Bug Condition Exploration Test: Mobile Error Message Visibility
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**
 *
 * This test encodes the EXPECTED behavior - it will validate the fix when it passes.
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists.
 * DO NOT attempt to fix the test or the code when it fails.
 *
 * Goal: Surface counterexamples that demonstrate error messages are not visible
 * on mobile viewports < 640px when upload fails.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { FileUpload } from "@/ui/pipeline/file-upload";
import * as useFileUploadModule from "@/state/use-file-upload";

// Mock translations with actual error messages
// NOTE: next-intl requires nested object format (not dot-notation keys)
const mockMessages = {
  pipeline: {
    upload: {
      dragDrop: "اسحب وأفلت أو انقر للتحميل",
      formats: "PDF, JPG, PNG (حتى 50 ميجابايت)",
      uploadButton: "رفع الملف",
      uploading: "جاري الرفع...",
      progress: "جاري الرفع...",
      dismiss: "إغلاق",
      errorInvalidType: "نوع الملف غير مدعوم. يرجى اختيار PDF أو صورة",
      errorTooLarge: "الملف كبير جداً. الحد الأقصى 50 ميجابايت",
      errorUploadFailed: "تعذر رفع الملف. حاول مرة أخرى",
      servicesUnavailable:
        "الخدمات غير متاحة حالياً. يرجى التحقق من الاتصال بالإنترنت وحاول مرة أخرى",
    },
  },
};

// Helper to get error text from nested mockMessages
const getErrorText = (errorType: (typeof errorTypes)[number]): string =>
  mockMessages.pipeline.upload[errorType];

// Mobile viewport widths to test (< 640px breakpoint)
const mobileViewportWidths = [320, 375, 414, 500, 639];

// All error types that can be displayed
const errorTypes = [
  "errorInvalidType",
  "errorTooLarge",
  "errorUploadFailed",
  "servicesUnavailable",
] as const;

// Mock the useFileUpload hook
vi.mock("@/state/use-file-upload");

describe("Bug Condition Exploration: Mobile Error Message Visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window size
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  /**
   * Property 1: Bug Condition - Mobile Error Message Invisible on Failed Upload
   *
   * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**
   *
   * EXPECTED OUTCOME: This test FAILS on unfixed code (proving the bug exists)
   */
  it("PROPERTY: error messages are visible and accessible on mobile viewports < 640px", () => {
    // Scoped PBT approach: test specific mobile viewports and error types
    const mobileViewportArb = fc.constantFrom(...mobileViewportWidths);
    const errorTypeArb = fc.constantFrom(...errorTypes);

    fc.assert(
      fc.property(mobileViewportArb, errorTypeArb, (viewportWidth, errorType) => {
        // Setup: Mock mobile viewport
        Object.defineProperty(window, "innerWidth", {
          writable: true,
          configurable: true,
          value: viewportWidth,
        });

        // Mock useFileUpload to return error state
        vi.mocked(useFileUploadModule.useFileUpload).mockReturnValue({
          file: null,
          setFile: vi.fn(),
          pageRange: "",
          setPageRange: vi.fn(),
          uploading: false,
          progress: 0,
          error: errorType,
          setError: vi.fn(),
          showVisualSelector: false,
          setShowVisualSelector: vi.fn(),
          inputRef: { current: null },
          processUpload: vi.fn(),
          handleFileSelect: vi.fn(),
          reset: vi.fn(),
          validateFile: vi.fn(),
        });

        // Render FileUpload with error state on mobile viewport
        const { container, unmount } = render(
          <NextIntlClientProvider locale="ar" messages={mockMessages}>
            <FileUpload onUploadStart={vi.fn()} folderId={null} />
          </NextIntlClientProvider>,
        );

        try {
          // Expected Behavior 1: Error div exists with proper ARIA role
          const errorElements = container.querySelectorAll('[role="alert"]');
          expect(
            errorElements.length,
            `Exactly one error element with role="alert" should exist for ${errorType} on ${viewportWidth}px viewport`,
          ).toBe(1);
          const errorElement = errorElements[0] as HTMLElement;

          // Expected Behavior 2: Error message text is present
          // Note: in test environment, useTranslations is mocked to return keys as-is
          // so we verify the raw error key is present in the error element
          expect(
            errorElement.textContent,
            `Error text should be visible for ${errorType}`,
          ).toContain(errorType);

          // Expected Behavior 3: Error is within viewport bounds (not clipped)
          const rect = errorElement.getBoundingClientRect();
          const viewportHeight = window.innerHeight || 768;

          expect(
            rect.left,
            `Error should not be clipped on left edge (viewport: ${viewportWidth}px)`,
          ).toBeGreaterThanOrEqual(0);

          expect(
            rect.right,
            `Error should not overflow viewport width (viewport: ${viewportWidth}px)`,
          ).toBeLessThanOrEqual(viewportWidth);

          expect(
            rect.top,
            `Error should be within viewport vertical bounds (viewport: ${viewportWidth}px)`,
          ).toBeGreaterThanOrEqual(0);

          expect(
            rect.bottom,
            `Error should not be clipped below viewport (viewport: ${viewportWidth}px)`,
          ).toBeLessThanOrEqual(viewportHeight);

          // Expected Behavior 4: Error text wraps properly (no horizontal overflow)
          const computedStyle = window.getComputedStyle(errorElement);
          const hasOverflow = errorElement.scrollWidth > errorElement.clientWidth;

          expect(
            hasOverflow,
            `Error text should not overflow horizontally on ${viewportWidth}px viewport (${errorType})`,
          ).toBe(false);

          // Expected Behavior 5: Element is visible (not hidden)
          expect(
            computedStyle.display,
            `Error should not have display:none (viewport: ${viewportWidth}px)`,
          ).not.toBe("none");

          expect(
            computedStyle.visibility,
            `Error should not have visibility:hidden (viewport: ${viewportWidth}px)`,
          ).not.toBe("hidden");

          // Note: jsdom does not compute CSS from Tailwind class-based opacity
          // so we verify the element is in the DOM and not explicitly hidden via inline style
          const inlineOpacity = errorElement.style.opacity;
          const isExplicitlyHidden = inlineOpacity !== "" && parseFloat(inlineOpacity) === 0;
          expect(
            isExplicitlyHidden,
            `Error should not be explicitly hidden via opacity:0 inline style (viewport: ${viewportWidth}px)`,
          ).toBe(false);
        } finally {
          // Always clean up after each PBT iteration to avoid DOM accumulation
          unmount();
        }
      }),
      {
        numRuns: 20, // Test all combinations: 5 viewports × 4 error types = 20 runs
        verbose: true, // Show counterexamples when test fails
      },
    );
  });

  /**
   * Unit Test Case 1: Ultra-narrow mobile viewport (320px) with longest error message
   *
   * **Validates: Requirements 1.6 - Arabic RTL text wrapping on narrow viewports**
   */
  it("should display longest Arabic error message (servicesUnavailable) without overflow on 320px viewport", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 320,
    });

    vi.mocked(useFileUploadModule.useFileUpload).mockReturnValue({
      file: null,
      setFile: vi.fn(),
      pageRange: "",
      setPageRange: vi.fn(),
      uploading: false,
      progress: 0,
      error: "servicesUnavailable",
      setError: vi.fn(),
      showVisualSelector: false,
      setShowVisualSelector: vi.fn(),
      inputRef: { current: null },
      processUpload: vi.fn(),
      handleFileSelect: vi.fn(),
      reset: vi.fn(),
      validateFile: vi.fn(),
    });

    const { container } = render(
      <NextIntlClientProvider locale="ar" messages={mockMessages}>
        <FileUpload onUploadStart={vi.fn()} folderId={null} />
      </NextIntlClientProvider>,
    );

    const errorElement = screen.queryByRole("alert");
    expect(errorElement).not.toBeNull();

    if (errorElement) {
      const rect = errorElement.getBoundingClientRect();
      expect(rect.right, "Error should not overflow 320px viewport").toBeLessThanOrEqual(320);
      expect(
        errorElement.scrollWidth,
        "Error text should not cause horizontal scroll",
      ).toBeLessThanOrEqual(errorElement.clientWidth + 1); // +1 for rounding
    }
  });

  /**
   * Unit Test Case 2: Mobile error at 640px boundary (just below breakpoint)
   *
   * **Validates: Requirements 1.5 - Mobile-specific padding/spacing issues**
   */
  it("should display error correctly at 639px (just below sm: breakpoint)", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 639,
    });

    vi.mocked(useFileUploadModule.useFileUpload).mockReturnValue({
      file: null,
      setFile: vi.fn(),
      pageRange: "",
      setPageRange: vi.fn(),
      uploading: false,
      progress: 0,
      error: "errorTooLarge",
      setError: vi.fn(),
      showVisualSelector: false,
      setShowVisualSelector: vi.fn(),
      inputRef: { current: null },
      processUpload: vi.fn(),
      handleFileSelect: vi.fn(),
      reset: vi.fn(),
      validateFile: vi.fn(),
    });

    const { container } = render(
      <NextIntlClientProvider locale="ar" messages={mockMessages}>
        <FileUpload onUploadStart={vi.fn()} folderId={null} />
      </NextIntlClientProvider>,
    );

    const errorElement = screen.queryByRole("alert");
    expect(errorElement, "Error should be visible at 639px viewport").not.toBeNull();

    if (errorElement) {
      const rect = errorElement.getBoundingClientRect();
      expect(rect.right, "Error should fit within 639px viewport").toBeLessThanOrEqual(639);
    }
  });

  /**
   * Unit Test Case 3: Verify error has proper accessibility attributes
   *
   * **Validates: Requirements 1.2 - Error accessibility on mobile**
   */
  it("should have proper ARIA attributes for screen reader accessibility", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 375,
    });

    vi.mocked(useFileUploadModule.useFileUpload).mockReturnValue({
      file: null,
      setFile: vi.fn(),
      pageRange: "",
      setPageRange: vi.fn(),
      uploading: false,
      progress: 0,
      error: "errorInvalidType",
      setError: vi.fn(),
      showVisualSelector: false,
      setShowVisualSelector: vi.fn(),
      inputRef: { current: null },
      processUpload: vi.fn(),
      handleFileSelect: vi.fn(),
      reset: vi.fn(),
      validateFile: vi.fn(),
    });

    render(
      <NextIntlClientProvider locale="ar" messages={mockMessages}>
        <FileUpload onUploadStart={vi.fn()} folderId={null} />
      </NextIntlClientProvider>,
    );

    // Error should be findable by role="alert" for screen readers
    const errorElement = screen.getByRole("alert");
    expect(errorElement).toBeDefined();

    // Should contain the error key text (useTranslations is mocked to return keys as-is in tests)
    expect(errorElement.textContent).toContain("errorInvalidType");
  });
});
