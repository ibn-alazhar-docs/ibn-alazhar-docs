import { MAX_FOLDER_DEPTH } from "@/lib/validators/folder";
import type { FolderNode, FlatFolder } from "@/lib/build-folder-tree";
import { AppError } from "@/lib/errors";
import { ERROR_CODES } from "@/lib/constants";

interface FolderParent {
  parentId: string | null;
}

export class FolderTreeService {
  detectCircularReference(
    folderId: string,
    targetParentId: string,
    folderMap: Map<string, FolderParent>,
  ): boolean {
    let currentId: string | null = targetParentId;
    while (currentId) {
      if (currentId === folderId) return true;
      const f = folderMap.get(currentId);
      currentId = f?.parentId ?? null;
    }
    return false;
  }

  calculateDepth(targetParentId: string, folderMap: Map<string, FolderParent>): number {
    let depth = 0;
    let currentId: string | null = targetParentId;
    while (currentId) {
      const f = folderMap.get(currentId);
      if (!f?.parentId) break;
      depth++;
      currentId = f.parentId;
    }
    return depth;
  }

  getDescendantMaxDepth(
    folderId: string,
    currentDepth: number,
    folderMap: Map<string, FolderParent>,
  ): number {
    const children = Array.from(folderMap.entries())
      .filter(([, f]) => f.parentId === folderId)
      .map(([id]) => id);
    if (children.length === 0) return currentDepth;
    return Math.max(
      ...children.map((childId) =>
        this.getDescendantMaxDepth(childId, currentDepth + 1, folderMap),
      ),
    );
  }

  validateMoveDepth(
    folderId: string,
    targetParentId: string,
    folderMap: Map<string, FolderParent>,
  ): void {
    const depth = this.calculateDepth(targetParentId, folderMap);
    const sourceMaxDepth = this.getDescendantMaxDepth(folderId, 0, folderMap);
    if (depth + 1 + sourceMaxDepth >= MAX_FOLDER_DEPTH) {
      throw new AppError("تم الوصول للحد الأقصى من العمق", ERROR_CODES.MAX_DEPTH_REACHED, 400);
    }
  }

  buildTree(folders: FlatFolder[], parentId: string | null): FolderNode[] {
    return folders
      .filter((f) => f.parentId === parentId)
      .sort((a, b) => a.order - b.order)
      .map((f) => ({
        id: f.id,
        name: f.name,
        parentId: f.parentId,
        color: f.color,
        icon: f.icon,
        order: f.order,
        children: this.buildTree(folders, f.id),
        _count: f._count,
      }));
  }
}
