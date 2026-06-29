import { describe, it, expect } from "vitest";
import {
  isFolderRoot,
  isFolderDeleted,
  canDeleteFolder,
  canRestoreFolder,
  getFolderPath,
  getFolderDepth,
} from "../../apps/web/src/domain/folder";
import type { DomainFolder } from "../../apps/web/src/domain/types";

function makeFolder(overrides: Partial<DomainFolder> = {}): DomainFolder {
  return {
    id: "folder-1",
    userId: "user-1",
    name: "Test Folder",
    parentId: null,
    color: null,
    icon: null,
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

describe("Domain: Folder", () => {
  describe("isFolderRoot", () => {
    it("returns true when parentId is null", () => {
      const folder = makeFolder({ parentId: null });
      expect(isFolderRoot(folder)).toBe(true);
    });

    it("returns false when parentId is set", () => {
      const folder = makeFolder({ parentId: "parent-1" });
      expect(isFolderRoot(folder)).toBe(false);
    });
  });

  describe("isFolderDeleted", () => {
    it("returns false when deletedAt is null", () => {
      const folder = makeFolder({ deletedAt: null });
      expect(isFolderDeleted(folder)).toBe(false);
    });

    it("returns true when deletedAt is set", () => {
      const folder = makeFolder({ deletedAt: new Date() });
      expect(isFolderDeleted(folder)).toBe(true);
    });
  });

  describe("canDeleteFolder", () => {
    it("returns true for active folder", () => {
      const folder = makeFolder({ deletedAt: null });
      expect(canDeleteFolder(folder)).toBe(true);
    });

    it("returns false for deleted folder", () => {
      const folder = makeFolder({ deletedAt: new Date() });
      expect(canDeleteFolder(folder)).toBe(false);
    });
  });

  describe("canRestoreFolder", () => {
    it("returns true for deleted folder", () => {
      const folder = makeFolder({ deletedAt: new Date() });
      expect(canRestoreFolder(folder)).toBe(true);
    });

    it("returns false for active folder", () => {
      const folder = makeFolder({ deletedAt: null });
      expect(canRestoreFolder(folder)).toBe(false);
    });
  });

  describe("getFolderPath", () => {
    it("returns single folder for root", () => {
      const root = makeFolder({ id: "root", parentId: null });
      const path = getFolderPath("root", [root]);
      expect(path).toHaveLength(1);
      expect(path[0].id).toBe("root");
    });

    it("returns correct path for nested folders", () => {
      const root = makeFolder({ id: "root", parentId: null });
      const child = makeFolder({ id: "child", parentId: "root" });
      const grandchild = makeFolder({ id: "grandchild", parentId: "child" });

      const path = getFolderPath("grandchild", [root, child, grandchild]);
      expect(path).toHaveLength(3);
      expect(path.map((f) => f.id)).toEqual(["root", "child", "grandchild"]);
    });

    it("returns partial path if intermediate missing", () => {
      const child = makeFolder({ id: "child", parentId: "missing" });
      const path = getFolderPath("child", [child]);
      expect(path).toHaveLength(1);
    });
  });

  describe("getFolderDepth", () => {
    it("returns 0 for root folder", () => {
      const root = makeFolder({ id: "root", parentId: null });
      expect(getFolderDepth("root", [root])).toBe(0);
    });

    it("returns correct depth for nested folders", () => {
      const root = makeFolder({ id: "root", parentId: null });
      const child = makeFolder({ id: "child", parentId: "root" });
      const grandchild = makeFolder({ id: "grandchild", parentId: "child" });

      expect(getFolderDepth("grandchild", [root, child, grandchild])).toBe(2);
    });
  });
});
