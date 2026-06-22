import { folderRepository } from "../repositories/folder.repository";
import { documentRepository } from "../repositories/document.repository";
import { tagRepository } from "../repositories/tag.repository";
import { MAX_FOLDER_DEPTH } from "@/lib/validators/folder";

export interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  color: string | null;
  icon: string | null;
  order: number;
  children: FolderNode[];
  _count: { documents: number; children: number };
}

export class FolderUseCases {
  async getFolders(userId: string, role: string, parentId: string | null) {
    const isAdmin = role === "ADMIN";
    return folderRepository.findMany(userId, {
      where: {
        ...(isAdmin ? {} : { userId }),
        parentId: parentId || null,
        deletedAt: null,
      },
      orderBy: { order: "asc" },
      include: {
        _count: {
          select: { documents: true, children: true },
        },
      },
    });
  }

  async createFolder(
    userId: string,
    data: { name: string; parentId?: string | null; color?: string | null; icon?: string | null },
  ) {
    if (data.parentId) {
      const parentFolder = await folderRepository.findById(data.parentId, userId);
      if (!parentFolder) {
        throw new Error("NOT_FOUND");
      }
    }

    const currentMaxOrder = await folderRepository.getMaxOrder(userId, data.parentId || null);

    return folderRepository.create({
      userId,
      name: data.name,
      parentId: data.parentId || null,
      color: data.color || null,
      icon: data.icon || null,
      order: currentMaxOrder + 1,
    });
  }

  async getFolderById(id: string, userId: string) {
    const folder = await folderRepository.findById(id, userId, {
      _count: {
        select: { documents: true, children: true },
      },
      parent: {
        select: { id: true, name: true },
      },
    });

    if (!folder) throw new Error("NOT_FOUND");
    return folder;
  }

  async renameFolder(id: string, userId: string, name: string) {
    const folder = await folderRepository.findById(id, userId);
    if (!folder) throw new Error("NOT_FOUND");

    return folderRepository.update(id, userId, { name });
  }

  async deleteFolder(id: string, userId: string) {
    const folder = await folderRepository.findById(id, userId);
    if (!folder) throw new Error("NOT_FOUND");

    const allUserFolders = await folderRepository.findMany(userId, {
      select: { id: true, parentId: true },
    });

    const childMap = new Map<string, string[]>();
    for (const f of allUserFolders) {
      const children = childMap.get(f.parentId ?? "") ?? [];
      children.push(f.id);
      childMap.set(f.parentId ?? "", children);
    }

    const getDescendantIds = (parentId: string): string[] => {
      const ids: string[] = [];
      const stack = [parentId];
      while (stack.length > 0) {
        const currentId = stack.pop()!;
        const children = childMap.get(currentId) ?? [];
        for (const childId of children) {
          ids.push(childId);
          stack.push(childId);
        }
      }
      return ids;
    };

    const descendantIds = getDescendantIds(id);
    const allFolderIds = [id, ...descendantIds];

    await folderRepository.updateMany(
      { id: { in: allFolderIds }, userId },
      { deletedAt: new Date() },
    );
    await documentRepository.updateMany(
      { folderId: { in: allFolderIds }, userId, deletedAt: null },
      { folderId: null },
    );
  }

  async emptyFolder(id: string, userId: string) {
    const folder = await folderRepository.findById(id, userId);
    if (!folder) throw new Error("NOT_FOUND");

    const docsUpdated = await documentRepository.updateMany(
      { folderId: id, userId, deletedAt: null },
      { folderId: null },
    );

    const subfoldersUpdated = await folderRepository.updateMany(
      { parentId: id, userId },
      { parentId: folder.parentId || null },
    );

    return { documentsMoved: docsUpdated.count, foldersMoved: subfoldersUpdated.count };
  }

  async moveFolder(id: string, userId: string, parentId?: string | null) {
    const sourceFolder = await folderRepository.findById(id, userId);
    if (!sourceFolder) throw new Error("NOT_FOUND");

    if (id === parentId) throw new Error("CIRCULAR_REFERENCE");

    if (parentId) {
      const targetFolder = await folderRepository.findById(parentId, userId);
      if (!targetFolder) throw new Error("TARGET_NOT_FOUND");
    }

    const allUserFolders = await folderRepository.findMany(userId, {
      select: { id: true, parentId: true },
    });

    const folderMap = new Map<string, { parentId: string | null }>();
    for (const f of allUserFolders) {
      folderMap.set(f.id, { parentId: f.parentId });
    }

    if (parentId) {
      let currentId: string | null = parentId;
      while (currentId) {
        if (currentId === id) throw new Error("CIRCULAR_REFERENCE");
        const f = folderMap.get(currentId);
        currentId = f?.parentId ?? null;
      }

      let depth = 0;
      currentId = parentId;
      while (currentId) {
        const f = folderMap.get(currentId);
        if (!f?.parentId) break;
        depth++;
        currentId = f.parentId;
      }

      if (depth + 1 >= MAX_FOLDER_DEPTH) throw new Error("MAX_DEPTH_REACHED");
    }

    return folderRepository.update(id, userId, { parentId: parentId || null });
  }

  async restoreFolder(id: string, userId: string) {
    const folder = await folderRepository.findMany(userId, {
      where: { id },
      take: 1,
    });

    if (!folder.length) throw new Error("NOT_FOUND");

    const folderToRestore = folder[0];
    if (!folderToRestore) throw new Error("NOT_FOUND");
    if (folderToRestore.parentId) {
      const parent = await folderRepository.findById(folderToRestore.parentId, userId);
      if (!parent) throw new Error("PARENT_DELETED");
    }

    return folderRepository.restore(id, userId);
  }

  async getFolderTree(id: string, userId: string) {
    const targetFolder = await folderRepository.findById(id, userId);
    if (!targetFolder) throw new Error("NOT_FOUND");

    const allFolders = await folderRepository.findMany(userId, {
      orderBy: { order: "asc" },
      include: {
        _count: { select: { documents: true, children: true } },
      },
    });

    const buildTree = (
      folders: Omit<FolderNode, "children">[],
      parentId: string | null,
    ): FolderNode[] => {
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
          children: buildTree(folders, f.id),
          _count: f._count,
        }));
    };

    return {
      tree: buildTree(allFolders as unknown as Omit<FolderNode, "children">[], null),
      targetFolder,
    };
  }

  async getFolderTags(id: string, userId: string, role: string) {
    const tags = await tagRepository.findFolderTags(userId, role, id === "root" ? null : id);

    return tags
      .map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        count: t._count.documents,
      }))
      .sort((a, b) => b.count - a.count);
  }
}

export const folderUseCases = new FolderUseCases();
