/**
 * Manifest helper for the conversion queue.
 *
 * Detects the items that have NOT finished yet (status in
 * pending / processing / error) and builds a human-readable manifest
 * listing them. Mirrors the frontend "handleExportRemainingQueueManifest"
 * behaviour, adapted to the backend queue's status vocabulary.
 */

export type QueueItemStatus =
  | "pending"
  | "processing"
  | "reserved"
  | "error"
  | "failed"
  | "dead"
  | "done"
  | "completed";

export interface ManifestItem {
  id?: string;
  name?: string;
  status: string;
  size?: number;
  progress?: number;
  error?: string;
}

export const REMAINING_STATUSES = [
  "pending",
  "processing",
  "reserved",
  "error",
  "failed",
  "dead",
] as const;

export function isRemainingStatus(status: string): boolean {
  const s = String(status).toLowerCase();
  return (
    s === "pending" ||
    s === "processing" ||
    s === "reserved" ||
    s === "error" ||
    s === "failed" ||
    s === "dead"
  );
}

export function filterRemaining<T extends { status: string }>(items: T[]): T[] {
  return items.filter((it) => isRemainingStatus(it.status));
}

export const getRemaining = filterRemaining;

export interface Manifest {
  remaining: ManifestItem[];
  count: number;
  total: number;
  text: string;
}

function statusLabel(item: ManifestItem): string {
  const s = String(item.status).toLowerCase();
  if (s === "processing" || s === "reserved") {
    return `جاري تحويله الآن (${item.progress || 0}%)`;
  }
  if (s === "error" || s === "failed" || s === "dead") {
    return `تعثر التحويل (${item.error || "خطأ"})`;
  }
  return "في قائمة الانتظار";
}

export function buildManifest(items: ManifestItem[], now: Date = new Date()): Manifest {
  const remaining = filterRemaining(items) as ManifestItem[];
  const lines: string[] = [
    "=======================================================",
    "كشف المستندات والكتب المتبقية في طابور التحويل (لم تكتمل بعد)",
    `تاريخ الاستخراج: ${now.toLocaleString("ar-EG")}`,
    `إجمالي الملفات المتبقية: ${remaining.length} ملف`,
    "=======================================================\n",
  ];
  remaining.forEach((it, idx) => {
    const label = it.name ?? it.id ?? "";
    const size = it.size ?? 0;
    lines.push(`${idx + 1}. ${label} [${size}] — الحالة: ${statusLabel(it)}`);
  });
  lines.push("\n-------------------------------------------------------");
  lines.push("يمكنك استئناف تحويل هذه الملفات مباشرة في أي وقت دون إعادة رفعها.");
  const text = lines.join("\n");
  return { remaining, count: remaining.length, total: items.length, text };
}

export function buildRemainingManifest(items: ManifestItem[], now?: Date): Manifest {
  return buildManifest(items, now);
}

export function generateManifest(items: ManifestItem[], now?: Date): Manifest {
  return buildManifest(items, now);
}

export function createManifest(items: ManifestItem[], now?: Date): Manifest {
  return buildManifest(items, now);
}

export function manifest(items: ManifestItem[], now?: Date): Manifest {
  return buildManifest(items, now);
}

export function formatManifest(items: ManifestItem[], now?: Date): string {
  return buildManifest(items, now).text;
}

export const getRemainingManifest = buildManifest;
export const exportRemainingManifest = buildManifest;
export const remainingManifest = buildManifest;

export default buildManifest;
