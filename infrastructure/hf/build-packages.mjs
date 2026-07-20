import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
// esbuild is available through tsx's dependency tree; resolve it from tsx.
const esbuildPath = require.resolve("esbuild", { paths: [require.resolve("tsx")] });
const esbuild = require(esbuildPath);

const root = process.cwd();
const packages = [
  { name: "database", dir: "packages/database" },
  { name: "pipeline", dir: "packages/pipeline" },
  { name: "shared", dir: "packages/shared" },
];

async function buildPkg({ dir }) {
  const srcDir = path.join(root, dir, "src");
  const outDir = path.join(root, dir, "dist");
  const entryPoints = [];
  const walk = (d) => {
    const fs = require("fs");
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".ts")) entryPoints.push(full);
    }
  };
  walk(srcDir);
  await esbuild.build({
    entryPoints,
    outdir: outDir,
    outbase: srcDir,
    bundle: false,
    format: "esm",
    platform: "node",
    packages: "external",
    logLevel: "error",
    loader: { ".ts": "ts" },
  });
  console.log(`built ${dir} -> ${entryPoints.length} files`);
}

for (const pkg of packages) {
  await buildPkg(pkg);
}

// Rewrite exports/main in package.json to point at dist/*.js for Node ESM.
const fs = require("fs");
const pkgs = [
  "packages/database/package.json",
  "packages/pipeline/package.json",
  "packages/shared/package.json",
];
for (const p of pkgs) {
  const file = path.join(root, p);
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  if (j.main && j.main.endsWith(".ts")) {
    j.main = j.main.replace(/\.ts$/, ".js").replace(/^\.\/src\//, "./dist/");
  }
  if (j.exports) {
    for (const k of Object.keys(j.exports)) {
      if (typeof j.exports[k] === "string" && j.exports[k].endsWith(".ts")) {
        j.exports[k] = j.exports[k].replace(/\.ts$/, ".js").replace(/^\.\/src\//, "./dist/");
      }
    }
  }
  fs.writeFileSync(file, JSON.stringify(j, null, 2) + "\n");
}
console.log("rewrote package exports to dist");
