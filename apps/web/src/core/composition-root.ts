import { userRepository } from "./repositories/user.repository";
import { documentRepository } from "./repositories/document.repository";
import { folderRepository } from "./repositories/folder.repository";
import { tagRepository } from "./repositories/tag.repository";
import { tagDocumentRepository } from "./repositories/tag-document.repository";
import { conversionJobRepository } from "./repositories/conversion-job.repository";
import { shareRepository } from "./repositories/share.repository";
import { SearchRepository } from "./repositories/search.repository";

import { RegistrationUseCases } from "./use-cases/registration.use-cases";
import { ProfileUseCases } from "./use-cases/profile.use-cases";
import { UserUseCases } from "./use-cases/user.use-cases";
import { TagUseCases } from "./use-cases/tag.use-cases";
import { ConversionUseCases } from "./use-cases/conversion.use-cases";
import { ExportUseCases } from "./use-cases/export.use-cases";
import { FolderUseCases } from "./use-cases/folder.use-cases";
import { SearchUseCases } from "./use-cases/search.use-cases";
import { DocumentCrudUseCases } from "./use-cases/document-crud.use-cases";
import { DocumentMoveUseCases } from "./use-cases/document-move.use-cases";
import { DocumentTagUseCases } from "./use-cases/document-tag.use-cases";
import { DocumentShareUseCases } from "./use-cases/document-share.use-cases";
import { UploadDocumentUseCase } from "./use-cases/upload-document.use-case";

// Repositories
export const repos = {
  user: userRepository,
  document: documentRepository,
  folder: folderRepository,
  tag: tagRepository,
  tagDocument: tagDocumentRepository,
  conversionJob: conversionJobRepository,
  share: shareRepository,
  search: new SearchRepository(),
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
  folder: new FolderUseCases(folderRepository, tagRepository),
  search: new SearchUseCases(new SearchRepository()),
  documentCrud: new DocumentCrudUseCases(documentRepository, folderRepository),
  documentMove: new DocumentMoveUseCases(documentRepository, folderRepository),
  documentTag: new DocumentTagUseCases(documentRepository, tagRepository),
  documentShare: new DocumentShareUseCases(documentRepository, shareRepository),
  uploadDocument: new UploadDocumentUseCase(documentRepository, folderRepository),
} as const;
