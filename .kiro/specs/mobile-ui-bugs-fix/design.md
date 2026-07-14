# Mobile UI Error Message Visibility Bugfix Design

## Overview

This bugfix addresses error message visibility issues in the file upload component (`apps/web/src/ui/pipeline/file-upload.tsx`) on mobile devices. The bug manifests when upload errors occur on mobile viewports: the error div briefly appears but then becomes hidden or inaccessible, preventing users from understanding why their upload failed.

The root cause is suspected to be a combination of insufficient mobile-specific styling, potential React state update timing issues, and lack of persistent error notification mechanisms for constrained mobile viewports. The fix will ensure error messages remain persistently visible on mobile devices while preserving all existing desktop behavior and functionality.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when an upload error occurs on mobile viewports (< 640px) and the error message becomes invisible or inaccessible
- **Property (P)**: The desired behavior - error messages must remain persistently visible and actionable on mobile devices until explicitly dismissed
- **Preservation**: Existing desktop error display, successful upload flows, and all non-mobile interactions must remain unchanged
- **FileUpload Component**: The React component at `apps/web/src/ui/pipeline/file-upload.tsx` that handles file selection and upload UI
- **useFileUpload Hook**: The custom hook at `apps/web/src/state/use-file-upload.ts` that manages upload state, validation, and error handling
- **Error State**: The `error` string state managed by `useFileUpload` that contains validation or upload failure messages

## Bug Details

### Bug Condition

The bug manifests when a file upload fails on mobile devices (viewport width < 640px) and the error message is rendered but becomes invisible or inaccessible to the user. The error div element exists in the DOM with the message "تعذر رفع الملف" (or other error keys like `errorInvalidType`, `errorTooLarge`, `servicesUnavailable`) but disappears due to layout issues, insufficient mobile styling, or React re-render behavior.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { viewportWidth: number, errorState: string | null, isVisible: boolean }
  OUTPUT: boolean
  
  RETURN input.viewportWidth < 640
         AND input.errorState !== null
         AND input.errorState IN ['errorInvalidType', 'errorTooLarge', 'errorUploadFailed', 'servicesUnavailable', <any error string>]
         AND NOT input.isVisible
END FUNCTION
```

### Examples

- **Example 1**: User on iPhone (375px viewport) uploads a 60MB PDF. Validation fails with `errorTooLarge`. The error div renders but is clipped by parent container padding or pushed outside viewport.
- **Example 2**: User on Android (360px viewport) uploads a .docx file. Validation fails with `errorInvalidType`. The error message flashes briefly then disappears due to insufficient z-index or React state update causing re-render.
- **Example 3**: User on mobile tablet (500px viewport) attempts upload when services are down. `servicesUnavailable` error is set but error div has insufficient mobile spacing (p-5 on mobile vs p-8 on desktop), causing layout crowding that hides the message.
- **Edge Case**: User on ultra-narrow mobile (320px viewport) receives long Arabic RTL error message that overflows container without proper text wrapping, making it unreadable.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Desktop error message display (viewport ≥ 640px) must continue to use existing `bg-danger-bg border border-danger/20` styling
- Successful file upload flows must continue to display file name, size, progress bar, and completion state correctly on all devices
- Mouse hover effects on desktop (`whileHover` animations) must remain functional
- File validation logic in `useFileUpload` hook must continue to work identically
- Error state management (setError, reset) must preserve current behavior
- Drag-and-drop functionality must remain unchanged
- Translation handling via `next-intl` must continue to work for both Arabic and English
- ARIA attributes and accessibility features must remain intact

**Scope:**
All inputs that do NOT involve mobile viewports experiencing upload errors should be completely unaffected by this fix. This includes:
- Desktop error display and interactions
- Successful upload flows on any device
- File selection and validation logic
- Non-error UI states (idle, uploading, success)

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Insufficient Mobile Styling**: The error div uses generic padding (`px-4 py-3`) and relies on parent container padding (`p-5` on mobile, `sm:p-8` on desktop). On narrow mobile viewports, this may cause the error div to be clipped or pushed outside the visible area.

2. **Lack of Mobile-Specific Layout Constraints**: The error div is positioned between the file upload card and the submit button without explicit mobile layout rules. On constrained mobile screens, content may overflow or be occluded by other elements.

3. **React Re-render Timing**: When error state is set via `setError()`, React may batch state updates with other component state changes, causing the error div to briefly appear then disappear if subsequent renders remove it from the visible flow.

4. **No Persistent Error Notification**: The error div is inline within the form layout. On mobile, users may scroll past it or the viewport may not accommodate the full form height, making the error invisible without a persistent toast/modal notification.

5. **RTL Text Overflow on Mobile**: Arabic error messages may not properly wrap or handle overflow on narrow mobile viewports, causing text to be cut off or container to expand beyond viewport width.

## Correctness Properties

Property 1: Bug Condition - Mobile Error Visibility

_For any_ upload error that occurs on a mobile viewport (< 640px), the fixed FileUpload component SHALL display the error message in a persistently visible container that remains fully accessible within the viewport, with adequate spacing, proper text wrapping for RTL content, and clear visual prominence until the user explicitly dismisses or resolves the error.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**

Property 2: Preservation - Desktop and Non-Error Behavior

_For any_ interaction that is NOT a mobile error display scenario (desktop errors, successful uploads, non-error states, file selection), the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing functionality for desktop viewports, animation effects, validation logic, and UI transitions.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `apps/web/src/ui/pipeline/file-upload.tsx`

**Function**: `FileUpload` component rendering

**Specific Changes**:

1. **Add Mobile-Specific Error Container Styling**:
   - Wrap error div in a mobile-aware container with explicit viewport constraints
   - Add `max-w-full overflow-hidden` to prevent horizontal overflow on narrow screens
   - Increase mobile padding/margin to ensure clear separation from surrounding elements
   - Add `min-h-[44px]` to ensure touch-friendly target size if dismiss button is added

2. **Implement Responsive Text Handling for RTL**:
   - Add `break-words overflow-wrap-anywhere` for proper text wrapping on Arabic content
   - Ensure `text-start` (logical property) for proper RTL/LTR text alignment
   - Test with longest error message (`servicesUnavailable` in Arabic: 86 characters)

3. **Add Explicit Mobile Layout Rules**:
   - Use `space-y-4` consistently between all form elements
   - Add `sticky` positioning or ensure error div is always in viewport on mobile
   - Consider adding `scroll-mt-4` to error div for automatic scroll-to-error behavior

4. **Optional: Add Dismiss Button for Mobile**:
   - Add a small close icon button (minimum 44x44px touch target) to error div on mobile
   - Wire up to call `setError(null)` when clicked
   - Only show dismiss button on viewports < 640px using responsive classes

5. **Optional: Add Toast Notification Fallback**:
   - Consider using a third-party toast library (e.g., `sonner`) or building a simple toast component
   - Display error in a fixed-position toast on mobile when error state is set
   - Ensure toast respects RTL directionality and has proper z-index

### Minimal Implementation Approach

The minimal fix focuses on **Changes 1-3** only, avoiding additional dependencies:

```tsx
{error && (
  <div 
    className="bg-danger-bg border border-danger/20 text-danger px-4 py-3 sm:px-4 sm:py-3 rounded-lg text-sm max-w-full overflow-hidden break-words text-start space-y-2"
    role="alert"
    aria-live="polite"
  >
    <div className="flex items-start justify-between gap-2">
      <span className="flex-1">
        {error.startsWith("pipeline.") || error.startsWith("common.")
          ? t(error.replace("pipeline.upload.", ""))
          : error}
      </span>
      <button
        type="button"
        onClick={() => setError(null)}
        className="sm:hidden flex-shrink-0 text-danger hover:text-danger/80 p-1 -m-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label={t("common.dismiss")}
      >
        ×
      </button>
    </div>
  </div>
)}
```

**File**: `apps/web/src/state/use-file-upload.ts`

**No changes required** - the hook already exposes `setError` which can be used for dismissal.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code using mobile viewport testing, then verify the fix works correctly across all mobile device sizes and error types while preserving existing desktop and non-error behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis by testing error visibility on actual mobile viewports.

**Test Plan**: Write tests that render the FileUpload component with various error states on mobile viewport dimensions (320px, 375px, 640px). Use React Testing Library's `getByRole('alert')` or `getByText` to verify error visibility. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Mobile Narrow Viewport Test**: Set viewport to 375px width, trigger `errorTooLarge`, verify error div is visible and fully within viewport bounds (will fail on unfixed code if clipped)
2. **Mobile RTL Text Wrap Test**: Set viewport to 360px width, trigger `servicesUnavailable` (longest Arabic message), verify text wraps properly without overflow (will fail on unfixed code if text is cut off)
3. **Mobile Error Persistence Test**: Set viewport to 500px width, trigger error, then trigger React re-render by updating unrelated state, verify error remains visible (will fail on unfixed code if error disappears)
4. **Ultra-Narrow Mobile Test**: Set viewport to 320px width, trigger any error, verify error container does not exceed viewport width (may fail on unfixed code)

**Expected Counterexamples**:
- Error div is rendered but has `overflow: hidden` parent or insufficient padding causing clipping
- Error text overflows container horizontally on narrow viewports
- Error div briefly appears then is removed from visible flow due to layout issues

### Fix Checking

**Goal**: Verify that for all mobile viewport widths and error types, the fixed component displays error messages persistently and accessibly.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := FileUpload_fixed.render({ error: input.errorState, viewportWidth: input.viewportWidth })
  ASSERT result.errorVisible === true
  ASSERT result.errorAccessible === true
  ASSERT result.errorWithinViewport === true
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (desktop viewports, non-error states), the fixed component produces the same result as the original component.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT FileUpload_original.render(input) === FileUpload_fixed.render(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across viewport sizes (320px to 1920px)
- It catches edge cases like viewport size transitions (639px vs 640px breakpoint)
- It provides strong guarantees that desktop behavior and successful upload flows are unchanged

**Test Plan**: Write snapshot tests or visual regression tests capturing current desktop error display (viewport ≥ 640px), then verify fixed component produces identical output for desktop scenarios.

**Test Cases**:
1. **Desktop Error Preservation**: Render error on 1024px viewport, verify styling matches unfixed version exactly
2. **Successful Upload Preservation**: Render successful upload flow on mobile, verify file display and progress bar work identically
3. **Hover Animation Preservation**: Verify `whileHover` effects on desktop still trigger correctly
4. **Validation Logic Preservation**: Verify `validateFile` function produces same results for all file types and sizes

### Unit Tests

- Test error rendering on mobile viewports (320px, 375px, 414px, 640px) with all error types
- Test error dismissal button (if implemented) only appears on mobile viewports
- Test Arabic RTL text wrapping in error messages on narrow viewports
- Test that error div has proper ARIA attributes (`role="alert"`, `aria-live="polite"`)
- Test error persistence across component re-renders on mobile

### Property-Based Tests

- Generate random viewport widths (320-2000px) and error states, verify correct visibility behavior for each breakpoint
- Generate random error message strings (including long Arabic text), verify all wrap properly on mobile
- Test that desktop viewports (≥640px) produce identical rendering to unfixed component

### Integration Tests

- E2E test: Open app on mobile device emulation (Chrome DevTools), upload invalid file, verify error message is visible and readable
- E2E test: Upload oversized file on mobile, verify error persists until user dismisses or selects new file
- E2E test: Verify error display works correctly in both Arabic and English locales on mobile
- Visual regression test: Capture screenshots of error states on multiple mobile viewports, compare with baseline
