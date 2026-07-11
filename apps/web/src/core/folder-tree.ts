export interface FlatFolder {
  id: string;
  name: string;
  parentId: string | null;
  color: string | null;
  icon: string | null;
  order: number;
  _count: { documents: number; children: number };
}

export interface FolderNode extends FlatFolder {
  children: FolderNode[];
}

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
  visited: Set<string> = new Set(),
  childrenIndex?: Map<string | null, string[]>,
): number {
  // Guard against cyclic parent references (corrupt data) to avoid infinite recursion.
  if (visited.has(folderId)) return currentDepth;
  visited.add(folderId);

  const index = childrenIndex ?? buildChildrenIndex(folderMap);
  const children = index.get(folderId) ?? [];
  if (children.length === 0) return currentDepth;
  return Math.max(
    ...children.map((childId) =>
      getDescendantMaxDepth(childId, currentDepth + 1, folderMap, visited, index),
    ),
  );
}

function buildChildrenIndex(folderMap: Map<string, FolderParent>): Map<string | null, string[]> {
  const index = new Map<string | null, string[]>();
  for (const [id, folder] of folderMap.entries()) {
    const list = index.get(folder.parentId) ?? [];
    list.push(id);
    index.set(folder.parentId, list);
  }
  return index;
}

/**
 * Converts a flat folder list into a nested tree structure.
 * Maintains deterministic sort order via the `order` field on each node.
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
