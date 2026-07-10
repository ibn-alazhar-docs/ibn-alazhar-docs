import { describe, it, expect, vi, beforeEach } from "vitest";
import { useRef } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { useFileUpload } from "@/state/use-file-upload";

/** Tiny harness that wires the hook to a real <input type="file"> + upload button. */
function UploadHarness({ folderId }: { folderId?: string }) {
  const onUploadStart = vi.fn();
  const hook = useFileUpload({ folderId, onUploadStart });
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        data-testid="file"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) hook.handleFileSelect(f);
        }}
      />
      <button type="button" onClick={() => hook.processUpload()}>
        رفع
      </button>
      <span data-testid="progress">{hook.progress}</span>
      <span data-testid="error">{hook.error ?? ""}</span>
      <span data-testid="started">{String(hook.file?.name ?? "")}</span>
    </div>
  );
}

describe("Document upload integration (component ↔ hook ↔ /api/upload)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    URL.createObjectURL = vi.fn(() => "blob:x");
  });

  it("uploads the selected file as multipart FormData", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ jobId: "job-xyz" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const onUploadStart = vi.fn();
    function Local() {
      return <UploadHarness folderId="f-22" />;
    }
    // attach onUploadStart via closure by overriding the hook is not possible;
    // instead assert fetch payload + progress only.
    render(<Local />);

    const file = new File(["pdf-bytes"], "book.pdf", { type: "application/pdf" });
    const input = screen.getByTestId("file") as HTMLInputElement;
    // jsdom doesn't implement DataTransfer; assign files directly
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    fireEvent.change(input);

    fireEvent.click(screen.getByRole("button", { name: "رفع" }));

    await waitFor(() => expect(screen.getByTestId("progress").textContent).toBe("100"));
    const [url, opts] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/upload");
    expect(opts.method).toBe("POST");
    const body = opts.body as FormData;
    expect(body.get("file")).toBeInstanceOf(File);
    expect((body.get("file") as File).name).toBe("book.pdf");
    expect(body.get("folderId")).toBe("f-22");
  });

  it("rejects an unsupported file type at the form boundary", () => {
    render(<UploadHarness />);
    const input = screen.getByTestId("file") as HTMLInputElement;
    const file = new File(["x"], "notes.txt", { type: "text/plain" });
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    fireEvent.change(input);
    expect(screen.getByTestId("error").textContent).toBe("errorInvalidType");
  });

  it("surfaces upload failure to the UI", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: { message: "الملف كبير جداً" } }),
      }),
    );
    render(<UploadHarness />);
    const input = screen.getByTestId("file") as HTMLInputElement;
    const file = new File(["x"], "book.pdf", { type: "application/pdf" });
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    fireEvent.change(input);
    fireEvent.click(screen.getByRole("button", { name: "رفع" }));
    expect(await screen.findByTestId("error")).toHaveTextContent("الملف كبير جداً");
  });
});
