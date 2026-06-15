# Editorial Continuity Notes — Phase 2B

## Overview

This document records editorial decisions, style choices, and continuity rules applied during the creation of the "Fiqh of Priorities in Seeking Knowledge" collection. It serves as a reference for maintaining consistency across future collections.

---

## 1. Voice and Tone

**Applied consistently across all 8 documents:**

| Attribute          | Rule                                                | Example                                      |
| ------------------ | --------------------------------------------------- | -------------------------------------------- |
| Person             | Third-person scholarly, first-person only in quotes | "ينبغي لطالب العلم" not "ننصحك"              |
| Authority          | Grounded in named scholars and texts                | "قال الإمام الشافعي" not "يقول الخبراء"      |
| Certainty          | Confident but not absolute                          | "الأرجح" / "the more balanced view"          |
| Emotional register | Calm, dignified, never sensational                  | No exclamation marks except in direct quotes |
| Arabic             | Classical-modern fusion                             | Fusha with contemporary clarity              |

## 2. Structural Consistency

### Frontmatter patterns used across all 8 docs:

- **id:** Sequential `doc-004` through `doc-011` (bridging from existing `doc-001`–`doc-003`)
- **slug:** `quest-NNN-description` (e.g., `quest-001-fadl-alilm`)
- **order:** Global sequential 4–11 (works with existing global navigation)
- **themes:** Tier label (`foundational`, `intermediate`, `advanced`, `synthesis`) + content label (`principles`, `fiqh`, `methodology`, `ethics`, `heritage`)
- **readingTime:** Ranges 7–10 minutes for substantive depth

### Section heading hierarchy:

```
## المقدمة / Introduction
## ... (3–6 main sections)
## خلاصة / Summary
```

No document goes deeper than H3 (###) except where tables or code blocks are used. Maximum 2 levels of nesting.

## 3. Relationship Integrity

### Rule set applied:

- Linear prerequisites chain: 001 → 002 → 003 → 004 → 005 → 006 → 007 → 008
- Each doc references the previous and next via `related`
- `continuation` always points to the next doc in sequence
- `prerequisites` points to immediate predecessor(s)
- The last doc (quest-008) has empty `continuation`
- The first doc (quest-001) has empty `prerequisites`
- No circular references
- Relations are identical across AR and EN locales

### Edge case: doc-001-platform-overview updated

Existing doc-001's `related` field was extended to include `quest-001-fadl-alilm` — connecting the platform introduction to the substantive collection. Both AR and EN versions updated in parallel.

## 4. Arabic Editorial Choices

| Decision                                       | Rationale                                                                           |
| ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| Diacritics (tashkeel) used sparingly           | Only where disambiguation needed; full tashkeel would slow reading                  |
| Quranic verses with braces { }                 | Consistent with Arabic typographic tradition for Qur'an quotations                  |
| Classical terms retained (فرض عين / فرض كفاية) | These are precise technical terms with no adequate substitute                       |
| Modern examples included                       | "الموسوعات الرقمية" bridges classical and contemporary                              |
| Poetic/proverbial insertions                   | One per doc maximum, always sourced or clearly marked                               |
| Callout labels in Arabic                       | "ملاحظة", "تنبيه", "فائدة", "تأمل", "تأصيل" — matching AUTHORING_TOOLKIT categories |

## 5. English Editorial Choices

| Decision                              | Rationale                                                                     |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| Arabic terms transliterated + glossed | "fard 'ayn (individual obligation)" — educates the English reader             |
| Idiomatic not literal translation     | "العمود الفقري" → "backbone" not "spinal column"                              |
| Passive voice accepted                | Scholarly English tolerates passive more than Arabic                          |
| - Arabic quotations left untranslated | { } braces for Qur'an; author names in Arabic script on first mention         |
| No gender-neutral awkwardness         | "the student" / "they" where natural, "he" where traditional register demands |
| Varied sentence openings              | Avoids the monotony of "This document..." / "This section..."                 |

## 6. Callout Usage Audit

| Doc       | Callouts Used | Type    | Purpose                           |
| --------- | ------------- | ------- | --------------------------------- |
| quest-001 | 1             | info    | Reflection                        |
| quest-001 | 1             | success | Benefit                           |
| quest-002 | 1             | info    | Grounding                         |
| quest-002 | 1             | warning | Note on flexibility               |
| quest-003 | 1             | info    | Note on conventional vs. real     |
| quest-003 | 1             | warning | Caution on over-instrumentalising |
| quest-004 | 1             | success | Azhari method summary             |
| quest-004 | 1             | warning | Counsell from al-Shafi'i          |
| quest-005 | 1             | info    | Recommended reading               |
| quest-006 | 1             | success | Ghazali example                   |
| quest-007 | 1             | info    | Counsell for authors              |
| quest-008 | 1             | warning | Timetable flexibility             |

**Total: 12 callouts across 8 documents — average 1.5 per doc. Within AUTHORING_TOOLKIT guidelines (max 2–3).**

## 7. Thematic Groups

Documents are grouped by two theme axes:

**By tier (for category page grouping):**

- foundational → quest-001, quest-002
- intermediate → quest-003, quest-004, quest-005
- advanced → quest-006, quest-007
- synthesis → quest-008

**By content (for cross-cutting filters):**

- methodology → quest-003, quest-004, quest-006, quest-008
- fiqh → quest-002
- principles → quest-001
- ethics → quest-005
- heritage → quest-007

## 8. Cross-Locale Parity Notes

All 8 doc pairs pass parity validation (0 errors, 0 warnings). Specifically:

- Same `id` for AR and EN versions ✓
- Same `slug` for AR and EN versions ✓
- Same `order` for AR and EN versions ✓
- Same `category` for AR and EN versions ✓
- Same `related`, `prerequisites`, `continuation` for AR and EN versions ✓
- Reading time differs by ≤ 1 minute across locales ✓
- Both locales have matching journeys ✓

## 9. Learning Progression

The collection is designed for three reading modes:

**Sequential (recommended):** quest-001 → quest-002 → ... → quest-008
— Builds cumulative understanding; each doc assumes prior docs.

**Tier-based:** Read all docs in one tier (e.g., all foundational) then stop.
— Suitable for readers with limited time or specific needs.

**Reference:** Jump to any single doc for a self-contained discussion.
— Each doc includes enough context to stand alone, with cross-references for depth.
