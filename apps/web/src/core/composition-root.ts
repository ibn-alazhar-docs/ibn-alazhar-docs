import { prisma } from "@/lib/prisma";

import { UserRepository } from "./repositories/user.repository";
import { DocumentRepository } from "./repositories/document.repository";
import { FolderRepository } from "./repositories/folder.repository";
import { TagRepository } from "./repositories/tag.repository";
import { TagDocumentRepository } from "./repositories/tag-document.repository";
import { ConversionJobRepository } from "./repositories/conversion-job.repository";
import { ShareRepository } from "./repositories/share.repository";
import { SearchRepository } from "./repositories/search.repository";

import { RegistrationUseCases } from "./use-cases/registration.use-cases";
import { ProfileUseCases } from "./use-cases/profile.use-cases";
import { UserUseCases } from "./use-cases/user.use-cases";
import { TagUseCases } from "./use-cases/tag.use-cases";
import { ConversionUseCases } from "./use-cases/conversion.use-cases";
import { ExportUseCases } from "./use-cases/export.use-cases";
import { ExportDocumentUseCase } from "./use-cases/export-document.use-case";
import { FolderUseCases } from "./use-cases/folder.use-cases";
import { SearchUseCases } from "./use-cases/search.use-cases";
import { DocumentCrudUseCases } from "./use-cases/document-crud.use-cases";
import { DocumentMoveUseCases } from "./use-cases/document-move.use-cases";
import { DocumentTagUseCases } from "./use-cases/document-tag.use-cases";
import { DocumentShareUseCases } from "./use-cases/document-share.use-cases";
import { UploadDocumentUseCase } from "./use-cases/upload-document.use-case";

// Repositories — all created from the single PrismaClient instance
const userRepository = new UserRepository(prisma);
const documentRepository = new DocumentRepository(prisma);
const folderRepository = new FolderRepository(prisma);
const tagRepository = new TagRepository(prisma);
const tagDocumentRepository = new TagDocumentRepository(prisma);
const conversionJobRepository = new ConversionJobRepository(prisma);
const shareRepository = new ShareRepository(prisma);
const searchRepository = new SearchRepository(prisma);

export const repos = {
  user: userRepository,
  document: documentRepository,
  folder: folderRepository,
  tag: tagRepository,
  tagDocument: tagDocumentRepository,
  conversionJob: conversionJobRepository,
  share: shareRepository,
  search: searchRepository,
} as const;

// Use-cases
export const useCases = {
  registration: new RegistrationUseCases(userRepository),
  profile: new ProfileUseCases(userRepository),
  user: new UserUseCases(userRepository),
  tag: new TagUseCases(tagRepository, tagDocumentRepository),
  conversion: new ConversionUseCases(documentRepository, conversionJobRepository),
  export: new ExportUseCases(
    documentRepository,
    tagRepository,
    folderRepository,
    tagDocumentRepository,
  ),
  exportDocument: new ExportDocumentUseCase(documentRepository),
  folder: new FolderUseCases(folderRepository, tagRepository),
  search: new SearchUseCases(searchRepository),
  documentCrud: new DocumentCrudUseCases(documentRepository, folderRepository),
  documentMove: new DocumentMoveUseCases(documentRepository, folderRepository),
  documentTag: new DocumentTagUseCases(documentRepository, tagRepository, tagDocumentRepository),
  documentShare: new DocumentShareUseCases(documentRepository, shareRepository),
  uploadDocument: new UploadDocumentUseCase(documentRepository, folderRepository),
} as const;
