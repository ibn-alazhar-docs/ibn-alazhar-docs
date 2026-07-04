# Code Style Guidelines — Ibn Al-Azhar Docs

## 1. TypeScript & Typing

- **Strict Typing:** Never use `any`. Use `unknown` for unverified data and `instanceof Error` for error catching.
- **Interfaces over Types:** Prefer `interface` over `type` for object definitions unless unions/intersections are strictly required.
- **Exporting:** Use named exports exclusively (except for Next.js pages/layouts where default exports are required by the framework).

## 2. Naming Conventions

- **Variables & Functions:** `camelCase` (e.g., `handleUpload`, `documentList`).
- **Components & Classes:** `PascalCase` (e.g., `DocumentRow`, `FileUpload`).
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `MAX_FILE_SIZE`, `DEFAULT_LOCALE`).
- **Files:** `kebab-case` for all files (e.g., `document-table.tsx`, `auth-guards.ts`).

## 3. Formatting & Linting

- **Prettier:** Code formatting is strictly enforced via Prettier. Run `pnpm format:write` before committing.
- **ESLint:** Zero-tolerance policy (`--max-warnings 0`). All warnings must be resolved, not ignored.

## 4. UI & Components

- **Tailwind v4:** Use Tailwind CSS for styling. Avoid writing custom CSS unless absolutely necessary.
- **RTL Support:** Use logical CSS properties (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`) instead of physical ones (`ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`) to ensure perfect Arabic RTL alignment.
- **Translations:** No hardcoded text in UI components. Use `next-intl` (e.g., `useTranslations()`).

## 5. Backend & Database

- **Prisma:** Always run `pnpm db:generate` after modifying `schema.prisma`.
- **Soft Deletes:** Respect `deletedAt` filters in queries. Do not permanently delete records unless intended.
- **Error Handling:** Use standardized error responses and avoid leaking sensitive backend details to the client.
