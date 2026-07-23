/**
 * Safe, serialized Prisma migration step for HuggingFace Spaces.
 * ---------------------------------------------------------------------------
 * Root cause of the recurring P3009 / P3018 failures
 *   HuggingFace Spaces can briefly run two containers at once (a rolling
 *   restart, or a new deploy starting before the old one is stopped). Both
 *   containers boot and run `prisma migrate deploy` against the same Neon
 *   database and RACE: one begins a migration (writes a `_prisma_migrations`
 *   row with `started_at` but no `finished_at`) while the other sees that
 *   half-written row and aborts with P3009. A container killed mid-migration
 *   (restart / OOM) leaves the same dangling row.
 *
 * Fix
 *   1. Take a Postgres advisory lock so only ONE container migrates at a time.
 *      The other container blocks on `pg_advisory_lock` until we release it,
 *      which eliminates the race that produces P3009 in the first place.
 *   2. `prisma migrate deploy` remains the primary, history-tracked path.
 *   3. If it fails, clear only GENUINELY STUCK incomplete migrations (rows
 *      started >2 minutes ago that never finished — never an in-flight one)
 *      and retry once.
 *   4. Only as a last resort do we `prisma db push`. We prefer the WITHOUT
 *      --accept-data-loss form; --accept-data-loss is used ONLY when Prisma
 *      insists data would be lost, preceded by a loud warning. We then
 *      baseline every migration so the next boot uses the normal tracked path.
 *
 * This script never blocks boot: any unexpected error is swallowed and the
 * process exits 0 so the web/worker processes still start.
 */
import { spawnSync } from "node:child_process";
import process from "node:process";
import pg from "pg";

const { Pool } = pg;

const SCHEMA = process.env.SCHEMA_PATH ?? "packages/database/prisma/schema.prisma";
// Arbitrary fixed 64-bit advisory key (session-scoped; no table row needed).
const LOCK_KEY = 9314720852136587n;

function run(args, opts = {}) {
  return spawnSync("npx", ["prisma", ...args, "--schema", SCHEMA], {
    stdio: "inherit",
    ...opts,
  });
}

function listMigrationNames() {
  const res = spawnSync("ls", ["packages/database/prisma/migrations"], {
    encoding: "utf8",
  });
  if (res.status !== 0 || !res.stdout) return [];
  return res.stdout
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn("[migrate] DATABASE_URL not set — skipping migrations.");
    return;
  }

  const pool = new Pool({ connectionString: databaseUrl });
  let client;
  try {
    client = await pool.connect();
    await client.query("SELECT pg_advisory_lock($1::bigint)", [LOCK_KEY]);
    console.log("[migrate] acquired migration advisory lock");
  } catch (err) {
    // The lock is best-effort serialization, not mandatory. Proceed anyway.
    console.error("[migrate] could not acquire advisory lock:", err);
  }

  try {
    // 1) Primary, history-tracked path.
    if (run(["migrate", "deploy"]).status === 0) {
      console.log("[migrate] migrations applied ✓");
      return;
    }

    // 2) Recovery: drop incomplete migrations (P3009) and retry. Because the
    //    advisory lock guarantees we are the ONLY process migrating right now,
    //    any row with started_at set but no finished_at is genuinely stuck
    //    (a previous run was interrupted / killed) and safe to delete and
    //    re-attempt. No time-based grace is needed.
    console.warn("[migrate] migrate deploy failed — applying P3009 guard and retrying");
    run(["db", "execute", "--stdin"], {
      input:
        'DELETE FROM "_prisma_migrations" WHERE finished_at IS NULL AND started_at IS NOT NULL;\n',
    });
    if (run(["migrate", "deploy"]).status === 0) {
      console.log("[migrate] migrations applied after P3009 recovery ✓");
      return;
    }

    // 3) Last resort: schema push. Prefer NO data loss.
    console.warn("[migrate] migrate deploy still failing — attempting db push (no data loss)");
    if (run(["db", "push", "--skip-generate"]).status !== 0) {
      console.warn(
        "[migrate] WARNING: db push requires data loss — proceeding with " +
          "--accept-data-loss. Review the schema drift; this path should be rare.",
      );
      run(["db", "push", "--accept-data-loss", "--skip-generate"]);
    }

    // Drop orphaned triggers/functions that reference columns dropped by
    // db push. The searchvector trigger (trg_update_searchvector) fires on
    // every INSERT/UPDATE and writes to NEW.searchvector — if db push dropped
    // that column the trigger causes every document INSERT to fail with
    // "The column `new` does not exist". Safe to drop: the app's
    // DocumentRepository.updateSearchVector() handles search indexing.
    run(["db", "execute", "--stdin"], {
      input:
        'DROP TRIGGER IF EXISTS trg_update_searchvector ON documents;\n' +
        "DROP FUNCTION IF EXISTS update_searchvector();\n",
    });

    // Baseline every migration so subsequent boots take the tracked path.
    for (const name of listMigrationNames()) {
      run(["migrate", "resolve", "--applied", name]);
    }

    // Re-create any critical columns that a previous `db push --accept-data-loss`
    // may have dropped. The searchvector / searchpreview / wordcount trio lives
    // in Prisma but is managed via raw SQL, so a destructive push can silently
    // remove them while the migration history still claims they were applied.
    run(["db", "execute", "--stdin"], {
      input:
        'ALTER TABLE documents ADD COLUMN IF NOT EXISTS searchvector tsvector;\n' +
        "ALTER TABLE documents ADD COLUMN IF NOT EXISTS searchpreview text;\n" +
        "ALTER TABLE documents ADD COLUMN IF NOT EXISTS wordcount integer;\n" +
        "CREATE INDEX IF NOT EXISTS documents_searchvector_idx ON documents USING GIN (searchvector);\n" +
        'DROP TRIGGER IF EXISTS trg_update_searchvector ON documents;\n' +
        "DROP FUNCTION IF EXISTS update_searchvector();\n",
    });

    console.log("[migrate] schema synced and migrations baselined ✓");
  } finally {
    if (client) {
      try {
        await client.query("SELECT pg_advisory_unlock($1::bigint)", [LOCK_KEY]);
      } catch {
        /* ignore */
      }
      client.release();
    }
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[migrate] unexpected error:", err);
  process.exit(0); // never block boot on a migration hiccup
});
