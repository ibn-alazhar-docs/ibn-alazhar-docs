import { describe, it, expect } from "vitest";
import { buildFolderTree, type FlatFolder } from "@/lib/shared/build-folder-tree";

function makeFolder(overrides: Partial<FlatFolder> = {}): FlatFolder {
  return {
    id: "folder-1",
    name: "Default",
    parentId: null,
    color: null,
    icon: null,
    order: 0,
    _count: { documents: 0, children: 0 },
    ...overrides,
  };
}

describe("buildFolderTree", () => {
  it("returns empty array for empty input", () => {
    expect(buildFolderTree([])).toEqual([]);
  });

  it("single root folder returns one root node", () => {
    const folders = [makeFolder({ id: "r1", name: "Root" })];
    const tree = buildFolderTree(folders);
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe("r1");
    expect(tree[0].children).toEqual([]);
  });

  it("multiple root folders returned at top level", () => {
    const folders = [
      makeFolder({ id: "r1", name: "Root 1" }),
      makeFolder({ id: "r2", name: "Root 2" }),
      makeFolder({ id: "r3", name: "Root 3" }),
    ];
    const tree = buildFolderTree(folders);
    expect(tree).toHaveLength(3);
  });

  it("child folder nested under parent", () => {
    const folders = [
      makeFolder({ id: "parent", name: "Parent" }),
      makeFolder({ id: "child", name: "Child", parentId: "parent" }),
    ];
    const tree = buildFolderTree(folders);
    expect(tree).toHaveLength(1);
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].id).toBe("child");
  });

  it("deep nesting (3 levels)", () => {
    const folders = [
      makeFolder({ id: "a", name: "A" }),
      makeFolder({ id: "b", name: "B", parentId: "a" }),
      makeFolder({ id: "c", name: "C", parentId: "b" }),
    ];
    const tree = buildFolderTree(folders);
    expect(tree).toHaveLength(1);
    expect(tree[0].children[0].children[0].id).toBe("c");
  });

  it("orphaned child (parentId points to nonexistent) is excluded from tree", () => {
    const folders = [makeFolder({ id: "orphan", name: "Orphan", parentId: "nonexistent" })];
    const tree = buildFolderTree(folders);
    expect(tree).toHaveLength(0);
  });

  it("multiple children under same parent", () => {
    const folders = [
      makeFolder({ id: "parent", name: "Parent" }),
      makeFolder({ id: "c1", name: "C1", parentId: "parent" }),
      makeFolder({ id: "c2", name: "C2", parentId: "parent" }),
      makeFolder({ id: "c3", name: "C3", parentId: "parent" }),
    ];
    const tree = buildFolderTree(folders);
    expect(tree).toHaveLength(1);
    expect(tree[0].children).toHaveLength(3);
  });

  it("mixed: roots with children and standalone roots", () => {
    const folders = [
      makeFolder({ id: "r1", name: "Root 1" }),
      makeFolder({ id: "r2", name: "Root 2" }),
      makeFolder({ id: "c1", name: "Child 1", parentId: "r1" }),
      makeFolder({ id: "c2", name: "Child 2", parentId: "r2" }),
    ];
    const tree = buildFolderTree(folders);
    expect(tree).toHaveLength(2);
    expect(tree[0].children).toHaveLength(1);
    expect(tree[1].children).toHaveLength(1);
  });

  it("preserves folder metadata (color, icon, order, _count)", () => {
    const folders = [
      makeFolder({
        id: "f1",
        name: "Colored",
        color: "#FF0000",
        icon: "book",
        order: 3,
        _count: { documents: 5, children: 2 },
      }),
    ];
    const tree = buildFolderTree(folders);
    expect(tree[0].color).toBe("#FF0000");
    expect(tree[0].icon).toBe("book");
    expect(tree[0].order).toBe(3);
    expect(tree[0]._count.documents).toBe(5);
  });

  it("children array starts empty for leaf nodes", () => {
    const folders = [
      makeFolder({ id: "parent", name: "Parent" }),
      makeFolder({ id: "child", name: "Child", parentId: "parent" }),
    ];
    const tree = buildFolderTree(folders);
    expect(tree[0].children[0].children).toEqual([]);
  });
});
