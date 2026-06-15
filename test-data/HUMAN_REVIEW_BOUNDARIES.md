# Human Review Boundaries

## Purpose

Define explicitly what belongs to automated processing, what requires human assistance, and what must stay fully manual. This prevents scope creep into AI/ML territory and clarifies the deterministic pipeline's limits.

---

## Boundary 1: Fully Automated

These operations MUST be 100% automated with zero human intervention:

| Operation                   | Reason                                          | Current Status |
| --------------------------- | ----------------------------------------------- | -------------- |
| Unicode normalization       | Deterministic, no ambiguity                     | ✅ Implemented |
| Arabic letter normalization | Unicode ranges are fixed                        | ✅ Implemented |
| Control character removal   | Regex on known character ranges                 | ✅ Implemented |
| Tashkeel/tatweel removal    | Unicode ranges are fixed                        | ✅ Implemented |
| Whitespace normalization    | Fixed rules                                     | ✅ Implemented |
| Page number removal         | Pattern matching on known formats               | ✅ Implemented |
| OCR artifact removal        | Regex on known OCR error patterns               | ✅ Implemented |
| Trailing noise stripping    | Regex on non-standard trailing chars            | ✅ Implemented |
| Garbage line filtering      | Ratio-based threshold                           | ✅ Implemented |
| Markdown generation         | Fixed rules (headings → ##, paragraphs → merge) | ✅ Implemented |
| TXT/JSON export             | Fixed format rules                              | ✅ Implemented |
| Metadata generation         | Count-based statistics                          | ✅ Implemented |

---

## Boundary 2: Human-Assisted (Review)

These operations produce AUTOMATED output that a human should REVIEW before publishing:

| Operation                         | Reason                                               | Recommended Review      |
| --------------------------------- | ---------------------------------------------------- | ----------------------- |
| Heading detection                 | False positives possible (especially with OCR noise) | Spot-check headings     |
| Line reconstruction               | Merge errors can change meaning                      | Read first 3 paragraphs |
| Bullet list detection             | Nested or multi-line items may collapse              | Scan list sections      |
| Mixed Arabic/English preservation | Rare edge cases with flipped RTL/LTR                 | Check English terms     |
| Page noise removal                | False positives possible (intentional short lines)   | Verify no content loss  |

### Review Flow

```
Automated output → Human spot-check → Approve/Reject → Re-run if needed
```

### Spot-check Procedure

1. Read headings — do they match the document structure?
2. Read first 3 paragraphs — any merging artifacts?
3. Scan list sections — are bullet items properly separated?
4. Check English terms — any inverted characters?
5. Verify word count — any major content loss?

### Automation for Review

- Headings detected vs expected count (flag if > 20% difference)
- Paragraph continuity score (flag if < 0.80)
- Line count before/after (flag if > 50% reduction)

---

## Boundary 3: Fully Manual

These operations MUST be done by a human, NEVER automated:

| Operation                   | Reason                                     | Alternative               |
| --------------------------- | ------------------------------------------ | ------------------------- |
| Spell-checking Arabic text  | Requires native Arabic speaker + context   | Dictionary pass in future |
| Grammatical correctness     | Requires understanding of Arabic grammar   | None                      |
| Footnote/endnote extraction | Requires semantic understanding            | Manual separation         |
| Table reconstruction        | Requires spatial layout understanding      | Manual formatting         |
| Image captioning            | Cannot be deterministic                    | None                      |
| Content summarization       | Requires comprehension                     | None                      |
| Semantic heading hierarchy  | Chapter vs section depends on context      | User-configured in UI     |
| Curly-quote normalization   | Context-dependent (closing vs opening)     | Manual correction         |
| Footnote content            | Marker-to-content association is ambiguous | Manual linking            |

### Why These Stay Manual

1. **Deterministic constraint**: The pipeline uses ONLY regex and counting — no AI or ML.
2. **Semantic gap**: Arabic morphology and context cannot be handled by patterns alone.
3. **Safety**: Automated grammar/spell checking would introduce errors that look plausible.
4. **Scope**: The pipeline produces "good enough" readable output — perfection is the human's job.

---

## Decision Tree

```
Input text
    │
    ├── Contains Arabic characters? ── No ──→ Empty output (automated)
    │
    ├── Has bidi/control chars? ── Yes ──→ Strip (automated)
    ├── Has page numbers/noise? ── Yes ──→ Filter (automated)
    ├── Has broken ال? ── Yes ──→ Rejoin (automated)
    │
    ├── Has headings? ── Yes ──→ Detect patterns (automated → REVIEW)
    ├── Has line breaks? ── Yes ──→ Reconstruct (automated → REVIEW)
    │
    ├── Has garbled chars? ── Yes ──→ → > 60% Arabic? Yes → Filter garbage (automated)
    │                                           → ≤ 60% Arabic? → Flag "corrupt text layer" (manual OCR needed)
    │
    ├── Has tables/columns? ── Yes ──→ Flag for manual formatting
    ├── Has footnotes? ── Yes ──→ Flag for manual extraction
    │
    └── Output → Human spot-check → Publish
```

## Enforcement

- **Automated gates**: All Boundary 1 operations run unconditionally
- **Warning gates**: Boundary 2 operations log a count for human follow-up
- **Error gates**: Boundary 3 operations NEVER execute — any attempt throws an explicit error
