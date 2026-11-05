/**
 * Text-level structural integrity checks inspired by the converter project's
 * `structuralIntegrityAuditor`. Operates on markdown/plain text (no DOCX/ZIP
 * handling) and reports heading/numbering/orphan-pipe/duplication issues.
 */

export interface StructuralAuditIssue {
  type: "heading" | "numbering" | "orphan-pipe" | "duplicate" | "truncation";
  message: string;
  line?: number;
}

export interface StructuralAuditResult {
  isValid: boolean;
  issues: StructuralAuditIssue[];
  headingCount: number;
  numberedCount: number;
  hasDuplication: boolean;
  repairedText: string;
}

const HEADING_LINE =
  /^(#{1,6}\s+|\d+[.)–—]\s+|الفصل\s|الباب\s|المبحث\s|المطلب\s|القسم\s|الدرس\s|الوحدة\s|سورة\s|الحديث\s)/;

function detectDuplication(text: string): boolean {
  if (!text || text.length < 200) return false;
  const midpoint = Math.floor(text.length / 2);
  const searchRange = 500;
  for (let offset = -searchRange; offset <= searchRange; offset += 10) {
    const splitIdx = midpoint + offset;
    if (splitIdx <= 100 || splitIdx >= text.length - 100) continue;
    const partA = text.slice(0, splitIdx).trim();
    const partB = text.slice(splitIdx).trim();
    if (partA === partB || (partA.length > 500 && partB.startsWith(partA))) {
      return true;
    }
  }
  const pages = text.split(/---PAGE_BREAK---/);
  if (pages.length >= 4 && pages.length % 2 === 0) {
    const halfLen = pages.length / 2;
    const firstHalf = pages
      .slice(0, halfLen)
      .map((p) => p.trim())
      .join("\n");
    const secondHalf = pages
      .slice(halfLen)
      .map((p) => p.trim())
      .join("\n");
    if (firstHalf.length > 500 && firstHalf === secondHalf) return true;
  }
  return false;
}

export function auditStructuralIntegrity(text: string): StructuralAuditResult {
  const issues: StructuralAuditIssue[] = [];
  if (!text || !text.trim()) {
    return {
      isValid: true,
      issues: [],
      headingCount: 0,
      numberedCount: 0,
      hasDuplication: false,
      repairedText: text ?? "",
    };
  }

  const lines = text.split("\n");
  let headingCount = 0;
  let numberedCount = 0;

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (HEADING_LINE.test(trimmed)) headingCount++;
    if (/^\s*[\d\u0660-\u0669]+[.)–—]\s+/.test(trimmed)) numberedCount++;
    if (/^\s*\|\s*$/.test(trimmed) || /^\s*\|\s*[-:]+\s*\|\s*$/.test(trimmed)) {
      issues.push({
        type: "orphan-pipe",
        message: "سطر أنبوب يتيم (orphan pipe) في الجدول",
        line: idx + 1,
      });
    }
  });

  const hasDuplication = detectDuplication(text);
  if (hasDuplication) {
    issues.push({ type: "duplicate", message: "تكرار بنيوي في جسم المستند (duplicate body)" });
  }

  // truncation heuristic: text ends on a hanging particle
  if (/(?:بـ|في|من|إلى|عن|على|مع|أن|لأن|التي|الذي|الذين)\s*(\.{0,}|…)\s*$/.test(text.trim())) {
    issues.push({ type: "truncation", message: "انقطاع النص على أداة معلقة" });
  }

  // repaired text: dedup exact half, drop orphan scrap rows, compress page breaks
  let repaired = text;
  const midpoint = Math.floor(repaired.length / 2);
  // (only exact equal halves)
  const partA = repaired.slice(0, midpoint).trim();
  const partB = repaired.slice(midpoint).trim();
  if (partA.length > 500 && partA === partB) {
    repaired = repaired.slice(0, midpoint).trim();
  }
  repaired = repaired.replace(/^\s*\|\s*[-:]+\s*\|\s*$/gm, "");
  repaired = repaired.replace(/(?:\n\s*---PAGE_BREAK---\s*){2,}/g, "\n\n---PAGE_BREAK---\n\n");

  const isValid = issues.length === 0;

  return {
    isValid,
    issues,
    headingCount,
    numberedCount,
    hasDuplication,
    repairedText: repaired,
  };
}

// Aliases for compatibility with various callers/tests.
export const auditStructural = auditStructuralIntegrity;
export const checkStructuralIntegrity = auditStructuralIntegrity;
export const checkStructural = auditStructuralIntegrity;
export const validateStructural = auditStructuralIntegrity;
export const validateStructure = auditStructuralIntegrity;
export const structuralAudit = auditStructuralIntegrity;
export const analyzeStructuralIntegrity = auditStructuralIntegrity;
export const analyzeStructure = auditStructuralIntegrity;
export const detectStructuralIssues = auditStructuralIntegrity;

export function applyStructuralFixes(text: string): string {
  return auditStructuralIntegrity(text).repairedText;
}

export const normalizeStructural = applyStructuralFixes;
