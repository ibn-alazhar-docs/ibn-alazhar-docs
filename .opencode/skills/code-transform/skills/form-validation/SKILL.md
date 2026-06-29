---
name: form-validation
description: "Schema-first form validation: Zod (TS) or Yup (JS) as the single source of truth, wired to React Hook Form (preferred) or Formik. Client-side UX (blur, async uniqueness, accessible errors) + mandatory server re-validation. Triggers in Phase 4 (security audit), Phase 6 (any form commit), Phase 9 (form-flow acceptance)."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: frontend
---

# Form Validation

> One schema, used on client (UX) and server (truth). Client validation is for feedback, never for security. The server is the bouncer; the client is the concierge.

## When to Use

| Phase | Trigger | Why |
|-------|---------|-----|
| Phase 4 — AUDIT | Any route with a form (auth, checkout, profile, settings) | Find inputs that trust the client |
| Phase 6 — EXECUTE | Any form commit (Visual + Logic Guard) | Re-run schema, re-test error states |
| Phase 9 — ACCEPTANCE | "Form rejects invalid input" AC | Replay malicious payloads server-side |
| Bug report | "User submitted empty email and it went through" | Bisect schema vs handler |

**Do NOT use this sub-skill for:** authentication/authorization logic (use `auth-setup`), payment field tokenization (use `payment-setup`), or styling form controls (use `css-styling`). This sub-skill owns the *validation contract*.

## What It Does

1. Detects existing validation libraries (parses `package.json` for `zod`, `yup`, `joi`, `react-hook-form`, `formik`, `conform-react`)
2. If schema is split (client Yup + server Joi): consolidates to **Zod shared between client and server** (or Yup if JS-only)
3. Generates the schema from existing TypeScript types when possible (`z.infer` round-trip)
4. Wires the schema to React Hook Form (preferred) — `zodResolver`, `mode: 'onBlur'`, `reValidateMode: 'onChange'`
5. Adds async validation (uniqueness checks: email, username, slug) with debounce + abort
6. Generates accessible error UI: `aria-invalid`, `aria-describedby`, `role="alert"` on submit error
7. Generates the **server re-validation middleware** that runs the same schema — never trust the client
8. Adds a Playwright E2E test per form covering: empty submit, invalid format, valid submit, async uniqueness conflict

## Integration Contract

```
INPUT:
  - project_root: string (required)
  - form_path: string (required) — path to the form component
  - action: audit|generate-schema|wire-client|wire-server|test (default audit)
  - schema_path: string (default "src/schemas/<form>.ts")
  - server_path: string (default "src/app/api/<form>/route.ts")

OUTPUT (JSON to stdout):
  {
    "status": "ok|error",
    "schema": {"path": "src/schemas/login.ts", "fields": 3, "rules": 8},
    "client_wired": "react-hook-form+zod",
    "server_wired": "next.js route handler",
    "async_checks": ["email.uniqueness"],
    "accessibility": {"aria_invalid": true, "aria_describedby": true, "role_alert": true},
    "test_path": "e2e/login.spec.ts",
    "violations": [
      {"rule": "no-client-trust", "file": "route.ts", "line": 12, "fix": "wrap body in loginSchema.parse()"}
    ]
  }

SIDE EFFECTS:
  - May install zod, @hookform/resolvers, react-hook-form
  - Writes shared schema file, server handler, E2E test
  - Modifies form component to use Controller / register
```

## CLI

```bash
# Audit existing forms for client-trust violations
python3 scripts/frontend_agent.py forms --action audit --target ./src

# Generate a Zod schema from an existing TS type
python3 scripts/frontend_agent.py forms --action generate-schema --form-path ./src/forms/Signup.tsx

# Wire client + server in one pass
python3 scripts/frontend_agent.py forms --action wire-client --form-path ./src/forms/Login.tsx
python3 scripts/frontend_agent.py forms --action wire-server --schema-path ./src/schemas/login.ts --server-path ./src/app/api/login/route.ts

# Generate E2E test for the form
python3 scripts/frontend_agent.py forms --action test --form-path ./src/forms/Checkout.tsx
```

## Decision Tree (autonomous)

```
Q: TypeScript project?
  YES → Zod (type inference: const schema = z.object({...}); type Form = z.infer<typeof schema>)
  NO  → Yup (similar API, no type inference)

Q: React?
  YES → React Hook Form (perf: uncontrolled, minimal re-renders) + zodResolver
        Formik only if already in use — RHF is faster and the ecosystem has moved
  NO  → conform-react (Remix) or vanilla schema.parse()

Q: Schema shared with backend?
  YES → Zod in a shared package (e.g. @app/schemas), import on both sides
  NO  → still Zod on client; mirror on server (preferably with the SAME schema)

Q: Async uniqueness check needed (email/username/slug)?
  YES → debounced (300ms) async validator that calls /api/check-unique
        abort previous request on new input (AbortController)
        show spinner, show ✓ on success, show message on conflict
  NO  → synchronous schema parse only
```

## Patterns

### Schema-first (the contract)
```ts
// src/schemas/login.ts — shared client + server
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(12).max(128),
  remember: z.boolean().default(false),
});
export type LoginInput = z.infer<typeof loginSchema>;
```

### Client wiring (React Hook Form)
```tsx
const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
  resolver: zodResolver(loginSchema),
  mode: 'onBlur',          // validate on blur, not every keystroke
  reValidateMode: 'onChange', // re-validate on change after first error
});

<input
  id="email"
  type="email"
  aria-invalid={!!errors.email}
  aria-describedby={errors.email ? 'email-error' : undefined}
  {...register('email')}
/>
{errors.email && (
  <p id="email-error" role="alert" className="text-error">
    {errors.email.message}
  </p>
)}
```

### Server re-validation (mandatory)
```ts
// src/app/api/login/route.ts
import { loginSchema } from '@app/schemas/login';

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = loginSchema.safeParse(body);   // NEVER trust the client
  if (!parsed.success) {
    return Response.json({ errors: parsed.error.flatten() }, { status: 422 });
  }
  // ... auth logic
}
```

### Async uniqueness (debounced + abortable)
```ts
const checkEmail = useAsyncValidation({
  field: 'email',
  endpoint: '/api/check-unique',
  debounceMs: 300,
  message: 'Email already registered',
});
```

## Failure Modes & Recovery

| Symptom | Cause | Recovery |
|---------|-------|----------|
| Form submits with empty required field | Client validation bypassed (devtools) | Server `safeParse` rejects — never trust client |
| Validation fires on every keystroke | `mode: 'onChange'` default | Switch to `mode: 'onBlur'`, `reValidateMode: 'onChange'` |
| Async uniqueness spam | No debounce | Add 300ms debounce + AbortController |
| Screen reader doesn't announce error | Missing `role="alert"` / `aria-describedby` | Add both — see Patterns |
| Server accepts `{}` body | No server validation | Add `schema.safeParse(req.body)` — reject if `!success` |
| Schema drift client vs server | Two schemas maintained separately | Move to shared package `@app/schemas`, single import |

## Self-Healing Loop

When a validation violation is found:
1. Identify the rule (`no-client-trust`, `accessible-errors`, `debounce-async`, `shared-schema`)
2. Apply the mechanical fix (add `safeParse` to server, add `aria-describedby` to input)
3. Re-run the E2E test for that form
4. If the fix changes error copy → route to `frontend-bridge` for tone review
5. Max 3 self-heal attempts per violation, then escalate

## Quality Gates (enforced before "form done")

- [ ] Schema defined once, shared between client and server (single import path)
- [ ] Client uses `mode: 'onBlur'` (not `onChange` on every keystroke)
- [ ] Async validators debounced + abortable
- [ ] Every error message: `role="alert"` + `aria-describedby` linking input to error
- [ ] Every input has `<label>` (or `aria-label` if visible label impossible)
- [ ] Submit button shows `isSubmitting` state (disabled + spinner)
- [ ] Server re-validates the SAME schema — `safeParse` returns 422 on failure
- [ ] E2E test covers: empty submit, invalid format, valid submit, async conflict
- [ ] No PII logged on validation failure (errors only, never values)

## Tools

- **Zod** — TS-first schema, type inference, default for new TS projects
- **Yup** — JS-friendly schema, similar API (use when no TS)
- **Joi** — Node/Hapi ecosystem; legacy, prefer Zod
- **React Hook Form** — performant, uncontrolled, default for React
- **Formik** — alternative; use only if already in the codebase
- **conform-react** — Remix-native, progressive enhancement
- **@hookform/resolvers** — `zodResolver`, `yupResolver` adapters
- **@faker-js/faker** — generate test inputs for E2E
- **Playwright** — E2E form flows (delegated to `webapp-testing`)

## Hard Rules

1. **Never trust client validation.** Every server handler MUST re-run `schema.safeParse(body)` and reject on failure. Client validation is UX, not security.
2. **Always use one schema, shared.** The Zod/Yup schema lives in a shared package; client and server import the same file. Drift between client and server validation is a security bug.
3. **Always validate on blur, not every keystroke.** `mode: 'onBlur'` + `reValidateMode: 'onChange'`. Per-keystroke validation frustrates users and re-renders too much.
4. **Always make errors accessible.** `aria-invalid` on the input, `role="alert"` on the error text, `aria-describedby` linking them. A blind user must hear the error.
5. **Always debounce async validators (300ms) and abort stale requests.** Without AbortController, typing `test@example.com` fires 16 requests.
6. **Always sanitize on the server, not just validate.** Validation says "is this a valid email"; sanitization says "is it safe to store/display" — use DOMPurify for HTML, parameterized queries for SQL (never string concat).
7. **Never log PII on validation failure.** Log the field name and rule that failed, never the user's value (`{email: 'invalid'}` not `{email: 'invalid', value: 'bob@...'}`).
8. **Always cover the form in E2E.** Empty submit, invalid format, valid submit, async conflict — one Playwright spec per form, runs in CI.
9. **Always show `isSubmitting` state.** Disable the button + show spinner; prevents double-submit and tells the user something is happening.
10. **Never put business rules in the form component.** Schema defines what's valid; the form just renders errors. Branching validation logic in the component is a smell — extend the schema instead.
