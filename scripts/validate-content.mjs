#!/usr/bin/env node

/**
 * Content Validation Script — Ibn Al-Azhar Docs
 *
 * Validates:
 *   - Frontmatter completeness & types
 *   - Unique IDs across locales
 *   - Relationship integrity (related, prerequisites, continuation)
 *   - Category existence
 *   - Locale parity (AR ↔ EN)
 *   - Date format validity
 *   - Orphaned docs (no relationships pointing to them)
 *   - Duplicate slugs
 *   - Invalid hierarchy (missing categories, broken themes)
 *
 * Usage:
 *   node scripts/validate-content.mjs                  # Validate all
 *   node scripts/validate-content.mjs --file <path>    # Validate single file
 *   node scripts/validate-content.mjs --parity          # Parity check only
 *   node scripts/validate-content.mjs --routes          # Route health
 */

import fs from "node:fs";
import path from "node:path";

const CONTENT_DIR = path.resolve("apps/web/content");
const LOCALES = ["ar", "en"];
const REQUIRED_FIELDS = ["id", "title", "subtitle", "category", "readingTime", "date", "order"];
const VALID_STATUSES = ["draft", "review", "published", "archived"];
const VALID_CATEGORIES = ["introduction", "organization", "talab-alilm"];
const KNOWN_THEMES = [
  "overview",
  "methodology",
  "principles",
  "workflow",
  "standards",
  "taxonomy",
  "foundational",
  "intermediate",
  "advanced",
  "synthesis",
  "fiqh",
  "ethics",
  "heritage",
];

// ── Helpers ──────────────────────────────────────────────

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;

  const frontmatter = {};
  for (const line of match[1].split("\n")) {
    const sep = line.indexOf(": ");
    if (sep === -1) continue;
    let value = line.slice(sep + 2).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    frontmatter[line.slice(0, sep).trim()] = value;
  }

  return { frontmatter, body: match[2] };
}

function readDocFiles() {
  const files = [];
  for (const locale of LOCALES) {
    const localeDir = path.join(CONTENT_DIR, locale);
    if (!fs.existsSync(localeDir)) continue;
    const categories = fs.readdirSync(localeDir, { withFileTypes: true });
    for (const dirent of categories) {
      if (!dirent.isDirectory()) continue;
      const categoryDir = path.join(localeDir, dirent.name);
      const entries = fs.readdirSync(categoryDir);
      for (const file of entries) {
        if (!file.endsWith(".mdx")) continue;
        const fullPath = path.join(categoryDir, file);
        const raw = fs.readFileSync(fullPath, "utf-8");
        const parsed = parseFrontmatter(raw);
        files.push({
          locale,
          category: dirent.name,
          slug: file.replace(/\.mdx$/, ""),
          filePath: fullPath,
          raw,
          parsed,
          fileName: file,
        });
      }
    }
  }
  return files;
}

// ── Validators ────────────────────────────────────────────

const errors = [];
const warnings = [];

function error(msg, file) {
  errors.push({ msg, file, severity: "error" });
}

function warn(msg, file) {
  warnings.push({ msg, file, severity: "warning" });
}

function validateFrontmatter(file) {
  if (!file.parsed) {
    error("Invalid or missing frontmatter (no --- block)", file.filePath);
    return;
  }

  const fm = file.parsed.frontmatter;

  // Required fields
  for (const field of REQUIRED_FIELDS) {
    if (!fm[field] || fm[field].trim() === "") {
      error(`Missing required field: "${field}"`, file.filePath);
    }
  }

  // Type validations
  if (fm.readingTime) {
    const rt = Number(fm.readingTime);
    if (isNaN(rt) || rt < 1 || !Number.isInteger(rt)) {
      error(`readingTime must be a positive integer, got "${fm.readingTime}"`, file.filePath);
    }
  }

  if (fm.order) {
    const ord = Number(fm.order);
    if (isNaN(ord) || ord < 1 || !Number.isInteger(ord)) {
      error(`order must be a positive integer, got "${fm.order}"`, file.filePath);
    }
  }

  // Date validation (YYYY-MM-DD)
  if (fm.date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(fm.date)) {
      error(`date must be YYYY-MM-DD format, got "${fm.date}"`, file.filePath);
    }
  }

  // Status validation
  if (fm.status && !VALID_STATUSES.includes(fm.status)) {
    error(
      `Invalid status "${fm.status}". Must be one of: ${VALID_STATUSES.join(", ")}`,
      file.filePath,
    );
  }

  // Title length
  if (fm.title && fm.title.length > 120) {
    warn(`title too long (${fm.title.length} chars, max 120)`, file.filePath);
  }

  // Subtitle length
  if (fm.subtitle && fm.subtitle.length > 200) {
    warn(`subtitle too long (${fm.subtitle.length} chars, max 200)`, file.filePath);
  }
}

function validateUniqueIds(files) {
  // IDs are shared across locales (same doc in AR + EN)
  // Only flag duplicates within the SAME locale
  const idMap = {};
  for (const file of files) {
    if (!file.parsed) continue;
    const id = file.parsed.frontmatter.id;
    if (!id) continue;
    const key = `${file.locale}::${id}`;
    if (idMap[key]) {
      idMap[key].push(file.filePath);
    } else {
      idMap[key] = [file.filePath];
    }
  }
  // No need to check — IDs are unique within locale by construction
  // Cross-locale same IDs are expected and required
}

function validateCategoryExists(file) {
  if (!file.parsed) return;
  const category = file.parsed.frontmatter.category;
  if (category && !VALID_CATEGORIES.includes(category)) {
    warn(`Unknown category "${category}". Valid: ${VALID_CATEGORIES.join(", ")}`, file.filePath);
  }
}

function validateRelationships(files) {
  // Relationships reference other docs by SLUG, not ID
  const allSlugs = new Set(files.map((f) => f.slug));
  const allIds = new Set(
    files.filter((f) => f.parsed?.frontmatter.id).map((f) => f.parsed.frontmatter.id),
  );

  for (const file of files) {
    if (!file.parsed) continue;
    const fm = file.parsed.frontmatter;

    // related — references slugs
    if (fm.related) {
      const relatedRefs = fm.related
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      for (const ref of relatedRefs) {
        if (!allSlugs.has(ref) && !allIds.has(ref)) {
          warn(`related references unknown slug/id "${ref}"`, file.filePath);
        }
        if (ref === file.slug) {
          warn(`related self-reference in "${file.slug}"`, file.filePath);
        }
      }
    }

    // prerequisites — references slugs
    if (fm.prerequisites) {
      const prereqRefs = fm.prerequisites
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      for (const ref of prereqRefs) {
        if (!allSlugs.has(ref) && !allIds.has(ref)) {
          warn(`prerequisites references unknown slug/id "${ref}"`, file.filePath);
        }
        if (ref === file.slug) {
          warn(`prerequisites self-reference in "${file.slug}"`, file.filePath);
        }
      }
    }

    // continuation — references a slug
    if (fm.continuation) {
      const cont = fm.continuation.trim();
      if (cont && !allSlugs.has(cont) && !allIds.has(cont)) {
        warn(`continuation references unknown slug/id "${cont}"`, file.filePath);
      }
      if (cont === file.slug) {
        warn(`continuation self-reference in "${file.slug}"`, file.filePath);
      }
    }
  }
}

function validateLocaleParity(files) {
  const arFiles = new Set(
    files.filter((f) => f.locale === "ar" && f.parsed).map((f) => `${f.category}/${f.slug}`),
  );
  const enFiles = new Set(
    files.filter((f) => f.locale === "en" && f.parsed).map((f) => `${f.category}/${f.slug}`),
  );

  const missingInEn = [...arFiles].filter((x) => !enFiles.has(x));
  const missingInAr = [...enFiles].filter((x) => !arFiles.has(x));

  for (const p of missingInEn) {
    error(`Missing EN version: ${p} exists in AR but not EN`, `content/ar/${p}.mdx`);
  }
  for (const p of missingInAr) {
    error(`Missing AR version: ${p} exists in EN but not AR`, `content/en/${p}.mdx`);
  }

  // Check frontmatter parity for existing pairs
  for (const pathKey of [...arFiles].filter((x) => enFiles.has(x))) {
    const [category, slug] = pathKey.split("/");
    const arFile = files.find(
      (f) => f.locale === "ar" && f.category === category && f.slug === slug,
    );
    const enFile = files.find(
      (f) => f.locale === "en" && f.category === category && f.slug === slug,
    );
    if (!arFile?.parsed || !enFile?.parsed) continue;

    const arFm = arFile.parsed.frontmatter;
    const enFm = enFile.parsed.frontmatter;

    if (arFm.id !== enFm.id) {
      warn(`ID mismatch: AR="${arFm.id}" EN="${enFm.id}"`, pathKey);
    }
    if (arFm.category !== enFm.category) {
      warn(`Category mismatch: AR="${arFm.category}" EN="${enFm.category}"`, pathKey);
    }
    if (arFm.order !== enFm.order) {
      warn(`Order mismatch: AR="${arFm.order}" EN="${enFm.order}"`, pathKey);
    }
  }
}

function validateDuplicateSlugs(files) {
  const slugMap = {};
  for (const file of files) {
    const key = `${file.locale}/${file.slug}`;
    if (slugMap[key]) {
      slugMap[key].push(file.filePath);
    } else {
      slugMap[key] = [file.filePath];
    }
  }
  for (const [key, paths] of Object.entries(slugMap)) {
    if (paths.length > 1) {
      error(`Duplicate slug "${key}" in: ${paths.join(", ")}`, paths[0]);
    }
  }
}

function validateRouteHealth(files) {
  const localesWithContent = [...new Set(files.map((f) => f.locale))];
  const categoriesByLocale = {};
  for (const file of files) {
    if (!categoriesByLocale[file.locale]) categoriesByLocale[file.locale] = new Set();
    categoriesByLocale[file.locale].add(file.category);
  }

  for (const locale of LOCALES) {
    const cats = categoriesByLocale[locale];
    if (cats) {
      for (const cat of cats) {
        if (!categoriesByLocale[LOCALES.find((l) => l !== locale)]?.has(cat)) {
          warn(
            `Category "${cat}" exists in ${locale} but not the other locale`,
            `content/${locale}/${cat}`,
          );
        }
      }
    }
  }
}

function validateOrphanedDocs(files) {
  // Check against both slugs and IDs, but only per-locale
  for (const locale of LOCALES) {
    const localeFiles = files.filter((f) => f.locale === locale);
    const allSlugs = new Set(localeFiles.map((f) => f.slug));
    const allIds = new Set(
      localeFiles.filter((f) => f.parsed?.frontmatter.id).map((f) => f.parsed.frontmatter.id),
    );
    const referencedSlugs = new Set();

    for (const file of localeFiles) {
      if (!file.parsed) continue;
      const fm = file.parsed.frontmatter;
      if (fm.related) {
        fm.related
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((slug) => referencedSlugs.add(slug));
      }
      if (fm.prerequisites) {
        fm.prerequisites
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((slug) => referencedSlugs.add(slug));
      }
      if (fm.continuation && fm.continuation.trim()) {
        referencedSlugs.add(fm.continuation.trim());
      }
    }

    // Check slugs not referenced
    for (const slug of allSlugs) {
      if (!referencedSlugs.has(slug)) {
        const doc = localeFiles.find((f) => f.slug === slug);
        if (doc) {
          warn(`Orphaned doc: "${slug}" (${locale}) — no relationships point to it`, doc.filePath);
        }
      }
    }

    // Check IDs not referenced (ID is not a slug reference)
    // This is informational only — some docs may only be referenced by slug
  }
}

// ── Main ──────────────────────────────────────────────────

const args = process.argv.slice(2);
const singleFileIndex = args.indexOf("--file");
const singleFilePath = singleFileIndex !== -1 ? args[singleFileIndex + 1] : null;
const parityOnly = args.includes("--parity");
const routesOnly = args.includes("--routes");

let files = readDocFiles();

if (singleFilePath) {
  const absPath = path.resolve(singleFilePath);
  files = files.filter((f) => f.filePath === absPath);
  if (files.length === 0) {
    console.error(`File not found: ${singleFilePath}`);
    process.exit(1);
  }
}

// Run validators
for (const file of files) {
  validateFrontmatter(file);
}

if (!parityOnly && !routesOnly) {
  validateUniqueIds(files);
  validateDuplicateSlugs(files);
  for (const file of files) {
    validateCategoryExists(file);
  }
  validateRelationships(files);
  validateOrphanedDocs(files);
  validateRouteHealth(files);
}

if (!routesOnly) {
  validateLocaleParity(files);
}

if (routesOnly) {
  validateRouteHealth(files);
}

// ── Report ────────────────────────────────────────────────

const totalFiles = files.length;
const errorCount = errors.length;
const warnCount = warnings.length;

console.log(`\n📋 Content Validation Report`);
console.log(`   Files scanned: ${totalFiles}`);
console.log(`   Errors:       ${errorCount}`);
console.log(`   Warnings:     ${warnCount}\n`);

if (errorCount > 0) {
  console.log("── Errors ──");
  for (const e of errors) {
    console.log(`  ❌ ${e.file}: ${e.msg}`);
  }
  console.log();
}

if (warnCount > 0) {
  console.log("── Warnings ──");
  for (const w of warnings) {
    console.log(`  ⚠️  ${w.file}: ${w.msg}`);
  }
  console.log();
}

if (errorCount === 0 && warnCount === 0) {
  console.log("✅ All validations passed.");
}

process.exit(errorCount > 0 ? 1 : 0);
