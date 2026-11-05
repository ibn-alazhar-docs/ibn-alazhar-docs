import { describe, it, expect } from "vitest";
import { loadConfig } from "../../packages/pipeline/src/config";
import {
  saveAuditSession,
  getLatestAuditSession,
  listAuditSessions,
} from "../../packages/pipeline/src/audit/vault";

process.env.STORAGE_DRIVER = "local";
process.env.STORAGE_LOCAL_DIR = "/tmp/opencode/audit-vault-test";

describe("audit vault", () => {
  it("saves and retrieves latest session", async () => {
    const config = loadConfig();
    const docId = `doc-${Date.now()}`;

    const saved = await saveAuditSession(config, docId, {
      filename: "book.pdf",
      sourceText: "نص مصدر",
      convertedMarkdown: "# markdown",
      bookTitle: "عنوان",
      metadata: { pages: 2 },
    });

    expect(saved.sessionId).toMatch(/^audit_/);

    const latest = await getLatestAuditSession(config, docId);
    expect(latest).not.toBeNull();
    expect(latest?.sourceText).toBe("نص مصدر");
    expect(latest?.convertedMarkdown).toBe("# markdown");
    expect(latest?.meta.filename).toBe("book.pdf");

    const sessions = await listAuditSessions(config, docId);
    expect(sessions.length).toBe(1);
    expect(sessions[0].id).toBe(saved.sessionId);
  });

  it("returns null when no session exists", async () => {
    const config = loadConfig();
    const latest = await getLatestAuditSession(config, `missing-${Date.now()}`);
    expect(latest).toBeNull();
    const sessions = await listAuditSessions(config, `missing-${Date.now()}`);
    expect(sessions).toEqual([]);
  });
});
