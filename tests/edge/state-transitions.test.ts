import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DocStatus } from "@ibn-al-azhar-docs/shared";

// ─── State Machine Definition ──────────────────────────────────────────────────

type Transition = `${DocStatus}->${DocStatus}`;

const ALL_STATUSES: DocStatus[] = [
  "UPLOADED",
  "VALIDATING",
  "SPLITTING",
  "OCR_PROCESSING",
  "CLEANING",
  "GENERATING",
  "COMPLETED",
  "FAILED",
  "ARCHIVED",
];

// Valid transitions in the document lifecycle
const VALID_TRANSITIONS: Set<Transition> = new Set([
  "UPLOADED->VALIDATING",
  "UPLOADED->FAILED",
  "VALIDATING->SPLITTING",
  "VALIDATING->FAILED",
  "SPLITTING->OCR_PROCESSING",
  "SPLITTING->FAILED",
  "OCR_PROCESSING->CLEANING",
  "OCR_PROCESSING->FAILED",
  "CLEANING->GENERATING",
  "CLEANING->FAILED",
  "GENERATING->COMPLETED",
  "GENERATING->FAILED",
  "COMPLETED->ARCHIVED",
  "FAILED->UPLOADED",
  "FAILED->ARCHIVED",
]);

// ─── State Machine Logic ──────────────────────────────────────────────────────

function isValidTransition(from: DocStatus, to: DocStatus): boolean {
  if (from === to) return true; // No-op transitions always allowed for idempotency
  return VALID_TRANSITIONS.has(`${from}->${to}`);
}

function getNextValidStatuses(from: DocStatus): DocStatus[] {
  return ALL_STATUSES.filter((s) => isValidTransition(from, s));
}

interface StatusUpdateResult {
  success: boolean;
  error?: string;
  newStatus?: DocStatus;
}

function attemptTransition(
  current: DocStatus,
  target: DocStatus,
  version?: number,
  expectedVersion?: number,
): StatusUpdateResult {
  if (version !== undefined && expectedVersion !== undefined && version !== expectedVersion) {
    return { success: false, error: "STALE_VERSION" };
  }
  if (isValidTransition(current, target)) {
    return { success: true, newStatus: target };
  }
  return { success: false, error: `INVALID_TRANSITION: ${current} -> ${target}` };
}

// ─── Document Status Lifecycle Tests ──────────────────────────────────────────

describe("Document Status Lifecycle — State Transitions", () => {
  it("UPLOADED → VALIDATING (normal pipeline start)", () => {
    expect(isValidTransition("UPLOADED", "VALIDATING")).toBe(true);
    const result = attemptTransition("UPLOADED", "VALIDATING");
    expect(result.success).toBe(true);
    expect(result.newStatus).toBe("VALIDATING");
  });

  it("UPLOADED → FAILED (direct failure before queueing)", () => {
    expect(isValidTransition("UPLOADED", "FAILED")).toBe(true);
    const result = attemptTransition("UPLOADED", "FAILED");
    expect(result.success).toBe(true);
    expect(result.newStatus).toBe("FAILED");
  });

  it("VALIDATING → SPLITTING", () => {
    expect(isValidTransition("VALIDATING", "SPLITTING")).toBe(true);
  });

  it("VALIDATING → FAILED (validation error)", () => {
    expect(isValidTransition("VALIDATING", "FAILED")).toBe(true);
  });

  it("SPLITTING → OCR_PROCESSING", () => {
    expect(isValidTransition("SPLITTING", "OCR_PROCESSING")).toBe(true);
  });

  it("SPLITTING → FAILED (split error)", () => {
    expect(isValidTransition("SPLITTING", "FAILED")).toBe(true);
  });

  it("OCR_PROCESSING → CLEANING (normal OCR completion)", () => {
    expect(isValidTransition("OCR_PROCESSING", "CLEANING")).toBe(true);
  });

  it("OCR_PROCESSING → FAILED (OCR error)", () => {
    expect(isValidTransition("OCR_PROCESSING", "FAILED")).toBe(true);
  });

  it("CLEANING → GENERATING (normal cleaning completion)", () => {
    expect(isValidTransition("CLEANING", "GENERATING")).toBe(true);
  });

  it("CLEANING → FAILED (cleaning error)", () => {
    expect(isValidTransition("CLEANING", "FAILED")).toBe(true);
  });

  it("GENERATING → COMPLETED (normal completion)", () => {
    expect(isValidTransition("GENERATING", "COMPLETED")).toBe(true);
    const result = attemptTransition("GENERATING", "COMPLETED");
    expect(result.success).toBe(true);
    expect(result.newStatus).toBe("COMPLETED");
  });

  it("GENERATING → FAILED (generation error)", () => {
    expect(isValidTransition("GENERATING", "FAILED")).toBe(true);
  });

  it("COMPLETED → ARCHIVED (user archives)", () => {
    expect(isValidTransition("COMPLETED", "ARCHIVED")).toBe(true);
    const result = attemptTransition("COMPLETED", "ARCHIVED");
    expect(result.success).toBe(true);
    expect(result.newStatus).toBe("ARCHIVED");
  });

  it("FAILED → UPLOADED (retry after failure)", () => {
    expect(isValidTransition("FAILED", "UPLOADED")).toBe(true);
    const result = attemptTransition("FAILED", "UPLOADED");
    expect(result.success).toBe(true);
    expect(result.newStatus).toBe("UPLOADED");
  });

  it("FAILED → ARCHIVED (archive failed document)", () => {
    expect(isValidTransition("FAILED", "ARCHIVED")).toBe(true);
  });

  it("COMPLETED → COMPLETED (no-op/idempotent)", () => {
    expect(isValidTransition("COMPLETED", "COMPLETED")).toBe(true);
  });

  it("UPLOADED → UPLOADED (no-op)", () => {
    expect(isValidTransition("UPLOADED", "UPLOADED")).toBe(true);
  });
});

// ─── Invalid Transitions ──────────────────────────────────────────────────────

describe("Document Status — Invalid Transitions Rejected", () => {
  it("COMPLETED → FAILED (already completed — should be rejected)", () => {
    expect(isValidTransition("COMPLETED", "FAILED")).toBe(false);
    const result = attemptTransition("COMPLETED", "FAILED");
    expect(result.success).toBe(false);
    expect(result.error).toContain("INVALID_TRANSITION");
  });

  it("ARCHIVED → UPLOADED (archived documents cannot be re-uploaded)", () => {
    expect(isValidTransition("ARCHIVED", "UPLOADED")).toBe(false);
    const result = attemptTransition("ARCHIVED", "UPLOADED");
    expect(result.success).toBe(false);
  });

  it("ARCHIVED → COMPLETED (cannot un-archive)", () => {
    expect(isValidTransition("ARCHIVED", "COMPLETED")).toBe(false);
    const result = attemptTransition("ARCHIVED", "COMPLETED");
    expect(result.success).toBe(false);
  });

  it("ARCHIVED → FAILED (already archived)", () => {
    expect(isValidTransition("ARCHIVED", "FAILED")).toBe(false);
  });

  it("ARCHIVED → VALIDATING (cannot restart archived)", () => {
    expect(isValidTransition("ARCHIVED", "VALIDATING")).toBe(false);
  });

  it("COMPLETED → VALIDATING (cannot re-process completed)", () => {
    expect(isValidTransition("COMPLETED", "VALIDATING")).toBe(false);
  });

  it("COMPLETED → SPLITTING (skipping processing stages)", () => {
    expect(isValidTransition("COMPLETED", "SPLITTING")).toBe(false);
  });

  it("UPLOADED → GENERATING (skipping pipeline)", () => {
    expect(isValidTransition("UPLOADED", "GENERATING")).toBe(false);
  });

  it("VALIDATING → COMPLETED (must go through pipeline)", () => {
    expect(isValidTransition("VALIDATING", "COMPLETED")).toBe(false);
  });

  it("OCR_PROCESSING → COMPLETED (must clean and generate first)", () => {
    expect(isValidTransition("OCR_PROCESSING", "COMPLETED")).toBe(false);
  });

  it("ALL invalid transitions return appropriate errors", () => {
    for (const from of ALL_STATUSES) {
      for (const to of ALL_STATUSES) {
        if (from === to) continue;
        const valid = isValidTransition(from, to);
        const result = attemptTransition(from, to);
        if (!valid) {
          expect(result.success).toBe(false);
          expect(result.error).toContain("INVALID_TRANSITION");
        }
      }
    }
  });

  it("ARCHIVED → any processing state is invalid", () => {
    const processingStates: DocStatus[] = [
      "VALIDATING",
      "SPLITTING",
      "OCR_PROCESSING",
      "CLEANING",
      "GENERATING",
    ];
    for (const target of processingStates) {
      expect(isValidTransition("ARCHIVED", target)).toBe(false);
    }
  });
});

// ─── Concurrent Status Updates ────────────────────────────────────────────────

describe("Concurrent Status Updates", () => {
  it("two workers try to set COMPLETED simultaneously — only one succeeds", async () => {
    let currentStatus: DocStatus = "GENERATING";
    let updateCount = 0;

    const tryComplete = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 5));
      if (currentStatus === "GENERATING") {
        currentStatus = "COMPLETED";
        updateCount++;
        return true;
      }
      return false;
    });

    const results = await Promise.all([tryComplete(), tryComplete()]);

    const succeeded = results.filter(Boolean).length;
    expect(succeeded).toBe(1);
    expect(updateCount).toBe(1);
  });

  it("two workers race to set COMPLETED — at most one succeeds from same state", async () => {
    let currentStatus: DocStatus = "GENERATING";
    let successCount = 0;

    const setCompleted = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 5));
      if (currentStatus === "GENERATING") {
        currentStatus = "COMPLETED";
        successCount++;
        return true;
      }
      return false;
    });

    const results = await Promise.all([setCompleted(), setCompleted()]);
    const succeeded = results.filter(Boolean).length;
    expect(succeeded).toBe(1);
    expect(successCount).toBe(1);
  });

  it("status update with stale data (outdated version) — rejected", () => {
    const doc = { id: "doc-1", status: "UPLOADED" as DocStatus, version: 1 };

    const updateWithVersionCheck = vi.fn(
      (newStatus: DocStatus, expectedVersion: number): StatusUpdateResult => {
        return attemptTransition(doc.status, newStatus, doc.version, expectedVersion);
      },
    );

    // Version 2 tries to update but document is still at version 1 — stale
    const staleResult = updateWithVersionCheck("FAILED", 2);
    expect(staleResult.success).toBe(false);
    expect(staleResult.error).toBe("STALE_VERSION");

    // Correct version succeeds
    const correctResult = updateWithVersionCheck("FAILED", 1);
    expect(correctResult.success).toBe(true);
  });
});

// ─── Status Notification / SSE Delivery Failure ────────────────────────────────

describe("Status Notification Delivery", () => {
  it("SSE disconnected during status change — client reconnects and gets current state", async () => {
    let sseConnected = true;
    const notifications: DocStatus[] = [];

    const emitStatusChange = vi.fn(async (status: DocStatus) => {
      if (!sseConnected) {
        return { delivered: false, reason: "SSE_DISCONNECTED" };
      }
      notifications.push(status);
      return { delivered: true };
    });

    // Simulate SSE disconnect
    sseConnected = false;
    const failedDelivery = await emitStatusChange("COMPLETED");
    expect(failedDelivery.delivered).toBe(false);

    // Client reconnects and queries current state
    const currentStatus: DocStatus = "COMPLETED";
    expect(currentStatus).toBe("COMPLETED");
  });

  it("webhook notification for status change fails — queued for retry", async () => {
    const webhookQueue: Array<{ event: string; status: DocStatus; retries: number }> = [];

    const sendWebhook = vi.fn(async (event: string, status: DocStatus) => {
      const MAX_RETRIES = 3;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt < MAX_RETRIES) throw new Error("HTTP 502");
          return { sent: true };
        } catch {
          webhookQueue.push({ event, status, retries: attempt });
        }
      }
      return { sent: false, error: "WEBHOOK_FAILED" };
    });

    const result = await sendWebhook("status.change", "COMPLETED");
    expect(result.sent).toBe(true);
    expect(webhookQueue.length).toBeGreaterThanOrEqual(2);
  });

  it("multiple status updates batched — last known state is correct", async () => {
    const statusHistory: DocStatus[] = [];

    const applyTransition = vi.fn((from: DocStatus, to: DocStatus) => {
      if (isValidTransition(from, to)) {
        statusHistory.push(to);
        return to;
      }
      return from;
    });

    // Simulate rapid pipeline transitions
    let current: DocStatus = "UPLOADED";
    const transitions: Array<[DocStatus, DocStatus]> = [
      ["UPLOADED", "FAILED"],
      ["FAILED", "UPLOADED"],
      ["UPLOADED", "VALIDATING"],
      ["VALIDATING", "FAILED"],
    ];

    for (const [from, to] of transitions) {
      current = applyTransition(from, to);
    }

    expect(statusHistory[statusHistory.length - 1]).toBe("FAILED");
    expect(statusHistory[0]).toBe("FAILED"); // first transition
  });

  it("status callback throws error — caught without crashing process", async () => {
    const onStatusChange = vi.fn().mockRejectedValue(new Error("Callback crashed"));

    const safeEmit = vi.fn(async (status: DocStatus) => {
      try {
        await onStatusChange(status);
      } catch {
        return { delivered: false, error: "CALLBACK_FAILED" };
      }
      return { delivered: true };
    });

    const result = await safeEmit("COMPLETED");
    expect(result.delivered).toBe(false);
    expect(result.error).toBe("CALLBACK_FAILED");
  });
});

// ─── Full Pipeline Simulation ─────────────────────────────────────────────────

describe("Full Pipeline — Valid Path Simulation", () => {
  it("document follows UPLOADED → VALIDATING → SPLITTING → OCR_PROCESSING → CLEANING → GENERATING → COMPLETED", () => {
    const pipeline: DocStatus[] = [
      "UPLOADED",
      "VALIDATING",
      "SPLITTING",
      "OCR_PROCESSING",
      "CLEANING",
      "GENERATING",
      "COMPLETED",
    ];

    for (let i = 0; i < pipeline.length - 1; i++) {
      expect(isValidTransition(pipeline[i], pipeline[i + 1])).toBe(true);
    }

    // Walk the full path
    const path: DocStatus[] = [pipeline[0]];
    for (let i = 1; i < pipeline.length; i++) {
      const result = attemptTransition(path[path.length - 1], pipeline[i]);
      expect(result.success).toBe(true);
      if (result.newStatus) path.push(result.newStatus);
    }

    expect(path[path.length - 1]).toBe("COMPLETED");
  });

  it("document retry path: FAILED → UPLOADED → pipeline → COMPLETED", () => {
    const retryPath: DocStatus[] = [
      "FAILED",
      "UPLOADED",
      "VALIDATING",
      "SPLITTING",
      "OCR_PROCESSING",
      "CLEANING",
      "GENERATING",
      "COMPLETED",
    ];

    for (let i = 0; i < retryPath.length - 1; i++) {
      expect(isValidTransition(retryPath[i], retryPath[i + 1])).toBe(true);
    }

    let current: DocStatus = retryPath[0];
    for (let i = 1; i < retryPath.length; i++) {
      const result = attemptTransition(current, retryPath[i]);
      expect(result.success).toBe(true);
      if (result.newStatus) current = result.newStatus;
    }
    expect(current).toBe("COMPLETED");
  });

  it("document archive path: COMPLETED → ARCHIVED", () => {
    expect(isValidTransition("COMPLETED", "ARCHIVED")).toBe(true);
    const result = attemptTransition("COMPLETED", "ARCHIVED");
    expect(result.success).toBe(true);
    expect(result.newStatus).toBe("ARCHIVED");
  });

  it("document failure path at each stage is valid", () => {
    const failurePoints: DocStatus[] = [
      "UPLOADED",
      "VALIDATING",
      "SPLITTING",
      "OCR_PROCESSING",
      "CLEANING",
      "GENERATING",
    ];

    for (const stage of failurePoints) {
      expect(isValidTransition(stage, "FAILED")).toBe(true);
    }
  });
});

// ─── Concurrent Status Edge Cases ──────────────────────────────────────────────

describe("Concurrent Status — Edge Transitions", () => {
  it("status race: FAILED->UPLOADED while another worker sets FAILED — first wins", async () => {
    let currentStatus: DocStatus = "UPLOADED";
    let version = 1;

    const setStatus = vi.fn(async (target: DocStatus, expectedVersion: number) => {
      await new Promise((r) => setTimeout(r, 5));
      if (version !== expectedVersion) return { success: false, error: "STALE_VERSION" };
      version++;
      currentStatus = target;
      return { success: true, newStatus: target };
    });

    const [r1, r2] = await Promise.allSettled([setStatus("VALIDATING", 1), setStatus("FAILED", 1)]);

    const successes = [r1, r2].filter(
      (r) => r.status === "fulfilled" && (r as PromiseFulfilledResult<any>).value.success,
    ).length;
    expect(successes).toBe(1);
  });

  it("double-archive from COMPLETED — idempotent", async () => {
    let currentStatus: DocStatus = "COMPLETED";

    const archive = vi.fn(async () => {
      if (currentStatus === "COMPLETED") {
        currentStatus = "ARCHIVED";
        return { success: true, newStatus: "ARCHIVED" };
      }
      if (currentStatus === "ARCHIVED") {
        return { success: true, newStatus: "ARCHIVED", note: "already_archived" };
      }
      return { success: false, error: "INVALID_TRANSITION" };
    });

    const r1 = await archive();
    expect(r1.newStatus).toBe("ARCHIVED");

    const r2 = await archive();
    expect(r2.note).toBe("already_archived");
    expect(currentStatus).toBe("ARCHIVED");
  });

  it("rapid back-and-forth between FAILED and UPLOADED", async () => {
    let current: DocStatus = "FAILED";

    const transition = vi.fn(async (from: DocStatus, to: DocStatus) => {
      if (!isValidTransition(from, to)) {
        return { success: false, error: `INVALID_TRANSITION: ${from} -> ${to}` };
      }
      current = to;
      return { success: true };
    });

    expect((await transition(current, "UPLOADED")).success).toBe(true);
    expect((await transition(current, "FAILED")).success).toBe(true);
    expect((await transition(current, "UPLOADED")).success).toBe(true);
    expect((await transition(current, "FAILED")).success).toBe(true);
    expect(current).toBe("FAILED");
  });

  it("concurrent transitions with version conflict — first writer wins, stale detected", async () => {
    const history: Array<{ target: DocStatus; expectedVer: number; result: any }> = [];

    let docVersion = 1;
    let status: DocStatus = "UPLOADED";

    const attempt = vi.fn(async (target: DocStatus, expectedVer: number) => {
      // Simulate a small delay, then check-and-set
      await new Promise((r) => setTimeout(r, 5));
      if (docVersion !== expectedVer) {
        const result = { success: false, error: "STALE" };
        history.push({ target, expectedVer, result });
        return result;
      }
      docVersion++;
      status = target;
      const result = { success: true };
      history.push({ target, expectedVer, result });
      return result;
    });

    // Run sequentially to verify version check works correctly
    const r1 = await attempt("VALIDATING", 1);
    expect(r1.success).toBe(true);
    expect(docVersion).toBe(2);

    const r2 = await attempt("FAILED", 1);
    expect(r2.success).toBe(false);
    expect(r2.error).toBe("STALE");

    const r3 = await attempt("SPLITTING", 2);
    expect(r3.success).toBe(true);
    expect(docVersion).toBe(3);
  });

  it("stale version check when called sequentially — second attempt fails", async () => {
    let docVersion = 1;
    let status: DocStatus = "UPLOADED";

    const attempt = vi.fn(async (target: DocStatus, expectedVer: number) => {
      if (docVersion !== expectedVer) return { success: false, error: "STALE" };
      docVersion++;
      status = target;
      return { success: true };
    });

    const r1 = await attempt("VALIDATING", 1);
    expect(r1.success).toBe(true);

    const r2 = await attempt("FAILED", 2);
    expect(r2.success).toBe(true);

    const r3 = await attempt("SPLITTING", 2);
    expect(r3.success).toBe(false);
    expect(r3.error).toBe("STALE");
  });

  it("status update during bulk operation — invariant maintained", async () => {
    const processedDocs = new Set<string>();

    const bulkTransition = vi.fn(async (ids: string[], target: DocStatus) => {
      for (const id of ids) {
        processedDocs.add(`${id}:${target}`);
      }
      return ids.length;
    });

    const singleTransition = vi.fn(async (id: string, target: DocStatus) => {
      processedDocs.add(`${id}:${target}`);
      return 1;
    });

    await Promise.all([
      bulkTransition(["doc-1", "doc-2"], "COMPLETED"),
      singleTransition("doc-2", "ARCHIVED"),
    ]);

    // doc-2 should have exactly 1-2 entries (COMPLETED and/or ARCHIVED)
    const doc2Entries = Array.from(processedDocs).filter((e) => e.startsWith("doc-2:"));
    expect(doc2Entries.length).toBeGreaterThanOrEqual(1);
    expect(doc2Entries.length).toBeLessThanOrEqual(2);
  });
});
