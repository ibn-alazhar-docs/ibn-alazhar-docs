import fs from "node:fs";
import { promises as fsPromises } from "node:fs";
import path from "node:path";
import { cache } from "react";
import { JOURNEY_DEFINITIONS } from "./journeys-data";
import { CATEGORY_LABELS, CATEGORY_DESCRIPTIONS, CATEGORY_ICONS, THEME_LABELS } from "./i18n-data";

function resolveContentDir(): string {
  const fromCwd = path.join(process.cwd(), "content");
  if (fs.existsSync(fromCwd)) return fromCwd;
  const fromWorkspace = path.join(process.cwd(), "apps/web/content");
  if (fs.existsSync(fromWorkspace)) return fromWorkspace;
  return fromCwd;
}

const CONTENT_DIR = resolveContentDir();

async function exists(p: string): Promise<boolean> {
  try {
    await fsPromises.access(p);
    return true;
  } catch {
    return false;
  }
}

export interface DocMetadata {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  readingTime: number;
  date: string;
  order: number;
  related?: string[];
  prerequisites?: string[];
  continuation?: string;
  themes?: string[];
}

export interface DocEntry {
  slug: string;
  locale: string;
  category: string;
  metadata: DocMetadata;
}

export interface ContentCollection {
  locale: string;
  categories: DocCategory[];
}

export interface DocCategory {
  id: string;
  label: string;
  docs: DocEntry[];
}

export interface JourneyEntry {
  slug: string;
  title: string;
  description: string;
  icon: string;
  docs: DocEntry[];
  totalReadingTime: number;
  docCount: number;
}

export interface ThematicGroup {
  theme: string;
  label: string;
  docs: DocEntry[];
}

function parseFrontmatter(raw: string): { metadata: DocMetadata; content: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new Error("Invalid MDX: missing frontmatter");
  }

  const frontmatter: Record<string, string> = {};
  for (const line of match[1]!.split("\n")) {
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

  function parseArray(raw: string | undefined): string[] {
    if (!raw || raw.trim() === "") return [];
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const metadata: DocMetadata = {
    id: frontmatter["id"] ?? "",
    title: frontmatter["title"] ?? "",
    subtitle: frontmatter["subtitle"] ?? "",
    category: frontmatter["category"] ?? "",
    readingTime: Number(frontmatter["readingTime"]) || 1,
    date: frontmatter["date"] ?? "",
    order: Number(frontmatter["order"]) || 99,
    related: parseArray(frontmatter["related"]),
    prerequisites: parseArray(frontmatter["prerequisites"]),
    continuation: frontmatter["continuation"] ?? "",
    themes: parseArray(frontmatter["themes"]),
  };

  return { metadata, content: match[2]! };
}

async function getDocFiles(
  locale: string,
): Promise<{ file: string; category: string; slug: string }[]> {
  const localeDir = path.join(CONTENT_DIR, locale);
  if (!(await exists(localeDir))) return [];

  const entries: { file: string; category: string; slug: string }[] = [];
  const categories = await fsPromises.readdir(localeDir, { withFileTypes: true });

  for (const dirent of categories) {
    if (!dirent.isDirectory()) continue;
    const categoryDir = path.join(localeDir, dirent.name);
    const files = await fsPromises.readdir(categoryDir);

    for (const file of files) {
      if (!file.endsWith(".mdx")) continue;
      const slug = file.replace(/\.mdx$/, "");
      entries.push({ file: path.join(categoryDir, file), category: dirent.name, slug });
    }
  }

  return entries;
}

export const getDocContent = cache(async function getDocContent(
  locale: string,
  category: string,
  slug: string,
): Promise<{
  metadata: DocMetadata;
  content: string;
} | null> {
  const filePath = path.resolve(CONTENT_DIR, locale, category, `${slug}.mdx`);
  if (!filePath.startsWith(path.resolve(CONTENT_DIR))) return null;
  if (!(await exists(filePath))) return null;

  const raw = await fsPromises.readFile(filePath, "utf-8");
  return parseFrontmatter(raw);
});

export const getAllDocs = cache(async function getAllDocs(locale: string): Promise<DocEntry[]> {
  const files = await getDocFiles(locale);
  const docsPromises = files.map(async ({ category, slug, file }) => {
    const raw = await fsPromises.readFile(file, "utf-8");
    const { metadata } = parseFrontmatter(raw);
    return { slug, locale, category, metadata };
  });
  const docs = await Promise.all(docsPromises);
  return docs.sort((a, b) => a.metadata.order - b.metadata.order);
});

export async function getDocBySlug(locale: string, slug: string): Promise<DocEntry | null> {
  const all = await getAllDocs(locale);
  return all.find((d) => d.slug === slug) ?? null;
}

export function getCategoryLabel(id: string, locale: string): string {
  return CATEGORY_LABELS[id]?.[locale] ?? id;
}

export function getCategoryDescription(id: string, locale: string): string {
  return CATEGORY_DESCRIPTIONS[id]?.[locale] ?? "";
}

export function getCategoryIcon(id: string): string {
  return CATEGORY_ICONS[id] ?? "-";
}

export async function getCategoryThemes(id: string, locale: string): Promise<ThematicGroup[]> {
  const all = await getAllDocs(locale);
  const categoryDocs = all.filter((d) => d.category === id);

  const groups = new Map<string, DocEntry[]>();
  for (const doc of categoryDocs) {
    const themes = doc.metadata.themes?.length ? doc.metadata.themes : ["overview"];
    for (const theme of themes) {
      const existing = groups.get(theme) ?? [];
      existing.push(doc);
      groups.set(theme, existing);
    }
  }

  return Array.from(groups.entries())
    .map(([theme, docs]) => ({
      theme,
      label: THEME_LABELS[theme]?.[locale] ?? theme,
      docs,
    }))
    .sort((a, b) => b.docs.length - a.docs.length);
}

export async function getDocNavigation(
  locale: string,
  currentSlug: string,
): Promise<{ prev: DocEntry | null; next: DocEntry | null }> {
  const all = await getAllDocs(locale);
  const idx = all.findIndex((d) => d.slug === currentSlug);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? all[idx - 1]! : null,
    next: idx < all.length - 1 ? all[idx + 1]! : null,
  };
}

export async function getContentCollection(locale: string): Promise<ContentCollection> {
  const docs = await getAllDocs(locale);
  const categories = new Map<string, DocEntry[]>();

  for (const doc of docs) {
    const existing = categories.get(doc.category) ?? [];
    existing.push(doc);
    categories.set(doc.category, existing);
  }

  return {
    locale,
    categories: Array.from(categories.entries()).map(([id, docs]) => ({
      id,
      label: getCategoryLabel(id, locale),
      docs,
    })),
  };
}

export async function getRelatedDocs(locale: string, currentSlug: string): Promise<DocEntry[]> {
  const current = await getDocBySlug(locale, currentSlug);
  if (!current?.metadata.related?.length) return [];

  const promises = current.metadata.related.map((slug) => getDocBySlug(locale, slug));
  const results = await Promise.all(promises);
  return results.filter((d): d is DocEntry => d !== null);
}

export async function getPrerequisiteDocs(
  locale: string,
  currentSlug: string,
): Promise<DocEntry[]> {
  const current = await getDocBySlug(locale, currentSlug);
  if (!current?.metadata.prerequisites?.length) return [];

  const promises = current.metadata.prerequisites.map((slug) => getDocBySlug(locale, slug));
  const results = await Promise.all(promises);
  return results.filter((d): d is DocEntry => d !== null);
}

export async function getContinuationDoc(
  locale: string,
  currentSlug: string,
): Promise<DocEntry | null> {
  const current = await getDocBySlug(locale, currentSlug);
  if (!current?.metadata.continuation) return null;
  return getDocBySlug(locale, current.metadata.continuation);
}

export async function getJourneys(locale: string): Promise<JourneyEntry[]> {
  const all = await getAllDocs(locale);

  const definitions = JOURNEY_DEFINITIONS;
  return definitions.map((def) => {
    const docs = def.docSlugs
      .map((slug) => all.find((d) => d.slug === slug))
      .filter((d): d is DocEntry => d !== null);

    return {
      slug: def.slug,
      title: def.title[locale] ?? def.title.en ?? "",
      description: def.description[locale] ?? def.description.en ?? "",
      icon: def.icon,
      docs,
      totalReadingTime: docs.reduce((sum, d) => sum + d.metadata.readingTime, 0),
      docCount: docs.length,
    };
  });
}

export async function getJourney(slug: string, locale: string): Promise<JourneyEntry | null> {
  const journeys = await getJourneys(locale);
  return journeys.find((j) => j.slug === slug) ?? null;
}

export async function getDocJourneys(locale: string, docSlug: string): Promise<JourneyEntry[]> {
  const journeys = await getJourneys(locale);
  return journeys.filter((j) => j.docs.some((d) => d.slug === docSlug));
}

export async function getRecentDocs(locale: string, limit: number = 4): Promise<DocEntry[]> {
  const all = await getAllDocs(locale);
  return [...all].sort((a, b) => b.metadata.date.localeCompare(a.metadata.date)).slice(0, limit);
}

export async function getCategoryTotalReadingTime(id: string, locale: string): Promise<number> {
  const all = await getAllDocs(locale);
  return all.filter((d) => d.category === id).reduce((sum, d) => sum + d.metadata.readingTime, 0);
}

export function getLocaleName(locale: string): string {
  return locale === "ar" ? "العربية" : "English";
}
