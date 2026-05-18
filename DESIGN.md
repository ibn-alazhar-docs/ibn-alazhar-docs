# DESIGN.md — Ibn Al-Azhar Docs

## Visual direction

Academic, calm, trustworthy, heritage-modern.

The interface should feel like a serious educational tool built for Arabic study workflows, not a generic AI SaaS dashboard.

## Color system

### Core colors

- Primary Green: #16A34A
- Heritage Gold: #CA8A04
- Dark Text Gray: #1F2937
- Pure White: #FFFFFF

### Usage

- Green is the primary action color.
- Gold is a restrained heritage accent.
- Dark gray is the main text color.
- White and warm neutral surfaces should dominate the UI.
- Avoid pure black backgrounds unless explicitly designing a dark mode surface.
- Avoid purple/blue gradient branding.

## Typography

### Primary Arabic font

Cairo.

### Rules

- Arabic readability is more important than novelty.
- Use clear hierarchy through size, weight, spacing, and color.
- Avoid tiny Arabic text.
- Avoid overusing bold weights.
- Avoid mixing many fonts.
- English text, when needed, should support Arabic content, not dominate it.

## Layout

- RTL-first.
- Mobile-first.
- Calm spacing.
- Clear page hierarchy.
- Avoid dense dashboards.
- Avoid cards inside cards unless there is a strong information architecture reason.
- Use logical CSS properties where possible.

## Components

### Buttons

- Primary buttons use green.
- Secondary buttons are quiet.
- Destructive actions must be visually distinct and confirmed where needed.

### Cards

- Use cards to group meaningful tasks.
- Keep elevation subtle.
- Avoid excessive shadows.

### Forms

- Labels visible.
- Arabic placeholders natural.
- Errors clear and helpful.
- Help text concise.

### File states

Every file-related surface must support:
- Empty state
- Uploading/loading state
- Processing state
- Success state
- Error state
- Permission or access-denied state where relevant

## Motion

- Motion should be subtle and functional.
- No bouncy playful motion.
- Respect reduced motion.
- Use animation to clarify progress, not to impress.

## Icons

- Use icons sparingly.
- Icons must support meaning.
- Directional icons must respect RTL.

## Dark mode

Dark mode should not be a simple inversion.

Use dark gray surfaces, not pure black. Reduce harsh contrast. Keep green and gold slightly restrained.

## Do

- Make Arabic text feel native.
- Make upload and conversion flows obvious.
- Make trust and privacy visible.
- Make every state understandable.
- Keep the design calm and premium.

## Do not

- Do not use generic AI gradients.
- Do not use random glass effects.
- Do not create fake analytics cards.
- Do not center everything.
- Do not over-decorate with Islamic patterns.
- Do not hide important actions behind icons only.
