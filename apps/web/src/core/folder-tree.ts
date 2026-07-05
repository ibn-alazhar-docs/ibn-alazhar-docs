import type { FolderNode, FlatFolder } from "@/lib/shared/build-folder-tree";

interface FolderParent {
  parentId: string | null;
}

/**
 * Recursively finds the maximum depth of all descendants from a given folder.
 * Used to enforce MAX_FOLDER_DEPTH constraints before move operations.
 */
export function getDescendantMaxDepth(
  folderId: string,
  currentDepth: number,
  folderMap: Map<string, FolderParent>,
): number {
  const children = Array.from(folderMap.entries())
    .filter(([, f]) => f.parentId === folderId)
    .map(([id]) => id);
  if (children.length === 0) return currentDepth;
  return Math.max(
    ...children.map((childId) => getDescendantMaxDepth(childId, currentDepth + 1, folderMap)),
  );
}

/**
 * Converts a flat folder list into a nested tree structure.
 * Maintains sort order via the `order` field on each node.
 */
export function buildFolderTree(folders: FlatFolder[], parentId: string | null): FolderNode[] {
  const nodes: (FlatFolder & { children: FolderNode[] })[] = folders.map((f) => ({
    ...f,
    children: [] as FolderNode[],
  }));
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const roots: FolderNode[] = [];

  for (const node of nodes) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(node);
    } else if (node.parentId === parentId) {
      roots.push(node);
    }
  }

  const sortChildren = (nodes: FolderNode[]): FolderNode[] => {
    nodes.sort((a, b) => a.order - b.order);
    for (const n of nodes) sortChildren(n.children);
    return nodes;
  };

  return sortChildren(roots);
}
