import { type FlatFolder } from "@/lib/shared/build-folder-tree";
import { AppError, NotFoundError } from "@/lib/shared/errors";
import { ERROR_CODES } from "@/lib/shared/constants";
import { MAX_FOLDER_DEPTH } from "@/lib/shared/validators/folder";
import { isAdminRole } from "@/domain/auth";
import type { IFolderRepository } from "@/domain/repositories/folder.repository.interface";
import type { ITagRepository } from "@/domain/repositories/tag.repository.interface";
import { getDescendantMaxDepth, buildFolderTree } from "@/core/folder-tree";

export class FolderUseCases {
  constructor(
    private readonly folderRepository: IFolderRepository,
    private readonly tagRepository: ITagRepository,
  ) {}

  private async buildFolderMap(userId: string): Promise<Map<string, { parentId: string | null }>> {
    const allFolders = await this.folderRepository.findMany(userId, {
      select: { id: true, parentId: true },
    });
    const map = new Map<string, { parentId: string | null }>();
    for (const f of allFolders) {
      map.set(f.id, { parentId: f.parentId });
    }
    return map;
  }

  async getFolders(userId: string, role: string, parentId: string | null) {
    const admin = isAdminRole(role);
    return this.folderRepository.findMany(userId, {
      where: {
        ...(admin ? {} : { userId }),
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

    const allFolderIds = await this.folderRepository.getDescendantIds(id, userId);

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

    if (id === parentId) throw new AppError("مرجع دائري", ERROR_CODES.CIRCULAR_REFERENCE, 400);

    if (parentId) {
      const targetFolder = await this.folderRepository.findById(parentId, userId);
      if (!targetFolder)
        throw new AppError("المجلد الهدف غير موجود", ERROR_CODES.TARGET_NOT_FOUND, 404);

      const descendants = await this.folderRepository.getDescendantIds(id, userId);
      if (descendants.includes(parentId)) {
        throw new AppError("مرجع دائري", ERROR_CODES.CIRCULAR_REFERENCE, 400);
      }

      const targetDepth = await this.folderRepository.getAncestorDepth(parentId, userId);
      const sourceMaxDepth = getDescendantMaxDepth(id, 0, await this.buildFolderMap(userId));
      if (targetDepth + 1 + sourceMaxDepth >= MAX_FOLDER_DEPTH) {
        throw new AppError("تم الوصول للحد الأقصى من العمق", ERROR_CODES.MAX_DEPTH_REACHED, 400);
      }
    }

    return this.folderRepository.update(id, userId, { parentId: parentId || null });
  }

  async restoreFolder(id: string, userId: string) {
    const folderToRestore = await this.folderRepository.findWithDeleted(id, userId);
    if (!folderToRestore) throw new NotFoundError();
    if (folderToRestore.parentId) {
      const parent = await this.folderRepository.findById(folderToRestore.parentId, userId);
      if (!parent) throw new AppError("المجلد الأصل محذوف", ERROR_CODES.PARENT_DELETED, 404);
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

    return {
      tree: buildFolderTree(allFolders as unknown as FlatFolder[], null),
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
