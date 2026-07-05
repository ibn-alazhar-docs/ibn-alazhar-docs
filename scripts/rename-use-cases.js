#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function walk(dir, cb) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, cb);
    else cb(full);
  }
}

function moveUseCases() {
  const repoRoot = path.join(__dirname, "..");
  const srcRoot = path.join(repoRoot, "apps", "web", "src", "core", "use-cases");
  const dstRoot = path.join(repoRoot, "apps", "web", "src", "core", "services");

  if (!fs.existsSync(srcRoot)) {
    console.error("Source directory not found:", srcRoot);
    process.exit(1);
  }

  ensureDir(dstRoot);

  walk(srcRoot, (file) => {
    const rel = path.relative(srcRoot, file);
    const dest = path.join(dstRoot, rel);
    ensureDir(path.dirname(dest));
    fs.renameSync(file, dest);
    console.log("moved", file, "→", dest);
  });

  // remove empty directories under srcRoot
  function removeEmpty(dir) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) removeEmpty(full);
    }
    const remaining = fs.readdirSync(dir);
    if (remaining.length === 0) fs.rmdirSync(dir);
  }
  removeEmpty(srcRoot);
}

function replaceImports() {
  const repoRoot = path.join(__dirname, "..");
  const exts = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

  function isTextFile(p) {
    return exts.includes(path.extname(p));
  }

  function walkAll(dir, cb) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walkAll(full, cb);
      else cb(full);
    }
  }

  walkAll(repoRoot, (file) => {
    if (!isTextFile(file)) return;
    const text = fs.readFileSync(file, "utf8");
    if (!text.includes("use-cases")) return;
    const replaced = text
      .replace(/core\/use-cases/g, "core/services")
      .replace(/\/use-cases/g, "/services");
    if (replaced !== text) {
      fs.writeFileSync(file, replaced, "utf8");
      console.log("updated imports in", file);
    }
  });
}

function main() {
  console.log("Starting rename use-cases → services");
  moveUseCases();
  console.log("Files moved; now updating import paths across repo");
  replaceImports();
  console.log("Done. Please run `pnpm typecheck` and `pnpm lint` to verify.");
}

main();
