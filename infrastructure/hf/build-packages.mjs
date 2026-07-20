import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
// esbuild is available through tsx's dependency tree; resolve it from tsx.
const esbuildPath = require.resolve("esbuild", { paths: [require.resolve("tsx")] });
const esbuild = require(esbuildPath);

const root = process.cwd();
const packages = [
  { name: "database", dir: "packages/database", entry: "packages/database/src/index.ts" },
  { name: "pipeline", dir: "packages/pipeline", entry: "packages/pipeline/src/index.ts" },
  { name: "shared", dir: "packages/shared", entry: "packages/shared/src/index.ts" },
];

async function buildPkg({ dir, entry }) {
  const outfile = path.join(root, dir, "dist", "index.js");
  await esbuild.build({
    entryPoints: [path.join(root, entry)],
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    packages: "external",
    logLevel: "error",
    loader: { ".ts": "ts", ".json": "json" },
  });
  console.log(`bundled ${dir} -> ${outfile}`);
}

for (const pkg of packages) {
  await buildPkg(pkg);
}

// Rewrite exports/main in package.json to point at the bundled dist/index.js so
// Node's ESM resolver is happy at runtime (workers run via tsx on src/.ts, but
// importing the workspace package must resolve to real JS).
const fs = require("fs");
const pkgs = [
  "packages/database/package.json",
  "packages/pipeline/package.json",
  "packages/shared/package.json",
];
for (const p of pkgs) {
  const file = path.join(root, p);
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  j.main = "./dist/index.js";
  // Collapse exports to a single entry pointing at the bundle.
  if (j.exports) {
    for (const k of Object.keys(j.exports)) {
      j.exports[k] = "./dist/index.js";
    }
  }
  fs.writeFileSync(file, JSON.stringify(j, null, 2) + "\n");
}
console.log("rewrote package exports to dist/index.js bundle");
