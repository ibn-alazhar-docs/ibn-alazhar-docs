import { prisma } from "@/transport/db";

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
import { WebhookRepository } from "./repositories/webhook.repository";
import { BookmarkRepository } from "./repositories/bookmark.repository";
import { VerificationTokenRepository } from "./repositories/verification-token.repository";

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
import { WebhookUseCases } from "./services/webhook.use-cases";
import { BookmarkUseCases } from "./services/bookmark.use-cases";
import { AnalyticsUseCases } from "./services/analytics.use-cases";
import { PasswordResetUseCases } from "./services/password-reset.use-cases";
import { AutoTagUseCases } from "./services/auto-tag.use-cases";

// Composition root (DI hub): repositories and use-cases are module-level
// singletons built once at import time. The grouping below only organizes
// wiring; it does not change instances, constructors, or lifecycles.

// Repositories — all created from the single PrismaClient instance.
// Two repos are intentionally NOT Prisma-backed: AccountRepository is
// constructed without arguments (delegates to auth/account handling), and
// MinioStorageRepository is env-driven (bucket/credentials come from config).
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
const webhookRepository = new WebhookRepository(prisma);
const bookmarkRepository = new BookmarkRepository(prisma);
// Internal only: verification tokens are consumed by registration and
// password-reset use-cases and are not exposed via `repos`.
const verificationTokenRepository = new VerificationTokenRepository(prisma);

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
  webhook: webhookRepository,
  bookmark: bookmarkRepository,
} as const;

// Documents: CRUD, move, tagging, upload, search, bookmark, auto-tagging.
// uploadDocument needs `storageRepository` (object writes) in addition to
// document/folder; bookmark/search are document-adjacent user features.
function createDocumentUseCases(deps: {
  documentRepository: DocumentRepository;
  folderRepository: FolderRepository;
  tagRepository: TagRepository;
  tagDocumentRepository: TagDocumentRepository;
  storageRepository: MinioStorageRepository;
  searchRepository: SearchRepository;
  bookmarkRepository: BookmarkRepository;
}) {
  return {
    documentCrud: new DocumentCrudUseCases(deps.documentRepository, deps.folderRepository),
    documentMove: new DocumentMoveUseCases(deps.documentRepository, deps.folderRepository),
    documentTag: new DocumentTagUseCases(
      deps.documentRepository,
      deps.tagRepository,
      deps.tagDocumentRepository,
    ),
    uploadDocument: new UploadDocumentUseCase(
      deps.documentRepository,
      deps.folderRepository,
      deps.storageRepository,
    ),
    search: new SearchUseCases(deps.searchRepository),
    bookmark: new BookmarkUseCases(deps.bookmarkRepository),
    autoTag: new AutoTagUseCases(deps.documentRepository, deps.tagRepository),
  } as const;
}

// Folders/tags: folder and tag use-cases share the tag repositories because
// folder views filter/count by tags and the tag use-case maintains the
// document-tag many-to-many link.
function createFolderTagUseCases(deps: {
  folderRepository: FolderRepository;
  tagRepository: TagRepository;
  tagDocumentRepository: TagDocumentRepository;
}) {
  return {
    folder: new FolderUseCases(deps.folderRepository, deps.tagRepository),
    tag: new TagUseCases(deps.tagRepository, deps.tagDocumentRepository),
  } as const;
}

// Conversions: tracks job state for a document; lives in its own group so
// document and conversion-job wiring stays explicit.
function createConversionUseCases(deps: {
  documentRepository: DocumentRepository;
  conversionJobRepository: ConversionJobRepository;
}) {
  return {
    conversion: new ConversionUseCases(deps.documentRepository, deps.conversionJobRepository),
  } as const;
}

// Share/export: `documentDownload` is built first because `exportDocument`
// reuses that exact singleton instance rather than constructing its own copy.
// Bulk `export` joins documents/tags/folders/conversions/storage in one pass.
function createShareExportUseCases(deps: {
  documentRepository: DocumentRepository;
  tagRepository: TagRepository;
  folderRepository: FolderRepository;
  tagDocumentRepository: TagDocumentRepository;
  conversionJobRepository: ConversionJobRepository;
  storageRepository: MinioStorageRepository;
  shareRepository: ShareRepository;
  accountRepository: AccountRepository;
}) {
  const documentDownload = new DocumentDownloadUseCase(deps.accountRepository);
  return {
    documentDownload,
    shareAccess: new ShareAccessUseCase(deps.shareRepository),
    documentShare: new DocumentShareUseCases(deps.documentRepository, deps.shareRepository),
    export: new ExportUseCases(
      deps.documentRepository,
      deps.tagRepository,
      deps.folderRepository,
      deps.tagDocumentRepository,
      deps.conversionJobRepository,
      deps.storageRepository,
    ),
    exportDocument: new ExportDocumentUseCase(
      deps.documentRepository,
      deps.storageRepository,
      documentDownload,
    ),
  } as const;
}

// Admin/account: registration/password-reset share the internal verification
// token repository; `analytics` receives the raw `prisma` instance (not a
// repository) because it runs direct aggregate queries.
function createAdminUseCases(deps: {
  userRepository: UserRepository;
  verificationTokenRepository: VerificationTokenRepository;
  webhookRepository: WebhookRepository;
  prisma: typeof prisma;
}) {
  return {
    registration: new RegistrationUseCases(deps.userRepository, deps.verificationTokenRepository),
    profile: new ProfileUseCases(deps.userRepository),
    user: new UserUseCases(deps.userRepository),
    passwordReset: new PasswordResetUseCases(deps.userRepository, deps.verificationTokenRepository),
    webhook: new WebhookUseCases(deps.webhookRepository),
    analytics: new AnalyticsUseCases(deps.prisma),
  } as const;
}

// Use-cases — singletons composed from the repositories above. Exported under
// the historical keys in their historical order for route compatibility.
const documentUseCases = createDocumentUseCases({
  documentRepository,
  folderRepository,
  tagRepository,
  tagDocumentRepository,
  storageRepository,
  searchRepository,
  bookmarkRepository,
});
const folderTagUseCases = createFolderTagUseCases({
  folderRepository,
  tagRepository,
  tagDocumentRepository,
});
const conversionUseCases = createConversionUseCases({
  documentRepository,
  conversionJobRepository,
});
const shareExportUseCases = createShareExportUseCases({
  documentRepository,
  tagRepository,
  folderRepository,
  tagDocumentRepository,
  conversionJobRepository,
  storageRepository,
  shareRepository,
  accountRepository,
});
const adminUseCases = createAdminUseCases({
  userRepository,
  verificationTokenRepository,
  webhookRepository,
  prisma,
});

export const useCases = {
  registration: adminUseCases.registration,
  profile: adminUseCases.profile,
  user: adminUseCases.user,
  passwordReset: adminUseCases.passwordReset,
  tag: folderTagUseCases.tag,
  conversion: conversionUseCases.conversion,
  export: shareExportUseCases.export,
  exportDocument: shareExportUseCases.exportDocument,
  folder: folderTagUseCases.folder,
  search: documentUseCases.search,
  documentCrud: documentUseCases.documentCrud,
  documentMove: documentUseCases.documentMove,
  documentTag: documentUseCases.documentTag,
  documentShare: shareExportUseCases.documentShare,
  uploadDocument: documentUseCases.uploadDocument,
  shareAccess: shareExportUseCases.shareAccess,
  documentDownload: shareExportUseCases.documentDownload,
  webhook: adminUseCases.webhook,
  bookmark: documentUseCases.bookmark,
  analytics: adminUseCases.analytics,
  autoTag: documentUseCases.autoTag,
} as const;
