---
name: ibn-rtl-audit
description: Use this skill when reviewing Arabic UI, layouts, forms, dashboards, navigation, icons, spacing, and responsive behavior.
---

# Ibn Al-Azhar Docs RTL Audit Skill

Review UI for Arabic-first and RTL-first correctness.

## Checks

1. html dir="rtl" for Arabic routes.
2. Arabic text alignment is natural.
3. Icons mirror correctly where needed.
4. Sidebar and navigation direction are correct.
5. Form labels, placeholders, errors, and help text work in Arabic.
6. Spacing uses logical properties where possible.
7. Tables and file lists are readable in RTL.
8. Numbers, dates, file sizes, and mixed Arabic/English text are handled carefully.
9. Loading, empty, error, and success states exist.
10. Mobile layout remains usable in RTL.

## Output

Return:
- RTL status
- Problems
- Recommended code-level fixes
- Accessibility notes
