# TEST_READY

## Test Suite: E2E Authentication Overhaul

This document details the Playwright E2E test suite implemented for the authentication overhaul. The suite is located at:
`tests/e2e/auth-overhaul.spec.ts`

## Test Cases Covered

### Tier 1: Feature Coverage (Happy path & client-side validation errors)

- `reg-t1-1`: Successful register using Name, Email, Password, Confirm Password.
- `reg-t1-2`: Register form validation error: Empty email.
- `reg-t1-3`: Register form validation error: Missing name.
- `reg-t1-4`: Register form validation error: Weak password (< 8 characters or no uppercase/lowercase/number).
- `reg-t1-5`: Register form validation error: Mismatched password and confirm password.
- `log-t1-1`: Successful login with valid credentials.
- `log-t1-2`: Login failed: Wrong password.
- `log-t1-3`: Login failed: Non-existent email.
- `log-t1-4`: Login form validation error: Invalid email format.
- `log-t1-5`: Login form validation error: Empty password.
- `rst-t1-1`: Forgot password request: Successful submission with registered email.
- `rst-t1-2`: Forgot password validation error: Invalid email format.
- `rst-t1-3`: Reset password: Successful password reset using valid token and valid new password.
- `rst-t1-4`: Reset password validation error: Mismatched password and confirm password.
- `rst-t1-5`: Reset password validation error: Weak password.

### Tier 2: Boundary & Corner Cases (Server checks, extreme inputs, state constraints)

- `reg-t2-1`: Register with already-registered email (returns 409 Conflict).
- `reg-t2-2`: Register with email normalization checks (spaces trimmed, uppercase normalized).
- `reg-t2-3`: Password at exact boundary limits (8 characters, specific character types).
- `reg-t2-4`: Name/email input length limits (exceeding database or schema limits handled gracefully).
- `reg-t2-5`: Register with a soft-deleted email address (conflict, does not reactivate).
- `log-t2-1`: Email case-insensitivity login check.
- `log-t2-2`: Brute force locking (verify account locks after repeated failures).
- `log-t2-3`: Login with soft-deleted user credentials (rejected).
- `log-t2-4`: SQL/NoSQL Injection character tests on inputs (sanitized, no crashes).
- `log-t2-5`: Redirect behaviour (URL containing `callbackUrl` redirects correctly after successful login).
- `rst-t2-1`: Request reset for non-existent email (behave identically for privacy).
- `rst-t2-2`: Reset password using expired token (rejected).
- `rst-t2-3`: Reset password using malformed/altered token (rejected).
- `rst-t2-4`: Token single-use check (token is invalidated immediately after use).
- `rst-t2-5`: Rate limiting reset requests.

### Tier 3: Cross-Feature Combinations (Pairwise flows)

- `comb-t3-1`: Register → immediately login with the newly created account.
- `comb-t3-2`: Login → request reset token → reset password → login with new password.
- `comb-t3-3`: Register → request reset token → reset password → try old password (fail) → try new password (success).

### Tier 4: Real-World Application Scenarios (Acceptance criteria)

- `app-t4-1`: Complete E2E user lifecycle: Sign up, logout, forget password, reset password, login, redirect to dashboard, access protected pages.
- `app-t4-2`: Multilingual & RTL Toggle: Check RTL (Arabic) layouts on login/register/reset pages, toggle to English LTR, check all labels translate, inputs preserve entered value, styling Cairo font applied correctly, zero overlaps/truncation.

## Invocation Commands

### Run all E2E Authentication tests:

```bash
npx playwright test tests/e2e/auth-overhaul.spec.ts
```

### Run E2E Authentication tests with HTML report:

```bash
npx playwright test tests/e2e/auth-overhaul.spec.ts --reporter=html
```

### Run specific test case by pattern:

```bash
npx playwright test tests/e2e/auth-overhaul.spec.ts -g "reg-t1-1"
```
