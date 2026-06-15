# Editorial Style Guide — دليل الأسلوب التحريري

> **Phase:** 2A — Editorial + Authoring System  
> **Status:** Approved  
> **Last Updated:** 2026-05-24

---

## 1. Purpose

Define the tone, formatting, readability, heading structure, linking, citation, and callout conventions for all content in Ibn Al-Azhar Docs.

Consistency is not about limiting voice — it is about ensuring every document meets a baseline of scholarly quality and reader trust.

---

## 2. Tone and Voice

### 2.1 Core Tone

| Attribute      | Application                                                     |
| -------------- | --------------------------------------------------------------- |
| **Scholarly**  | Precise terminology, evidence-based claims, measured assertions |
| **Clear**      | Accessible to a 12th-grade Azhari student, not just specialists |
| **Respectful** | Honoring differing scholarly opinions (ikhilaf)                 |
| **Calm**       | No hype, no exaggeration, no marketing language                 |
| **Direct**     | Active voice, clear subject, concise expression                 |

### 2.2 Tone Prohibitions

| Prohibited                                 | Instead Use                                    |
| ------------------------------------------ | ---------------------------------------------- |
| Marketing speech ("الأفضل", "الأقوى")      | Measured comparison ("من أبرز", "يتميز بـ")    |
| Absolutes ("دائماً", "أبداً", "never")     | Qualified statements ("في الغالب", "عادةً")    |
| Casual language ("حلو", "رائع", "awesome") | Scholarly register ("ممتاز", "جيد", "notable") |
| Sarcasm or humor                           | Direct, respectful tone                        |
| First-person plural overuse ("نحن نعتقد")  | Impersonal constructions ("يُعتقد أن")         |

### 2.3 Scholarly Register

Arabic documents use **الفصحى** (Modern Standard Arabic) with classical scholarly vocabulary where appropriate:

| Casual                      | Scholarly           |
| --------------------------- | ------------------- |
| "بكلامه"                    | "في قوله"           |
| "بعدين"                     | "ثم"                |
| "لكن" (as sentence starter) | "غير أن" / "بيد أن" |
| "جدا"                       | "شديداً" / "كبيراً" |

English documents use formal academic English:

| Casual                 | Scholarly                    |
| ---------------------- | ---------------------------- |
| "a lot of"             | "a significant number of"    |
| "things"               | "elements" / "aspects"       |
| "really"               | "substantially" / "markedly" |
| "but" (sentence start) | "however" / "nevertheless"   |

---

## 3. Formatting Standards

### 3.1 Headings

| Level | Format                                 | Notes                                 |
| ----- | -------------------------------------- | ------------------------------------- |
| H1    | From frontmatter title                 | Not written in MDX                    |
| H2    | `## Title Case` (EN) / `## عنوان` (AR) | Major sections                        |
| H3    | `### Title Case` (EN)                  | Subsections                           |
| H4    | `#### Title Case` (EN)                 | Rare — only for deeply nested content |

- No colon at end of headings
- No period at end of headings
- No stacked headings (two headings without body text between them)
- Heading levels must not skip (H2 → H4 is prohibited)

### 3.2 Bold and Italic

| Style             | Usage                                                                    |
| ----------------- | ------------------------------------------------------------------------ |
| **Bold**          | Key terms on first mention, callout labels                               |
| _Italic_          | Foreign terms (EN: Arabic loanwords, AR: English loanwords), book titles |
| ~~Strikethrough~~ | Never use                                                                |

### 3.3 Emphasis Rules

- One bolded term per paragraph maximum
- Do not bold entire sentences or paragraphs
- Use bold for definition-style introductions only

---

## 4. Readability

### 4.1 Sentence Length

| Language | Max Words | Ideal |
| -------- | --------- | ----- |
| Arabic   | 35        | 20-28 |
| English  | 30        | 15-22 |

### 4.2 Paragraph Length

| Language | Max Sentences | Ideal |
| -------- | ------------- | ----- |
| Arabic   | 6             | 3-5   |
| English  | 6             | 3-5   |

### 4.3 Document Length

| Metric       | Min   | Ideal    | Max    |
| ------------ | ----- | -------- | ------ |
| Sections     | 3     | 5-8      | 15     |
| Reading time | 3 min | 5-10 min | 30 min |
| Words (AR)   | 300   | 800-2000 | 5000   |
| Words (EN)   | 250   | 700-1800 | 4500   |

---

## 5. Linking Conventions

### 5.1 Internal Links

- Use relative paths: `/ar/docs/introduction/doc-001-platform-overview`
- Link text should describe the target: `راجع [منصة ابن الأزهر دوكس](/ar/docs/introduction/doc-001-platform-overview)`
- Do not use "هنا" or "click here" as link text

### 5.2 External Links

- Use full URLs with HTTPS
- Prefer primary sources over secondary sources
- Indicate external link with a note: `[المكتبة الشاملة](https://example.com) (رابط خارجي)`
- Verify links are stable (prefer permanent archives)

### 5.3 Cross-Document References

When referencing another document within the platform, use the relationship system:

```yaml
# In frontmatter:
related: "doc-002"
prerequisites: "doc-001"
```

Then use the inline link in the body for context:

```mdx
لمزيد من التفاصيل حول المنهجية، راجع [منهجية العمل](/ar/docs/introduction/doc-002-methodology-principles).
```

---

## 6. Citation Conventions

### 6.1 Inline Citations

| Style              | Example                                             |
| ------------------ | --------------------------------------------------- |
| Arabic (classical) | قال الإمام الشافعي رحمه الله: "..." (الأم، ج1، ص15) |
| Arabic (modern)    | (الشافعي، 2020، ص 15)                               |
| English (academic) | (Al-Shafi'i, 2020, p. 15)                           |

### 6.2 Block Quotes

For quotes longer than 2 sentences:

```mdx
> "نص الاقتباس الطويل الذي يتجاوز سطرين أو ثلاثة، ويحتاج
> إلى فقرة مستقلة لعرضه بشكل مناسب." — الإمام الغزالي، إحياء علوم الدين
```

### 6.3 Source Attribution

All significant claims should have a source. Sources go in the `source` frontmatter field for the document as a whole, or inline for specific claims.

---

## 7. Callout Conventions

See `docs/AUTHORING_TOOLKIT.md` §4 for the full callout system.

| Callout Type        | When to Use                          | Frequency Limit |
| ------------------- | ------------------------------------ | --------------- |
| **Info** (blue)     | Side notes, helpful context          | 2 per doc       |
| **Warning** (amber) | Cautions, limitations, common errors | 2 per doc       |
| **Success** (green) | Positive examples, applications      | 2 per doc       |
| **Error** (red)     | Critical corrections, misconceptions | 1 per doc       |
| **Quote** (gray)    | Extended quotations                  | 1 per doc       |

---

## 8. Terminology Consistency

### 8.1 Fixed Terms

These terms must be used consistently across all documents:

| AR Term         | EN Term           |
| --------------- | ----------------- |
| ابن الأزهر دوكس | Ibn Al-Azhar Docs |
| المنصة          | The platform      |
| المكتبة         | The library       |
| المستند         | Document          |
| التصنيف         | Category          |
| المسار          | Journey           |
| التيمة          | Theme             |
| المعرف          | ID                |
| الوصفة          | Slug              |

### 8.2 Terminological Precision

| Be Precise                | Not Vague            |
| ------------------------- | -------------------- |
| "الفقه الحنفي"            | "فقه المذهب"         |
| "التفسير بالمأثور"        | "التفسير" (alone)    |
| "أصول الفقه عند الشافعية" | "أصول الفقه" (alone) |

---

## 9. Document-Specific Rules

### 9.1 Introduction Documents

- Must state the scope and importance in the first paragraph
- Should end with a forward-looking statement
- May include a table of scope if covering multiple topics

### 9.2 Methodology Documents

- Must define the methodology before applying it
- Should include concrete examples
- Should mention limitations

### 9.3 Reference Documents

- Must cite the original source
- Should include alternative editions or translations
- Should note the source's scholarly standing

---

## 10. Review Checklist

Before any document moves from Draft → Review:

- [ ] Tone consistent with this guide
- [ ] No prohibited language
- [ ] Heading hierarchy correct
- [ ] Paragraphs within length limits
- [ ] All internal links valid
- [ ] All external links accessible
- [ ] Citation format consistent
- [ ] Callouts used sparingly
- [ ] Terminology matches established glossary
- [ ] No broken frontmatter
- [ ] Both AR and EN versions ready
- [ ] Spelling and grammar checked

---

## 11. Related Documents

- `docs/DOCUMENT_GOVERNANCE.md` — Lifecycle and standards
- `docs/AUTHORING_TOOLKIT.md` — Templates and authoring guides
- `docs/28_TERMINOLOGY_AND_NAMING_STANDARD.md` — Project terminology
- `docs/17_GLOSSARY.md` — Full project glossary
