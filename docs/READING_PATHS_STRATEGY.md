# Reading Paths Strategy

## Purpose

Define how editorial reading journeys are created, maintained, and presented. Journeys are the primary mechanism for guided knowledge discovery.

## Philosophy

Reading journeys are **editorial**, not algorithmic. Each path is hand-curated by the content team to provide a coherent learning sequence. Journeys reflect how scholars think about knowledge progression — not what a recommendation engine predicts.

## Journey Definition

A journey is:

- A **curated sequence** of documents
- With a **specific learning goal** in mind
- That **crosses category boundaries** when appropriate
- **Annotated with context** (title, description, icon)
- **Time-bounded** (estimated total reading time)

## Current Journeys

### 1. Beginner's Path — طريق المبتدئ

**Goal**: Orient new users to the platform.

| Step | Doc                      | Time | Category     |
| ---- | ------------------------ | ---- | ------------ |
| 1    | Platform Overview        | 4min | Introduction |
| 2    | Work Methodology         | 5min | Introduction |
| 3    | Knowledge Classification | 6min | Organization |

**Total**: ~15 minutes · 3 documents

### 2. Documentation Methodology — منهجية التوثيق

**Goal**: Deep understanding of the documentation process.

| Step | Doc               | Time | Category     |
| ---- | ----------------- | ---- | ------------ |
| 1    | Work Methodology  | 5min | Introduction |
| 2    | Platform Overview | 4min | Introduction |

**Total**: ~9 minutes · 2 documents

### 3. Knowledge Organization — تنظيم المعرفة

**Goal**: Explore the classification system.

| Step | Doc                      | Time | Category     |
| ---- | ------------------------ | ---- | ------------ |
| 1    | Knowledge Classification | 6min | Organization |
| 2    | Work Methodology         | 5min | Introduction |

**Total**: ~11 minutes · 2 documents

## Creating a New Journey

### Requirements

1. **Editorial justification**: Why does this path exist?
2. **Learning goal**: What will the reader understand after?
3. **Document sequence**: Ordered list of document slugs
4. **Metadata**: Title, description, icon (localized)
5. **Review**: Journeys should be reviewed quarterly for relevance

### Implementation

Journeys are defined in `src/lib/content.ts` in the `getJourneys()` function:

```typescript
{
  slug: "my-new-path",
  title: { ar: "العنوان بالعربية", en: "English Title" },
  description: {
    ar: "وصف المسار بالعربية",
    en: "Journey description in English",
  },
  icon: "📚",
  docSlugs: ["doc-001-slug", "doc-002-slug", "doc-003-slug"],
}
```

### Naming Conventions

| Field         | Convention                       | Example                    |
| ------------- | -------------------------------- | -------------------------- |
| `slug`        | kebab-case, descriptive          | `usul-al-fiqh-foundations` |
| `title`       | Short (3-6 words), clear goal    | "أصول الفقه للمبتدئين"     |
| `description` | 1-2 sentences, what reader gains | "رحلة تأسيسية في..."       |
| `icon`        | Single emoji, conceptual         | 📖 ⚙️ 🏛️ 🔍                |

## Journey Display Rules

### On Library Homepage

- Max 3 journeys shown
- Ordered by editorial priority (defined in code)
- Each displayed as a card with gold left-border accent
- "All journeys" link at section header

### On Journey Index

- All journeys displayed
- Same card layout as homepage
- Alphabetical by localized title

### On Journey Detail

- Timeline layout with numbered steps
- Vertical gold line connecting steps
- Each step shows doc title, subtitle, reading time, category
- Clicking a step navigates to the document

### On Document Pages

- If a document belongs to a journey, a "Part of [journey]" badge appears above the title
- Multiple badges if document belongs to multiple journeys
- Badge links to the journey detail page

## Journey Lifecycle

```
Draft → Published → Revised → Deprecated
```

| State      | Visibility           | Meaning                                         |
| ---------- | -------------------- | ----------------------------------------------- |
| Draft      | Not in production    | Under editorial development                     |
| Published  | Visible on all pages | Active, recommended path                        |
| Revised    | Visible              | Updated with new/changed documents              |
| Deprecated | Removed from index   | No longer recommended, redirected to newer path |

## Scaling Strategy

### Phase 1D (Current)

- 3 journeys, 2-3 docs each
- Manual editorial selection
- No user tracking or personalization

### Phase 2

- 5-8 journeys
- Journeys can reference documents across 3-5 categories
- Journey suggestions on document pages

### Phase 3

- 10-15 journeys
- Some journeys may have prerequisites (complete Journey A before Journey B)
- Editorial team adds 1-2 journeys per month

### Future Considerations

- User-created reading lists (post-MVP)
- Journey completion tracking (requires auth)
- Community-suggested journeys (requires moderation system)

## Quality Standards

### Every Journey Must Have

- [ ] Clear learning goal
- [ ] Documents ordered by logical progression
- [ ] Estimated reading time ≤ 60 minutes total
- [ ] Documents actually exist (validated at build time)
- [ ] Both Arabic and English metadata
- [ ] Meaningful icon (not default)
- [ ] Description that helps user decide if this path is for them

### Avoid

- ❌ Journeys that are just "all documents in a category" (use thematic groups instead)
- ❌ Journeys longer than 10 documents
- ❌ Journeys without a clear audience or goal
- ❌ Overlapping journeys (same docs in same order with different names)
