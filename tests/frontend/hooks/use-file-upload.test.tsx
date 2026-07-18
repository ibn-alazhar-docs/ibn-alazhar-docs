import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useFileUpload } from "@/state/use-file-upload";

const onUploadStart = vi.fn();

function makeFile(name: string, type: string, size = 1024): File {
  return new File(["x"], name, { type });
}

describe("useFileUpload (hook)", () => {
  beforeEach(() => {
    onUploadStart.mockClear();
    vi.stubGlobal("fetch", vi.fn());
    delete (window as unknown as Record<string, unknown>).onbeforeunload;
  });

  it("rejects non-PDF / non-image files", () => {
    const { result } = renderHook(() => useFileUpload({ onUploadStart }));
    expect(result.current.validateFile(makeFile("a.txt", "text/plain"))).toBe("errorInvalidType");
    expect(result.current.validateFile(makeFile("a.doc", "application/msword"))).toBe(
      "errorInvalidType",
    );
  });

  it("accepts pdf and image files", () => {
    const { result } = renderHook(() => useFileUpload({ onUploadStart }));
    expect(result.current.validateFile(makeFile("a.pdf", "application/pdf"))).toBeNull();
    expect(result.current.validateFile(makeFile("a.png", "image/png"))).toBeNull();
    expect(result.current.validateFile(makeFile("a.JPG", ""))).toBeNull();
  });

  it("rejects files larger than 5GB", () => {
    const { result } = renderHook(() => useFileUpload({ onUploadStart }));
    const big = makeFile("big.pdf", "application/pdf");
    Object.defineProperty(big, "size", { value: 6 * 1024 * 1024 * 1024 });
    expect(result.current.validateFile(big)).toBe("errorTooLarge");
  });

  it("selects a pdf and flags the visual selector", () => {
    const { result } = renderHook(() => useFileUpload({ onUploadStart }));
    act(() => result.current.handleFileSelect(makeFile("d.pdf", "application/pdf")));
    expect(result.current.file?.name).toBe("d.pdf");
    expect(result.current.showVisualSelector).toBe(true);
    expect(typeof window.onbeforeunload).toBe("function");
  });

  it("does not flag the visual selector for images", () => {
    const { result } = renderHook(() => useFileUpload({ onUploadStart }));
    act(() => result.current.handleFileSelect(makeFile("d.png", "image/png")));
    expect(result.current.showVisualSelector).toBe(false);
  });

  it("sets an error when selecting an invalid file", () => {
    const { result } = renderHook(() => useFileUpload({ onUploadStart }));
    act(() => result.current.handleFileSelect(makeFile("d.txt", "text/plain")));
    expect(result.current.error).toBe("errorInvalidType");
    expect(result.current.file).toBeNull();
  });

  it("uploads successfully and reports progress + job", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/health/ready") {
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ jobId: "job-123" }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useFileUpload({ folderId: "f1", onUploadStart }));

    act(() => result.current.handleFileSelect(makeFile("d.pdf", "application/pdf")));
    await act(async () => {
      await result.current.processUpload();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/upload",
      expect.objectContaining({ method: "POST" }),
    );
    // body should carry file + folderId
    const body = fetchMock.mock.calls[1]![1].body as FormData;
    expect(body.get("folderId")).toBe("f1");
    expect(result.current.progress).toBe(100);
    expect(onUploadStart).toHaveBeenCalledWith("job-123", "d.pdf");
  });

  it("surfaces server error message on failed upload", async () => {
    const errorBody = JSON.stringify({ error: { message: "فشل الرفع" } });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url === "/api/health/ready") {
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({
          ok: false,
          status: 400,
          text: async () => errorBody,
          json: async () => ({ error: { message: "فشل الرفع" } }),
        });
      }),
    );
    const { result } = renderHook(() => useFileUpload({ onUploadStart }));
    act(() => result.current.handleFileSelect(makeFile("d.pdf", "application/pdf")));
    await act(async () => {
      await result.current.processUpload();
    });
    expect(result.current.error).toBe("فشل الرفع");
  });

  it("resets all state", () => {
    const { result } = renderHook(() => useFileUpload({ onUploadStart }));
    act(() => result.current.handleFileSelect(makeFile("d.png", "image/png")));
    act(() => result.current.reset());
    expect(result.current.file).toBeNull();
    expect(result.current.showVisualSelector).toBe(false);
    expect(result.current.pageRange).toBe("");
    expect(result.current.error).toBeNull();
  });
});
