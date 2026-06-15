# Code Style

- TypeScript strict — `noUncheckedIndexedAccess`, `noImplicitOverride` enabled
- No `any` — use `unknown` and narrow with type guards
- Named exports over default exports
- `camelCase` for variables/functions, `PascalCase` for components/types, `UPPER_SNAKE_CASE` for constants
- React components are functions (no classes)
- Server Components by default in Next.js App Router; `"use client"` only when needed
- Imports: path aliases (`@/*` → `apps/web/src/*`, `@ibn-al-azhar-docs/pipeline` → `packages/pipeline/src`)
- No comments that restate the obvious; let the code speak
