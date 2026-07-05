# Design System — مَستَندات ابنُ الأزهر

## Product Context
- **What this is:** Arabic-first document processing platform for Azhar students
- **Who it's for:** Students, teachers, supervisors at Al-Azhar
- **Space/industry:** Arabic academic / Islamic education technology
- **Project type:** Web app with public landing + authenticated dashboard

## Aesthetic Direction
- **Direction:** المخطوطات الرقمية (Digital Manuscripts)
- **Decoration level:** Intentional — geometric patterns and textures reinforce manuscript metaphor
- **Mood:** Scholarly authority meets modern clarity. Warm like aged paper, precise like geometric illumination.

## Typography
- **Display/Hero:** Amiri — Arabic serif with manuscript DNA. Section headings, hero text, page titles.
- **Body/UI:** Cairo — Clean Arabic sans-serif. Body text, navigation, buttons, form labels.
- **Code:** Fira Code — Monospace with ligatures.
- **Scale:** Tailwind default (text-xs through text-9xl), no custom modular scale needed.

## Color
- **Approach:** Restrained — color is rare and meaningful
- **Primary Green:** `#16A34A` — Actions, links, active states
- **Heritage Gold:** `#CA8A04` — Accents on key elements only (dividers, selected states, badges)
- **Paper White:** `#FFFDF7` — Warm off-white background (not pure white)
- **Ink Dark:** `#1F2937` — Body text (deep gray, not pure black)
- **Manuscript Brown:** `#92400E` — Secondary accent, code highlights
- **Neutrals:** Warm gray scale from `#F5F0E8` (lightest) to `#374151` (darkest)
- **Dark mode:** Reduce saturation 10-20%, surfaces shift to warm dark grays

## Spacing
- **Base unit:** 8px
- **Density:** Spacious — generous margins like manuscript pages
- **Scale:** 2xs(4) xs(8) sm(12) md(16) lg(24) xl(32) 2xl(48) 3xl(64) 4xl(96)

## Layout
- **Approach:** Grid-disciplined (dashboard) + editorial flair (landing)
- **Grid:** 12-column responsive
- **Max content width:** 1200px
- **Border radius:** sm(4px) md(8px) lg(12px) full(9999px)

## Motion
- **Approach:** Intentional — text feels written, not popped
- **Easing:** ease-out (enter), ease-in (exit), ease-in-out (move)
- **Duration:** micro(50-100ms) short(150-250ms) medium(250-400ms) long(400-700ms)

## Decorative Elements
- **Geometric stars:** Used as section dividers on landing, not wallpaper
- **Paper texture:** Subtle grain on card surfaces (CSS background)
- **Gold shimmer:** Brief highlight on hover for key interactive elements

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-05 | Digital Manuscripts direction | Islamic manuscript illumination adapted for digital. Heritage integrated into DNA, not bolted on. |
| 2026-07-05 | Paper-warm background | Distinctive from generic white SaaS. Comfortable reading. Heritage resonance. |
| 2026-07-05 | Gold as living accent | Rare = precious. Used on selected states and key dividers only. |
| 2026-07-05 | Amiri for display | Instant heritage authority. Immediately recognizable as Al-Azhar. |
