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

export function buildFolderTree(folders: FlatFolder[]): FolderNode[] {
  const nodes: (FlatFolder & { children: FolderNode[] })[] = folders.map((f) => ({
    ...f,
    children: [] as FolderNode[],
  }));
  const folderMap = new Map(nodes.map((f) => [f.id, f]));
  const rootNodes: FolderNode[] = [];

  for (const folder of nodes) {
    if (folder.parentId && folderMap.has(folder.parentId)) {
      const parent = folderMap.get(folder.parentId);
      if (parent) {
        parent.children.push(folder);
      }
    } else if (!folder.parentId) {
      rootNodes.push(folder);
    }
  }

  return rootNodes;
}
