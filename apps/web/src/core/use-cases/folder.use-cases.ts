import { MAX_FOLDER_DEPTH } from "@/lib/validators/folder";
import type { FolderNode } from "@/lib/build-folder-tree";
import { AppError, NotFoundError } from "@/lib/errors";
import type { IFolderRepository } from "@/domain/repositories/folder.repository.interface";
import type { ITagRepository } from "@/domain/repositories/tag.repository.interface";

export class FolderUseCases {
  constructor(
    private readonly folderRepository: IFolderRepository,
    private readonly tagRepository: ITagRepository,
  ) {}

  async getFolders(userId: string, role: string, parentId: string | null) {
    const isAdmin = role === "ADMIN";
    return this.folderRepository.findMany(userId, {
      where: {
        ...(isAdmin ? {} : { userId }),
        parentId: parentId || null,
        deletedAt: null,
      },
      orderBy: { order: "asc" },
      include: {
        _count: { select: { documents: true, children: true } },
      },
    });
  }

  async createFolder(
    userId: string,
    data: { name: string; parentId?: string | null; color?: string | null; icon?: string | null },
  ) {
    if (data.parentId) {
      const parentFolder = await this.folderRepository.findById(data.parentId, userId);
      if (!parentFolder) throw new NotFoundError();
    }

    // Use atomic increment to avoid race condition
    const maxOrder = await this.folderRepository.getMaxOrder(userId, data.parentId || null);

    return this.folderRepository.create({
      userId,
      name: data.name,
      parentId: data.parentId || null,
      color: data.color || null,
      icon: data.icon || null,
      order: maxOrder + 1,
    });
  }

  async getFolderById(id: string, userId: string) {
    const folder = await this.folderRepository.findById(id, userId, {
      _count: { select: { documents: true, children: true } },
      parent: { select: { id: true, name: true } },
    });
    if (!folder) throw new NotFoundError();
    return folder;
  }

  async renameFolder(id: string, userId: string, name: string) {
    const folder = await this.folderRepository.findById(id, userId);
    if (!folder) throw new NotFoundError();
    return this.folderRepository.update(id, userId, { name });
  }

  async deleteFolder(id: string, userId: string) {
    const folder = await this.folderRepository.findById(id, userId);
    if (!folder) throw new NotFoundError();

    const allUserFolders = await this.folderRepository.findMany(userId, {
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

    await this.folderRepository.transaction(async (tx) => {
      await tx.folder.updateMany({
        where: { id: { in: allFolderIds }, userId },
        data: { deletedAt: new Date() },
      });
      await tx.document.updateMany({
        where: { folderId: { in: allFolderIds }, userId, deletedAt: null },
        data: { folderId: null },
      });
    });
  }

  async emptyFolder(id: string, userId: string) {
    const folder = await this.folderRepository.findById(id, userId);
    if (!folder) throw new NotFoundError();

    const [docsUpdated, subfoldersUpdated] = await this.folderRepository.transaction(async (tx) => {
      const docs = await tx.document.updateMany({
        where: { folderId: id, userId, deletedAt: null },
        data: { folderId: null },
      });
      const subs = await tx.folder.updateMany({
        where: { parentId: id, userId },
        data: { parentId: folder.parentId || null },
      });
      return [docs, subs] as const;
    });

    return { documentsMoved: docsUpdated.count, foldersMoved: subfoldersUpdated.count };
  }

  async moveFolder(id: string, userId: string, parentId?: string | null) {
    const sourceFolder = await this.folderRepository.findById(id, userId);
    if (!sourceFolder) throw new NotFoundError();

    if (id === parentId) throw new AppError("مرجع دائري", "CIRCULAR_REFERENCE", 400);

    if (parentId) {
      const targetFolder = await this.folderRepository.findById(parentId, userId);
      if (!targetFolder) throw new AppError("المجلد الهدف غير موجود", "TARGET_NOT_FOUND", 404);
    }

    const allUserFolders = await this.folderRepository.findMany(userId, {
      select: { id: true, parentId: true },
    });

    const folderMap = new Map<string, { parentId: string | null }>();
    for (const f of allUserFolders) {
      folderMap.set(f.id, { parentId: f.parentId });
    }

    if (parentId) {
      let currentId: string | null = parentId;
      while (currentId) {
        if (currentId === id) throw new AppError("مرجع دائري", "CIRCULAR_REFERENCE", 400);
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

      // Check depth of source folder's descendants
      const getDescendantMaxDepth = (folderId: string, currentDepth: number): number => {
        const children = Array.from(folderMap.entries())
          .filter(([, f]) => f.parentId === folderId)
          .map(([id]) => id);
        if (children.length === 0) return currentDepth;
        return Math.max(
          ...children.map((childId) => getDescendantMaxDepth(childId, currentDepth + 1)),
        );
      };

      const sourceMaxDepth = getDescendantMaxDepth(id, 0);
      if (depth + 1 + sourceMaxDepth >= MAX_FOLDER_DEPTH)
        throw new AppError("تم الوصول للحد الأقصى من العمق", "MAX_DEPTH_REACHED", 400);
    }

    return this.folderRepository.update(id, userId, { parentId: parentId || null });
  }

  async restoreFolder(id: string, userId: string) {
    const folderToRestore = await this.folderRepository.findWithDeleted(id, userId);
    if (!folderToRestore) throw new NotFoundError();
    if (folderToRestore.parentId) {
      const parent = await this.folderRepository.findById(folderToRestore.parentId, userId);
      if (!parent) throw new AppError("المجلد الأصل محذوف", "PARENT_DELETED", 404);
    }
    return this.folderRepository.restore(id, userId);
  }

  async getFolderTree(id: string, userId: string) {
    const targetFolder = await this.folderRepository.findById(id, userId);
    if (!targetFolder) throw new NotFoundError();

    const allFolders = await this.folderRepository.findMany(userId, {
      orderBy: { order: "asc" },
      include: { _count: { select: { documents: true, children: true } } },
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
    const tags = await this.tagRepository.findFolderTags(userId, role, id === "root" ? null : id);
    return tags
      .map((t) => ({ id: t.id, name: t.name, color: t.color, count: t._count.documents }))
      .sort((a, b) => b.count - a.count);
  }
}
