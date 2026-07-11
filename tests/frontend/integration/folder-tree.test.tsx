import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { useState } from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import type { FlatFolder } from "@/core/folder-tree";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() },
}));

vi.mock("motion/react", () => {
  const React = require("react");
  const passthrough = (tag: string) =>
    React.forwardRef(({ children, ...props }: any, ref: any) =>
      React.createElement(tag, { ref, ...props }, children),
    );
  return { motion: new Proxy({}, { get: (_t, tag) => passthrough(tag as string) }) };
});

import { FolderTree } from "@/ui/folders/folder-tree";

const flat: FlatFolder[] = [
  {
    id: "1",
    name: "محاضرات",
    parentId: null,
    color: null,
    icon: null,
    order: 0,
    _count: { documents: 1, children: 0 },
  },
];

function Harness() {
  const [selected, setSelected] = useState<string | null>(null);
  return <FolderTree selectedFolderId={selected} onSelectFolder={setSelected} />;
}

describe("FolderTree integration (component ↔ useFolders ↔ /api/folders)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("shows a loading skeleton then renders the loaded folders", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ folders: flat }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<Harness />);
    // loading skeleton present
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    expect(await screen.findByText("محاضرات")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/folders");
  });

  it("renders an empty state and a create affordance when there are no folders", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ folders: [] }) }),
    );
    render(<Harness />);
    expect(await screen.findByText("empty")).toBeInTheDocument();
  });

  it("opens the create dialog, submits, and POSTs a new folder", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ folders: flat }) }) // initial load
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // POST create
      .mockResolvedValueOnce({ ok: true, json: async () => ({ folders: flat }) }); // reload
    vi.stubGlobal("fetch", fetchMock);

    render(<Harness />);
    await screen.findByText("محاضرات");

    fireEvent.click(screen.getByRole("button", { name: /createButton/i }));
    const dialog = await screen.findByRole("dialog");
    const input = within(dialog).getByLabelText(/nameLabel/i);
    fireEvent.change(input, { target: { value: "جديد" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /create/i }));

    await waitFor(() => {
      const calls = fetchMock.mock.calls.map((c: any[]) => ({ url: c[0], method: c[1]?.method }));
      expect(calls.some((c: any) => c.url === "/api/folders" && c.method === "POST")).toBe(true);
    });
    const postCall = fetchMock.mock.calls
      .map((c: any[]) => c)
      .find((c: any[]) => c[1]?.method === "POST");
    expect(JSON.parse(postCall![1].body)).toEqual({ name: "جديد", parentId: null });
  });

  it("selects a folder and reflects selection state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ folders: flat }) }),
    );
    render(<Harness />);
    const row = await screen.findByText("محاضرات");
    fireEvent.click(row);
    expect(row.closest("div")!.className).toContain("bg-[var(--success-bg)]");
  });
});
