import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";



import { FolderItem } from "@/ui/folders/folder-item";
import { createFolderNode } from "../test-utils";

function setup(folder = createFolderNode({ name: "مجلد 1" })) {
  const handlers = {
    onSelect: vi.fn(),
    onRename: vi.fn(),
    onDelete: vi.fn(),
    onMove: vi.fn(),
  };
  render(
    <FolderItem
      folder={folder}
      level={0}
      selectedFolderId={null}
      onSelect={handlers.onSelect}
      onRename={handlers.onRename}
      onDelete={handlers.onDelete}
      onMove={handlers.onMove}
    />,
  );
  return handlers;
}

describe("FolderItem (component)", () => {
  it("renders the folder name", () => {
    setup(createFolderNode({ name: "محاضرات" }));
    expect(screen.getByText("محاضرات")).toBeInTheDocument();
  });

  it("calls onSelect when the row is clicked", () => {
    const h = setup(createFolderNode({ id: "f-9", name: "X" }));
    fireEvent.click(screen.getByText("X"));
    expect(h.onSelect).toHaveBeenCalledWith("f-9");
  });

  it("shows a document-count badge when documents > 0", () => {
    setup(createFolderNode({ name: "Y", _count: { documents: 4, children: 0 } }));
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("expands/collapses children", () => {
    const child = createFolderNode({ id: "c1", name: "طفل", parentId: "p1" });
    const parent = createFolderNode({
      id: "p1",
      name: "أب",
      children: [child],
      _count: { documents: 0, children: 1 },
    });
    setup(parent);
    expect(screen.getByText("طفل")).toBeInTheDocument();
    // collapse
    fireEvent.click(screen.getAllByRole("button", { name: "collapse" })[0]);
    expect(screen.queryByText("طفل")).not.toBeInTheDocument();
    // expand again
    fireEvent.click(screen.getAllByRole("button", { name: "expand" })[0]);
    expect(screen.getByText("طفل")).toBeInTheDocument();
  });

  it("hides expand control when no children", () => {
    setup(createFolderNode({ name: "Z", _count: { documents: 0, children: 0 } }));
    expect(screen.queryByRole("button", { name: "expand" })).not.toBeInTheDocument();
  });

  it("opens the actions menu and exposes rename/move/delete", () => {
    const h = setup(createFolderNode({ id: "f-2", name: "M" }));
    fireEvent.click(screen.getByRole("button", { name: "settings" }));
    expect(screen.getByText("rename")).toBeInTheDocument();
    expect(screen.getByText("moveTo")).toBeInTheDocument();
    expect(screen.getByText("delete")).toBeInTheDocument();
    expect(h.onDelete).not.toHaveBeenCalled();
  });

  it("calls onDelete from the menu", () => {
    const h = setup(createFolderNode({ id: "f-3", name: "D" }));
    fireEvent.click(screen.getByRole("button", { name: "settings" }));
    fireEvent.click(screen.getByText("delete"));
    expect(h.onDelete).toHaveBeenCalledWith("f-3");
  });

  it("calls onMove from the menu", () => {
    const h = setup(createFolderNode({ id: "f-4", name: "V", parentId: "par" }));
    fireEvent.click(screen.getByRole("button", { name: "settings" }));
    fireEvent.click(screen.getByText("moveTo"));
    expect(h.onMove).toHaveBeenCalledWith("f-4", "par");
  });

  it("enters rename mode and commits on Enter", () => {
    const h = setup(createFolderNode({ id: "f-5", name: "old" }));
    fireEvent.click(screen.getByRole("button", { name: "settings" }));
    fireEvent.click(screen.getByText("rename"));
    const input = screen.getByLabelText("rename") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "new" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(h.onRename).toHaveBeenCalledWith("f-5", "new");
  });

  it("cancels rename on Escape without committing", () => {
    const h = setup(createFolderNode({ id: "f-6", name: "old" }));
    fireEvent.click(screen.getByRole("button", { name: "settings" }));
    fireEvent.click(screen.getByText("rename"));
    const input = screen.getByLabelText("rename") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "new" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(h.onRename).not.toHaveBeenCalled();
  });

  it("closes the menu when clicking outside", () => {
    setup(createFolderNode({ id: "f-7", name: "O" }));
    fireEvent.click(screen.getByRole("button", { name: "settings" }));
    expect(screen.getByText("rename")).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText("rename")).not.toBeInTheDocument();
  });

  it("applies selected styling when selectedFolderId matches", () => {
    render(
      <FolderItem
        folder={createFolderNode({ id: "f-8", name: "S" })}
        level={0}
        selectedFolderId="f-8"
        onSelect={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
        onMove={vi.fn()}
      />,
    );
    const row = screen.getByText("S").closest("div")!;
    expect(row.className).toContain("bg-[var(--success-bg)]");
  });
});
