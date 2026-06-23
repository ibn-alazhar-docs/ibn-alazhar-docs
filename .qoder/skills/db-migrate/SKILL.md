---
name: db-migrate
description: Safely run Prisma database migrations — check status, generate client, validate schema. Use after modifying schema.prisma or when applying pending migrations. Triggers — "db migrate", "run migration", "prisma migrate", "database migration", "apply migrations", "schema changed".
---

Safely manage Prisma database migrations with pre-flight checks.

## Pre-flight checks

1. **Verify infra is running**: Check that Postgres is reachable on port 5433 (`./ibn.sh dev-infra` if not).

   ```bash
   docker ps --filter "name=postgres" --format "{{.Status}}" | grep -q "healthy" || echo "WARNING: Postgres not running. Start with: ./ibn.sh dev-infra"
   ```

2. **Check for schema changes**: `git diff --name-only | grep prisma/schema.prisma`
   - If schema.prisma was NOT modified, this is likely just applying existing migrations — proceed to step 3.
   - If schema.prisma WAS modified, confirm the changes with the user before migrating.

3. **Check migration status**:
   ```bash
   npx prisma migrate status
   ```

## Migration steps

4. **Generate Prisma client** (always safe, always needed after schema changes):

   ```bash
   pnpm db:generate
   ```

5. **Apply migrations** (dev environment):

   ```bash
   pnpm db:migrate
   ```

   This runs `prisma migrate dev` which:
   - Creates new migration files for schema changes
   - Applies pending migrations to the database
   - Resets the database if drift is detected (asks first)

6. **Seed if reset occurred**:
   ```bash
   pnpm db:seed
   ```

## Post-migration validation

7. **Verify typecheck still passes** (schema changes can break types):

   ```bash
   pnpm typecheck
   ```

8. **Report**: Migration status, files created/modified, whether seed was needed, and typecheck result.

## Warnings

- **Never run `prisma migrate deploy` in dev** — use `migrate dev` for development.
- **Never force-reset without asking** — if Prisma detects drift, ask the user before resetting.
- **Always generate client after schema changes** — consumers import from `@prisma/client` which is auto-generated.
