import { normalizeStage, DOC_PROGRESS_MAP } from "@/shared/conversion-status-utils";
import { repos } from "@/core/composition-root";
import { LIMITS, UI_TIMING } from "@/shared/constants";

export class StreamService {
  private static sseConnectionsByUser = new Map<string, number>();

  static checkAndIncrementConnections(userId: string): { allowed: boolean; count: number } {
    const currentConnections = this.sseConnectionsByUser.get(userId) ?? 0;
    if (currentConnections >= LIMITS.MAX_SSE_CONNECTIONS_PER_USER) {
      return { allowed: false, count: currentConnections };
    }
    this.sseConnectionsByUser.set(userId, currentConnections + 1);
    return { allowed: true, count: currentConnections + 1 };
  }

  static decrementConnections(userId: string) {
    const count = this.sseConnectionsByUser.get(userId) ?? 0;
    if (count > 0) {
      this.sseConnectionsByUser.set(userId, count - 1);
    }
  }

  static async getDocumentStatus(
    jobId: string,
  ): Promise<{ stage: string; progress: number } | null> {
    try {
      const doc = await repos.document.findFirst({ id: jobId }, { status: true });
      if (!doc) return null;
      const stage = normalizeStage(doc.status);
      const progress = DOC_PROGRESS_MAP[doc.status] ?? 0;
      return { stage, progress };
    } catch {
      return null;
    }
  }

  static sendSSE(
    controller: ReadableStreamDefaultController,
    encoder: TextEncoder,
    data: string,
    closed: boolean,
  ) {
    if (!closed) {
      controller.enqueue(encoder.encode(`data: ${data}\n\n`));
    }
  }

  static closeSSE(controller: ReadableStreamDefaultController, closed: boolean) {
    if (!closed) {
      controller.close();
    }
  }

  static handlePollResult(
    status: { stage: string; progress: number } | null,
    jobId: string,
    send: (data: string) => void,
    consecutiveCompleteChecks: number,
  ): number {
    if (!status) {
      send(JSON.stringify({ type: "progress", jobId, stage: "pending", progress: 0 }));
      return consecutiveCompleteChecks;
    }

    send(JSON.stringify({ type: "progress", jobId, stage: status.stage, progress: status.progress }));

    if (status.stage === "completed" || status.stage === "failed") {
      return consecutiveCompleteChecks + 1;
    }

    return 0;
  }

  static handleCompletion(
    jobId: string,
    status: string,
    send: (data: string) => void,
    close: () => void,
  ) {
    send(JSON.stringify({ type: "complete", jobId, status }));
    setTimeout(close, UI_TIMING.SSE_CLOSE_DELAY_MS);
  }
}
