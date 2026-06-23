export {
  loginSchema,
  registerSchema,
  profileUpdateSchema,
  adminUserUpdateSchema,
  type LoginInput,
  type RegisterInput,
  type ProfileUpdateInput,
  type AdminUserUpdateInput,
} from "./auth";

export { documentUpdateSchema, type DocumentUpdateInput } from "./document";

export {
  createFolderSchema,
  renameFolderSchema,
  moveFolderSchema,
  MAX_FOLDER_DEPTH,
} from "./folder";

export {
  createTagSchema,
  updateTagSchema,
  mergeTagsSchema,
  addTagToDocumentSchema,
  setDocumentTagsSchema,
  bulkTagSchema,
  bulkUntagSchema,
  TAG_COLORS,
  MAX_TAGS_PER_USER,
} from "./tag";

export {
  createShareSchema,
  EXPIRATION_OPTIONS,
  EXPORT_FORMATS,
  expirationToMs,
  msToExpirationOption,
  type CreateShareInput,
  type ExpirationOption,
  type ExportFormat,
} from "./share";
