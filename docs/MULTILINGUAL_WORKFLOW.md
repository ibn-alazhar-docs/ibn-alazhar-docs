# Multilingual Workflow — سير العمل متعدد اللغات

> **Phase:** 2A — Editorial + Authoring System  
> **Status:** Approved  
> **Last Updated:** 2026-05-24

---

## 1. Purpose

Define the systems, conventions, and tooling for maintaining Arabic ↔ English content parity across Ibn Al-Azhar Docs.

No machine translation. No external services. Every locale is independently authored and manually synchronized.

---

## 2. Locale Architecture

### 2.1 Directory Structure

```
content/
├── ar/           ← Arabic content (primary authoring language)
│   ├── introduction/
│   │   ├── doc-001-platform-overview.mdx
│   │   └── ...
│   └── ...
└── en/           ← English content (translated from Arabic)
    ├── introduction/
    │   ├── doc-001-platform-overview.mdx
    │   └── ...
    └── ...
```

### 2.2 Locale Independence Rules

| Element       | Rule                                  |
| ------------- | ------------------------------------- |
| Slug          | MUST be identical across locales      |
| Category      | MUST be identical across locales      |
| ID            | MUST be identical across locales      |
| Order         | SHOULD be identical across locales    |
| Content       | Independently written per locale      |
| Title         | Translated per locale                 |
| Subtitles     | Translated per locale                 |
| Themes        | SHOULD be identical (when applicable) |
| Relationships | SHOULD be identical (when applicable) |

### 2.3 Primary Authoring Language

**Arabic is the primary authoring language.** All documents are first written in Arabic, then translated/extended into English. This ensures:

- The platform's identity remains Arabic-first
- Scholarly concepts are defined in their original language
- Translations are faithful to the source
- Terminology consistency flows from AR → EN

---

## 3. Translation Workflow

```
1. Write AR version    → Full content, all frontmatter
2. Frontmatter sync    → Copy id, category, order, themes to EN
3. Translate title     → Ensure accurate scholarly translation
4. Write EN content    → English adaptation (NOT machine translation)
5. Verify parity       → Both docs exist, same structure
6. Review both         → Independent review per locale
7. Publish together    → Both locales published simultaneously
```

### 3.1 Translation vs. Adaptation

| Approach                | When to Use                                                   |
| ----------------------- | ------------------------------------------------------------- |
| **Literal translation** | Technical definitions, taxonomy, rules                        |
| **Adaptation**          | Explanatory text, examples, cultural contexts                 |
| **Parallel writing**    | When the EN audience needs different examples or explanations |

For most documents: write AR first, then adapt into EN. Do not translate word-for-word.

### 3.2 The `language` Field

Each document's frontmatter includes a `language` field:

```yaml
language: "ar" # Language of this specific file
```

This field is informational — it enables future tooling to filter by language.

---

## 4. Parity Detection

### 4.1 What "Parity" Means

Two versions (AR + EN) of a document have **parity** when:

- Both files exist at corresponding paths
- `id` matches
- `category` matches
- `order` matches
- Both have the same `status`
- Both have all required frontmatter fields

### 4.2 What "Parity Gap" Means

A **parity gap** exists when:

- A document exists in AR but not EN (or vice versa) — **missing translation**
- Frontmatter fields differ between locales — **metadata drift**
- Order values differ — **navigation mismatch**
- Status differs — **lifecycle inconsistency**

### 4.3 Parity Detection Tool

```bash
# Check parity across all documents
node scripts/validate-content.mjs --parity

# Output:
# ✅ 6/6 docs have AR/EN parity
# ❌ 1 missing: organization/doc-004-foundations exists in AR but not EN
```

### 4.4 Parity Report Format

```
Missing translations:
  • introduction/doc-004-advanced-topics → exists in AR, missing in EN

Metadata drift:
  • introduction/doc-002-methodology-principles: order(ar:2, en:3)
  • organization/doc-003-knowledge-taxonomies: status(ar:published, en:draft)

Status mismatch:
  • introduction/doc-002-methodology-principles: ar=published, en=review
```

---

## 5. Route Synchronization

### 5.1 Route Pattern

All content routes follow:

```
/[locale]/docs/{category}/{slug}
```

Because slugs and categories are locale-independent, route synchronization is automatic — the same route structure works for both locales:

```
/ar/docs/introduction/doc-001-platform-overview   ✓
/en/docs/introduction/doc-001-platform-overview   ✓
```

### 5.2 Route Breaking Conditions

A route breaks when:

- A slug exists in one locale but not the other
- A category directory exists in one locale but not the other
- The `generateStaticParams` in the route handler only finds one locale

### 5.3 Route Health Check

```bash
node scripts/validate-content.mjs --routes
```

---

## 6. Metadata Synchronization

### 6.1 Auto-Copied Fields

When creating an EN version from AR, these fields are automatically populated by the scaffold tool:

| Field           | Auto-Copy? | Notes                                      |
| --------------- | ---------- | ------------------------------------------ |
| `id`            | Yes        | Must be identical                          |
| `category`      | Yes        | Must be identical                          |
| `order`         | Yes        | Should be identical                        |
| `themes`        | Yes        | Should be identical                        |
| `related`       | Yes        | Should be identical                        |
| `prerequisites` | Yes        | Should be identical                        |
| `continuation`  | Yes        | Should be identical                        |
| `title`         | No         | Must be translated                         |
| `subtitle`      | No         | Must be translated                         |
| `date`          | No         | Should match publication date              |
| `readingTime`   | No         | May differ if EN content is longer/shorter |
| `language`      | No         | Set to `"en"`                              |

### 6.2 Periodic Synchronization

Run monthly (or per release):

```bash
node scripts/validate-content.mjs --parity
```

This generates a parity gap report. Fix gaps before the next release.

---

## 7. Locale Scaling

### 7.1 Adding a New Locale

1. Create `content/{new-locale}/` directory
2. For each document in `ar/`, create a corresponding file in `new-locale/`
3. Add the locale to `generateStaticParams` in route handlers
4. Add locale labels to `getLocaleName()` in `content.ts`
5. Add locale messages to `src/messages/{new-locale}.json`
6. Add locale to middleware (Next.js i18n config)

### 7.2 Supported Locales

| Locale   | Code | Status  | Priority  |
| -------- | ---- | ------- | --------- |
| العربية  | `ar` | Active  | Primary   |
| English  | `en` | Active  | Secondary |
| Français | `fr` | Planned | Future    |
| Türkçe   | `tr` | Planned | Future    |

---

## 8. Summary of Rules

| Rule                               | Severity    | Enforcement   |
| ---------------------------------- | ----------- | ------------- |
| Every doc exists in both AR and EN | Required    | CI validation |
| Same slug across locales           | Required    | CI validation |
| Same id across locales             | Required    | CI validation |
| Same category across locales       | Required    | CI validation |
| Content independently written      | Required    | Manual review |
| Same order recommended             | Recommended | Lint warning  |
| Same themes recommended            | Recommended | Lint warning  |
| Same relationships recommended     | Recommended | Lint warning  |

---

## 9. Related Documents

- `docs/AUTHORING_TOOLKIT.md` — Templates and scaffold
- `docs/DOCUMENT_GOVERNANCE.md` — Lifecycle and standards
- `docs/EDITORIAL_STYLE_GUIDE.md` — Tone per locale
- `scripts/validate-content.mjs` — Parity validation
- `scripts/generate-doc.mjs` — Scaffold with locale pairs
