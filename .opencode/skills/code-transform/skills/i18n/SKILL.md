---
name: i18n
description: "Internationalization — RTL support, locale files, ICU MessageFormat, Intl API for dates/numbers/currency, pluralization. Picks the library (react-intl / i18next / vue-i18n / babel), extracts user-facing strings, enforces logical CSS properties for RTL. Triggers in Phase 4 (i18n readiness audit) and Phase 6 (multi-language build)."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: cross-cutting
---

# Internationalization

> One codebase, every locale. Strings in locale files, ICU MessageFormat for plurals/gender, `Intl.*` for formatting, logical CSS properties for RTL. Never hardcode user-facing text, never concatenate translations, never assume LTR.

## When to Use

| Phase                | Trigger                              | Why                                                    |
| -------------------- | ------------------------------------ | ------------------------------------------------------ |
| Phase 4 — AUDIT      | "Will this app ship multi-language?" | Audit hardcoded strings, RTL readiness                 |
| Phase 6 — EXECUTE    | Add a second locale                  | Set up i18n library, extract strings, add locale files |
| Phase 6 — EXECUTE    | Any new user-facing string           | Add to locale file, never inline                       |
| Phase 9 — ACCEPTANCE | "Arabic version works" AC            | Verify RTL layout, plural forms, date/number format    |

**Do NOT use this sub-skill for:** styling (use `css-styling`), translation management platform setup (use Crowdin/Localazy docs), or content management (use `cms-setup`). This sub-skill owns the _code-level i18n architecture_.

## What It Does

1. Detects the existing i18n library (parses `package.json` for `react-intl`, `i18next`, `next-intl`, `vue-i18n`, `babel`)
2. If none and multi-language is required: installs + configures per the Decision Tree
3. Extracts every user-facing string from source files into locale files (`en.json`, `ar.json`, `es.json`)
4. Detects hardcoded strings via ESLint rule (`react-intl`'s `no-unescaped-intl` / `i18next`'s `no-literal-string`)
5. Converts `margin-left`/`padding-right` to `margin-inline-start`/`padding-inline-end` (logical properties for RTL)
6. Sets up ICU MessageFormat for plurals (`{count, plural, one {1 item} other {# items}}`) and gender
7. Replaces `new Date().toLocaleDateString()` with explicit `Intl.DateTimeFormat` calls (locale-aware)
8. Adds `dir="rtl"` switching based on detected locale; persists in cookie
9. Generates a missing-translations report (keys in `en.json` missing from other locales)

## Integration Contract

```
INPUT:
  - project_root: string (required)
  - target: file|directory (required)
  - action: audit|install|extract|lint|add-locale (default audit)
  - library: react-intl|i18next|next-intl|vue-i18n (optional, auto-detected)
  - locales: comma-separated list (default "en,es,ar,fr,de,ja,zh")

OUTPUT (JSON to stdout):
  {
    "status": "ok|error",
    "library": "react-intl",
    "locales_supported": ["en", "es", "ar", "fr"],
    "rtl_ready": true,
    "extracted_strings": 247,
    "missing_translations": {"ar": 12, "es": 4, "fr": 18},
    "hardcoded_strings": [
      {"file": "Button.tsx", "line": 8, "string": "Click here", "fix": "extract to messages.button.click"}
    ],
    "non_logical_css": [
      {"file": "Card.tsx", "line": 14, "property": "margin-left", "fix": "margin-inline-start"}
    ],
    "report_path": "/tmp/ct-<uuid>/i18n-audit.html"
  }

SIDE EFFECTS:
  - May install react-intl / i18next / next-intl / vue-i18n
  - Writes locale files (en.json, ar.json, etc.)
  - Modifies source: replaces strings with `<FormattedMessage>` / `t()` calls
  - Updates CSS to use logical properties
```

## CLI

```bash
# Audit i18n readiness
python3 scripts/frontend_agent.py i18n --action audit --target ./src

# Install + configure react-intl on a Next.js project
python3 scripts/frontend_agent.py i18n --action install --library next-intl --locales en,es,ar

# Extract all hardcoded strings to locale files
python3 scripts/frontend_agent.py i18n --action extract --target ./src --locales en,es,ar,fr

# Lint for new hardcoded strings
python3 scripts/frontend_agent.py i18n --action lint --target ./src

# Add a new locale (copies en.json as a template, marks all missing)
python3 scripts/frontend_agent.py i18n --action add-locale --locale ja
```

## Decision Tree (autonomous)

```
Q: What framework?
  REACT (Next.js)  → next-intl (App Router native) or react-intl (client-only)
  REACT (Vite/CRA) → react-intl (FormatJS) or i18next (more features)
  VUE              → vue-i18n
  SVELTE           → svelte-i18n
  PYTHON (server)  → babel + gettext / Flask-Babel
  NODE (server)    → i18next (shared schemas with client)

Q: Server-rendered or client-rendered?
  SSR  → next-intl / next-i18next (locale routing built-in)
  CSR  → react-intl / i18next (client-side switching)

Q: How many locales?
  1    → don't install i18n yet, but extract strings so it's ready
  2-5  → simple JSON files in repo, hand-translated or TMS-lite (Localazy free tier)
  6+   → TMS (Crowdin / Localazy / Lokalise) — sync via CLI in CI

Q: RTL needed (Arabic, Hebrew, Farsi, Urdu)?
  YES → MANDATORY: switch all CSS to logical properties (margin-inline-start)
        Set <html dir="rtl"> based on locale
        Test with Arabic locale in CI
  NO  → still use logical properties (future-proof, no cost)

Q: Plurals or gender in copy?
  YES → ICU MessageFormat: {count, plural, one {1 item} other {# items}}
  NO  → still use ICU for consistency (cheaper than refactoring later)
```

## Patterns

### Locale file structure

```json
// en.json
{
  "nav": { "home": "Home", "settings": "Settings" },
  "cart": {
    "items": "{count, plural, one {# item} other {# items}}",
    "total": "Total: {amount, currency, USD}"
  },
  "user": {
    "welcome": "Welcome, {name}!",
    "lastLogin": "Last login: {date, date, ::YYYYMMDD}"
  }
}
```

### ICU MessageFormat (plurals, gender, formatting)

```tsx
// ✅ ICU handles plurals + number formatting locale-aware
<FormattedMessage id="cart.items" values={{ count: items.length }} />;
// → English: "3 items"
// → Arabic: "٣ عناصر" (Arabic numerals, plural form)

// ❌ never concatenate
items.length + " items"; // breaks in Arabic (no plural), wrong in ja (no plural)
```

### Intl API for formatting (never hardcode formats)

```ts
// ✅ locale-aware via Intl
new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(amount);
new Intl.PluralRules(locale).select(count); // 'one' | 'few' | 'many' | 'other'
new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(-1, "day"); // "yesterday"

// ❌ never hardcode
date.getMonth() + "/" + date.getDate() + "/" + date.getFullYear(); // US-only
"$" + amount.toFixed(2); // wrong currency symbol, wrong decimal for Europe
```

### RTL via logical properties

```css
/* ❌ physical properties — break in RTL */
.card {
  margin-left: 16px;
  padding-right: 8px;
  text-align: left;
}

/* ✅ logical properties — work in both LTR and RTL */
.card {
  margin-inline-start: 16px;
  padding-inline-end: 8px;
  text-align: start;
}
```

### Direction switching

```tsx
// Set <html dir="rtl"> based on locale (one place)
import { dir } from 'i18n';
<html lang={locale} dir={dir(locale)}>...</html>

// In Tailwind, use logical utilities:
<div className="ps-4 pe-2 ms-2 me-4" />  // padding-inline-start, padding-inline-end, margin-inline-start, margin-inline-end
```

### Locale routing (Next.js App Router)

```ts
// middleware.ts — /en/dashboard, /ar/dashboard, /es/dashboard
export const middleware = createMiddleware({
  locales: ["en", "es", "ar", "fr"],
  defaultLocale: "en",
});
```

## Failure Modes & Recovery

| Symptom                                  | Cause                                        | Recovery                                                              |
| ---------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------- |
| Strings render as keys (`nav.home`)      | Locale file missing key                      | Run `add-locale` to copy template, fill translations                  |
| Plural wrong in Arabic                   | Used `count + ' items'` not ICU              | Switch to `<FormattedMessage id="cart.items" values={{count}}/>`      |
| Layout broken in RTL                     | Used `margin-left` not `margin-inline-start` | Run `audit --action lint`, fix non-logical CSS                        |
| Date shows as `5/15/24` in Europe        | `toLocaleDateString()` without locale        | Use `Intl.DateTimeFormat(locale, {...}).format()`                     |
| Currency wrong symbol                    | `'$' + amount` hardcoded                     | Use `Intl.NumberFormat(locale, {style:'currency',currency}).format()` |
| SSR shows English then flashes to Arabic | Locale detected client-side                  | Use Next.js middleware for locale routing + cookie                    |

## Self-Healing Loop

When an i18n violation is found:

1. Identify the rule (`no-hardcoded-strings`, `use-logical-properties`, `use-icu-plurals`, `use-intl-format`)
2. Apply the mechanical fix (extract string to locale file, swap `margin-left` for `margin-inline-start`, swap `+ ' items'` for ICU)
3. Re-run the linter
4. If the fix requires translation → mark key as missing in non-en locales, generate translation ticket
5. Max 3 self-heal attempts per violation, then escalate

## Quality Gates (enforced before "i18n ready")

- [ ] Zero hardcoded user-facing strings (ESLint `no-literal-string` passes)
- [ ] All CSS uses logical properties (no `margin-left`/`padding-right` outside third-party)
- [ ] All plurals use ICU MessageFormat (`{count, plural, ...}`)
- [ ] All dates use `Intl.DateTimeFormat` (no `getMonth()` formatting)
- [ ] All numbers/currency use `Intl.NumberFormat` (no `'$' + amount`)
- [ ] `dir="rtl"` applied based on locale (Arabic, Hebrew, Farsi, Urdu)
- [ ] `<html lang>` set to active locale
- [ ] Locale routing works (`/en/...`, `/ar/...`)
- [ ] RTL test in CI (screenshot Arabic locale, compare to LTR for layout parity)
- [ ] Missing-translations report clean (or tracked as tickets)

## Tools

- **react-intl (FormatJS)** — React, ICU MessageFormat, well-supported
- **next-intl** — Next.js App Router native, server components
- **i18next + react-i18next** — framework-agnostic, more features (namespaces, lazy loading)
- **vue-i18n** — Vue 3 native
- **svelte-i18n** — Svelte
- **babel + gettext / Flask-Babel** — Python server-side
- **FormatJS CLI** — extracts messages from source into JSON
- **Crowdin / Localazy / Lokalise** — TMS (Translation Management System); sync via CLI in CI
- **Intl API** — built-in, no library needed for formatting (dates, numbers, plurals)

## Hard Rules

1. **Never hardcode user-facing strings.** Every visible text goes in a locale file. ESLint rule `no-literal-string` enforces this.
2. **Never concatenate translated strings.** `"Welcome, " + name + "!"` breaks word order in other languages. Use ICU: `"Welcome, {name}!"` with `<FormattedMessage>`.
3. **Always support RTL.** Use logical CSS properties (`margin-inline-start`), set `dir="rtl"` on `<html>`, mirror icons/layouts. A PR that adds `margin-left` is rejected.
4. **Always use ICU MessageFormat for plurals.** `{count, plural, one {1 item} other {# items}}`. Arabic has 6 plural forms; English has 2; Japanese has 1. Hardcoding breaks all of them.
5. **Always format dates/numbers/currency via `Intl.*`.** Never `getMonth() + '/' + getFullYear()`, never `'$' + amount`. `Intl.DateTimeFormat(locale, ...)` and `Intl.NumberFormat(locale, ...)` handle every locale correctly.
6. **Always set `<html lang>` and `dir`.** Screen readers use `lang` for pronunciation; layouts use `dir` for direction. Missing either is an accessibility bug.
7. **Always namespace locale keys.** `nav.home` not `home`. Flat key spaces become unmanageable past 100 strings.
8. **Never trust machine translation for production.** Use it as a draft, review with a native speaker. Mistranslations can be offensive or legally wrong.
9. **Always test the RTL locale in CI.** A screenshot diff of the Arabic layout catches CSS regressions before users do. Route to `visual-regression-ci`.
10. **Always extract strings before adding a new locale.** Adding `ar.json` to a codebase with 200 hardcoded strings = disaster. Extract first, then add locale.
