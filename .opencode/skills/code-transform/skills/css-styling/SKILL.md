---
name: css-styling
description: "Choose and enforce a CSS architecture: Tailwind utility-first, CSS Modules, CSS-in-JS (emotion/styled-components), or Sass. Owns design tokens, dark mode, responsive strategy, container queries, and CSS performance (purge, critical CSS, font-display). Triggers in Phase 4 (styling audit), Phase 6 (any UI commit), Phase 9 (visual acceptance)."
license: MIT
metadata:
  version: "1.0"
  author: OmniProject AI
  category: frontend
---

# CSS Styling

> Owns the styling architecture. Decides Tailwind vs CSS-in-JS vs CSS Modules vs Sass, enforces design tokens, dark mode, and CSS performance budgets. Coordinates with `frontend-bridge` (taste), `web-design` (principles), `accessibility` (contrast), and `i18n` (RTL).

## When to Use

| Phase | Trigger | Why |
|-------|---------|-----|
| Phase 4 — AUDIT | Dimension 9 (Frontend Architecture) flags inconsistent styling | Pick one architecture, consolidate |
| Phase 6 — EXECUTE | Every UI commit (Visual Guard) | Diff before/after CSS bundle |
| Phase 9 — ACCEPTANCE | "Dark mode works", "Mobile looks right" | Prove styling across themes + viewports |
| Phase 11 — ROLLOUT | Lighthouse CSS coverage check | Critical CSS inlined, unused CSS < 10% |

**Do NOT use this sub-skill for:** taste/aesthetic decisions (use `frontend-bridge`), visual hierarchy (use `web-design`), or running browsers (use `browser-launcher`). This sub-skill picks the *system* and enforces the *rules*.

## What It Does

1. Detects the existing styling system (parses `package.json`, `tailwind.config.*`, `postcss.config.*`, `*.module.css`, `styled-components` imports)
2. If multiple systems coexist: proposes consolidation per the Decision Tree (do not silently mix)
3. Establishes design tokens as the single source of truth (CSS custom properties)
4. Enforces dark mode via `prefers-color-scheme` + class-based override (`.dark`)
5. Enforces responsive strategy: Tailwind breakpoints OR container queries for component-level responsiveness
6. Enforces CSS performance budgets: purge unused, inline critical CSS, `font-display: swap`, subset fonts
7. Lints via Stylelint + the project's chosen tool's own linter (e.g. `eslint-plugin-tailwindcss`)
8. Routes RTL work to `i18n` and contrast fixes to `accessibility`

## Integration Contract

```
INPUT:
  - project_root: string (required)
  - target: file|directory (required)
  - action: audit|install|configure|lint|build (default audit)
  - preferred: tailwind|css-modules|css-in-js|sass (optional — forces choice)
  - dark_mode: bool (default true)
  - tokens_path: string (default "src/styles/tokens.css")

OUTPUT (JSON to stdout):
  {
    "status": "ok|error",
    "current_system": "tailwind|css-modules|css-in-js|sass|mixed",
    "recommended": "tailwind",
    "tokens": {"color": 24, "spacing": 8, "type": 12, "radius": 4, "shadow": 5},
    "dark_mode": {"supported": true, "strategy": "class"},
    "bundle_size_kb": 18.4,
    "unused_css_pct": 2.1,
    "critical_css_inlined": true,
    "violations": [
      {"rule": "no-important", "file": "Button.tsx", "line": 42, "fix": "increase specificity or use token"}
    ],
    "report_path": "/tmp/ct-<uuid>/css-audit.html"
  }

SIDE EFFECTS:
  - May install devDependencies (tailwindcss, postcss, autoprefixer, stylelint)
  - Writes tokens.css / tailwind.config.ts / postcss.config.js
  - Modifies source files to replace magic values with tokens
```

## CLI

```bash
# Audit existing styling system
python3 scripts/frontend_agent.py css --action audit --target ./src

# Install + configure Tailwind on a fresh Next.js project
python3 scripts/frontend_agent.py css --action install --preferred tailwind --dark-mode

# Lint one component
python3 scripts/frontend_agent.py css --action lint --target ./src/components/Button.tsx

# Build with critical-CSS inlining + purge report
python3 scripts/frontend_agent.py css --action build --target ./src --report /tmp/css-build.json
```

## Decision Tree (autonomous)

```
Q: Is this a new project (no styling installed)?
  YES → Q: Does the team use Tailwind already (check other repos)?
          YES → install Tailwind + tokens.css (utility-first wins for velocity)
          NO  → Q: Is it a component library (published to npm)?
                  YES → CSS Modules (zero runtime, scoped, framework-agnostic)
                  NO  → Tailwind (best DX, smallest bundles after purge)
  NO  → Q: What's already installed?
          TAILWIND  → keep, enforce tokens, add `eslint-plugin-tailwindcss`
          CSS-MODULES → keep, add `@tokens` import, add Stylelint
          CSS-IN-JS → Q: Server components / RSC in use?
                       YES → MIGRATE to CSS Modules or Tailwind (CSS-in-JS breaks RSC)
                       NO  → keep emotion (preferred over styled-components for tree-shaking)
          SASS      → keep only if legacy; otherwise migrate to Tailwind + tokens
          MIXED     → pick ONE (default: Tailwind), file migration plan, run it
  Q: Is there a design system?
    YES → tokens.css is the contract; Tailwind config references tokens via `theme.extend.colors = {brand: 'var(--color-brand-500)'}`
    NO  → generate tokens from `web-design` palette output
```

## Patterns

### Design tokens (single source of truth)
```css
:root {
  --color-bg: #fafafa;        /* never #fff */
  --color-text: #0a0a0a;      /* never #000 */
  --color-brand-500: #6366f1;
  --space-1: 0.25rem;  --space-2: 0.5rem;  --space-4: 1rem;
  --space-6: 1.5rem;   --space-8: 2rem;
  --radius-sm: 4px; --radius-md: 8px; --radius-lg: 12px;
  --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.05);
  --motion-fast: 150ms ease-out;
  --motion-normal: 250ms ease-out;
}
.dark {
  --color-bg: #0a0a0a;
  --color-text: #fafafa;
  --color-brand-500: #818cf8;
}
```
Tailwind config: `colors: { brand: 'var(--color-brand-500)' }` — utilities like `bg-brand-500` resolve to the token, which flips automatically in dark mode.

### Dark mode
- `prefers-color-scheme` for OS default
- `.dark` class on `<html>` for explicit toggle (persist in `localStorage`, apply before paint to avoid FOUC)
- All colors via tokens → dark mode "just works" when tokens flip

### Responsive
- Tailwind breakpoints: `sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536`
- Container queries (`@container`) for component-level responsiveness (cards in a sidebar vs main grid)
- Never use fixed `px` widths for layout — use `max-w-*` + `flex`/`grid`

### Performance
- **Purge**: Tailwind `content: ['./src/**/*.{ts,tsx}']` — drops bundle from ~3MB to ~15KB
- **Critical CSS**: inline above-the-fold CSS via `critters` (Next.js built-in) or `beastcss`
- **Fonts**: `font-display: swap`, preload `woff2`, subset to latin + latin-ext
- **No render-blocking**: async load non-critical CSS, or use `@layer` for low-priority rules

## Failure Modes & Recovery

| Symptom | Cause | Recovery |
|---------|-------|----------|
| Tailwind classes not generated | `content` glob wrong | Point at actual source files, rebuild |
| Dark mode flashes white on load | Class applied after hydration | Inline script in `<head>` reads `localStorage` before paint |
| `!important` everywhere | Specificity wars | Refactor to tokens + single source of truth; ban `!important` via Stylelint |
| CSS-in-JS bloats RSC bundle | styled-components in server components | Migrate to CSS Modules or Tailwind |
| 200KB+ CSS bundle | No purge / `content` includes node_modules | Tighten `content` glob, re-run `tailwind --purge` |
| FOIT (invisible text) | `font-display: block` or missing | Set `font-display: swap`, preload `woff2` |

## Self-Healing Loop

When a CSS violation is found:
1. Identify the rule (`no-important`, `no-magic-color`, `no-inline-style`, `use-token`)
2. Apply the mechanical fix (replace `#6366f1` with `var(--color-brand-500)`, replace `style={{color:'red'}}` with `className="text-error"`)
3. Re-lint the file
4. If the fix would change visual output → capture before/after screenshot via `screenshot-capture`, route to `frontend-bridge` for taste check
5. Max 3 self-heal attempts per violation, then escalate to manual review

## Quality Gates (enforced before "styling done")

- [ ] Zero `!important` outside vendor overrides
- [ ] Zero inline `style={{}}` except for genuinely dynamic values (e.g. `--x` from drag)
- [ ] Zero hardcoded colors outside `tokens.css` (Stylelint `color-no-hex` outside tokens)
- [ ] Dark mode: every color token has a `.dark` counterpart
- [ ] Lighthouse "Unused CSS" < 10KB on mobile
- [ ] Lighthouse "Avoid enormous network payloads" passes for CSS
- [ ] All fonts use `font-display: swap` (or `optional` for non-critical)
- [ ] Stylelint passes with project config (no warnings)

## Tools

- **Tailwind CSS** — utility-first, default for new projects (with `tailwindcss-animate`, `eslint-plugin-tailwindcss`)
- **PostCSS** — pipeline (`autoprefixer`, `postcss-preset-env`, `cssnano` for prod)
- **CSS Modules** — scoped, zero-runtime, best for component libraries
- **emotion** — preferred CSS-in-JS (tree-shakeable); avoid `styled-components` in RSC
- **Sass** — legacy only; new work uses PostCSS + tokens
- **Stylelint** — linter, configured with `stylelint-config-standard` + `stylelint-no-unsupported-browser-features`
- **critters** / **beastcss** — critical CSS inlining
- **fonttools** / **glyphhanger** — font subsetting

## Hard Rules

1. **Never use `!important`** except to override third-party CSS that you cannot patch. Every `!important` requires an inline comment explaining why.
2. **Never use inline `style={{}}`** except for genuinely dynamic values (computed at runtime from user input, drag position, measured dimensions). Static values belong in classes.
3. **Always use design tokens** for color, spacing, radius, shadow, motion. Magic numbers (`padding: 14px`, `color: #6366f1`) are forbidden outside `tokens.css`.
4. **Always support dark mode.** Every color token must have a `.dark` counterpart. A PR that adds a light-only color is rejected.
5. **Never ship un-purged CSS.** `content` glob must point at real source files. Final bundle > 50KB (gzip) on mobile is a blocker.
6. **Always set `font-display: swap` (or `optional`) on `@font-face`.** FOIT is forbidden; FOUT is acceptable.
7. **Never mix styling systems** in one project. Pick one (Tailwind default) and migrate the rest. Mixed systems confuse every contributor and bloat bundles.
8. **Always use logical properties** (`margin-inline-start`, `padding-block-end`) so RTL "just works" when `i18n` flips direction.
9. **Always inline critical CSS** for above-the-fold content. Defer the rest.
10. **Never reference Tailwind classes in strings** built via concatenation (`'bg-' + variant`). Use the full class name so the purge tool sees it (`'bg-red-500'`), or use `clsx` with a static map.
