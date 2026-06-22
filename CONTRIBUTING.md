# Contributing to Ibn Al-Azhar Docs

Welcome! We are excited that you are interested in contributing to **Ibn Al-Azhar Docs**.

## 🚀 Getting Started

1. **Clone the repository:**

   ```bash
   git clone <repo-url>
   cd Ibn_Al_Azhar_Docs
   ```

2. **Install dependencies:**
   We use `pnpm` as our package manager.

   ```bash
   pnpm install
   ```

3. **Environment Setup:**
   Copy the example environment file and fill in your local details.

   ```bash
   cp .env.example .env
   ```

4. **Start Local Infrastructure:**
   Use the provided helper script to spin up the Docker dependencies (PostgreSQL, Redis, MinIO).

   ```bash
   ./ibn.sh dev-infra
   ```

5. **Run Migrations & Seed Data:**

   ```bash
   pnpm db:generate
   pnpm db:migrate
   pnpm db:seed
   ```

6. **Start the Development Server:**
   ```bash
   pnpm --filter @ibn-al-azhar-docs/web dev
   ```

## 🛠️ Development Workflow

- **Branching:** Create a new branch for your feature or bugfix using the convention `feat/your-feature-name` or `fix/your-fix-name`.
- **Commit Messages:** Follow [Conventional Commits](https://www.conventionalcommits.org/) — use `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:` prefixes.
- **Code Style:** Ensure your code adheres to our guidelines outlined in `CODE_STYLE.md`.
- **Testing:** We use Vitest and Playwright. Tests require running infrastructure — start it with `./ibn.sh dev-infra` first, then run `pnpm test`.
- **CI/CD:** Before pushing, always run `pnpm ci:all` locally to ensure Linting, Typechecking, and Tests pass cleanly.

## 📝 Submitting a Pull Request

1. Ensure all tests and linting checks pass.
2. Provide a clear and descriptive title for your Pull Request.
3. Link any relevant issues.
4. Describe the changes you made and any context that would help reviewers.
5. A project maintainer will review your code. Please be responsive to feedback.

Thank you for helping us build the best document platform for Al-Azhar students!
