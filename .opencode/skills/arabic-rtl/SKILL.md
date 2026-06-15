---
name: arabic-rtl
description: Arabic-first and RTL-first UI guidelines for Ibn Al-Azhar Docs
---

## What I Do

Enforce Arabic-first and RTL-first design principles across all UI components.

## When to Use Me

- Creating or modifying any UI component
- Reviewing layout code
- Checking CSS/Tailwind classes
- Auditing accessibility

## Guidelines

### Arabic-First

- Default UI text is Arabic
- Error messages in Arabic
- Comments in Arabic
- English is secondary (for switching)

### RTL-First

- Root element: `dir="rtl"` and `lang="ar"`
- Use Tailwind logical properties: `ms-` not `ml-`, `me-` not `mr-`
- Use `start`/`end` not `left`/`right` in flex/grid
- Icons that indicate direction must flip in RTL
- Scrollbars and overflow work correctly in RTL

### Font

- Primary: Cairo (Google Fonts)
- Load with `next/font/google`
- Apply to `body` and all text elements

### Brand Colors

- Primary Green: `#16A34A` (green-600)
- Heritage Gold: `#CA8A04` (yellow-600)
- Dark Text: `#1F2937` (gray-800)
- Pure White: `#FFFFFF`
