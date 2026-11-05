import type { PipelineConfig } from "../types";
import { randomUUID } from "node:crypto";
import { uploadBuffer, downloadFile, listObjects } from "../storage";
import { logger as baseLogger } from "@ibn-al-azhar-docs/shared";

const logger = baseLogger.child({ module: "audit-vault" });

export interface AuditSessionMeta {
  id: string;
  documentId: string;
  filename: string;
  bookTitle: string;
  timestamp: number;
  date: string;
  sourceLength: number;
  markdownLength: number;
  sourceWords: number;
  targetWords: number;
  metadata: Record<string, unknown>;
}

export interface SaveAuditSessionInput {
  filename?: string;
  sourceText?: string;
  convertedMarkdown?: string;
  bookTitle?: string;
  metadata?: Record<string, unknown>;
  documentId?: string;
}

export interface AuditSession extends AuditSessionMeta {
  meta: AuditSessionMeta;
  sourceText: string;
  convertedMarkdown: string;
}

function resolveScope(
  documentIdOrInput: unknown,
  fallback?: unknown,
): {
  scope: string;
  input: SaveAuditSessionInput;
} {
  if (typeof documentIdOrInput === "string") {
    return {
      scope: documentIdOrInput || "global",
      input: (fallback as SaveAuditSessionInput) || {},
    };
  }
  const input = (documentIdOrInput as SaveAuditSessionInput) || {};
  return {
    scope: input.documentId || "global",
    input,
  };
}

function wordsOf(text: string): number {
  return (text || "").split(/\s+/).filter(Boolean).length;
}

function metaFromRaw(raw: Record<string, unknown>, scope: string): AuditSessionMeta {
  return {
    id: String(raw.id ?? raw.sessionId ?? ""),
    documentId: String(raw.documentId ?? scope),
    filename: String(raw.filename ?? "book.pdf"),
    bookTitle: String(raw.bookTitle ?? "فقه حنفي ثانية ثانوي أزهري"),
    timestamp: Number(raw.timestamp ?? Date.now()),
    date: String(raw.date ?? new Date().toISOString()),
    sourceLength: Number(raw.sourceLength ?? (raw.sourceText ? String(raw.sourceText).length : 0)),
    markdownLength: Number(
      raw.markdownLength ?? (raw.convertedMarkdown ? String(raw.convertedMarkdown).length : 0),
    ),
    sourceWords: Number(raw.sourceWords ?? wordsOf(String(raw.sourceText ?? ""))),
    targetWords: Number(raw.targetWords ?? wordsOf(String(raw.convertedMarkdown ?? ""))),
    metadata: (raw.metadata as Record<string, unknown>) || {},
  };
}

export async function saveAuditSession(
  config: PipelineConfig,
  documentIdOrInput: string | SaveAuditSessionInput = "global",
  maybeInput?: SaveAuditSessionInput,
): Promise<{ sessionId: string; meta: AuditSessionMeta; id: string }> {
  const { scope, input } = resolveScope(documentIdOrInput, maybeInput);
  const sourceText = input.sourceText || "";
  const convertedMarkdown = input.convertedMarkdown || "";
  const sessionId = `audit_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const meta: AuditSessionMeta = {
    id: sessionId,
    documentId: scope,
    filename: input.filename || "book.pdf",
    bookTitle: input.bookTitle || "فقه حنفي ثانية ثانوي أزهري",
    timestamp: Date.now(),
    date: new Date().toISOString(),
    sourceLength: sourceText.length,
    markdownLength: convertedMarkdown.length,
    sourceWords: wordsOf(sourceText),
    targetWords: wordsOf(convertedMarkdown),
    metadata: input.metadata || {},
  };

  const prefix = `audit/${scope}`;
  await uploadBuffer(
    config,
    `${prefix}/${sessionId}_meta.json`,
    Buffer.from(JSON.stringify(meta, null, 2), "utf-8"),
    "application/json",
  );
  if (sourceText) {
    await uploadBuffer(
      config,
      `${prefix}/${sessionId}_source.txt`,
      Buffer.from(sourceText, "utf-8"),
      "text/plain; charset=utf-8",
    );
  }
  if (convertedMarkdown) {
    await uploadBuffer(
      config,
      `${prefix}/${sessionId}_converted.md`,
      Buffer.from(convertedMarkdown, "utf-8"),
      "text/markdown; charset=utf-8",
    );
  }
  await uploadBuffer(
    config,
    `${prefix}/latest_session.json`,
    Buffer.from(JSON.stringify({ ...meta, sourceText, convertedMarkdown }, null, 2), "utf-8"),
    "application/json",
  );

  logger.info({ sessionId, scope }, "تم حفظ جلسة التدقيق");
  return { sessionId, meta, id: sessionId };
}

export async function getLatestAuditSession(
  config: PipelineConfig,
  documentId: string = "global",
): Promise<AuditSession | null> {
  const scope = documentId || "global";
  const prefix = `audit/${scope}`;
  try {
    const buf = await downloadFile(config, `${prefix}/latest_session.json`);
    const raw = JSON.parse(buf.toString("utf-8")) as Record<string, unknown>;
    const meta = metaFromRaw(raw, scope);
    return {
      ...meta,
      meta,
      sourceText: String(raw.sourceText ?? ""),
      convertedMarkdown: String(raw.convertedMarkdown ?? ""),
    };
  } catch (err) {
    logger.debug({ err, scope }, "لا توجد جلسة تدقيق حديثة");
    return null;
  }
}

export async function listAuditSessions(
  config: PipelineConfig,
  documentId: string = "global",
): Promise<AuditSessionMeta[]> {
  const scope = documentId || "global";
  const prefix = `audit/${scope}`;
  let keys: string[] = [];
  try {
    keys = await listObjects(config, prefix);
  } catch (err) {
    logger.debug({ err, scope }, "تعذر سرد كائنات التدقيق");
    return [];
  }
  const metaKeys = keys.filter((k) => k.endsWith("_meta.json"));
  const sessions: AuditSessionMeta[] = [];
  for (const key of metaKeys) {
    try {
      const buf = await downloadFile(config, key);
      const raw = JSON.parse(buf.toString("utf-8")) as Record<string, unknown>;
      sessions.push(metaFromRaw(raw, scope));
    } catch (err) {
      logger.warn({ err, key }, "تعذر قراءة ملف meta للتدقيق");
    }
  }
  return sessions.sort((a, b) => b.timestamp - a.timestamp);
}

// ---- Aliases / compatibility shims ----
export const save = saveAuditSession;
export const getLatest = getLatestAuditSession;
export const list = listAuditSessions;
export const saveSession = saveAuditSession;
export const getLatestSession = getLatestAuditSession;
export const listSessions = listAuditSessions;

export const auditVault = {
  save: saveAuditSession,
  getLatest: getLatestAuditSession,
  list: listAuditSessions,
  saveAuditSession,
  getLatestAuditSession,
  listAuditSessions,
};

export default auditVault;
