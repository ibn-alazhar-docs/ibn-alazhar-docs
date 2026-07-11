#!/usr/bin/env node

/**
 * Document Generator — Ibn Al-Azhar Docs
 *
 * Scaffolds a new document pair (AR + EN) with proper frontmatter.
 *
 * Usage:
 *   node scripts/generate-doc.mjs                    # Interactive mode
 *   node scripts/generate-doc.mjs \
 *     --category introduction \
 *     --title-ar "عنوان المقال" \
 *     --title-en "Article Title" \
 *     --order 4
 *
 * Options:
 *   --category     Category slug (required)
 *   --title-ar     Arabic title (required)
 *   --title-en     English title (required)
 *   --order        Sort order (default: auto-detect)
 *   --subtitle-ar  Arabic subtitle
 *   --subtitle-en  English subtitle
 *   --themes       Comma-separated themes
 *   --related      Comma-separated related ids
 *   --prerequisites Comma-separated prerequisite ids
 *   --continuation Continuation id
 *   --dry-run      Print what would be created, don't write files
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const CONTENT_DIR = path.resolve("apps/web/content");
const VALID_CATEGORIES = ["introduction", "organization"];
const LOCALES = ["ar", "en"];

// ── Helpers ──────────────────────────────────────────────

function getNextId(category) {
  let maxNum = 0;
  for (const locale of LOCALES) {
    const localeDir = path.join(CONTENT_DIR, locale, category);
    if (!fs.existsSync(localeDir)) continue;
    const files = fs.readdirSync(localeDir);
    for (const file of files) {
      const match = file.match(/doc-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  }
  const nextNum = maxNum + 1;
  // Also consider existing global IDs
  for (const locale of LOCALES) {
    const localeDir = path.join(CONTENT_DIR, locale);
    if (!fs.existsSync(localeDir)) continue;
    const cats = fs.readdirSync(localeDir, { withFileTypes: true });
    for (const dirent of cats) {
      if (!dirent.isDirectory() || dirent.name === category) continue;
      const catDir = path.join(localeDir, dirent.name);
      const files = fs.readdirSync(catDir);
      for (const file of files) {
        const match = file.match(/doc-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= nextNum) return `doc-${String(num + 1).padStart(3, "0")}`;
        }
      }
    }
  }
  return `doc-${String(nextNum).padStart(3, "0")}`;
}

function getNextOrder(category, locale = "ar") {
  const localeDir = path.join(CONTENT_DIR, locale, category);
  if (!fs.existsSync(localeDir)) return 1;
  const files = fs.readdirSync(localeDir);
  let maxOrder = 0;
  for (const file of files) {
    if (!file.endsWith(".mdx")) continue;
    const raw = fs.readFileSync(path.join(localeDir, file), "utf-8");
    const match = raw.match(/order:\s*(\d+)/);
    if (match) {
      const ord = parseInt(match[1], 10);
      if (ord > maxOrder) maxOrder = ord;
    }
  }
  return maxOrder + 1;
}

function kebabFromTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function buildFrontmatter(fields) {
  const lines = ["---"];
  const order = [
    "id",
    "title",
    "subtitle",
    "category",
    "readingTime",
    "date",
    "order",
    "status",
    "related",
    "prerequisites",
    "continuation",
    "themes",
    "author",
    "tags",
    "source",
    "language",
  ];

  for (const key of order) {
    if (fields[key] !== undefined && fields[key] !== null && fields[key] !== "") {
      const val = fields[key];
      if (val === undefined || val === null) continue;
      lines.push(`${key}: ${typeof val === "string" && val.includes(",") ? `"${val}"` : val}`);
    }
  }

  lines.push("---", "");
  return lines.join("\n");
}

function generateContent(locale, fields) {
  const isAr = locale === "ar";
  const sections = [];

  // Introduction
  if (isAr) {
    sections.push("## المقدمة\n\n[2-3 جمل تمهيدية تشرح موضوع المستند وأهميته.]\n");
  } else {
    sections.push(
      `## Introduction\n\n[2-3 introductory sentences explaining the document's subject and importance.]\n`,
    );
  }

  // Main sections
  for (let i = 1; i <= 3; i++) {
    if (isAr) {
      sections.push(
        `## القسم ${["الأول", "الثاني", "الثالث"][i - 1]}\n\n[3-5 فقرات تغطي الموضوع الرئيسي.]\n`,
      );
    } else {
      const labels = ["One", "Two", "Three"];
      sections.push(`## Section ${labels[i - 1]}\n\n[3-5 paragraphs covering the main topic.]\n`);
    }
  }

  // Summary
  if (isAr) {
    sections.push("## خلاصة\n\n[فقرة تلخيصية تربط الأفكار الرئيسية وتقدم استنتاجًا.]\n");
  } else {
    sections.push(
      "## Summary\n\n[A concluding paragraph connecting the main ideas and presenting a conclusion.]\n",
    );
  }

  return sections.join("\n");
}

function generateDoc(
  id,
  category,
  order,
  titleAr,
  titleEn,
  subtitleAr,
  subtitleEn,
  themes,
  related,
  prerequisites,
  continuation,
  dryRun,
) {
  const baseSlug = kebabFromTitle(titleEn);
  const slug = `${id}-${baseSlug}`;

  const todayISO = today();

  const templates = {
    ar: {
      frontmatter: buildFrontmatter({
        id,
        title: titleAr,
        subtitle: subtitleAr || `[وصف مختصر للمستند]`,
        category,
        readingTime: 5,
        date: todayISO,
        order,
        status: "draft",
        related,
        prerequisites,
        continuation,
        themes,
        author: "فريق التوثيق",
        language: "ar",
      }),
      content: generateContent("ar", {}),
    },
    en: {
      frontmatter: buildFrontmatter({
        id,
        title: titleEn,
        subtitle: subtitleEn || `[Brief description of the document]`,
        category,
        readingTime: 5,
        date: todayISO,
        order,
        status: "draft",
        related,
        prerequisites,
        continuation,
        themes,
        author: "Documentation Team",
        language: "en",
      }),
      content: generateContent("en", {}),
    },
  };

  const files = [];
  for (const locale of LOCALES) {
    const dir = path.join(CONTENT_DIR, locale, category);
    const filePath = path.join(dir, `${slug}.mdx`);
    const content = templates[locale].frontmatter + "\n" + templates[locale].content;

    files.push({ path: filePath, content, locale });
  }

  return files;
}

// ── Interactive Mode ──────────────────────────────────────

async function interactive() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  function ask(q) {
    return new Promise((resolve) => rl.question(q, resolve));
  }

  console.log("\n📝 New Document Scaffold\n");
  console.log("Available categories:", VALID_CATEGORIES.join(", "));

  const category = await ask("Category: ");
  if (!VALID_CATEGORIES.includes(category)) {
    console.error(`Invalid category. Choose from: ${VALID_CATEGORIES.join(", ")}`);
    rl.close();
    process.exit(1);
  }

  const titleAr = await ask("Arabic title: ");
  if (!titleAr) {
    console.error("Arabic title is required.");
    rl.close();
    process.exit(1);
  }

  const titleEn = await ask("English title: ");
  if (!titleEn) {
    console.error("English title is required.");
    rl.close();
    process.exit(1);
  }

  const subtitleAr = await ask("Arabic subtitle (optional): ");
  const subtitleEn = await ask("English subtitle (optional): ");
  const themes = await ask("Themes, comma-separated (optional): ");
  const related = await ask("Related IDs, comma-separated (optional): ");
  const prerequisites = await ask("Prerequisite IDs, comma-separated (optional): ");
  const continuation = await ask("Continuation ID (optional): ");

  rl.close();

  const id = getNextId(category);
  const order = getNextOrder(category);
  const files = generateDoc(
    id,
    category,
    order,
    titleAr,
    titleEn,
    subtitleAr,
    subtitleEn,
    themes,
    related,
    prerequisites,
    continuation,
    false,
  );

  console.log(`\n📄 Creating "${id}" (order: ${order})`);
  for (const f of files) {
    const dir = path.dirname(f.path);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(f.path, f.content, "utf-8");
    console.log(`   ✅ ${f.locale}: ${f.path}`);
  }
  console.log("\n📋 Next steps:");
  console.log("   1. Edit the MDX files to add real content");
  console.log("   2. Run: node scripts/validate-content.mjs");
  console.log("   3. Build: pnpm build\n");
}

// ── CLI Mode ──────────────────────────────────────────────

function cli() {
  const args = {};
  const argList = process.argv.slice(2);
  for (let i = 0; i < argList.length; i++) {
    if (argList[i].startsWith("--")) {
      const key = argList[i].slice(2);
      const val = argList[i + 1];
      if (val && !val.startsWith("--")) {
        args[key] = val;
        i++;
      } else {
        args[key] = true;
      }
    }
  }

  const dryRun = !!args["dry-run"];

  if (!args["title-ar"] || !args["title-en"] || !args.category) {
    console.error(
      "Usage: node scripts/generate-doc.mjs --category <cat> --title-ar <ar> --title-en <en> [options]",
    );
    console.error("Required: --category, --title-ar, --title-en");
    process.exit(1);
  }

  const category = args.category;
  if (!VALID_CATEGORIES.includes(category)) {
    console.error(`Invalid category "${category}". Valid: ${VALID_CATEGORIES.join(", ")}`);
    process.exit(1);
  }

  const order = args.order ? parseInt(args.order, 10) : getNextOrder(category);
  const id = getNextId(category);
  const files = generateDoc(
    id,
    category,
    order,
    args["title-ar"],
    args["title-en"],
    args["subtitle-ar"],
    args["subtitle-en"],
    args.themes,
    args.related,
    args.prerequisites,
    args.continuation,
    dryRun,
  );

  if (dryRun) {
    console.log(`\n📄 Dry run: would create "${id}" (order: ${order})`);
    for (const f of files) {
      console.log(`   📝 ${f.locale}: ${f.path}`);
    }
    console.log();
    return;
  }

  console.log(`\n📄 Creating "${id}" (order: ${order})`);
  for (const f of files) {
    const dir = path.dirname(f.path);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(f.path, f.content, "utf-8");
    console.log(`   ✅ ${f.locale}: ${f.path}`);
  }
  console.log("\n✅ Done. Run validation: node scripts/validate-content.mjs\n");
}

// ── Entry ─────────────────────────────────────────────────

const hasArgs = process.argv.slice(2).length > 0;
if (hasArgs) {
  cli();
} else {
  interactive();
}
