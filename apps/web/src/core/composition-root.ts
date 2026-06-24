import { userRepository } from "./repositories/user.repository";
import { documentRepository } from "./repositories/document.repository";
import { folderRepository } from "./repositories/folder.repository";
import { tagRepository } from "./repositories/tag.repository";
import { tagDocumentRepository } from "./repositories/tag-document.repository";
import { conversionJobRepository } from "./repositories/conversion-job.repository";
import { shareRepository } from "./repositories/share.repository";
import { searchRepository } from "@/domain/repositories/search.repository.interface";

import { RegistrationUseCases } from "./use-cases/registration.use-cases";
import { ProfileUseCases } from "./use-cases/profile.use-cases";
import { UserUseCases } from "./use-cases/user.use-cases";
import { TagUseCases } from "./use-cases/tag.use-cases";
import { ConversionUseCases } from "./use-cases/conversion.use-cases";
import { ExportUseCases } from "./use-cases/export.use-cases";
import { FolderUseCases } from "./use-cases/folder.use-cases";
import { SearchUseCases } from "./use-cases/search.use-cases";
import { DocumentCrudUseCases } from "./use-cases/document-crud.use-cases";
import { DocumentShareUseCases } from "./use-cases/document-share.use-cases";

// Repositories
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
  user: new UserUseCases(),
  tag: new TagUseCases(tagRepository, tagDocumentRepository),
  conversion: new ConversionUseCases(documentRepository, conversionJobRepository),
  export: new ExportUseCases(
    documentRepository,
    tagRepository,
    folderRepository,
    tagDocumentRepository,
  ),
  folder: new FolderUseCases(folderRepository, tagRepository),
  search: new SearchUseCases(searchRepository),
  documentCrud: new DocumentCrudUseCases(documentRepository, folderRepository),
  documentShare: new DocumentShareUseCases(documentRepository, shareRepository),
} as const;
