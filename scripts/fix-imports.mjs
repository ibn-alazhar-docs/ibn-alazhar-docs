#!/usr/bin/env node
/*
 * fix-imports.mjs — import rewriter for the layered refactor (apps/web).
 *
 * The refactor moves many files. Codebase uses BOTH alias imports (@/...) and
 * relative imports (./, ../) to those files. A naive `sed` on @/ aliases leaves
 * relative imports broken (e.g. audit.ts `import { prisma } from "./prisma"`).
 *
 * This tool builds a static move-map (old path -> new alias) from the ORIGINAL
 * tree, then rewrites every import/export specifier — alias OR relative — that
 * resolves to a moved file, replacing it with the new `@/` alias. It is
 * idempotent: running it repeatedly is safe.
 *
 * Usage:
 *   node scripts/fix-imports.mjs --build   # scan ORIGINAL tree, write .move-map.json
 *   node scripts/fix-imports.mjs --apply   # rewrite imports using .move-map.json
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(SCRIPT_DIR, "../apps/web/src");
const MAP_FILE = join(SCRIPT_DIR, ".move-map.json");

// (from, to) relative to apps/web/src. `to` may name an index file.
// Directory moves enumerate every file beneath them.
const MOVES = [
  { from: "lib/backend/prisma.ts", to: "transport/db.ts" },
  { from: "lib/backend/audit.ts", to: "middleware/audit.ts" },
  { from: "lib/backend/request-logger.ts", to: "middleware/request-logger.ts" },
  { from: "lib/backend/auth.ts", to: "middleware/auth.ts" },
  { from: "lib/backend/auth-guards.ts", to: "middleware/auth-guards.ts" },
  { from: "lib/backend/rate-limit.ts", to: "clients/redis/rate-limit.ts" },
  { from: "lib/backend/rate-limit", to: "clients/redis" },
  { from: "lib/backend/services", to: "core/services" },
  { from: "lib/backend/export", to: "core/services/export" },
  { from: "lib/backend/content", to: "shared/content" },
  { from: "lib/backend/content.ts", to: "shared/content/index.ts" },
  { from: "lib/shared", to: "shared" },
  { from: "components", to: "ui" }, // special: flatten inner components/ui -> ui/
  { from: "hooks", to: "state" },
  { from: "lib/frontend/api-client.ts", to: "api/api-client.ts" },
  { from: "lib/frontend/cn.ts", to: "ui/cn.ts" },
  { from: "lib/frontend/brand.ts", to: "ui/brand.ts" },
  { from: "lib/frontend/fonts.ts", to: "ui/fonts.ts" },
  { from: "lib/frontend/metadata.ts", to: "ui/metadata.ts" },
  { from: "lib/frontend/hooks/use-queries.ts", to: "state/use-queries.ts" },
];

const noExt = (p) => p.replace(/\.tsx?$/, "");
const toPosix = (p) => p.split(sep).join("/");

function walk(dir, fn) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, fn);
    else if (/\.tsx?$/.test(entry)) fn(full);
  }
}

function buildMap() {
  const map = {};
  for (const { from, to } of MOVES) {
    const fromAbs = join(SRC, from);
    if (!existsSync(fromAbs)) {
      console.warn(`  [build] skip missing: ${from}`);
      continue;
    }
    const fromKey = noExt(from);
    const toKey = noExt(to);
    if (statSync(fromAbs).isDirectory()) {
      map[fromKey] = toKey; // directory import entry
      walk(fromAbs, (f) => {
        const rel = toPosix(relative(SRC, f));
        const relNoExt = noExt(rel);
        let newRel;
        if (from === "components") {
          // flatten the pre-existing inner components/ui -> ui/
          if (relNoExt.startsWith("components/ui/")) {
            newRel = "ui/" + relNoExt.slice("components/ui/".length);
          } else {
            newRel = "ui/" + relNoExt.slice("components/".length);
          }
        } else {
          newRel = toKey + "/" + noExt(toPosix(relative(fromAbs, f)));
        }
        map[relNoExt] = newRel;
      });
      if (from === "components") map["components/ui"] = "ui";
    } else {
      map[fromKey] = toKey;
    }
  }
  return map;
}

const IMPORT_RE = /(\bfrom\s*|\bimport\s*|\bexport\s+\*\s+from\s*|\brequire\(\s*)(['"])([^'"]+)\2/g;

function apply(map) {
  let changed = 0;
  walk(SRC, (f) => {
    const srcText = readFileSync(f, "utf8");
    const out = srcText.replace(IMPORT_RE, (m, prefix, quote, spec) => {
      if (!spec.startsWith(".") && !spec.startsWith("@/")) return m;
      let key;
      if (spec.startsWith("@/")) {
        key = noExt(spec.slice(2));
      } else {
        const abs = resolve(dirname(f), spec);
        key = noExt(toPosix(relative(SRC, abs)));
      }
      const mapped = map[key];
      if (!mapped) return m;
      return prefix + quote + "@/" + mapped + quote;
    });
    if (out !== srcText) {
      writeFileSync(f, out);
      changed++;
    }
  });
  console.log(`  [apply] rewrote imports in ${changed} file(s)`);
}

const mode = process.argv[2];
if (mode === "--build") {
  const map = buildMap();
  writeFileSync(MAP_FILE, JSON.stringify(map, null, 2));
  console.log(`  [build] wrote ${Object.keys(map).length} mappings to ${MAP_FILE}`);
} else if (mode === "--apply") {
  if (!existsSync(MAP_FILE)) {
    console.error("  [apply] .move-map.json missing — run --build first");
    process.exit(1);
  }
  apply(JSON.parse(readFileSync(MAP_FILE, "utf8")));
} else {
  console.error("usage: node scripts/fix-imports.mjs --build | --apply");
  process.exit(1);
}
