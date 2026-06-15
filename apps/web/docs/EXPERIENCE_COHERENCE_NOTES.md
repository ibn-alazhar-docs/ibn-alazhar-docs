# Experience Coherence Notes

## Emotional Consistency

### Platform Personality

Ibn Al-Azhar Docs projects the following emotional qualities:

| Quality         | Evidence                                                                                                 |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| **Calm**        | Minimal animations (fade-in only, no parallax, no scrolling effects), generous white space, muted colors |
| **Scholarly**   | Classic color palette (green + gold), Cairo typeface, structured prose with proper typographic hierarchy |
| **Timeless**    | No trendy design patterns (no glassmorphism, no extreme shadows, no gradient meshes), clean borders      |
| **Intentional** | Every element serves a function — no decorative flourishes without purpose                               |
| **Warm**        | Gold accents, cream backgrounds (gold-50), subtle green highlights in links and buttons                  |

### Tonal Consistency Across Surfaces

| Surface         | Tone                    | Consistent?                          |
| --------------- | ----------------------- | ------------------------------------ |
| Homepage        | Welcoming, aspirational | ✅                                   |
| Library         | Organized, inviting     | ✅                                   |
| Document reader | Focused, undistracted   | ✅                                   |
| Journey page    | Guiding, progressive    | ✅                                   |
| Dashboard       | Minimal, placeholder    | ⚠️ Still raw ("قريباً" placeholders) |

## Editorial Tone Coherence

### Voice Characteristics

- **Arabic**: Classical/modern Arabic hybrid — formal without being stiff, scholarly without being obscure
- **English**: Formal academic English — appropriate for an international scholarly audience

### Tone Across Phases

| Content                                  | Tone                  | Notes                               |
| ---------------------------------------- | --------------------- | ----------------------------------- |
| Platform docs (doc-001 to doc-003)       | Explanatory, overview | Describes the platform itself       |
| Collection docs (quest-001 to quest-008) | Teaching, reflective  | Guides the reader through knowledge |
| UI labels                                | Minimal, direct       | Tooltips, navigation — functional   |

**Verdict**: The editorial tone shifts appropriately between "platform explanation" and "knowledge teaching" without jarring transitions.

## Intellectual Atmosphere

### Reading Environment

The platform creates an intellectual atmosphere through:

1. **Generous prose width** (48rem max on desktop): comfortable line length for sustained reading
2. **Two-column layout** (content + TOC on desktop): supports quick navigation without losing place
3. **CSS-only scroll progress**: gives a sense of progress through long documents
4. **Journey context badges**: roots each document in a larger intellectual journey
5. **Prerequisites and continuations**: acknowledges that knowledge is cumulative
6. **Related documents**: creates lateral connections, not just linear progression

### Atmosphere Weaknesses

1. **No reading time estimates on document overview cards**: The data exists but isn't surfaced in all card views
2. **No dark mode**: For late-night reading, a dark theme would significantly improve the intellectual atmosphere
3. **No bookmark/reading position**: Long sessions benefit from position memory

These are acknowledged and deferred to future phases.

## Calmness Preservation

### Commitments

- **No invasive animations**: The only animations are:
  - Fade-in-up on homepage hero (single play on load)
  - Card hover transitions (border/shadow color, 0.15s–0.2s)
  - Reading progress bar (width transition, 0.1s linear) — hidden on reduced motion
- **No sounds**: No audio feedback anywhere
- **No autoplay**: No video, no carousel, no auto-advancing content
- **No modals**: No modal dialogs or popups
- **No infinite scroll**: All content is paged or listed

### Non-Calm Elements (Identified)

The CTA section on the homepage has a radial gradient background that's slightly busy. This is the most "loud" element on the platform. Acceptable as a call-to-action which should attract attention.

## Refinement Decisions

### Arrow Direction Standard

A systematic inconsistency in arrow directionality was identified and fixed:

| Context              | RTL (Arabic)            | LTR (English)           | Fix                       |
| -------------------- | ----------------------- | ----------------------- | ------------------------- |
| "Back" links         | `→` مسارات القراءة      | `←` Reading Journeys    | Directional               |
| "Forward" links      | جميع المسارات `←`       | All journeys `→`        | Directional               |
| CTA buttons          | CTA text `←`            | CTA text `→`            | Dynamic via `useLocale()` |
| Prev/Next links      | `→` السابق / التالي `←` | `←` Previous / Next `→` | Dynamic with locale       |
| Breadcrumb separator | `›`                     | `›`                     | Same (direction-neutral)  |

**Rule**: In RTL, `←` means "forward" (to the right) and `→` means "backward" (to the left). In LTR, the standard convention applies. Arrows now correctly reflect the direction of travel for each language.

### Callout Background Softening

Solid flat callout backgrounds were replaced with subtle gradients:

- Before: `background: var(--color-info-50)`
- After: `background: linear-gradient(135deg, var(--color-info-50), white)`

This creates a softer, more premium appearance without sacrificing contrast.

### Blockquote Enhancement

Blockquotes received:

- Increased padding (1rem → 1.25rem)
- Gradient background (softer feel)
- Added support for `<cite>` element
- Refined border-radius

### Line Height Fine-Tuning

The prose line-height remains at 2 (which equates to 36px at 1.125rem) — intentionally generous for Arabic script readability and long-session reading comfort.

## Future Coherence Opportunities

1. **Consistent card metadata**: Standardize how reading time, doc count, and date appear across all card variants
2. **Dark mode**: Ensure the calm atmosphere translates to dark backgrounds
3. **Reading sessions**: Consider adding estimated reading time to search results and sidebar
4. **Skip-to-content link**: Add a visible skip link for keyboard users improves the ethical atmosphere
5. **Dashboard polish**: The dashboard pages (files, folders, conversions, settings) with "قريباً" placeholders break the coherence — either remove or fill them

## Summary

| Quality                 | Score     | Notes                                         |
| ----------------------- | --------- | --------------------------------------------- |
| Emotional consistency   | ✅ Strong | Calm, scholarly, intentional throughout       |
| Tone coherence          | ✅ Strong | Appropriate voice per surface                 |
| Intellectual atmosphere | ✅ Strong | Cumulative knowledge architecture             |
| Calmness preservation   | ✅ Strong | No invasive elements                          |
| Accessibility maturity  | ⚠️ Good   | Needs skip-link, heading hierarchy in Phase 3 |
| Visual polish           | ✅ Strong | Systematic refinements applied                |
