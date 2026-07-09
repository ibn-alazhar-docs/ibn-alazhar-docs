import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { buildFolderTree, type FlatFolder } from "@/core/folder-tree";
import { useFolders } from "@/ui/folders/use-folders";

const flat: FlatFolder[] = [
  { id: "1", name: "A", parentId: null, color: null, icon: null, order: 0, _count: { documents: 2, children: 1 } },
  { id: "2", name: "B", parentId: "1", color: null, icon: null, order: 0, _count: { documents: 0, children: 0 } },
];

describe("useFolders (hook)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("starts in a loading state with no folders", () => {
    const { result } = renderHook(() => useFolders());
    expect(result.current.loading).toBe(true);
    expect(result.current.folders).toEqual([]);
  });

  it("loads and builds the folder tree from the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ folders: flat }),
      }),
    );
    const { result } = renderHook(() => useFolders());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.folders).toHaveLength(1);
    expect(result.current.folders[0].name).toBe("A");
    expect(result.current.folders[0].children[0].name).toBe("B");
  });

  it("stops loading even when the request fails (folders stay empty)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const { result } = renderHook(() => useFolders());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.folders).toEqual([]);
  });

  it("createFolder POSTs and reloads", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useFolders());

    await act(async () => {
      await result.current.createFolder("New", null);
    });
    const postCall = fetchMock.mock.calls.find((c: any[]) => c[1]?.method === "POST");
    expect(postCall![0]).toBe("/api/folders");
    expect(JSON.parse(postCall![1].body)).toEqual({ name: "New", parentId: null });
  });

  it("createFolder throws on non-2xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "dup" }) }),
    );
    const { result } = renderHook(() => useFolders());
    await expect(result.current.createFolder("X", null)).rejects.toThrow("dup");
  });

  it("deleteFolder DELETEs the folder id", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useFolders());
    await act(async () => {
      await result.current.deleteFolder("folder-9");
    });
    const deleteCall = fetchMock.mock.calls.find((c: any[]) => c[1]?.method === "DELETE");
    expect(deleteCall![0]).toBe("/api/folders/folder-9");
  });

  it("renameFolder PATCHes the new name", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useFolders());
    await act(async () => {
      await result.current.renameFolder("folder-9", "Renamed");
    });
    const patchCall = fetchMock.mock.calls.find((c: any[]) => c[1]?.method === "PATCH");
    const body = JSON.parse(patchCall![1].body);
    expect(body).toEqual({ name: "Renamed" });
  });

  it("moveFolder POSTs the new parent", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useFolders());
    await act(async () => {
      await result.current.moveFolder("folder-9", "parent-1");
    });
    const postCall = fetchMock.mock.calls.find((c: any[]) => c[1]?.method === "POST");
    expect(postCall![0]).toBe("/api/folders/folder-9/move");
    expect(JSON.parse(postCall![1].body)).toEqual({ parentId: "parent-1" });
  });

  it("reuses a deterministic tree (helpers sanity)", () => {
    const tree = buildFolderTree(flat, null);
    expect(tree).toHaveLength(1);
    expect(tree[0].children[0].id).toBe("2");
  });
});
