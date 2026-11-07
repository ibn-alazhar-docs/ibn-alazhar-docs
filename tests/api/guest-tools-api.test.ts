/**
 * Guest Tools Hub HTTP contract (docs/IMPLEMENTATION_TOOLS.md §7).
 *
 * These routes are the only unauthenticated, quota-bearing surface in the
 * product, and until now they had no test at all. The seam that is mocked is
 * exactly one: `guest-tool-processor` (Python, Tesseract, Gemini, pandoc). Everything
 * else runs for real — the shared limits, magic-byte sniffing, the in-memory
 * queue with its per-IP/per-tool/per-total caps, the 0700 temp directory, TTL
 * sweeping, and the capability-token lookup.
 */

import { accessSync, constants } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GuestJobResult } from "@/domain/guest-tools";

const guestRuntime = vi.hoisted(() => ({
  /** Resolvers for jobs whose processing has started but not finished. */
  pending: [] as Array<() => void>,
  /** When set, the next run fails with this instead of completing. */
  fail: null as { kind: "guest" | "raw"; code: string } | null,
}));

vi.mock("@/core/services/guest/guest-tool-processor", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/core/services/guest/guest-tool-processor")>();
  return {
    ...actual,
    // The service calls `onProgress` as its cooperative cancellation check, so
    // the fake reports progress on the same two sides of the await the real
    // extractor uses — otherwise a cancelled run would never notice.
    processGuestInput: vi.fn(async (input: { onProgress?: (p: number) => void }) => {
      input.onProgress?.(35);
      await new Promise<void>((resolve) => {
        guestRuntime.pending.push(resolve);
      });
      if (guestRuntime.fail) {
        throw guestRuntime.fail.kind === "guest"
          ? new actual.GuestProcessingError(guestRuntime.fail.code, "انقطع الاستخراج")
          : new Error(`${guestRuntime.fail.code}: quota exhausted`);
      }
      input.onProgress?.(95);
      return guestResult();
    }),
    renderGuestDocx: vi.fn(async () => {
      throw new actual.GuestProcessingError("DOCX_UNAVAILABLE", "pandoc غير مثبت");
    }),
  };
});

import {
  DELETE as deleteGuestJob,
  GET as getGuestJob,
} from "@/app/api/tools/guest/jobs/[id]/route";
import { GET as getGuestQueue, POST as createGuest } from "@/app/api/tools/guest/jobs/route";
import { __resetGuestJobStore } from "@/core/services/guest/guest-job-store";
import { guestInputPath } from "@/core/services/guest/guest-temp-files";

const CLEANED = "بسم الله الرحمن الرحيم\n\nالحمد لله";

function guestResult(): GuestJobResult {
  return {
    route: "native",
    engine: "native",
    cleanedText: {
      raw: CLEANED,
      cleaned: CLEANED,
      markdown: `# كتاب\n\n${CLEANED}`,
      metadata: {
        pageCount: 1,
        headingCount: 1,
        wordCount: 6,
        charCount: CLEANED.length,
        confidence: 0.95,
        garbageRatio: 0,
        htmlFragmentCount: 0,
        paragraphCount: 2,
        qualityScore: 80,
      },
    },
  };
}

/** Each test gets its own IP so the per-IP cap of 1 never leaks between them. */
let ipSeed = 0;
function nextIp(): string {
  ipSeed += 1;
  return `203.0.113.${ipSeed}`;
}

const PNG_HEAD = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function bytesOf(fill: number, head = PNG_HEAD): Uint8Array {
  const out = new Uint8Array(head.length + fill);
  out.set(head);
  out.fill(0x42, head.length);
  return out;
}

interface PostOptions {
  ip?: string;
  tool?: string | null;
  file?: { name: string; type: string; bytes: Uint8Array } | null;
}

function postJobs(options: PostOptions = {}): Request {
  const form = new FormData();
  if (options.tool !== null) form.append("tool", options.tool ?? "ocr");
  if (options.file) {
    form.append(
      "file",
      new Blob([options.file.bytes], { type: options.file.type }),
      options.file.name,
    );
  }
  return new Request("http://localhost/api/tools/guest/jobs", {
    method: "POST",
    body: form,
    headers: { "cf-connecting-ip": options.ip ?? nextIp() },
  });
}

const PNG_FILE = { name: "kitāb.png", type: "image/png", bytes: bytesOf(64) };

let createdIds: string[] = [];

async function submitAndTakeJobId(options: PostOptions = {}): Promise<string> {
  const res = await createGuest(postJobs(options));
  expect(res.status).toBe(202);
  const body = await res.json();
  createdIds.push(body.job.jobId);
  return body.job.jobId as string;
}

/** Let the fire-and-forget run reach the point where it awaits the processor. */
async function tick(): Promise<void> {
  for (let i = 0; i < 8; i++) await new Promise((resolve) => setImmediate(resolve));
}

/**
 * Poll until a condition holds. The guest path is fire-and-forget over real
 * file I/O, and the api project runs its files in parallel workers, so a fixed
 * number of event-loop turns is flaky under load — waiting on the actual
 * observable state is both faster on an idle machine and honest on a busy one.
 */
async function waitUntil(condition: () => boolean, message: string): Promise<void> {
  for (let i = 0; i < 500; i++) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 4));
  }
  throw new Error(`timed out waiting for: ${message}`);
}

/** Finish the oldest queued job and let the completion/cleanup chain settle. */
async function completeOldest(): Promise<void> {
  await waitUntil(() => guestRuntime.pending.length > 0, "the guest run to reach the processor");
  const resolve = guestRuntime.pending.shift()!;
  resolve();
  await tick();
}

function exists(path: string): boolean {
  try {
    accessSync(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

beforeEach(async () => {
  // The store hangs off globalThis, so a job leaked from any other file would
  // occupy the single per-IP slot this suite depends on.
  await __resetGuestJobStore();
  guestRuntime.pending.length = 0;
  guestRuntime.fail = null;
});

afterEach(async () => {
  for (const id of createdIds) {
    await deleteGuestJob(
      new Request(`http://localhost/api/tools/guest/jobs/${id}`, {
        method: "DELETE",
        headers: { "cf-connecting-ip": nextIp() },
      }),
      { params: Promise.resolve({ id }) },
    );
  }
  createdIds = [];
  await __resetGuestJobStore();
  guestRuntime.pending.length = 0;
  guestRuntime.fail = null;
});

describe("POST /api/tools/guest/jobs — server-side validation", () => {
  it("rejects a body that is not multipart form data", async () => {
    const request = new Request("http://localhost/api/tools/guest/jobs", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": nextIp() },
      body: JSON.stringify({ tool: "ocr" }),
    });

    const res = await createGuest(request);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_FORM");
  });

  it("rejects a submission with no file", async () => {
    const res = await createGuest(postJobs({ tool: "ocr", file: null }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("MISSING_FILE");
  });

  it("rejects an unknown tool id", async () => {
    const res = await createGuest(postJobs({ tool: "magic", file: PNG_FILE }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_TOOL");
  });

  it("refuses a sidecar-pending tool instead of faking a result", async () => {
    // tashkeel/transcription are advertised but not wired: a guest must never be
    // handed a simulated success (docs/MERGE_PLAN.md — graceful degradation).
    const res = await createGuest(postJobs({ tool: "tashkeel", file: PNG_FILE }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_TOOL");
  });

  it("rejects content whose magic bytes are not PDF or an image", async () => {
    const res = await createGuest(
      postJobs({
        file: { name: "book.txt", type: "text/plain", bytes: new TextEncoder().encode("نص") },
      }),
    );
    expect(res.status).toBe(415);
    expect((await res.json()).error.code).toBe("UNSUPPORTED_TYPE");
  });

  it("rejects a declared type that disagrees with the sniffed content", async () => {
    const res = await createGuest(
      postJobs({ file: { name: "virus.pdf", type: "application/pdf", bytes: bytesOf(48) } }),
    );
    // PNG magic under a .pdf name: sniffed image/png vs declared application/pdf.
    expect(res.status).toBe(415);
    expect((await res.json()).error.code).toBe("UNSUPPORTED_TYPE");
  });

  it("creates a queued job and returns only the capability token", async () => {
    const res = await createGuest(postJobs({ file: PNG_FILE }));
    expect(res.status).toBe(202);
    const body = await res.json();

    expect(body.job.jobId).toMatch(/^[0-9a-f]{32}$/);
    expect(body.job.status).toBe("queued");
    expect(body.job.tool).toBe("ocr");
    expect(body.job.pageCount).toBe(1); // server counted, image = 1 page
    expect(body.job.limits.maxFileSizeMB).toBe(99);
    expect(body.job.limits.maxPages).toBe(1000);
    expect(body.job.limits.maxConcurrentJobsPerIp).toBe(1);
    expect(body.job.result).toBeUndefined();
    expect(new Date(body.job.expiresAt).getTime()).toBeGreaterThan(Date.now());
    await completeOldest();
  });
});

describe("guest queue caps", () => {
  it("holds one active job per IP and says when a slot frees", async () => {
    const ip = nextIp();
    await submitAndTakeJobId({ ip, file: PNG_FILE });

    const res = await createGuest(postJobs({ ip, file: PNG_FILE }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toMatch(/^\d+$/);
    expect((await res.json()).error.code).toBe("GUEST_QUEUE_FULL_PER_IP");

    // The same IP can submit again once its job leaves the active set.
    await completeOldest();
    const retry = await createGuest(postJobs({ ip, file: PNG_FILE }));
    expect(retry.status).toBe(202);
    await completeOldest();
  });

  it("publishes only queue counts, never names, paths, or IPs", async () => {
    const jobId = await submitAndTakeJobId({ file: PNG_FILE });
    const res = await getGuestQueue(
      new Request("http://localhost/api/tools/guest/jobs", {
        headers: { "cf-connecting-ip": nextIp() },
      }),
    );
    expect(res.status).toBe(200);
    const raw = await res.text();
    const snapshot = JSON.parse(raw);

    expect(snapshot.queue.active).toBeGreaterThanOrEqual(1);
    expect(snapshot.queue.perTool.ocr).toBeGreaterThanOrEqual(1);
    expect(raw).not.toContain("kitāb.png");
    expect(raw).not.toContain(jobId);
    expect(raw).not.toContain("/tmp");
    await completeOldest();
  });
});

describe("GET /api/tools/guest/jobs/[id] — capability token reads", () => {
  it("treats a malformed id as not found, without touching the store", async () => {
    for (const hostile of ["../etc/passwd", "zzzz", "0".repeat(31), "0".repeat(33)]) {
      const res = await getGuestJob(
        new Request(`http://localhost/api/tools/guest/jobs/${hostile}`),
        { params: Promise.resolve({ id: hostile }) },
      );
      expect(res.status, hostile).toBe(404);
    }
  });

  it("returns 404 for a well-formed id that does not exist", async () => {
    const id = "a".repeat(32);
    const res = await getGuestJob(new Request(`http://localhost/api/tools/guest/jobs/${id}`), {
      params: Promise.resolve({ id }),
    });
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("GUEST_JOB_NOT_FOUND");
  });

  it("shows an in-flight job without a result, then the text once it completes", async () => {
    const id = await submitAndTakeJobId({ file: PNG_FILE });

    const running = await getGuestJob(new Request(`http://localhost/api/tools/guest/jobs/${id}`), {
      params: Promise.resolve({ id }),
    });
    expect(running.status).toBe(200);
    expect(running.headers.get("Cache-Control")).toBe("no-store");
    const runningView = await running.json();
    // `runGuestJob` marks the record processing synchronously, so a client that
    // polls after the 202 never observes the `queued` snapshot it was handed.
    expect(runningView.status).toBe("processing");
    expect(runningView.result).toBeUndefined();
    expect(runningView.fileName).toBe("kitāb.png");

    await completeOldest();

    const done = await getGuestJob(new Request(`http://localhost/api/tools/guest/jobs/${id}`), {
      params: Promise.resolve({ id }),
    });
    const view = await done.json();
    expect(view.status).toBe("completed");
    expect(view.result.text).toContain("الحمد لله");
    expect(view.result.route).toBe("native");
    expect(view.result.engine).toBe("native");
    expect(view.result.metadata.qualityScore).toBe(80);
  });

  it("refuses a download before the result exists", async () => {
    const id = await submitAndTakeJobId({ file: PNG_FILE });
    const res = await getGuestJob(
      new Request(`http://localhost/api/tools/guest/jobs/${id}?format=txt`),
      { params: Promise.resolve({ id }) },
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("GUEST_JOB_NOT_READY");
    await completeOldest();
  });

  it("serves txt and json downloads with RFC 5987 attachment names", async () => {
    const id = await submitAndTakeJobId({ file: PNG_FILE });
    await completeOldest();

    const txt = await getGuestJob(
      new Request(`http://localhost/api/tools/guest/jobs/${id}?format=txt`),
      {
        params: Promise.resolve({ id }),
      },
    );
    expect(txt.status).toBe(200);
    expect(txt.headers.get("Content-Type")).toContain("text/plain");
    expect(txt.headers.get("Content-Disposition")).toContain(`guest-ocr-${id.slice(0, 8)}.txt`);
    expect(await txt.text()).toContain("الحمد لله");

    const json = await getGuestJob(
      new Request(`http://localhost/api/tools/guest/jobs/${id}?format=json`),
      { params: Promise.resolve({ id }) },
    );
    expect(json.status).toBe(200);
    expect(json.headers.get("Content-Type")).toContain("application/json");
  });

  it("degrades DOCX to 503 while TXT and JSON keep working", async () => {
    const id = await submitAndTakeJobId({ file: PNG_FILE });
    await completeOldest();

    const docx = await getGuestJob(
      new Request(`http://localhost/api/tools/guest/jobs/${id}?format=docx`),
      { params: Promise.resolve({ id }) },
    );
    expect(docx.status).toBe(503);
    expect((await docx.json()).error.code).toBe("DOCX_UNAVAILABLE");
  });

  it("reports a provider outage as a coded failure, not a fake success", async () => {
    // What `extractText` throws once every local and cloud provider is down.
    guestRuntime.fail = { kind: "guest", code: "OCR_UNAVAILABLE" };
    const id = await submitAndTakeJobId({ file: PNG_FILE });
    await completeOldest();

    const res = await getGuestJob(new Request(`http://localhost/api/tools/guest/jobs/${id}`), {
      params: Promise.resolve({ id }),
    });
    const view = await res.json();
    expect(view.status).toBe("failed");
    expect(view.error.code).toBe("OCR_UNAVAILABLE");
    expect(view.result).toBeUndefined();
  });

  it("maps a raw pipeline error onto a guest code instead of leaking it", async () => {
    // The OCR chain rejects with a plain `ALL_OCR_PROVIDERS_FAILED` error; the
    // guest contract must translate it (guestFailureFromError), never store the
    // provider's internals as the code a browser switches on.
    guestRuntime.fail = { kind: "raw", code: "ALL_OCR_PROVIDERS_FAILED" };
    const id = await submitAndTakeJobId({ file: PNG_FILE });
    await completeOldest();

    const res = await getGuestJob(new Request(`http://localhost/api/tools/guest/jobs/${id}`), {
      params: Promise.resolve({ id }),
    });
    const view = await res.json();
    expect(view.status).toBe("failed");
    expect(view.error.code).toBe("OCR_UNAVAILABLE");
  });
});

describe("guest data lifetime and cancellation", () => {
  it("deletes the uploaded input as soon as the job finishes", async () => {
    const id = await submitAndTakeJobId({ file: PNG_FILE });
    expect(exists(guestInputPath(id))).toBe(true);

    await completeOldest();
    // The unlink happens in the run's `finally`, after the terminal write, so
    // the file disappears on a later I/O turn than the status does.
    await waitUntil(() => !exists(guestInputPath(id)), "the guest upload to be unlinked");
  });

  it("cancels an in-flight run on DELETE and frees the IP slot", async () => {
    const ip = nextIp();
    const id = await submitAndTakeJobId({ ip, file: PNG_FILE });
    // The cancellation path only exists once the run is inside the processor;
    // deleting earlier simply means there is nothing to abandon.
    await waitUntil(() => guestRuntime.pending.length > 0, "the run to reach the processor");

    const del = await deleteGuestJob(new Request(`http://localhost/api/tools/guest/jobs/${id}`), {
      params: Promise.resolve({ id }),
    });
    expect(del.status).toBe(200);
    expect((await del.json()).deleted).toBe(true);
    expect(exists(guestInputPath(id))).toBe(false);

    // The run is still in flight; finishing it must not resurrect the record.
    await completeOldest();
    const gone = await getGuestJob(new Request(`http://localhost/api/tools/guest/jobs/${id}`), {
      params: Promise.resolve({ id }),
    });
    expect(gone.status).toBe(404);

    const again = await createGuest(postJobs({ ip, file: PNG_FILE }));
    expect(again.status).toBe(202);
    await completeOldest();
  });
});
