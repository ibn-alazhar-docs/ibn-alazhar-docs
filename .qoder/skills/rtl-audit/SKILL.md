---
name: rtl-audit
description: Scan the codebase for physical CSS properties that break RTL layouts and verify Arabic-first compliance. Use when adding UI components, reviewing frontend changes, or auditing RTL compliance. Triggers — "rtl audit", "check RTL", "find left/right CSS", "RTL issues", "direction audit", "Arabic rendering".
---

Scan all frontend source files for physical CSS properties that must be replaced with logical equivalents for Arabic RTL support, and verify Arabic-first compliance.

## What to scan

Search in `apps/web/src/` and any component files for these violations:

### Physical to Logical replacements

| Physical (BAD)          | Logical (GOOD)                 |
| ----------------------- | ------------------------------ |
| `ml-` / `margin-left`   | `ms-` / `margin-inline-start`  |
| `mr-` / `margin-right`  | `me-` / `margin-inline-end`    |
| `pl-` / `padding-left`  | `ps-` / `padding-inline-start` |
| `pr-` / `padding-right` | `pe-` / `padding-inline-end`   |
| `left-`                 | `start-`                       |
| `right-`                | `end-`                         |
| `rounded-l-`            | `rounded-s-`                   |
| `rounded-r-`            | `rounded-e-`                   |
| `text-left`             | `text-start`                   |
| `text-right`            | `text-end`                     |

### Exceptions (NOT violations)

- `left-0 right-0` used together for full-width positioning (e.g., `inset-x-0` pattern)
- `float-left`/`float-right` in print-specific styles
- Properties inside `dir="ltr"` blocks (explicit LTR context like code blocks, email inputs)
- `border-l-` / `border-r-` when used for decorative borders in LTR contexts

## Arabic-first checks

Alongside CSS properties, verify:

- Root element has `dir="rtl"` and `lang="ar"`
- Directional icons flip correctly in RTL
- Font is Cairo loaded via `next/font/google`
- UI text defaults to Arabic (no hardcoded English-only strings)
- Use `next-intl` (`useTranslations()`) for all text — no hardcoded strings

## How to report

1. Search for each physical property pattern across `apps/web/src/`
2. For each hit, check if it falls under exceptions
3. Report a table: **File** | **Line** | **Found** | **Suggested fix**
4. Group by severity:
   - **Critical** (breaks RTL layout) — must fix before merge
   - **Warning** (Arabic-first violation) — should fix before merge
   - **Minor** (cosmetic) — flag for next iteration
5. If zero violations found, report "RTL audit clean"

## Escalation

| Condition                 | Action               |
| ------------------------- | -------------------- |
| RTL direction broken      | Block — fix required |
| Arabic text not rendering | Block — fix required |
| CSS uses LTR assumptions  | Flag for fix         |
| Responsive RTL broken     | Flag for fix         |
