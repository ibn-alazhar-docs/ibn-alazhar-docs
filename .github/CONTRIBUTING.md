# Contributing to Ibn Al-Azhar Docs

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce**
- **Expected vs actual behavior**
- **Screenshots** (if applicable)
- **Environment details** (OS, Node version, Browser)

### Suggesting Features

Feature requests are welcome! Please:

- Use a clear and descriptive title
- Provide detailed description of the feature
- Explain why this feature would be useful
- Include mockups or examples if possible

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Follow the code style** (run `pnpm check` before committing)
3. **Write meaningful commit messages** (see Commit Guidelines below)
4. **Add tests** if you're adding functionality
5. **Update documentation** if you're changing behavior
6. **Ensure CI passes** before requesting review

#### Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: bug fix
docs: documentation changes
style: formatting, missing semi colons, etc
refactor: code restructuring
test: adding tests
chore: maintenance tasks
```

Examples:
```
feat: add status filters to conversions page
fix: resolve sidebar performance issue
docs: update deployment guide
```

#### Branch Naming

```
feat/feature-name
fix/bug-description
docs/documentation-update
refactor/code-improvement
```

## Development Setup

### Prerequisites

- Node.js 22+
- pnpm 10.33.4+
- Docker & Docker Compose
- PostgreSQL 16+

### Local Setup

```bash
# Clone repository
git clone https://github.com/yourusername/Ibn_Al_Azhar_Docs.git
cd Ibn_Al_Azhar_Docs

# Install dependencies
pnpm install

# Start infrastructure
./ibn.sh dev-infra

# Start development server
pnpm --filter @ibn-al-azhar-docs/web dev
```

### Running Tests

```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint

# Unit tests
pnpm test

# Integration tests (requires services)
pnpm test:integration

# E2E tests
pnpm test:e2e

# Full CI pipeline
pnpm ci:all
```

## Code Style

### TypeScript

- Use strict TypeScript (`strict: true`)
- Prefer `interface` over `type` for object shapes
- Use `unknown` instead of `any`
- Always define return types for functions

### Naming Conventions

- **Files:** `kebab-case.ts`
- **Components:** `PascalCase.tsx`
- **Functions/Variables:** `camelCase`
- **Constants:** `UPPER_SNAKE_CASE`
- **Types/Interfaces:** `PascalCase`

### React Components

- Use functional components with hooks
- Memoize expensive computations with `useMemo`
- Memoize callbacks with `useCallback`
- Use `React.memo()` for performance-critical components

### Code Formatting

We use Prettier and ESLint:

```bash
# Format code
pnpm format:write

# Check formatting
pnpm format:check

# Fix linting issues
pnpm lint --fix
```

## Project Structure

```
Ibn_Al_Azhar_Docs/
├── apps/
│   └── web/                 # Next.js application
│       ├── src/
│       │   ├── app/        # App Router pages
│       │   ├── core/       # Business logic
│       │   ├── domain/     # Domain types
│       │   ├── ui/         # UI components
│       │   └── state/      # Client state
├── packages/
│   ├── database/           # Prisma schema
│   ├── pipeline/           # OCR pipeline
│   └── shared/             # Shared utilities
├── workers/                # Background workers
├── tests/                  # Test suites
├── docs/                   # Documentation
└── specs/                  # Specifications
```

## Documentation

- Keep README.md up to date
- Document new features in `docs/`
- Add JSDoc comments for public APIs
- Update TypeScript interfaces

## Review Process

1. **Self-review** your code before requesting review
2. **Run all checks** (`pnpm ci:all`)
3. **Request review** from maintainers
4. **Address feedback** promptly
5. **Squash commits** if requested

## Questions?

- Open an issue for bugs or feature requests
- Check existing documentation in `docs/`
- Review [DEPLOYMENT_READY.md](../DEPLOYMENT_READY.md)

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License.

---

Thank you for contributing to Ibn Al-Azhar Docs! 🚀
