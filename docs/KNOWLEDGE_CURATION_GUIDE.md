# Knowledge Curation Guide

## Principles for Building Canonical Collections

---

## 1. What is a Canonical Collection?

A canonical collection is a curated set of documents that:

- Shares a unified theme
- Follows a progressive structure (foundation → synthesis)
- Maintains editorial consistency
- Forms a coherent learning journey
- Has internal relationships (prerequisites, continuations, related docs)
- Is bilingual (AR + EN with verified parity)

A collection is **canonical** when it has passed editorial review, has 0 validation errors, and is included in the platform's reading journeys.

## 2. Collection Design Checklist

Before creating a collection, answer:

- [ ] What is the single unifying theme? (one sentence)
- [ ] Who is the target reader? (beginner, intermediate, advanced, mixed)
- [ ] What is the knowledge progression? (what comes first, what depends on what)
- [ ] How many documents? (sweet spot: 6–10)
- [ ] How many tiers? (typically 3–4)
- [ ] What are the tier boundaries? (foundational / intermediate / advanced / synthesis)
- [ ] What existing content does it connect to? (cross-collection links)
- [ ] What journeys does it enable? (at least 2–3 reading paths)

## 3. Document Archetypes

Every collection should include a mix of these archetypes:

| Archetype         | Purpose                             | Usually in Tier           | Example from Phase 2B                 |
| ----------------- | ----------------------------------- | ------------------------- | ------------------------------------- |
| **The Motivator** | Explains why this topic matters     | Foundational              | quest-001 (Virtue of Knowledge)       |
| **The Map**       | Shows the landscape and divisions   | Foundational/Intermediate | quest-002 (Priority Fiqh)             |
| **The Tool**      | Introduces key concepts/terminology | Intermediate              | quest-003 (Instrumental/Purposive)    |
| **The Method**    | Describes how to do something       | Intermediate              | quest-004 (Gradual Progression)       |
| **The Ethos**     | Covers ethics and conduct           | Intermediate              | quest-005 (Etiquette)                 |
| **The Tension**   | Explores a productive tension       | Advanced                  | quest-006 (Breadth vs Specialisation) |
| **The Legacy**    | Grounds the topic in tradition      | Advanced                  | quest-007 (Authorship Heritage)       |
| **The Blueprint** | Gives a practical plan              | Synthesis                 | quest-008 (Practical Model)           |

Not every collection needs all eight, but each needs at least one from each tier.

## 4. Writing Rules for Curators

### Do

- Write Arabic first, then adapt English
- Start each document with `## المقدمة / ## Introduction`
- End each document with `## خلاصة / ## Summary`
- Include at least 3 H2 sections
- Keep subtitle under 200 characters (Arabic and English both)
- Use relative paths for all cross-references
- Ground claims in Qur'an, Sunnah, or named scholarly authorities
- Use 1–2 callouts per document (max 3)
- Keep paragraphs under 6 sentences
- Keep Arabic sentences under 35 words, English under 30 words

### Don't

- Don't write "في هذا المقال" or "in this article" — let the structure speak
- Don't use first-person authorial voice ("I think", "in my opinion") — scholarly third person
- Don't include biographical information about the author in the document body
- Don't use emoji in document content (icons belong in metadata only)
- Don't include external links (no URLs in documents — use internal slugs only)
- Don't create content that duplicates existing documents — reuse via relations
- Don't write for SEO — write for a reader who is already here

## 5. Relationship Mapping

Every collection must define a relationship map before writing begins.

**Rules:**

- Linear prerequisite chain is the default (A→B→C→D)
- Each doc references its predecessor in `related`
- Each doc references its successor in `continuation`
- First doc has no `prerequisites`
- Last doc has no `continuation`
- Cross-collection links use `related` only (no `prerequisites` or `continuation` across collections)
- AR and EN must have identical relationship fields

**Template:**

```yaml
# For document N in a chain (not first, not last):
related: "prev-slug, next-slug"
prerequisites: "prev-slug"
continuation: "next-slug"
themes: "tier-theme, content-theme"

# For first document:
related: "next-slug"
prerequisites: ""
continuation: "next-slug"
themes: "foundational, theme-label"

# For last document:
related: "prev-slug"
prerequisites: "prev-slug"
continuation: ""
themes: "synthesis, theme-label"
```

## 6. Thematic Labelling

Theme labels serve two purposes:

1. **Tier grouping** on category pages (foundational, intermediate, advanced, synthesis)
2. **Content filtering** across categories (methodology, fiqh, ethics, heritage, principles)

Every document must have exactly **two theme labels**: one tier + one content.

Current theme vocabulary:

```
Tier:     foundational | intermediate | advanced | synthesis
Content:  principles | methodology | fiqh | ethics | heritage | taxonomy | standards | overview | workflow
```

New themes can be added but must be registered in both:

- `content.ts` → `themeLabels` record
- `scripts/validate-content.mjs` → `KNOWN_THEMES` array

## 7. Validation Before Publishing

Before declaring a collection complete, run:

```
pnpm validate:content      # Must show 0 errors, 0 warnings
pnpm test                  # All tests must pass
pnpm lint                  # 0 lint errors
```

Additional manual checks:

- [ ] Every AR doc has an EN counterpart (same slug, same ID, same order, same category)
- [ ] Every doc has `## المقدمة` / `## Introduction` (or equivalent first H2)
- [ ] Every doc has `## خلاصة` / `## Summary` (or equivalent last H2)
- [ ] No circular relationships
- [ ] Every `continuation` slug resolves and the chain is complete
- [ ] All `related` slugs resolve
- [ ] At least one journey includes the collection's docs
- [ ] Category metadata exists for the new category (if any)

## 8. Maintenance

- Collections should be reviewed quarterly for broken links, outdated content, and parity drift
- If a document is deprecated, update ALL relationships that reference it
- When adding a document to an existing collection, re-validate the full chain
- Never delete a document without migrating its relationships
- Deprecated documents should have `status: archived` in frontmatter (to be implemented when status field is enforced)
