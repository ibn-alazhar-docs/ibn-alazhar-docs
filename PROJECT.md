# Project: Ibn Al-Azhar Docs Authentication & UI Overhaul

## Architecture

- **Routing**: `[locale]/(auth)/login`, `[locale]/(auth)/register`, `[locale]/(auth)/forgot-password`, `[locale]/(auth)/reset-password`
- **APIs**:
  - `/api/auth/register` (existing, handles POST for registration)
  - `/api/auth/forgot-password` (new, handles POST to request password reset token)
  - `/api/auth/reset-password` (new, handles POST to reset password using token)
- **Forms**:
  - `RegisterForm` (Name, Email, Password, Confirm Password input fields, Google sign-in)
  - `LoginForm` (Email, Password, Google sign-in)
  - `ForgotPasswordForm` (Email input)
  - `ResetPasswordForm` (Password, Confirm Password inputs)
- **Client-Side Validation**: Zod validators (`loginSchema`, `registerSchema`, `forgotPasswordSchema`, `resetPasswordSchema`) called before form submission
- **Styling**: Cairo font, RTL/LTR support, responsive premium aesthetic matching landing page, light/dark modes.

## Milestones

| #   | Name                     | Scope                                                                                               | Dependencies | Status  |
| --- | ------------------------ | --------------------------------------------------------------------------------------------------- | ------------ | ------- |
| 1   | Test Infra Setup         | Establish E2E testing framework, test cases (Tiers 1-4), and write `TEST_INFRA.md`                  | None         | PLANNED |
| 2   | Auth Logic & APIs        | Implement forgot-password / reset-password use cases, database queries, and Next.js API routes      | None         | PLANNED |
| 3   | Registration Page & Form | Implement full registration form fields, integrate Zod validation, and route to register API        | M2           | PLANNED |
| 4   | Login Page & Form        | Update Login Form to use translations instead of hardcoded strings, integrate Zod validation        | M2           | PLANNED |
| 5   | Password Reset UI        | Implement Forgot Password and Reset Password pages/forms, client-side validation                    | M2, M3, M4   | PLANNED |
| 6   | Visual & Quality Polish  | Ensure light/dark mode correctness, RTL/LTR styling alignment, Cairo font, responsive premium theme | M3, M4, M5   | PLANNED |
| 7   | Testing & Audit          | Run all E2E tests, perform adversarial coverage hardening (Tier 5), and run Forensic Audit          | M1, M6       | PLANNED |

## Interface Contracts

### Client ↔ `/api/auth/forgot-password`

- **Method**: POST
- **Request Body**:
  ```typescript
  {
    email: string;
  }
  ```
- **Response (200 OK)**:
  ```typescript
  { message: string, resetLink?: string } // resetLink included in development mode for easy E2E testing
  ```
- **Response (400 Bad Request / 404 Not Found)**:
  ```typescript
  { error: { code: string, message: string } }
  ```

### Client ↔ `/api/auth/reset-password`

- **Method**: POST
- **Request Body**:
  ```typescript
  { token: string, email: string, password: md5/plain } // schema requires token, email, password, confirmPassword
  ```
- **Response (200 OK)**:
  ```typescript
  {
    message: string;
  }
  ```
- **Response (400 Bad Request / 401 Unauthorized)**:
  ```typescript
  { error: { code: string, message: string } }
  ```

## Code Layout

- Frontend Components: `apps/web/src/ui/auth/`
- App Router Pages: `apps/web/src/app/[locale]/(auth)/`
- Validation Schemas: `apps/web/src/shared/validators/auth.ts`
- Backend Use Cases: `apps/web/src/core/services/`
- API Routes: `apps/web/src/app/api/auth/`
