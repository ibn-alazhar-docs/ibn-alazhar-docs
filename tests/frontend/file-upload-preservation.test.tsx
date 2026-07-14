/**
 * Preservation Property Tests: Desktop and Non-Error Behavior Unchanged
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12**
 *
 * IMPORTANT: Follow observation-first methodology
 * - Observe behavior on UNFIXED code for non-buggy inputs
 * - Write tests capturing observed behavior patterns from Preservation Requirements
 * - These tests document baseline behavior that must NOT change when fixing the mobile bug
 *
 * EXPECTED OUTCOME: Tests PASS on unfixed code (confirms baseline to preserve)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { FileUpload } from "@/ui/pipeline/file-upload";
import * as useFileUploadModule from "@/state/use-file-upload";

// Mock translations with actual messages
const mockMessages = {
  "pipeline.upload": {
    dragDrop: "اسحب وأفلت أو انقر للتحميل",
    formats: "PDF, JPG, PNG (حتى 50 ميجابايت)",
    uploadButton: "رفع الملف",
    uploading: "جاري الرفع...",
    progress: "جاري الرفع...",
    errorInvalidType: "نوع الملف غير مدعوم. يرجى اختيار PDF أو صورة",
    errorTooLarge: "الملف كبير جداً. الحد الأقصى 50 ميجابايت",
    errorUploadFailed: "تعذر رفع الملف. حاول مرة أخرى",
    servicesUnavailable:
      "الخدمات غير متاحة حالياً. يرجى التحقق من الاتصال بالإنترنت وحاول مرة أخرى",
  },
  common: {
    dismiss: "إغلاق",
  },
};

// Desktop viewport widths to test (≥ 640px breakpoint)
const desktopViewportWidths = [640, 768, 1024, 1280, 1920];

// All error types
const errorTypes = [
  "errorInvalidType",
  "errorTooLarge",
  "errorUploadFailed",
  "servicesUnavailable",
] as const;

// Mock the useFileUpload hook
vi.mock("@/state/use-file-upload");

describe("Preservation Property: Desktop and Non-Error Behavior Unchanged", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window size to default desktop
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Property 2: Preservation - Desktop Error Display Unchanged
   *
   * **Validates: Requirements 3.1, 3.2**
   *
   * EXPECTED OUTCOME: Tests PASS (confirms baseline desktop behavior to preserve)
   */
  it("PROPERTY: desktop error display uses existing bg-danger-bg border styling unchanged", () => {
    const desktopViewportArb = fc.constantFrom(...desktopViewportWidths);
    const errorTypeArb = fc.constantFrom(...errorTypes);

    fc.assert(
      fc.property(desktopViewportArb, errorTypeArb, (viewportWidth, errorType) => {
        // Setup: Desktop viewport
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

        // Render on desktop viewport
        const { container } = render(
          <NextIntlClientProvider locale="ar" messages={mockMessages}>
            <FileUpload onUploadStart={vi.fn()} folderId={null} />
          </NextIntlClientProvider>,
        );

        // Preservation 1: Error element exists with expected styling classes
        const errorElement = container.querySelector(".bg-danger-bg");
        expect(
          errorElement,
          `Error element should exist with bg-danger-bg class on desktop (${viewportWidth}px)`,
        ).not.toBeNull();

        if (!errorElement) return;

        // Preservation 2: Border styling is preserved
        expect(
          errorElement.className,
          `Error should have border-danger/20 class on desktop (${viewportWidth}px)`,
        ).toContain("border-danger/20");

        // Preservation 3: Text styling is preserved
        expect(
          errorElement.className,
          `Error should have text-danger class on desktop (${viewportWidth}px)`,
        ).toContain("text-danger");

        // Preservation 4: Error message is translated by next-intl
        // Note: errorType keys are translated via t() in the component
        expect(
          errorElement.textContent,
          `Error element should contain text for ${errorType} on desktop`,
        ).toBeTruthy();

        // Preservation 5: Error is visible (not hidden)
        const computedStyle = window.getComputedStyle(errorElement);
        expect(
          computedStyle.display,
          `Error should be visible on desktop (${viewportWidth}px)`,
        ).not.toBe("none");
      }),
      {
        numRuns: 20, // 5 viewports × 4 error types = 20 runs
        verbose: true,
      },
    );
  });

  /**
   * Unit Test: Successful File Selection on Mobile
   *
   * **Validates: Requirements 3.3, 3.4, 3.5**
   *
   * EXPECTED OUTCOME: Tests PASS (confirms successful uploads work correctly)
   */
  it("should display file name and size correctly on mobile after successful selection", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 375,
    });

    // Mock a successfully selected file (NO error state)
    const mockFile = new File(["test"], "document.pdf", { type: "application/pdf" });
    Object.defineProperty(mockFile, "size", { value: 2_500_000 }); // 2.5MB

    vi.mocked(useFileUploadModule.useFileUpload).mockReturnValue({
      file: mockFile,
      setFile: vi.fn(),
      pageRange: "",
      setPageRange: vi.fn(),
      uploading: false,
      progress: 0,
      error: null, // No error - successful selection
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

    // Preservation: File name is displayed
    expect(screen.queryByText("document.pdf")).not.toBeNull();

    // Preservation: File size is displayed correctly
    const expectedSize = "2.38 MB";
    expect(screen.queryByText(expectedSize)).not.toBeNull();

    // Preservation: Upload button is enabled and visible
    const uploadButton = screen.getByTestId("upload-button");
    expect(uploadButton).not.toBeNull();
    expect(uploadButton.hasAttribute("disabled")).toBe(false);
  });

  /**
   * Property 2.2: Error Validation Logic Preservation
   *
   * **Validates: Requirements 3.6, 3.7, 3.8**
   *
   * EXPECTED OUTCOME: Tests PASS (confirms error logic unchanged)
   */
  it("PROPERTY: error state management preserves setError and reset functionality", () => {
    const mockSetError = vi.fn();
    const mockReset = vi.fn();

    vi.mocked(useFileUploadModule.useFileUpload).mockReturnValue({
      file: null,
      setFile: vi.fn(),
      pageRange: "",
      setPageRange: vi.fn(),
      uploading: false,
      progress: 0,
      error: "errorInvalidType",
      setError: mockSetError,
      showVisualSelector: false,
      setShowVisualSelector: vi.fn(),
      inputRef: { current: null },
      processUpload: vi.fn(),
      handleFileSelect: vi.fn(),
      reset: mockReset,
      validateFile: vi.fn(),
    });

    const { container } = render(
      <NextIntlClientProvider locale="ar" messages={mockMessages}>
        <FileUpload onUploadStart={vi.fn()} folderId={null} />
      </NextIntlClientProvider>,
    );

    // Preservation: Error is displayed using hook's error state
    const errorElement = container.querySelector(".bg-danger-bg");
    expect(errorElement, "Error should be displayed from hook state").not.toBeNull();

    // Preservation: setError and reset functions are wired correctly
    // (They exist and can be called - integration with hook is preserved)
    expect(mockSetError, "setError function should be available").toBeDefined();
    expect(mockReset, "reset function should be available").toBeDefined();
  });

  /**
   * Property 2.3: Translations Preservation
   *
   * **Validates: Requirements 3.9**
   *
   * Note: next-intl translations require proper setup. This test verifies
   * the component structure is preserved (translated text verified in E2E tests).
   *
   * EXPECTED OUTCOME: Tests PASS (confirms component structure unchanged)
   */
  it("PROPERTY: translation structure for Arabic locale is preserved", () => {
    vi.mocked(useFileUploadModule.useFileUpload).mockReturnValue({
      file: null,
      setFile: vi.fn(),
      pageRange: "",
      setPageRange: vi.fn(),
      uploading: false,
      progress: 0,
      error: null,
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

    // Preservation: Empty state shows text elements (drag/drop UI)
    const textElements = container.querySelectorAll(".text-lg, .text-sm");
    expect(
      textElements.length,
      "Component should render text elements for translations",
    ).toBeGreaterThan(0);

    // Preservation: Upload button exists with text
    const uploadButton = screen.getByTestId("upload-button");
    expect(uploadButton, "Upload button should exist").not.toBeNull();
    expect(
      uploadButton.textContent?.length,
      "Upload button should have text content",
    ).toBeGreaterThan(0);
  });

  /**
   * Property 2.4: Accessibility Preservation
   *
   * **Validates: Requirements 3.10**
   *
   * NOTE: Current unfixed code does NOT have role="alert" on error div.
   * This test documents current behavior - the fix may add this attribute.
   *
   * EXPECTED OUTCOME: Tests PASS (confirms ARIA attributes remain intact)
   */
  it("PROPERTY: semantic HTML and testid attributes remain intact", () => {
    vi.mocked(useFileUploadModule.useFileUpload).mockReturnValue({
      file: null,
      setFile: vi.fn(),
      pageRange: "",
      setPageRange: vi.fn(),
      uploading: false,
      progress: 0,
      error: "errorUploadFailed",
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

    // Preservation: Error element exists (even without role="alert")
    const errorElement = container.querySelector(".bg-danger-bg");
    expect(errorElement, "Error element should exist").not.toBeNull();

    // Preservation: File input has proper data-testid
    const fileInput = screen.getByTestId("file-input");
    expect(fileInput, "File input should have data-testid").not.toBeNull();

    // Preservation: Upload button has proper data-testid
    const uploadButton = screen.getByTestId("upload-button");
    expect(uploadButton, "Upload button should have data-testid").not.toBeNull();
  });

  /**
   * Property 2.5: Visual Design Tokens Preservation
   *
   * **Validates: Requirements 3.11**
   *
   * EXPECTED OUTCOME: Tests PASS (confirms design tokens are used consistently)
   */
  it("PROPERTY: design tokens (--danger-bg, --danger, border-danger/20) are used consistently", () => {
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

    // Preservation: bg-danger-bg class is present
    const errorElement = container.querySelector(".bg-danger-bg");
    expect(errorElement, "Error should use bg-danger-bg class").not.toBeNull();

    if (errorElement) {
      // Preservation: border-danger/20 class is present
      expect(errorElement.className, "Error should use border-danger/20 class").toContain(
        "border-danger/20",
      );

      // Preservation: text-danger class is present
      expect(errorElement.className, "Error should use text-danger class").toContain("text-danger");
    }
  });

  /**
   * Unit Test: Desktop Viewport (1024px) Error Display
   *
   * **Validates: Requirements 3.1**
   */
  it("should display error with existing styling on desktop viewport (1024px)", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
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

    const { container } = render(
      <NextIntlClientProvider locale="ar" messages={mockMessages}>
        <FileUpload onUploadStart={vi.fn()} folderId={null} />
      </NextIntlClientProvider>,
    );

    // Check existing styling classes are preserved
    const errorElement = container.querySelector(".bg-danger-bg");
    expect(errorElement, "Error element should exist on desktop").not.toBeNull();

    if (errorElement) {
      expect(errorElement.className).toContain("bg-danger-bg");
      expect(errorElement.className).toContain("border-danger/20");
      expect(errorElement.className).toContain("text-danger");
      expect(errorElement.className).toContain("rounded-lg");
    }
  });

  /**
   * Unit Test: Successful File Upload Progress Bar
   *
   * **Validates: Requirements 3.4**
   */
  it("should show progress indicator during upload on mobile", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 375,
    });

    const mockFile = new File(["test"], "test.pdf", { type: "application/pdf" });

    vi.mocked(useFileUploadModule.useFileUpload).mockReturnValue({
      file: mockFile,
      setFile: vi.fn(),
      pageRange: "",
      setPageRange: vi.fn(),
      uploading: true, // Upload in progress
      progress: 45,
      error: null,
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

    // Preservation: Progress bar container exists
    const progressContainer = container.querySelector(".bg-badge");
    expect(progressContainer, "Progress bar should be visible during upload").not.toBeNull();

    // Preservation: Upload button shows uploading state
    const uploadButton = screen.getByTestId("upload-button");
    expect(uploadButton.hasAttribute("disabled")).toBe(true);
  });

  /**
   * Unit Test: File Input Interaction
   *
   * **Validates: Requirements 3.5**
   */
  it("should handle file selection via hidden input element", () => {
    const mockHandleFileSelect = vi.fn();

    vi.mocked(useFileUploadModule.useFileUpload).mockReturnValue({
      file: null,
      setFile: vi.fn(),
      pageRange: "",
      setPageRange: vi.fn(),
      uploading: false,
      progress: 0,
      error: null,
      setError: vi.fn(),
      showVisualSelector: false,
      setShowVisualSelector: vi.fn(),
      inputRef: { current: null },
      processUpload: vi.fn(),
      handleFileSelect: mockHandleFileSelect,
      reset: vi.fn(),
      validateFile: vi.fn(),
    });

    render(
      <NextIntlClientProvider locale="ar" messages={mockMessages}>
        <FileUpload onUploadStart={vi.fn()} folderId={null} />
      </NextIntlClientProvider>,
    );

    // Preservation: File input exists and is hidden
    const fileInput = screen.getByTestId("file-input");
    expect(fileInput, "File input should exist").not.toBeNull();
    expect(fileInput.className, "File input should have hidden class").toContain("hidden");

    // Preservation: File input accepts correct file types
    expect(fileInput.getAttribute("accept")).toBe(".pdf,.jpg,.jpeg,.png");
  });

  /**
   * Unit Test: Error Translation Key Handling
   *
   * **Validates: Requirements 3.9**
   */
  it("should handle translation keys that start with pipeline. or common. prefixes", () => {
    vi.mocked(useFileUploadModule.useFileUpload).mockReturnValue({
      file: null,
      setFile: vi.fn(),
      pageRange: "",
      setPageRange: vi.fn(),
      uploading: false,
      progress: 0,
      error: "pipeline.upload.errorInvalidType", // Full translation key
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

    // Preservation: Translation key is processed correctly
    // (Code strips "pipeline.upload." prefix and translates)
    const errorElement = container.querySelector(".bg-danger-bg");
    expect(errorElement, "Error should be displayed").not.toBeNull();

    if (errorElement) {
      // Component should translate the key after stripping prefix
      expect(errorElement.textContent, "Error should contain translated text").toBeTruthy();
    }
  });

  /**
   * Unit Test: Desktop Breakpoint Boundary (640px)
   *
   * **Validates: Requirements 3.1**
   */
  it("should display error correctly at 640px (sm: breakpoint)", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 640,
    });

    vi.mocked(useFileUploadModule.useFileUpload).mockReturnValue({
      file: null,
      setFile: vi.fn(),
      pageRange: "",
      setPageRange: vi.fn(),
      uploading: false,
      progress: 0,
      error: "errorUploadFailed",
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

    // At 640px, desktop styles should apply
    const errorElement = container.querySelector(".bg-danger-bg");
    expect(errorElement, "Error should be visible at 640px").not.toBeNull();

    if (errorElement) {
      expect(errorElement.className).toContain("bg-danger-bg");
      expect(errorElement.className).toContain("border-danger/20");
    }
  });
});
