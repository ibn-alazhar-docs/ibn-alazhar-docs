import { prisma } from "@/lib/backend/prisma";

import { UserRepository } from "./repositories/user.repository";
import { AccountRepository } from "./repositories/account.repository";
import { DocumentRepository } from "./repositories/document.repository";
import { FolderRepository } from "./repositories/folder.repository";
import { TagRepository } from "./repositories/tag.repository";
import { TagDocumentRepository } from "./repositories/tag-document.repository";
import { ConversionJobRepository } from "./repositories/conversion-job.repository";
import { ShareRepository } from "./repositories/share.repository";
import { SearchRepository } from "./repositories/search.repository";
import { MinioStorageRepository } from "./repositories/storage.repository";

import { RegistrationUseCases } from "./services/registration.use-cases";
import { ProfileUseCases } from "./services/profile.use-cases";
import { UserUseCases } from "./services/user.use-cases";
import { TagUseCases } from "./services/tag.use-cases";
import { ConversionUseCases } from "./services/conversion.use-cases";
import { ExportUseCases } from "./services/export.use-cases";
import { ExportDocumentUseCase } from "./services/export-document.use-case";
import { FolderUseCases } from "./services/folder.use-cases";
import { SearchUseCases } from "./services/search.use-cases";
import { DocumentCrudUseCases } from "./services/document-crud.use-cases";
import { DocumentMoveUseCases } from "./services/document-move.use-cases";
import { DocumentTagUseCases } from "./services/document-tag.use-cases";
import { DocumentShareUseCases } from "./services/document-share.use-cases";
import { UploadDocumentUseCase } from "./services/upload-document.use-case";
import { ShareAccessUseCase } from "./services/share-access.use-case";
import { DocumentDownloadUseCase } from "./services/document-download.use-case";

// Repositories — all created from the single PrismaClient instance
const userRepository = new UserRepository(prisma);
const accountRepository = new AccountRepository();
const documentRepository = new DocumentRepository(prisma);
const folderRepository = new FolderRepository(prisma);
const tagRepository = new TagRepository(prisma);
const tagDocumentRepository = new TagDocumentRepository(prisma);
const conversionJobRepository = new ConversionJobRepository(prisma);
const shareRepository = new ShareRepository(prisma);
const searchRepository = new SearchRepository(prisma);
const storageRepository = new MinioStorageRepository();

export const repos = {
  user: userRepository,
  account: accountRepository,
  document: documentRepository,
  folder: folderRepository,
  tag: tagRepository,
  tagDocument: tagDocumentRepository,
  conversionJob: conversionJobRepository,
  share: shareRepository,
  search: searchRepository,
  storage: storageRepository,
} as const;

// Use-cases
const shareAccessUseCase = new ShareAccessUseCase(shareRepository);
const documentDownloadUseCase = new DocumentDownloadUseCase(accountRepository);

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
    conversionJobRepository,
    storageRepository,
  ),
  exportDocument: new ExportDocumentUseCase(
    documentRepository,
    storageRepository,
    documentDownloadUseCase,
  ),
  folder: new FolderUseCases(folderRepository, tagRepository),
  search: new SearchUseCases(searchRepository),
  documentCrud: new DocumentCrudUseCases(documentRepository, folderRepository),
  documentMove: new DocumentMoveUseCases(documentRepository, folderRepository),
  documentTag: new DocumentTagUseCases(documentRepository, tagRepository, tagDocumentRepository),
  documentShare: new DocumentShareUseCases(documentRepository, shareRepository),
  uploadDocument: new UploadDocumentUseCase(
    documentRepository,
    folderRepository,
    storageRepository,
  ),
  shareAccess: shareAccessUseCase,
  documentDownload: documentDownloadUseCase,
} as const;
