import type { DomainFolder } from "./types";

export function isFolderRoot(folder: DomainFolder): boolean {
  return folder.parentId === null;
}

export function isFolderDeleted(folder: DomainFolder): boolean {
  return folder.deletedAt !== null;
}

export function canDeleteFolder(folder: DomainFolder): boolean {
  return !isFolderDeleted(folder);
}

export function canRestoreFolder(folder: DomainFolder): boolean {
  return isFolderDeleted(folder);
}

export function getFolderPath(folderId: string, allFolders: DomainFolder[]): DomainFolder[] {
  const map = new Map(allFolders.map((f) => [f.id, f]));
  const path: DomainFolder[] = [];
  let currentId: string | null = folderId;

  while (currentId) {
    const folder = map.get(currentId);
    if (!folder) break;
    path.unshift(folder);
    currentId = folder.parentId;
  }

  return path;
}

export function getFolderDepth(folderId: string, allFolders: DomainFolder[]): number {
  return getFolderPath(folderId, allFolders).length - 1;
}
