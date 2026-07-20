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

// Extra entry points that must be bundled separately (e.g. server-only code that
// must NOT live in the shared barrel, to keep the browser build clean).
const extraEntries = [
  {
    dir: "packages/shared",
    entry: "packages/shared/src/health-server.ts",
    outfile: "packages/shared/dist/health-server.js",
  },
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

async function buildExtra({ entry, outfile }) {
  await esbuild.build({
    entryPoints: [path.join(root, entry)],
    outfile: path.join(root, outfile),
    bundle: true,
    format: "esm",
    platform: "node",
    packages: "external",
    logLevel: "error",
    loader: { ".ts": "ts", ".json": "json" },
  });
  console.log(`bundled extra -> ${outfile}`);
}

for (const pkg of packages) {
  await buildPkg(pkg);
}
for (const extra of extraEntries) {
  await buildExtra(extra);
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
  // Map each export key to its corresponding bundled dist file. The "." entry
  // always points at the main bundle; subpath entries (e.g. "./health-server")
  // map to their own dist file derived from the source path.
  if (j.exports) {
    for (const k of Object.keys(j.exports)) {
      if (k === ".") {
        j.exports[k] = "./dist/index.js";
        continue;
      }
      const src = j.exports[k];
      const dist = src
        .replace(/^(\.\/)?src\//, "./dist/")
        .replace(/\.ts$/, ".js");
      j.exports[k] = dist;
    }
  }
  fs.writeFileSync(file, JSON.stringify(j, null, 2) + "\n");
}
console.log("rewrote package exports to dist/index.js bundle");
