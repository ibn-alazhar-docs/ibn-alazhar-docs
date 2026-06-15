# UX Review — Phase 1B Vertical Slice

> **Review Date:** 2026-05-24  
> **Scope:** Landing page (Hero, Mission, KnowledgeAreas, ReadingPreview, Principles, CTASection)

---

## 1. Visual Rhythm

The page flows as a single vertical narrative with alternating backgrounds:

| Section        | Background                  | Border | Purpose                     |
| -------------- | --------------------------- | ------ | --------------------------- |
| Hero           | White + radial green glow   | None   | Visual anchor, brand impact |
| Mission        | White                       | Top    | Calm statement of purpose   |
| KnowledgeAreas | Off-white (`neutral-50/50`) | Top    | Visual break, card grid     |
| ReadingPreview | White                       | Top    | Return to calm reading      |
| Principles     | Off-white (`neutral-50/50`) | Top    | Visual break, card grid     |
| CTASection     | White + gradient            | Top    | Final call to action        |

This alternating pattern creates a natural pulse — light/dark/light/dark — that guides the reader down the page without explicit navigation.

## 2. Typography Rhythm

```
Hero h1:        7xl (mobile: 5xl)  extrabold    ←  Largest, most impact
Hero subtitle:  xl (mobile: lg)    regular     ←  Leading down
Section label:  xs                 bold+uppercase  ←  Eyebrow
Mission body:   xl (mobile: lg)    regular     ←  Comfortable reading
Card title:     lg                 bold        ←  Clear hierarchy
Card body:      sm                 regular     ←  Secondary info
CTA title:      4xl (mobile: 3xl)  extrabold   ←  Strong close
```

## 3. Spacing Rhythm

All sections use `py-24` (6rem/96px) vertical padding, consistent with the design system's generous whitespace philosophy. Content within sections uses `gap-6` between title/eyebrow and content, with `gap-4` for card internal spacing.

## 4. Interactive Patterns

| Element         | Pattern           | Feedback                                         |
| --------------- | ----------------- | ------------------------------------------------ |
| CTA Buttons     | Solid, rounded-xl | `hover:shadow-md`, `hover:bg-*`                  |
| Nav link        | Text only         | `hover:text-primary-600` color shift             |
| Knowledge cards | Bordered card     | `hover:border-primary-200/60`, `hover:shadow-sm` |
| Focus visible   | All interactive   | 2px primary-500 outline + offset                 |

## 5. Accessibility Walkthrough

- **Keyboard navigation**: All links reachable via Tab, visible focus rings
- **Screen reader flow**: Content reads in logical order, decorative elements hidden
- **Color contrast**: Primary-600 (#16A34A) on white passes WCAG AA for large text
- **Reduced motion**: All animations respect `prefers-reduced-motion`
- **Zoom**: Layout handles 200% zoom without horizontal scroll
- **RTL**: Full support via dir="rtl" on html element

## 6. Responsive Behavior

| Breakpoint          | Changes                                                               |
| ------------------- | --------------------------------------------------------------------- |
| <640px (mobile)     | Hero h1: 5xl→4xl, single-column grids, smaller card padding           |
| 640-1023px (tablet) | KnowledgeAreas: 2-column grid, Principles: 2-column grid              |
| 1024px+ (desktop)   | KnowledgeAreas: 4-column grid, max-width containers limit line length |

## 7. Content Design Notes

- **Eyebrow labels** (`رسالتنا`, `مجالات المعرفة`, `منهجنا`): Small, uppercase, pill-shaped badges with green dot — creates a consistent section identifier
- **Blockquote in Mission**: Gold-bordered right-aligned quote anchors the vision statement visually and conceptually
- **Numbered Principles**: The `01`, `02`, `03`, `04` numbering creates a systematic feel without being a literal ordered list; subtle gradient backgrounds differentiate each
- **CTA**: Dark button (`neutral-900`) instead of green — creates contrast against the light gradient background and signals finality

## 8. UX Principles Applied

1. **Progressive disclosure**: Hero → Mission → Details → Call to action
2. **Visual hierarchy**: Size, weight, color, and spacing communicate importance
3. **Consistency**: Identical eyebrow pattern, card pattern, spacing across sections
4. **Accessibility-first**: Semantic HTML, ARIA, focus management
5. **Typography-driven**: Content is the interface; no decorative overload
6. **Subtle motion**: Purposeful entry animations on hero, none elsewhere
